"""Background resource sampling (environment.ResourceMonitor).

resource_metadata() itself is monkeypatched throughout - these tests are
about the thread lifecycle (start/stop/periodic sampling/final flush/error
handling), not about what a real hardware snapshot contains (that's already
covered, and verified against real hardware, in test_environment.py).
"""

from __future__ import annotations

import time
import warnings

import pytest

from synthgraph.environment import ResourceMonitor
from synthgraph.errors import SynthGraphError
from synthgraph.integration_session import IntegrationSession

# Fast enough to observe several ticks within a short test, slow enough not
# to flood a slow CI machine with thread wakeups.
_FAST_INTERVAL = 0.03
_SETTLE = _FAST_INTERVAL * 6


class FakeTrainingHandle:
    def __init__(self, *, fail_every: int | None = None, with_session: bool = False) -> None:
        self.calls: list[tuple[int, dict]] = []
        self._fail_every = fail_every
        if with_session:
            self._integration_session = IntegrationSession()

    def log_metric(self, *, step: int, metrics: dict) -> None:
        if self._fail_every is not None and step % self._fail_every == 0:
            raise SynthGraphError("simulated backend failure")
        self.calls.append((step, dict(metrics)))


@pytest.fixture(autouse=True)
def _fake_resource_metadata(monkeypatch):
    monkeypatch.setattr(
        "synthgraph.environment.resource_metadata",
        lambda: {"cpu_count": 8},
    )


def test_start_then_stop_logs_at_least_one_sample():
    training = FakeTrainingHandle()
    monitor = ResourceMonitor(training, interval_seconds=_FAST_INTERVAL)

    monitor.start()
    time.sleep(_SETTLE)
    monitor.stop()

    assert len(training.calls) >= 1
    assert all(metrics == {"cpu_count": 8} for _, metrics in training.calls)


def test_samples_periodically_at_the_configured_interval():
    training = FakeTrainingHandle()
    monitor = ResourceMonitor(training, interval_seconds=_FAST_INTERVAL)

    monitor.start()
    time.sleep(_SETTLE)
    monitor.stop()

    # Several ticks should have fired in _SETTLE, not just the immediate
    # first-sample-on-start plus the final stop() sample.
    assert len(training.calls) >= 3


def test_steps_are_sequential_starting_at_zero():
    training = FakeTrainingHandle()
    monitor = ResourceMonitor(training, interval_seconds=_FAST_INTERVAL)

    monitor.start()
    time.sleep(_SETTLE)
    monitor.stop()

    steps = [step for step, _ in training.calls]
    assert steps == list(range(len(steps)))


def test_stop_logs_one_final_sample_beyond_the_periodic_ones():
    """stop() must not just kill the thread - it logs once more first, so
    the tail of a training run isn't missing a sample."""
    training = FakeTrainingHandle()
    # A long interval means the periodic loop won't tick again during the
    # test - the only way a sample appears is via the immediate first
    # sample on start() and the explicit one in stop().
    monitor = ResourceMonitor(training, interval_seconds=60.0)

    monitor.start()
    time.sleep(0.05)
    monitor.stop()

    assert len(training.calls) == 2  # immediate first sample + stop()'s final sample


def test_stop_is_safe_when_never_started():
    training = FakeTrainingHandle()
    monitor = ResourceMonitor(training, interval_seconds=_FAST_INTERVAL)

    monitor.stop()  # must not raise

    assert training.calls == []


def test_stop_is_safe_to_call_twice():
    training = FakeTrainingHandle()
    monitor = ResourceMonitor(training, interval_seconds=_FAST_INTERVAL)

    monitor.start()
    time.sleep(_SETTLE)
    monitor.stop()
    calls_after_first_stop = len(training.calls)

    monitor.stop()  # must not raise, must not log again

    assert len(training.calls) == calls_after_first_stop


def test_start_is_idempotent():
    training = FakeTrainingHandle()
    monitor = ResourceMonitor(training, interval_seconds=_FAST_INTERVAL)

    monitor.start()
    thread_after_first_start = monitor._thread
    monitor.start()  # must not spawn a second thread

    assert monitor._thread is thread_after_first_start
    monitor.stop()


def test_context_manager_starts_and_stops():
    training = FakeTrainingHandle()

    with ResourceMonitor(training, interval_seconds=_FAST_INTERVAL) as monitor:
        assert monitor._thread is not None
        time.sleep(_SETTLE)

    assert monitor._thread is None
    assert len(training.calls) >= 1


def test_a_failed_log_call_warns_but_keeps_the_thread_running():
    training = FakeTrainingHandle(fail_every=1)  # every sample fails
    monitor = ResourceMonitor(training, interval_seconds=_FAST_INTERVAL)

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        monitor.start()
        time.sleep(_SETTLE)
        monitor.stop()

    assert any("SynthGraph resource metric logging failed" in str(w.message) for w in caught)
    # Every sample failed, so nothing was recorded, but the thread must have
    # kept retrying rather than dying after the first failure - confirmed by
    # getting multiple warnings, one per attempted sample.
    assert len(caught) >= 2
    assert training.calls == []


def test_a_failed_sample_does_not_crash_the_thread(monkeypatch):
    def broken_resource_metadata():
        raise RuntimeError("simulated hardware query failure")

    monkeypatch.setattr("synthgraph.environment.resource_metadata", broken_resource_metadata)
    training = FakeTrainingHandle()
    monitor = ResourceMonitor(training, interval_seconds=_FAST_INTERVAL)

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        monitor.start()
        time.sleep(_SETTLE)
        monitor.stop()

    assert any("SynthGraph resource sampling failed" in str(w.message) for w in caught)
    assert training.calls == []


def test_construction_registers_stop_with_the_trainings_integration_session():
    """The exact gap the dogfooding run exposed: a script that starts a
    monitor and never calls .stop() loses the final sample, silently. When
    `training` has a session, construction registers stop() with it, so
    training.close() (which every TrainingHandle now has) closes this too -
    without the caller ever calling monitor.stop() directly."""
    training = FakeTrainingHandle(with_session=True)
    monitor = ResourceMonitor(training, interval_seconds=60.0)

    monitor.start()
    time.sleep(0.05)
    # No monitor.stop() call at all - only the session closes.
    training._integration_session.close()

    assert len(training.calls) == 2  # immediate first sample + the registered stop()'s final sample
    assert monitor._thread is None


def test_no_session_attribute_is_not_an_error():
    """A duck-typed training handle (e.g. a test fake with no session, as
    every other test in this file uses) must construct and run exactly as
    before - the getattr guard must not require the attribute to exist."""
    training = FakeTrainingHandle(with_session=False)

    monitor = ResourceMonitor(training, interval_seconds=_FAST_INTERVAL)
    monitor.start()
    time.sleep(_SETTLE)
    monitor.stop()

    assert len(training.calls) >= 1
