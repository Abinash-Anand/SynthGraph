"""Extract skrl training config for provenance capture.

Like stable-baselines3, skrl has no domain-randomization concept of its own
- it is an RL algorithm library, so what's worth recording is training
config: which algorithm, which models (policy/value/critic networks), and
the hyperparameters the agent was constructed with. That maps onto
``TrainingRun.config`` (the SDK's ``config=`` kwarg on
``training_runs.create()``/``experiment.training()``), the same as the
stable-baselines3 integration.

``extract_training_config()`` never imports ``skrl`` or reaches into a
running process on its own - the caller passes in an agent they already have
(a ``PPO``/``SAC``/``TD3``/... instance from ``skrl.agents.torch``) and gets
a plain dict back. Nothing here runs automatically.

``create_writer()`` reduces the *other* piece of manual work - logging
metrics at every step - the same way ``stable_baselines3.create_callback()``
does, but through skrl's own extension point, which is a **writer object**,
not a callback list: every skrl agent owns ``self.writer`` (normally a
TensorBoard ``SummaryWriter``) and calls ``self.writer.add_scalar(tag=,
value=, timestep=)`` once per tracked metric, at whatever cadence
``cfg.experiment.write_interval`` sets - confirmed directly against a real
agent, not assumed. Swap ``agent.writer`` for the object this returns (once,
after ``agent.init(...)``) and every subsequent write goes to SynthGraph too,
with no per-step ``log_metric()`` calls needed. Like the SB3 callback, this
uses skrl's own sanctioned mechanism (it's how skrl's *own* built-in W&B
support works - ``cfg.experiment.wandb = True`` makes skrl call
``wandb.init()`` and sync its TensorBoard writer itself) rather than
reaching into skrl from outside it.

Usage::

    from synthgraph.integrations.skrl import create_writer, extract_training_config

    agent = PPO(models=models, cfg=cfg, observation_space=obs_space,
                action_space=act_space, device="cuda:0")
    training = experiment.training(
        model=type(agent).__name__,
        framework="skrl",
        config=extract_training_config(agent),
    )
    agent.init(trainer_cfg=trainer_cfg)
    agent.writer = create_writer(training, wrapped=agent.writer)  # keep TensorBoard, add SynthGraph
    trainer = SequentialTrainer(cfg=trainer_cfg, env=env, agents=agent)
    trainer.train()
    training.close()  # flushes agent.writer's final pending batch (see below)

**Verification.** ``extract_training_config()`` was checked against a real,
fully constructed skrl 2.1.0 PPO agent (``pip install skrl``, real
``Model``/``GaussianMixin``/``DeterministicMixin`` subclasses, a real
``PPO_CFG`` dataclass), not just duck-typed stand-ins - confirmed every skrl
agent stores ``self.cfg`` (a dataclass), ``self.models``, ``self.device``,
``self.observation_space``, ``self.action_space`` on the shared
``skrl.agents.torch.base.Agent`` class, so this extraction works the same
way across every skrl algorithm (``PPO``, ``SAC``, ``TD3``, ``DDPG``, ...),
not just the one tested.

``create_writer()`` was checked the same way, driving the real
``agent.track_data()``/``agent.post_interaction()`` machinery directly (a
spy in place of ``agent.writer``, not a fake standing in for skrl) and
confirming: three ``track_data()`` calls followed by one
``post_interaction()`` crossing a ``write_interval`` boundary produced
exactly three ``add_scalar()`` calls, all sharing one ``timestep`` - the
batching this module relies on to turn that into a single ``log_metric()``
call instead of three separate HTTP requests.
"""

from __future__ import annotations

import warnings
from typing import Any

from ..errors import SynthGraphError, SynthGraphValidationError
from ..serialization import to_jsonable

__all__ = ["create_writer", "extract_training_config"]

#: Not a hyperparameter - it's skrl's logging/checkpoint directory config
#: (ExperimentCfg: directory, experiment_name, write_interval, ...), which
#: belongs in the researcher's own logging setup, not training provenance.
_EXCLUDED_CFG_FIELDS = frozenset({"experiment"})


def extract_training_config(agent: Any) -> dict[str, Any]:
    """Turn a skrl agent into a JSON-safe training config dict.

    Returns ``{"algorithm", "device", "observation_space", "state_space",
    "action_space", "models", "hyperparameters"}`` - each key present only
    when the corresponding attribute exists and is non-empty on *agent*.
    ``models`` maps each model's role (e.g. ``"policy"``, ``"value"``) to its
    class name. ``hyperparameters`` holds every field of ``agent.cfg``
    (skrl's per-algorithm config dataclass - ``PPO_CFG``, ``SAC_CFG``, ...)
    that is JSON-representable, except ``experiment`` (skrl's
    logging/checkpoint config, not a training hyperparameter).

    Raises :class:`SynthGraphValidationError` if *agent* has no ``cfg``
    attribute at all - every skrl agent has one (set in the shared
    ``Agent.__init__``), so its absence almost always means *agent* isn't a
    skrl agent instance.
    """
    if not hasattr(agent, "cfg"):
        raise SynthGraphValidationError(
            "agent has no `cfg` attribute; pass a skrl agent instance "
            "(e.g. a PPO, SAC or TD3 object from skrl.agents.torch)",
            field="agent",
        )

    config: dict[str, Any] = {"algorithm": type(agent).__name__}

    device = getattr(agent, "device", None)
    if device is not None:
        config["device"] = str(device)

    for space_name in ("observation_space", "state_space", "action_space"):
        space = getattr(agent, space_name, None)
        if space is not None:
            config[space_name] = str(space)

    models = getattr(agent, "models", None)
    if models:
        config["models"] = {
            name: type(model).__name__ for name, model in models.items() if model is not None
        }

    hyperparameters: dict[str, Any] = {}
    for key, value in vars(agent.cfg).items():
        if key in _EXCLUDED_CFG_FIELDS or value is None:
            continue
        try:
            hyperparameters[key] = to_jsonable(value, field=key)
        except SynthGraphValidationError:
            continue

    if hyperparameters:
        config["hyperparameters"] = hyperparameters

    return config


def create_writer(training: Any, *, wrapped: Any | None = None) -> Any:
    """Build a writer that logs an skrl agent's tracked metrics to SynthGraph.

    Assign the result to ``agent.writer`` after ``agent.init(...)`` (skrl
    only constructs ``self.writer`` inside ``init()``, once
    ``write_interval`` is resolved). From then on, every batch of metrics
    skrl writes - ``agent.post_interaction()`` calls ``add_scalar()`` once
    per tracked tag, all sharing one ``timestep``, at whatever cadence
    ``cfg.experiment.write_interval`` sets - is batched into a single
    ``training.log_metric(step=timestep, metrics={...})`` call instead of
    one HTTP request per tag.

    ``wrapped``, when given (typically the ``SummaryWriter`` skrl already
    constructed, i.e. ``agent.writer`` *before* replacing it), still receives
    every ``add_scalar()``/``flush()``/``close()`` call first - existing
    TensorBoard logging keeps working unchanged, SynthGraph logging is
    additive. Pass ``wrapped=None`` (the default) to log to SynthGraph only.

    A failure to reach the SynthGraph backend for one batch is caught and
    turned into a ``warnings.warn()`` rather than raised, and never affects
    ``wrapped`` - the same "capture must never be the reason the script
    crashes" principle as the stable-baselines3 callback.

    **Call ``.close()`` (or ``.flush()``) on the returned writer once
    training finishes.** Batching means the last write_interval's worth of
    metrics only gets sent to SynthGraph once a *later* call with a
    different timestep arrives, or the writer is explicitly flushed.
    Confirmed directly against skrl's own ``SequentialTrainer``: it never
    calls ``.close()``/``.flush()`` on the writer itself, so without this the
    final batch would be silently lost. This is *not* symmetric with skrl's
    own ``SummaryWriter`` - that one wraps TensorBoard's ``EventFileWriter``,
    which self-flushes on a background queue-size/time basis
    (``flush_secs=120`` by default) even without an explicit close, so the
    same risk exists there too but is much less likely to be noticed. This
    writer has no background flush, so the risk is real on every run, not
    just an edge case - always call ``.close()``.

    **Or don't, and call ``training.close()`` instead.** When *training* is a
    real ``TrainingHandle``, this writer registers its own ``close()`` with
    ``training``'s ``IntegrationSession`` at construction time, so leaving a
    ``with experiment.training(...) as training:`` block, or calling
    ``training.close()`` directly, flushes the final batch the same way -
    see ``integration_session.py``. The explicit call above still works and
    is what a duck-typed ``training`` (one with no session, e.g. in a test)
    needs, since only a real ``TrainingHandle`` has one to register with.
    """

    class SynthGraphWriter:
        def __init__(self) -> None:
            self._pending: dict[str, float] = {}
            self._pending_timestep: int | None = None

        def add_scalar(self, *, tag: str, value: float, timestep: int) -> None:
            if wrapped is not None:
                wrapped.add_scalar(tag=tag, value=value, timestep=timestep)

            if self._pending_timestep is not None and timestep != self._pending_timestep:
                self._flush()

            self._pending_timestep = timestep
            try:
                self._pending[tag] = float(value)
            except (TypeError, ValueError):
                pass

        def flush(self) -> None:
            if wrapped is not None:
                wrapped.flush()
            self._flush()

        def close(self) -> None:
            self._flush()
            if wrapped is not None:
                wrapped.close()

        def _flush(self) -> None:
            if not self._pending or self._pending_timestep is None:
                return
            step = self._pending_timestep
            metrics = dict(self._pending)
            self._pending.clear()
            self._pending_timestep = None
            try:
                training.log_metric(step=step, metrics=metrics)
            except SynthGraphError as error:
                warnings.warn(
                    f"SynthGraph metric logging failed at timestep {step}: {error}",
                    stacklevel=2,
                )

    writer = SynthGraphWriter()

    # Duck-typed, not imported: a plain training handle in a test has no
    # session at all, and that's fine - see integration_session.py. When
    # `training` is a real TrainingHandle, this closes the gotcha above
    # automatically: training.close() (or leaving a `with` block) now
    # flushes this writer too, so the explicit .close() call is a backstop,
    # not the only thing standing between a researcher and lost data.
    session = getattr(training, "_integration_session", None)
    if session is not None:
        session.register(writer.close, name="skrl_writer")

    return writer
