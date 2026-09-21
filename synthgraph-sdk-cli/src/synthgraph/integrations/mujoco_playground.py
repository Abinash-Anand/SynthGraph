"""Extract MuJoCo Playground environment/randomization info for provenance capture.

MuJoCo Playground's architecture is genuinely different from Isaac Lab's:
there is no ``EventManager``-style declarative config object holding
randomization ranges as inspectable attributes. Domain randomization is
imperative code - each task ships its own ``domain_randomize(model, rng)``
function (e.g. ``mujoco_playground._src.locomotion.go1.randomize``) that
mutates ``mjx.Model`` fields directly, with the randomization ranges as
literal numbers baked into the function body (confirmed by reading several
real ones on GitHub, e.g. ``geom_friction`` set via
``jax.random.uniform(key, minval=0.4, maxval=1.0)`` written directly in the
source). There is nothing to walk at runtime the way Isaac Lab's
``EventTermCfg.params`` can be walked.

So this module extracts two different things, both real and both verified
against the actual installed package, rather than pretending Playground has
an ``EventManager``-shaped API it doesn't have:

* ``env_config`` - most Playground tasks expose a structured
  ``default_config()`` returning an ``ml_collections.ConfigDict`` (task
  timing, PD gains, observation noise scales, reward scale weights, ...).
  This *is* real structured config and converts cleanly via its own
  ``.to_dict()``.
* ``domain_randomize`` - since the randomization ranges aren't structured
  data, this records the function's fully-qualified name (always available,
  and reproducible given the pinned package version) and, best-effort, its
  literal source text via ``inspect.getsource()`` - the only way to actually
  see the numeric ranges given this architecture. Source capture degrades to
  just the qualified name if ``inspect.getsource()`` fails (e.g. in a
  frozen/compiled build), never raises.

Nothing in this module imports ``mujoco_playground`` or runs an environment
on its own - the caller passes in a config object and/or a randomization
function they already have, and gets a plain dict back.

Usage::

    from synthgraph.integrations.mujoco_playground import (
        extract_env_config,
        extract_domain_randomize_fn,
    )

    env_cfg = registry.get_default_config("Go1JoystickFlatTerrain")
    randomization = extract_domain_randomize_fn(env.domain_randomize)
    experiment.generation(
        generator="mujoco_playground",
        parameters={**extract_env_config(env_cfg), **randomization},
    )

**Verification.** Checked against the real installed package
(``pip install playground``): ``joystick.default_config()`` really returns
an ``ml_collections.ConfigDict`` whose ``.to_dict()`` produces nested,
JSON-safe data (confirmed with the real Go1 joystick task's config), and
``inspect.getsource()`` really returns the real Go1 ``randomize.py`` source.
The imperative-randomization architecture claim itself is source-verified
against ``google-deepmind/mujoco_playground`` on GitHub across four
different tasks' ``randomize.py`` files, not assumed.
"""

from __future__ import annotations

import inspect
from typing import Any, Callable

from ..errors import SynthGraphValidationError
from ..serialization import to_jsonable

__all__ = ["extract_domain_randomize_fn", "extract_env_config"]


def extract_env_config(config: Any) -> dict[str, Any]:
    """Turn a Playground task's ``default_config()`` result into a plain dict.

    *config* is normally an ``ml_collections.ConfigDict`` (what every
    Playground task's ``default_config()`` returns), used via its own
    ``.to_dict()`` when available. A plain mapping is also accepted and
    passed through ``to_jsonable()`` as-is, so this also works if the
    caller already converted it themselves.

    Raises :class:`SynthGraphValidationError` if *config* is neither a
    ``ConfigDict``-like object (has ``.to_dict()``) nor a plain mapping.
    """
    to_dict = getattr(config, "to_dict", None)
    if callable(to_dict):
        raw = to_dict()
    elif isinstance(config, dict):
        raw = config
    else:
        raise SynthGraphValidationError(
            "config must be a Playground ConfigDict (with a `.to_dict()` "
            "method) or a plain dict, e.g. the return value of a task's "
            "`default_config()` function",
            field="config",
        )

    return {"env_config": to_jsonable(raw, field="config")}


def extract_domain_randomize_fn(func: Callable[..., Any]) -> dict[str, Any]:
    """Record a Playground task's ``domain_randomize`` function.

    Returns ``{"domain_randomize": {"function": "<qualified name>", "source":
    "<literal source text>"}}`` - ``source`` is included whenever
    ``inspect.getsource()`` succeeds (it needs the original ``.py`` file to
    still be on disk) and silently omitted otherwise, since the qualified
    name plus the pinned package version is already enough to identify
    exactly which randomization code ran.
    """
    info: dict[str, Any] = {
        "function": f"{getattr(func, '__module__', '?')}.{getattr(func, '__qualname__', repr(func))}"
    }
    try:
        info["source"] = inspect.getsource(func)
    except (OSError, TypeError):
        pass

    return {"domain_randomize": info}
