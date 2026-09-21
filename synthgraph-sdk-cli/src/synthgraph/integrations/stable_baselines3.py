"""Extract stable-baselines3 training config for provenance capture.

Unlike Isaac Lab's ``EventManager`` (domain-randomization config),
stable-baselines3 has no randomization concept of its own - it is the RL
*algorithm* implementation, so what it has worth recording is training
config: which algorithm, which policy, and the hyperparameters the model was
constructed with (learning rate, discount factor, batch size, and so on).
That maps onto ``TrainingRun.config`` (the SDK's ``config=`` kwarg on
``training_runs.create()``/``experiment.training()``), not
``Generation.parameters``.

Nothing in this module imports ``stable_baselines3`` or reaches into a
running process on its own - the caller passes in a model they already have
(e.g. a ``PPO``/``DQN``/``SAC`` instance) and gets a plain dict back. Nothing
here runs automatically; the same contract as ``environment.git_metadata()``/
``environment.environment_metadata()``, just extended to a framework object
instead of the local Git checkout and interpreter.

Usage::

    from synthgraph.integrations.stable_baselines3 import extract_training_config

    model = PPO("MlpPolicy", "CartPole-v1", learning_rate=3e-4, n_steps=64)
    training = experiment.training(
        model=type(model).__name__,
        framework="stable-baselines3",
        config=extract_training_config(model),
    )

**Verification.** Unlike the Isaac Lab integration, this one was checked
against a real installation (``pip install stable-baselines3``) with real
``PPO`` and ``DQN`` instances - the attribute names below, and the fact that
``learning_rate``/``clip_range``/etc. are sometimes schedules rather than
plain floats, were confirmed against the actual library rather than assumed.
It has not been checked against every algorithm SB3 ships (e.g. ``SAC``,
``TD3``, ``A2C``), so an unusual algorithm's specific hyperparameters may be
missing from the fixed attribute list below - anything not on that list is
simply not captured, never guessed at.
"""

from __future__ import annotations

from typing import Any

from ..errors import SynthGraphValidationError
from ..serialization import to_jsonable

__all__ = ["extract_training_config"]

#: Hyperparameter attribute names checked across stable-baselines3's
#: on-policy (PPO, A2C) and off-policy (DQN, SAC, TD3) algorithms. An
#: algorithm simply won't have the ones that don't apply to it - each is
#: read with getattr() and skipped when absent, never assumed.
_HYPERPARAMETER_ATTRIBUTES = [
    "learning_rate",
    "gamma",
    "gae_lambda",
    "ent_coef",
    "vf_coef",
    "max_grad_norm",
    "n_steps",
    "n_epochs",
    "batch_size",
    "clip_range",
    "clip_range_vf",
    "target_kl",
    "buffer_size",
    "learning_starts",
    "train_freq",
    "gradient_steps",
    "tau",
    "target_update_interval",
    "exploration_fraction",
    "exploration_initial_eps",
    "exploration_final_eps",
    "use_sde",
    "sde_sample_freq",
    "seed",
]


def extract_training_config(model: Any) -> dict[str, Any]:
    """Turn a stable-baselines3 model into a JSON-safe training config dict.

    Returns ``{"algorithm", "policy", "device", "observation_space",
    "action_space", "hyperparameters", "schedules"}`` - each key present only
    when the corresponding attribute exists on *model*. ``hyperparameters``
    holds every attribute from a fixed, checked-against-the-real-library
    list that is actually present and JSON-representable; ``schedules``
    lists which of those were a schedule (a callable of ``progress_remaining
    -> float``) rather than a constant - the value recorded is the schedule
    sampled at ``progress_remaining=1.0`` (its initial value, matching how
    stable-baselines3 itself treats that argument), not the callable.

    Raises :class:`SynthGraphValidationError` if *model* has no ``policy``
    attribute at all - every stable-baselines3 algorithm has one, so its
    absence almost always means *model* isn't a stable-baselines3 model.
    """
    if not hasattr(model, "policy"):
        raise SynthGraphValidationError(
            "model has no `policy` attribute; pass a stable-baselines3 "
            "algorithm instance (e.g. a PPO, DQN or SAC object)",
            field="model",
        )

    config: dict[str, Any] = {"algorithm": type(model).__name__}

    policy = model.policy
    if policy is not None:
        config["policy"] = type(policy).__name__

    device = getattr(model, "device", None)
    if device is not None:
        config["device"] = str(device)

    for space_name in ("observation_space", "action_space"):
        space = getattr(model, space_name, None)
        if space is not None:
            config[space_name] = str(space)

    hyperparameters: dict[str, Any] = {}
    schedules: list[str] = []
    for name in _HYPERPARAMETER_ATTRIBUTES:
        value = getattr(model, name, None)
        if value is None:
            continue

        if callable(value):
            try:
                # stable-baselines3 schedules are Callable[[float], float]
                # over progress_remaining; 1.0 is training's starting point.
                value = value(1.0)
            except TypeError:
                continue
            schedules.append(name)

        try:
            hyperparameters[name] = to_jsonable(value, field=name)
        except SynthGraphValidationError:
            continue

    if hyperparameters:
        config["hyperparameters"] = hyperparameters
    if schedules:
        config["schedules"] = schedules

    return config
