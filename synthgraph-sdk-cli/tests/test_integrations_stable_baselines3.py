from __future__ import annotations

import pytest

from synthgraph.errors import SynthGraphValidationError
from synthgraph.integrations.stable_baselines3 import extract_training_config


class FakePolicy:
    pass


class FakeSpace:
    def __init__(self, text: str) -> None:
        self._text = text

    def __str__(self) -> str:
        return self._text


class FakePPO:
    """Mirrors the real PPO attribute shape confirmed against a real
    stable-baselines3 install: schedules for learning_rate/clip_range,
    plain floats/ints for the rest, None for what PPO doesn't have."""

    def __init__(self) -> None:
        self.policy = FakePolicy()
        self.device = "cpu"
        self.observation_space = FakeSpace("Box(4,)")
        self.action_space = FakeSpace("Discrete(2)")
        self.learning_rate = lambda progress_remaining: 3e-4  # constant schedule
        self.gamma = 0.99
        self.gae_lambda = 0.95
        self.ent_coef = 0.0
        self.vf_coef = 0.5
        self.max_grad_norm = 0.5
        self.n_steps = 64
        self.n_epochs = 10
        self.batch_size = 32
        self.clip_range = lambda progress_remaining: 0.2 * progress_remaining
        self.clip_range_vf = None
        self.target_kl = None
        self.seed = None
        # Off-policy-only attributes simply don't exist on a PPO instance.


class FakeDQN:
    """Mirrors the real DQN attribute shape: no gae_lambda/ent_coef/clip_range,
    a train_freq namedtuple-with-enum, and off-policy-specific fields."""

    def __init__(self) -> None:
        self.policy = FakePolicy()
        self.device = "cpu"
        self.learning_rate = 1e-4
        self.gamma = 0.99
        self.batch_size = 32
        self.buffer_size = 1000
        self.learning_starts = 100
        self.train_freq = (4, "step")
        self.gradient_steps = 1
        self.tau = 1.0
        self.target_update_interval = 10000
        self.exploration_fraction = 0.1
        self.exploration_initial_eps = 1.0
        self.exploration_final_eps = 0.05
        self.seed = None


def test_algorithm_and_policy_names_are_captured():
    config = extract_training_config(FakePPO())

    assert config["algorithm"] == "FakePPO"
    assert config["policy"] == "FakePolicy"
    assert config["device"] == "cpu"
    assert config["observation_space"] == "Box(4,)"
    assert config["action_space"] == "Discrete(2)"


def test_schedules_are_sampled_at_progress_remaining_one_and_flagged():
    config = extract_training_config(FakePPO())

    assert config["hyperparameters"]["learning_rate"] == 3e-4
    assert config["hyperparameters"]["clip_range"] == 0.2
    assert set(config["schedules"]) == {"learning_rate", "clip_range"}


def test_plain_hyperparameters_are_captured_without_being_flagged_as_schedules():
    config = extract_training_config(FakePPO())

    assert config["hyperparameters"]["gamma"] == 0.99
    assert config["hyperparameters"]["batch_size"] == 32
    assert "gamma" not in config["schedules"]


def test_attributes_that_do_not_apply_to_the_algorithm_are_absent():
    config = extract_training_config(FakePPO())

    assert "buffer_size" not in config["hyperparameters"]
    assert "target_update_interval" not in config["hyperparameters"]


def test_off_policy_algorithm_captures_its_own_hyperparameters():
    config = extract_training_config(FakeDQN())

    assert config["algorithm"] == "FakeDQN"
    hyperparameters = config["hyperparameters"]
    assert hyperparameters["buffer_size"] == 1000
    assert hyperparameters["train_freq"] == [4, "step"]
    assert hyperparameters["exploration_final_eps"] == 0.05
    assert "gae_lambda" not in hyperparameters
    assert "clip_range" not in hyperparameters
    assert "schedules" not in config  # DQN's fields here are all plain values


def test_raises_when_given_something_without_a_policy_attribute():
    with pytest.raises(SynthGraphValidationError):
        extract_training_config(object())


def test_result_is_json_serializable():
    import json

    json.dumps(extract_training_config(FakePPO()))
    json.dumps(extract_training_config(FakeDQN()))
