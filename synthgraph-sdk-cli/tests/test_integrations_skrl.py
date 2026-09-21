from __future__ import annotations

import warnings

import pytest

from synthgraph.errors import SynthGraphError, SynthGraphValidationError
from synthgraph.integrations.skrl import create_writer, extract_training_config


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


class FakeTrainingHandle:
    def __init__(self, *, raise_on_call: bool = False) -> None:
        self.calls: list[tuple[int, dict]] = []
        self._raise_on_call = raise_on_call

    def log_metric(self, *, step: int, metrics: dict) -> None:
        if self._raise_on_call:
            raise SynthGraphError("simulated backend failure")
        self.calls.append((step, metrics))


class SpyWrapped:
    def __init__(self) -> None:
        self.calls: list[tuple] = []

    def add_scalar(self, *, tag, value, timestep) -> None:
        self.calls.append(("add_scalar", tag, value, timestep))

    def flush(self) -> None:
        self.calls.append(("flush",))

    def close(self) -> None:
        self.calls.append(("close",))


def test_create_writer_batches_same_timestep_calls_into_one_log_metric():
    """Confirmed against a real skrl agent: post_interaction() calls
    add_scalar() once per tracked tag, all sharing one timestep."""
    training = FakeTrainingHandle()
    writer = create_writer(training)

    writer.add_scalar(tag="Loss / policy loss", value=0.5, timestep=5)
    writer.add_scalar(tag="Reward / total reward (mean)", value=10.0, timestep=5)
    writer.add_scalar(tag="Loss / value loss", value=1.2, timestep=5)

    # Not flushed yet - still the same timestep.
    assert training.calls == []

    writer.close()

    assert training.calls == [
        (
            5,
            {
                "Loss / policy loss": 0.5,
                "Reward / total reward (mean)": 10.0,
                "Loss / value loss": 1.2,
            },
        )
    ]


def test_create_writer_flushes_previous_batch_when_timestep_changes():
    training = FakeTrainingHandle()
    writer = create_writer(training)

    writer.add_scalar(tag="loss", value=0.5, timestep=5)
    writer.add_scalar(tag="loss", value=0.3, timestep=10)  # new timestep flushes the first

    assert training.calls == [(5, {"loss": 0.5})]

    writer.close()

    assert training.calls == [(5, {"loss": 0.5}), (10, {"loss": 0.3})]


def test_create_writer_close_flushes_the_final_pending_batch():
    """The gotcha documented on create_writer(): skrl's own SequentialTrainer
    never calls .close()/.flush() itself, so without an explicit close the
    last batch would be silently lost."""
    training = FakeTrainingHandle()
    writer = create_writer(training)

    writer.add_scalar(tag="loss", value=0.5, timestep=5)
    assert training.calls == []

    writer.close()
    assert training.calls == [(5, {"loss": 0.5})]


def test_create_writer_flush_also_flushes_pending_data():
    training = FakeTrainingHandle()
    writer = create_writer(training)

    writer.add_scalar(tag="loss", value=0.5, timestep=5)
    writer.flush()

    assert training.calls == [(5, {"loss": 0.5})]


def test_create_writer_forwards_to_wrapped_writer_unconditionally():
    training = FakeTrainingHandle()
    wrapped = SpyWrapped()
    writer = create_writer(training, wrapped=wrapped)

    writer.add_scalar(tag="loss", value=0.5, timestep=5)
    writer.flush()
    writer.close()

    assert wrapped.calls == [
        ("add_scalar", "loss", 0.5, 5),
        ("flush",),
        ("close",),
    ]


def test_create_writer_survives_a_backend_failure_without_raising():
    training = FakeTrainingHandle(raise_on_call=True)
    wrapped = SpyWrapped()
    writer = create_writer(training, wrapped=wrapped)

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        writer.add_scalar(tag="loss", value=0.5, timestep=5)
        writer.close()  # must not raise

    assert any("SynthGraph metric logging failed" in str(w.message) for w in caught)
    # The wrapped writer must still work even though SynthGraph logging failed.
    assert ("add_scalar", "loss", 0.5, 5) in wrapped.calls
    assert ("close",) in wrapped.calls


def test_create_writer_drops_unconvertible_values_without_raising():
    training = FakeTrainingHandle()
    writer = create_writer(training)

    writer.add_scalar(tag="good", value=1.0, timestep=1)
    writer.add_scalar(tag="bad", value=object(), timestep=1)
    writer.close()

    assert training.calls == [(1, {"good": 1.0})]
