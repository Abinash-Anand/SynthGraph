"""Extract rl_games training config for provenance capture.

rl_games is config-driven: a researcher typically has a parsed YAML config
dict (with top-level ``algo``/``model``/``network``/``config`` keys, as
``rl_games.torch_runner.Runner`` expects) before an agent is ever
constructed - many rl_games workflows never touch an agent instance
directly at all, driving everything through ``Runner``. So unlike the
stable-baselines3/skrl integrations, this one accepts that raw ``params``
dict as the primary input, and falls back to reading ``.config`` off an
already-constructed agent (``A2CAgent``/``SACAgent``, ...) when that's what
the caller has instead - confirmed directly against rl_games' real source
(``rl_games/common/a2c_common.py``: ``self.config = config = params['config']``
in ``A2CBase.__init__``) that this is exactly the attribute every agent
stores.

Nothing in this module imports ``rl_games`` or reaches into a running
process on its own - the caller passes in a dict or object they already
have, and gets a plain dict back. Nothing here runs automatically.

Usage::

    from synthgraph.integrations.rl_games import extract_training_config

    import yaml
    # rl_games' own Runner.load() does exactly this: the YAML file has one
    # top-level "params" key wrapping algo/model/network/config - pass the
    # raw loaded file straight through, no need to unwrap it yourself.
    yaml_config = yaml.safe_load(open("ppo_continuous.yaml"))
    training = experiment.training(
        framework="rl_games",
        config=extract_training_config(yaml_config),
    )

**Verification.** rl_games agents are built through a heavyweight
YAML-config-driven ``Runner``/network-builder pipeline this SDK cannot
reasonably stand up just to construct a throwaway agent, so this has not
been exercised against a live agent instance. It has been checked directly
against rl_games' real source on GitHub (``Denys88/rl_games``,
``rl_games/common/a2c_common.py``) for the ``self.config`` attribute shape,
and against a real example config shipped in that repo
(``rl_games/configs/ppo_continuous.yaml``) for the dict shape this module
reads - not assumed from documentation.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from ..errors import SynthGraphValidationError
from ..serialization import to_jsonable

__all__ = ["extract_training_config"]


def extract_training_config(source: Mapping[str, Any] | Any) -> dict[str, Any]:
    """Turn an rl_games config dict or agent into a JSON-safe config dict.

    *source* may be a raw ``yaml.safe_load()`` result (one top-level
    ``"params"`` key wrapping ``algo``/``model``/``network``/``config`` -
    unwrapped the same way ``rl_games.torch_runner.Runner.load()`` does),
    the already-unwrapped ``params`` dict itself, or an already-constructed
    agent instance (anything with a ``.config`` attribute).

    Returns ``{"algorithm", "model", "network", "hyperparameters"}`` for a
    dict *source* - each key present only when that section of *params* has
    a ``name`` (for ``algo``/``model``/``network``) or exists at all (for
    ``config``, whose entries become ``hyperparameters``). For an agent
    *source*, returns ``{"algorithm": type(source).__name__,
    "hyperparameters": ...}`` - the algorithm/model/network names live only
    in the original ``params`` dict, not stored separately as attributes on
    a constructed agent.

    Raises :class:`SynthGraphValidationError` if *source* is neither a
    mapping with a ``config`` entry nor an object with a ``.config``
    attribute - that combination almost always means *source* isn't an
    rl_games params dict or agent.
    """
    if isinstance(source, Mapping):
        # rl_games.torch_runner.Runner.load() does exactly this: a YAML file
        # loaded with yaml.safe_load() has one top-level "params" key that
        # wraps the algo/model/network/config shape - unwrap it the same way
        # Runner does, so a caller can pass yaml.safe_load(f) directly.
        params = source["params"] if "params" in source and "config" not in source else source

        result: dict[str, Any] = {}
        for section_name, result_key in (("algo", "algorithm"), ("model", "model"), ("network", "network")):
            section = params.get(section_name)
            if isinstance(section, Mapping) and section.get("name"):
                result[result_key] = section["name"]
        config = params.get("config")
        if config is None:
            raise SynthGraphValidationError(
                "source has no 'config' entry; pass an rl_games params dict "
                "(with an 'algo'/'model'/'network'/'config' shape) or an "
                "agent instance with a `.config` attribute",
                field="source",
            )
    else:
        config = getattr(source, "config", None)
        if config is None:
            raise SynthGraphValidationError(
                "source has no `.config` attribute; pass an rl_games params "
                "dict or an agent instance (e.g. an A2CAgent or SACAgent "
                "object from rl_games.algos_torch)",
                field="source",
            )
        result = {"algorithm": type(source).__name__}

    hyperparameters: dict[str, Any] = {}
    if isinstance(config, Mapping):
        for key, value in config.items():
            try:
                hyperparameters[key] = to_jsonable(value, field=key)
            except SynthGraphValidationError:
                continue

    if hyperparameters:
        result["hyperparameters"] = hyperparameters

    return result
