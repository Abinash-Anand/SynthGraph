from __future__ import annotations

import pytest

from synthgraph.errors import SynthGraphValidationError
from synthgraph.integrations.wandb import extract_run_config, extract_run_metrics


class FakeWandbConfig(dict):
    """A real wandb.sdk.wandb_config.Config is dict()-convertible but not a
    dict subclass - this stands in for that without being one either,
    exercising the dict(config) call path."""


class FakeRun:
    def __init__(self, config: dict, summary: dict) -> None:
        self.config = config
        self.summary = summary


REAL_SUMMARY_SHAPE = {
    # Confirmed against a real offline wandb run: these bookkeeping keys
    # are always present alongside whatever the researcher logged.
    "_runtime": 0.1250501,
    "_step": 0,
    "_timestamp": 1789994618.8355246,
    "loss": 0.5,
    "reward": 10.2,
}


def test_extract_run_config_converts_to_plain_dict():
    run = FakeRun(config={"learning_rate": 0.0003, "batch_size": 32}, summary={})

    result = extract_run_config(run)

    assert result == {"learning_rate": 0.0003, "batch_size": 32}


def test_extract_run_metrics_drops_wandb_bookkeeping_keys():
    run = FakeRun(config={}, summary=REAL_SUMMARY_SHAPE)

    result = extract_run_metrics(run)

    assert result == {"loss": 0.5, "reward": 10.2}
    assert "_runtime" not in result
    assert "_step" not in result
    assert "_timestamp" not in result


def test_extract_run_config_raises_without_config_attribute():
    with pytest.raises(SynthGraphValidationError):
        extract_run_config(object())


def test_extract_run_metrics_raises_without_summary_attribute():
    with pytest.raises(SynthGraphValidationError):
        extract_run_metrics(object())


def test_results_are_json_serializable():
    import json

    run = FakeRun(config={"lr": 3e-4}, summary=REAL_SUMMARY_SHAPE)
    json.dumps(extract_run_config(run))
    json.dumps(extract_run_metrics(run))
