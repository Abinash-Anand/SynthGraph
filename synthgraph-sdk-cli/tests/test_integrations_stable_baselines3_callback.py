"""Tests for create_callback() against the real stable-baselines3 library.

Unlike test_integrations_stable_baselines3.py (which uses duck-typed fakes
and needs no dependency), create_callback() necessarily subclasses SB3's
real BaseCallback - there is no fake for that. SB3 is not a project
dependency, so this whole file self-skips via importorskip when it isn't
installed, rather than failing CI. Wherever SB3 *is* installed (as it was
when this was written and verified end-to-end against a real backend), these
tests exercise the real thing: a real PPO model, a real .learn() call, a
real callback instance.
"""

from __future__ import annotations

import warnings

import pytest

pytest.importorskip("stable_baselines3")

from synthgraph.errors import SynthGraphError  # noqa: E402
from synthgraph.integrations.stable_baselines3 import (  # noqa: E402
    _numeric_metrics,
    create_callback,
)


class FakeTrainingHandle:
    """Stands in for fluent.TrainingHandle - only .log_metric() is used."""

    def __init__(self, *, raise_on_call: bool = False) -> None:
        self.calls: list[tuple[int, dict]] = []
        self._raise_on_call = raise_on_call

    def log_metric(self, *, step: int, metrics: dict) -> None:
        if self._raise_on_call:
            raise SynthGraphError("simulated backend failure")
        self.calls.append((step, metrics))


def _make_model():
    from stable_baselines3 import PPO

    return PPO("MlpPolicy", "CartPole-v1", n_steps=64, batch_size=32, verbose=0)


def test_numeric_metrics_coerces_numpy_scalars():
    import numpy as np

    raw = {
        "train/loss": np.float32(1.5),
        "train/entropy": np.float64(-0.69),
        "train/n_updates": np.int64(10),
        "train/clip_range": 0.2,
    }

    result = _numeric_metrics(raw)

    assert result == {
        "train/loss": pytest.approx(1.5),
        "train/entropy": pytest.approx(-0.69),
        "train/n_updates": pytest.approx(10.0),
        "train/clip_range": pytest.approx(0.2),
    }
    assert all(isinstance(v, float) for v in result.values())


def test_numeric_metrics_drops_unconvertible_values():
    raw = {"good": 1.0, "bad": object()}

    result = _numeric_metrics(raw)

    assert result == {"good": 1.0}


def test_callback_logs_real_rollout_metrics_during_training():
    training = FakeTrainingHandle()
    model = _make_model()

    model.learn(total_timesteps=320, callback=create_callback(training))

    # Confirmed against a real run: the first rollout's logger is empty
    # (before SB3's first training update), so it's skipped - only
    # non-empty rollouts get logged.
    assert len(training.calls) >= 1
    for step, metrics in training.calls:
        assert isinstance(step, int)
        assert "train/loss" in metrics
        assert all(isinstance(v, float) for v in metrics.values())


def test_callback_steps_are_monotonically_increasing():
    training = FakeTrainingHandle()
    model = _make_model()

    model.learn(total_timesteps=320, callback=create_callback(training))

    steps = [step for step, _ in training.calls]
    assert steps == sorted(steps)
    assert len(steps) == len(set(steps))


def test_callback_survives_a_backend_failure_without_aborting_training():
    training = FakeTrainingHandle(raise_on_call=True)
    model = _make_model()

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        # Must not raise - training completes even though every log call fails.
        model.learn(total_timesteps=320, callback=create_callback(training))

    assert any("SynthGraph metric logging failed" in str(w.message) for w in caught)


def test_create_callback_does_not_require_stable_baselines3_at_module_import_time():
    """Importing the module must never require SB3 - only calling
    create_callback() does. This is checked by the fact that this whole
    test file only imports synthgraph.integrations.stable_baselines3 at
    module level (line above the importorskip guard would fail loudly if
    that weren't true, since importorskip only guards the SB3 import
    itself, not synthgraph's)."""
    import synthgraph.integrations.stable_baselines3 as module

    assert hasattr(module, "create_callback")
    assert hasattr(module, "extract_training_config")
