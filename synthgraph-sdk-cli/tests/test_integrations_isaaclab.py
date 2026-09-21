from __future__ import annotations

import pytest

from synthgraph.errors import SynthGraphValidationError
from synthgraph.integrations.isaaclab import extract_event_config


class FakeEventTermCfg:
    """Stands in for Isaac Lab's EventTermCfg: func + mode + params."""

    def __init__(self, func, mode, params=None, interval_range_s=None):
        self.func = func
        self.mode = mode
        self.params = params or {}
        if interval_range_s is not None:
            self.interval_range_s = interval_range_s


class FakeEventCfg:
    """Stands in for an EventCfg: a plain object whose fields are terms."""


class FakeEventManager:
    """Stands in for an EventManager: exposes the cfg it was built from."""

    def __init__(self, cfg):
        self.cfg = cfg


def randomize_mass(env, asset_cfg, mass_distribution_params, operation):
    raise NotImplementedError("never called - only introspected")


def reset_base(env):
    raise NotImplementedError("never called - only introspected")


def _sample_cfg() -> FakeEventCfg:
    cfg = FakeEventCfg()
    cfg.randomize_mass = FakeEventTermCfg(
        func=randomize_mass,
        mode="startup",
        params={"mass_distribution_params": (0.5, 1.5), "operation": "scale"},
    )
    cfg.reset_base = FakeEventTermCfg(func=reset_base, mode="reset", params={})
    cfg.push_robot = FakeEventTermCfg(
        func=randomize_mass,
        mode="interval",
        params={"velocity_range": {"x": (-0.5, 0.5)}},
        interval_range_s=(10.0, 15.0),
    )
    # Non-term attributes must be ignored, not mistaken for event terms.
    cfg.some_flag = True
    cfg.some_name = "not-a-term"
    return cfg


def test_extracts_terms_grouped_by_mode_from_a_manager():
    manager = FakeEventManager(_sample_cfg())

    result = extract_event_config(manager)

    events = result["isaaclab_events"]
    assert set(events) == {"startup", "reset", "interval"}
    assert len(events["startup"]) == 1
    assert len(events["reset"]) == 1
    assert len(events["interval"]) == 1


def test_extracts_terms_directly_from_a_cfg_object():
    result = extract_event_config(_sample_cfg())

    assert "isaaclab_events" in result
    assert set(result["isaaclab_events"]) == {"startup", "reset", "interval"}


def test_term_shape_includes_name_func_and_params():
    result = extract_event_config(_sample_cfg())

    [term] = result["isaaclab_events"]["startup"]
    assert term["name"] == "randomize_mass"
    assert term["func"] == "randomize_mass"
    assert term["params"] == {"mass_distribution_params": [0.5, 1.5], "operation": "scale"}


def test_interval_range_s_is_captured_when_present():
    result = extract_event_config(_sample_cfg())

    [term] = result["isaaclab_events"]["interval"]
    assert term["interval_range_s"] == [10.0, 15.0]
    assert "interval_range_s" not in result["isaaclab_events"]["startup"][0]


def test_non_term_attributes_are_ignored():
    result = extract_event_config(_sample_cfg())

    all_names = {term["name"] for terms in result["isaaclab_events"].values() for term in terms}
    assert "some_flag" not in all_names
    assert "some_name" not in all_names


def test_unrepresentable_params_are_dropped_not_raised():
    cfg = FakeEventCfg()
    cfg.bad_term = FakeEventTermCfg(
        func=randomize_mass,
        mode="startup",
        params={"good": 1.0, "bad": randomize_mass},  # a raw function isn't JSON-safe
    )

    result = extract_event_config(cfg)

    [term] = result["isaaclab_events"]["startup"]
    assert term["params"] == {"good": 1.0}
    assert result["isaaclab_events_unrepresentable_params"] == ["bad_term.params.bad"]


def test_raises_when_nothing_looks_like_an_event_term():
    with pytest.raises(SynthGraphValidationError):
        extract_event_config(object())


def test_raises_on_an_empty_cfg():
    with pytest.raises(SynthGraphValidationError):
        extract_event_config(FakeEventCfg())
