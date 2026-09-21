"""Extract Isaac Lab domain-randomization event config for provenance capture.

Isaac Lab's manager-based RL environments configure domain randomization
through an ``EventManager``: a config object (conventionally called
``EventCfg``) whose fields are ``EventTermCfg``-like objects, each carrying a
``func`` (the randomization function), a ``mode`` (``"startup"``, ``"reset"``,
``"interval"``, ...) and a ``params`` mapping (the actual randomization
ranges/values - e.g. ``{"mass_distribution_params": (0.5, 1.5), "operation":
"scale"}``). That ``params`` mapping is exactly the kind of thing
``Generation.parameters`` exists to record, so this module turns it into a
plain, JSON-safe dict the caller passes into ``generation.create(parameters=
...)`` or ``experiment.generation(parameters=...)`` themselves.

Nothing in this module imports ``isaaclab``, starts an environment, or reaches
into a running process on its own - the caller passes in an object they
already have (typically ``env.event_manager`` or the ``EventCfg`` instance
they built), and gets a dict back. Nothing here runs automatically; the same
contract as ``environment.git_metadata()``/``environment.environment_metadata
()``, just extended to a framework config object instead of the local Git
checkout and interpreter.

Usage::

    from synthgraph.integrations.isaaclab import extract_event_config

    randomization = extract_event_config(env.event_manager)
    experiment.generation(
        generator="isaaclab",
        parameters={**randomization, "task": "Isaac-Cartpole-v0"},
    )

**Verification.** ``isaaclab`` is not on PyPI (it is installed from source
alongside NVIDIA's Isaac Sim, a large GPU-simulation stack this environment
cannot run), so this has not been exercised against a *live* Isaac Lab
installation. It has, however, been checked directly against the real
source on GitHub (``isaac-sim/IsaacLab``,
``source/isaaclab/isaaclab/managers/``), not just documentation or training
knowledge: ``EventTermCfg`` (in ``manager_term_cfg.py``) declares exactly
``func``, ``mode``, ``interval_range_s`` on itself and inherits ``params``
from ``ManagerTermBaseCfg``; ``ManagerBase.__init__`` (in
``manager_base.py``) stores ``self.cfg = copy.deepcopy(cfg)``, confirming
the ``.cfg`` attribute this module reads off an ``EventManager``; and
``ManagerBase`` itself falls back to ``self.cfg.__dict__.items()`` to
iterate a non-dict cfg's fields when logging its own info - the exact same
approach ``_public_attributes()`` below uses. A ``params`` value can be a
``SceneEntityCfg`` object rather than a plain JSON value (also confirmed in
``ManagerTermBaseCfg``'s docstring); that case is already handled by the
``unrepresentable_params`` fallback rather than assumed away. What remains
unverified is only the live *values* a running environment produces, not
the attribute shape.
"""

from __future__ import annotations

from typing import Any

from ..errors import SynthGraphValidationError
from ..serialization import to_jsonable

__all__ = ["extract_event_config"]


def extract_event_config(source: Any) -> dict[str, Any]:
    """Extract domain-randomization event terms from an Isaac Lab config.

    ``source`` may be an ``EventManager`` instance (or anything else with a
    ``.cfg`` attribute), or an ``EventCfg``-like object directly. Its public
    fields are scanned for anything that looks like an ``EventTermCfg`` - an
    object with both a ``func`` and a ``mode`` attribute - and grouped by
    mode.

    Returns ``{"isaaclab_events": {mode: [term, ...], ...}}``, where each
    term is ``{"name", "func", "params"}`` plus ``"interval_range_s"`` when
    the term cfg has one. A ``params`` value that cannot be represented as
    JSON is dropped from that term and its dotted path recorded under
    ``"isaaclab_events_unrepresentable_params"`` instead of raising, so one
    unusual value never blocks capturing the rest.

    Raises :class:`SynthGraphValidationError` if nothing that looks like an
    event term is found at all - that almost always means ``source`` is not
    an Isaac Lab event manager or config, rather than that the environment
    genuinely has zero randomization terms.
    """
    cfg = getattr(source, "cfg", source)

    terms_by_mode: dict[str, list[dict[str, Any]]] = {}
    unrepresentable: list[str] = []

    for name, value in _public_attributes(cfg):
        if not (hasattr(value, "func") and hasattr(value, "mode")):
            continue
        mode = str(getattr(value, "mode"))
        terms_by_mode.setdefault(mode, []).append(_term_to_dict(name, value, unrepresentable))

    if not terms_by_mode:
        raise SynthGraphValidationError(
            "no event terms found on source; pass an Isaac Lab EventManager "
            "(anything with a `.cfg` attribute) or an EventCfg-like object "
            "whose fields are EventTermCfg-like (each with `.func` and "
            "`.mode`)",
            field="source",
        )

    result: dict[str, Any] = {"isaaclab_events": terms_by_mode}
    if unrepresentable:
        result["isaaclab_events_unrepresentable_params"] = unrepresentable
    return result


def _public_attributes(obj: Any) -> list[tuple[str, Any]]:
    """The non-private instance attributes of *obj*, or none for something
    that isn't a plain attribute-bearing object (e.g. a mapping or scalar)."""
    try:
        items = vars(obj).items()
    except TypeError:
        return []
    return [(name, value) for name, value in items if not name.startswith("_")]


def _term_to_dict(
    name: str,
    term_cfg: Any,
    unrepresentable: list[str],
) -> dict[str, Any]:
    """Turn one EventTermCfg-like object into a JSON-safe dict."""
    func = getattr(term_cfg, "func", None)
    func_name = (
        getattr(func, "__qualname__", None)
        or getattr(func, "__name__", None)
        or (str(func) if func is not None else None)
    )

    raw_params = getattr(term_cfg, "params", None) or {}
    params: dict[str, Any] = {}
    for key, value in dict(raw_params).items():
        try:
            params[key] = to_jsonable(value, field=f"{name}.params.{key}")
        except SynthGraphValidationError:
            unrepresentable.append(f"{name}.params.{key}")

    term: dict[str, Any] = {"name": name, "func": func_name, "params": params}

    interval_range_s = getattr(term_cfg, "interval_range_s", None)
    if interval_range_s is not None:
        term["interval_range_s"] = list(interval_range_s)

    return term
