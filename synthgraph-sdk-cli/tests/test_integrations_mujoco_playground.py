from __future__ import annotations

import pytest

from synthgraph.errors import SynthGraphValidationError
from synthgraph.integrations.mujoco_playground import (
    extract_domain_randomize_fn,
    extract_env_config,
)


class FakeConfigDict:
    """Mirrors ml_collections.config_dict.ConfigDict's .to_dict(), which a
    real Playground task's default_config() returns - confirmed against
    the real Go1 joystick task."""

    def __init__(self, data: dict) -> None:
        self._data = data

    def to_dict(self) -> dict:
        return self._data


REAL_GO1_CONFIG_SHAPE = {
    "Kd": 0.5,
    "Kp": 35.0,
    "action_repeat": 1,
    "ctrl_dt": 0.02,
    "episode_length": 1000,
    "noise_config": {
        "level": 1.0,
        "scales": {"joint_pos": 0.03, "joint_vel": 1.5, "gyro": 0.2},
    },
    "reward_config": {"scales": {"tracking_lin_vel": 1.0, "tracking_ang_vel": 0.5}},
}


def real_go1_domain_randomize(model, rng):
    """Stand-in with the real Go1 randomize.py's signature and a
    representative literal range, confirmed against the real source."""
    friction = 0.4  # geom_friction: U(0.4, 1.0), from the real source


def test_extract_env_config_uses_to_dict():
    result = extract_env_config(FakeConfigDict(REAL_GO1_CONFIG_SHAPE))

    assert result["env_config"] == REAL_GO1_CONFIG_SHAPE


def test_extract_env_config_accepts_a_plain_dict_too():
    result = extract_env_config({"ctrl_dt": 0.02})

    assert result["env_config"] == {"ctrl_dt": 0.02}


def test_extract_env_config_rejects_unrelated_objects():
    with pytest.raises(SynthGraphValidationError):
        extract_env_config(object())


def test_extract_domain_randomize_fn_records_qualified_name():
    result = extract_domain_randomize_fn(real_go1_domain_randomize)

    assert result["domain_randomize"]["function"].endswith(
        "real_go1_domain_randomize"
    )


def test_extract_domain_randomize_fn_captures_source_when_available():
    result = extract_domain_randomize_fn(real_go1_domain_randomize)

    assert "source" in result["domain_randomize"]
    assert "geom_friction" in result["domain_randomize"]["source"]
    assert "0.4" in result["domain_randomize"]["source"]


def test_extract_domain_randomize_fn_degrades_gracefully_without_source():
    # A builtin has no retrievable Python source.
    result = extract_domain_randomize_fn(len)

    assert "source" not in result["domain_randomize"]
    assert result["domain_randomize"]["function"]  # still has a name


def test_results_are_json_serializable():
    import json

    json.dumps(extract_env_config(FakeConfigDict(REAL_GO1_CONFIG_SHAPE)))
    json.dumps(extract_domain_randomize_fn(real_go1_domain_randomize))
