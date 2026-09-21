"""Extract skrl training config for provenance capture.

Like stable-baselines3, skrl has no domain-randomization concept of its own
- it is an RL algorithm library, so what's worth recording is training
config: which algorithm, which models (policy/value/critic networks), and
the hyperparameters the agent was constructed with. That maps onto
``TrainingRun.config`` (the SDK's ``config=`` kwarg on
``training_runs.create()``/``experiment.training()``), the same as the
stable-baselines3 integration.

Nothing in this module imports ``skrl`` or reaches into a running process on
its own - the caller passes in an agent they already have (a ``PPO``/``SAC``/
``TD3``/... instance from ``skrl.agents.torch``) and gets a plain dict back.
Nothing here runs automatically.

Usage::

    from synthgraph.integrations.skrl import extract_training_config

    agent = PPO(models=models, cfg=cfg, observation_space=obs_space,
                action_space=act_space, device="cuda:0")
    training = experiment.training(
        model=type(agent).__name__,
        framework="skrl",
        config=extract_training_config(agent),
    )

**Verification.** Checked against a real, fully constructed skrl 2.1.0 PPO
agent (``pip install skrl``, real ``Model``/``GaussianMixin``/
``DeterministicMixin`` subclasses, a real ``PPO_CFG`` dataclass), not just
duck-typed stand-ins - confirmed every skrl agent stores ``self.cfg`` (a
dataclass), ``self.models``, ``self.device``, ``self.observation_space``,
``self.action_space`` on the shared ``skrl.agents.torch.base.Agent`` class,
so this extraction works the same way across every skrl algorithm
(``PPO``, ``SAC``, ``TD3``, ``DDPG``, ...), not just the one tested.
"""

from __future__ import annotations

from typing import Any

from ..errors import SynthGraphValidationError
from ..serialization import to_jsonable

__all__ = ["extract_training_config"]

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
