from __future__ import annotations

import pytest

from synthgraph.errors import SynthGraphValidationError
from synthgraph.integrations.skrl import extract_training_config


class FakePolicy:
    pass


class FakeValue:
    pass


class FakeSpace:
    def __init__(self, text: str) -> None:
        self._text = text

    def __str__(self) -> str:
        return self._text


class FakePpoCfg:
    """Mirrors a real skrl 2.1.0 PPO_CFG instance's field set exactly,
    including the `.expand()`-driven per-model list-wrapping confirmed
    against a real, fully constructed skrl PPO agent."""

    def __init__(self) -> None:
        self.experiment = object()  # ExperimentCfg - excluded, not a hyperparameter
        self.rollouts = 32
        self.learning_epochs = 8
        self.mini_batches = 2
        self.discount_factor = 0.99
        self.gae_lambda = 0.95
        # skrl's cfg.expand() wraps scalars into one entry per model - this
        # is real observed behavior, not a guess.
        self.learning_rate = [0.0003, 0.0003]
        self.learning_rate_scheduler = [None, None]
        self.grad_norm_clip = 0.5
        self.ratio_clip = 0.2
        self.mixed_precision = False


class FakePpoAgent:
    def __init__(self) -> None:
        self.device = "cpu"
        self.observation_space = FakeSpace("Box(4,)")
        self.action_space = FakeSpace("Box(2,)")
        self.models = {"policy": FakePolicy(), "value": FakeValue()}
        self.cfg = FakePpoCfg()


def test_algorithm_device_and_spaces_are_captured():
    config = extract_training_config(FakePpoAgent())

    assert config["algorithm"] == "FakePpoAgent"
    assert config["device"] == "cpu"
    assert config["observation_space"] == "Box(4,)"
    assert config["action_space"] == "Box(2,)"


def test_models_are_captured_by_role_and_class_name():
    config = extract_training_config(FakePpoAgent())

    assert config["models"] == {"policy": "FakePolicy", "value": "FakeValue"}


def test_hyperparameters_come_from_cfg_fields():
    config = extract_training_config(FakePpoAgent())

    hyperparameters = config["hyperparameters"]
    assert hyperparameters["rollouts"] == 32
    assert hyperparameters["discount_factor"] == 0.99
    assert hyperparameters["gae_lambda"] == 0.95


def test_expanded_scalars_are_captured_as_lists_not_flattened():
    """skrl's cfg.expand() really does turn learning_rate into a
    per-model list - the SDK records what's actually there."""
    config = extract_training_config(FakePpoAgent())

    assert config["hyperparameters"]["learning_rate"] == [0.0003, 0.0003]


def test_experiment_field_is_excluded():
    config = extract_training_config(FakePpoAgent())

    assert "experiment" not in config["hyperparameters"]


def test_expanded_none_fields_are_captured_as_a_list_of_nulls():
    """Confirmed against a real agent: cfg.expand() turns even an unset
    (None) field into a per-model list, so it's [None, None], not omitted."""
    config = extract_training_config(FakePpoAgent())

    assert config["hyperparameters"]["learning_rate_scheduler"] == [None, None]


def test_a_field_that_is_genuinely_none_pre_expand_is_omitted():
    agent = FakePpoAgent()
    agent.cfg.kl_threshold = None

    config = extract_training_config(agent)

    assert "kl_threshold" not in config["hyperparameters"]


def test_raises_when_agent_has_no_cfg_attribute():
    with pytest.raises(SynthGraphValidationError):
        extract_training_config(object())


def test_result_is_json_serializable():
    import json

    json.dumps(extract_training_config(FakePpoAgent()))
