"""Extract Weights & Biases run config/metrics for provenance capture.

W&B is a generic experiment tracker, not an RL/domain-randomization
framework - it has no structured concept of "training config" the way
stable-baselines3's model attributes or skrl's config dataclass do, but a
``wandb.Run`` a researcher already has open carries exactly the same kind of
thing: whatever they logged as ``config=`` at ``wandb.init()`` time, plus
whatever they've since logged as metrics.

This mirrors *from* an existing W&B run *into* SynthGraph on an explicit
call, deliberately not by monkey-patching ``wandb.init()``/``wandb.log()``.
That would mean intercepting calls in the researcher's own process without
them asking for it at that specific point, which is the opposite of every
other integration in this package (and of ``environment.git_metadata()``/
``environment.environment_metadata()`` before them) - each one is a
function the caller invokes explicitly with an object they already have,
never a hook installed behind their back.

Nothing in this module imports ``wandb`` at module load time or starts a
run on its own - the caller passes in the ``wandb.Run`` object they already
have (from their own ``wandb.init()`` call) and gets a plain dict back.

Usage::

    from synthgraph.integrations.wandb import extract_run_config, extract_run_metrics

    run = wandb.init(project="rain-detection", config={"lr": 3e-4})
    training = experiment.training(
        framework="wandb-tracked",
        config=extract_run_config(run),
    )
    ...
    training.log_metric(step=100, metrics=extract_run_metrics(run))

**Verification.** Checked against a real, running ``wandb.Run`` (``pip
install wandb``, ``wandb.init(mode="offline", ...)`` - no account or network
needed): confirmed ``run.config`` and ``run.summary`` are both
dict-convertible via a plain ``dict(...)`` call, and that ``run.summary``
carries wandb's own bookkeeping keys (``_runtime``, ``_step``,
``_timestamp``) alongside whatever the researcher logged - handled below by
dropping keys wandb itself prefixes with ``_`` rather than passing its
internal bookkeeping through as if it were the researcher's data. Offline
test artifacts were cleaned up after verification; nothing from that test
run is stored in the SDK.
"""

from __future__ import annotations

from typing import Any

from ..errors import SynthGraphValidationError
from ..serialization import to_jsonable

__all__ = ["extract_run_config", "extract_run_metrics"]


def extract_run_config(run: Any) -> dict[str, Any]:
    """Turn a W&B run's ``config`` into a plain JSON-safe dict.

    Raises :class:`SynthGraphValidationError` if *run* has no ``config``
    attribute at all - every ``wandb.Run`` does, so its absence almost
    always means *run* isn't a W&B run object.
    """
    config = getattr(run, "config", None)
    if config is None:
        raise SynthGraphValidationError(
            "run has no `config` attribute; pass the object returned by "
            "your own `wandb.init(...)` call",
            field="run",
        )
    return to_jsonable(dict(config), field="config")


def extract_run_metrics(run: Any) -> dict[str, Any]:
    """Turn a W&B run's latest logged metrics (``run.summary``) into a plain dict.

    W&B's own bookkeeping keys (anything starting with ``_``, e.g.
    ``_runtime``, ``_step``, ``_timestamp``) are dropped - they describe
    W&B's tracking of the run, not a metric the researcher logged.

    Raises :class:`SynthGraphValidationError` if *run* has no ``summary``
    attribute at all - every ``wandb.Run`` does, so its absence almost
    always means *run* isn't a W&B run object.
    """
    summary = getattr(run, "summary", None)
    if summary is None:
        raise SynthGraphValidationError(
            "run has no `summary` attribute; pass the object returned by "
            "your own `wandb.init(...)` call",
            field="run",
        )
    metrics = {key: value for key, value in dict(summary).items() if not key.startswith("_")}
    return to_jsonable(metrics, field="metrics")
