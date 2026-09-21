from __future__ import annotations

import pytest

from synthgraph.errors import SynthGraphValidationError
from synthgraph.integrations.rl_games import extract_training_config

# Mirrors the real rl_games/configs/ppo_continuous.yaml shipped in
# Denys88/rl_games on GitHub, fetched and parsed to confirm this shape.
REAL_PPO_CONTINUOUS_PARAMS = {
    "algo": {"name": "a2c_continuous"},
    "model": {"name": "continuous_a2c_logstd"},
    "network": {"name": "actor_critic", "separate": True},
    "load_checkpoint": False,
    "load_path": "path",
    "config": {
        "reward_shaper": {"scale_value": 0.1},
        "normalize_advantage": True,
        "gamma": 0.99,
        "tau": 0.9,
        "learning_rate": "3e-4",
        "name": "walker",
        "score_to_win": 300,
        "grad_norm": 0.5,
        "entropy_coef": 0.0,
        "num_actors": 16,
        "horizon_length": 256,
        "minibatch_size": 1024,
        "mini_epochs": 8,
        "env_config": {"env_name": "BipedalWalkerHardcore-v3"},
    },
}


class FakeAgent:
    """Mirrors what A2CBase.__init__ really stores: self.config = params['config']."""

    def __init__(self, config: dict) -> None:
        self.config = config


def test_extracts_algorithm_model_network_from_a_raw_yaml_load_result():
    # rl_games.torch_runner.Runner.load() does config['params'] to unwrap
    # exactly this shape - a raw yaml.safe_load() result.
    wrapped = {"params": REAL_PPO_CONTINUOUS_PARAMS}

    result = extract_training_config(wrapped)

    assert result["algorithm"] == "a2c_continuous"
    assert result["model"] == "continuous_a2c_logstd"
    assert result["network"] == "actor_critic"


def test_unwrapped_params_dict_produces_identical_result():
    wrapped_result = extract_training_config({"params": REAL_PPO_CONTINUOUS_PARAMS})
    unwrapped_result = extract_training_config(REAL_PPO_CONTINUOUS_PARAMS)

    assert wrapped_result == unwrapped_result


def test_hyperparameters_come_from_the_config_section():
    result = extract_training_config(REAL_PPO_CONTINUOUS_PARAMS)

    hyperparameters = result["hyperparameters"]
    assert hyperparameters["gamma"] == 0.99
    assert hyperparameters["tau"] == 0.9
    assert hyperparameters["reward_shaper"] == {"scale_value": 0.1}
    assert hyperparameters["env_config"] == {"env_name": "BipedalWalkerHardcore-v3"}


def test_top_level_non_config_keys_are_not_treated_as_hyperparameters():
    result = extract_training_config(REAL_PPO_CONTINUOUS_PARAMS)

    assert "load_checkpoint" not in result["hyperparameters"]
    assert "load_path" not in result["hyperparameters"]


def test_agent_object_falls_back_to_its_config_attribute():
    agent = FakeAgent(config={"gamma": 0.995, "learning_rate": 5e-4})

    result = extract_training_config(agent)

    assert result["algorithm"] == "FakeAgent"
    assert result["hyperparameters"] == {"gamma": 0.995, "learning_rate": 5e-4}
    # An agent object has no separate model/network attributes - only the
    # original params dict had those.
    assert "model" not in result
    assert "network" not in result


def test_raises_when_dict_source_has_no_config_key():
    with pytest.raises(SynthGraphValidationError):
        extract_training_config({"algo": {"name": "a2c_continuous"}})


def test_raises_when_object_source_has_no_config_attribute():
    with pytest.raises(SynthGraphValidationError):
        extract_training_config(object())


def test_result_is_json_serializable():
    import json

    json.dumps(extract_training_config(REAL_PPO_CONTINUOUS_PARAMS))
