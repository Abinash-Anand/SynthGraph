from __future__ import annotations

import warnings

from synthgraph.integration_session import IntegrationSession


def test_close_runs_every_registered_closer():
    session = IntegrationSession()
    calls: list[str] = []

    session.register(lambda: calls.append("a"), name="a")
    session.register(lambda: calls.append("b"), name="b")
    session.close()

    assert calls == ["a", "b"]


def test_close_is_idempotent():
    session = IntegrationSession()
    calls: list[str] = []
    session.register(lambda: calls.append("x"), name="x")

    session.close()
    session.close()

    assert calls == ["x"]


def test_a_failing_closer_does_not_stop_the_rest():
    session = IntegrationSession()
    calls: list[str] = []

    def boom() -> None:
        raise RuntimeError("simulated close failure")

    session.register(boom, name="broken")
    session.register(lambda: calls.append("still ran"), name="ok")

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        session.close()

    assert calls == ["still ran"]
    assert any(
        "SynthGraph integration 'broken' failed to close cleanly" in str(w.message)
        for w in caught
    )


def test_register_after_close_does_not_retroactively_invoke():
    session = IntegrationSession()
    session.close()
    calls: list[str] = []

    session.register(lambda: calls.append("late"), name="late")

    assert calls == []


def test_close_returns_true_the_first_time_and_false_after():
    session = IntegrationSession()
    session.register(lambda: None, name="x")

    assert session.close() is True
    assert session.close() is False


def test_summary_is_none_when_nothing_was_ever_registered():
    session = IntegrationSession()
    session.close()

    assert session.summary() is None


def test_summary_is_none_before_close_has_run():
    session = IntegrationSession()
    session.register(lambda: None, name="x")

    assert session.summary() is None


def test_summary_reports_complete_when_everything_closed_cleanly():
    session = IntegrationSession()
    session.register(lambda: None, name="resource_monitor")
    session.register(lambda: None, name="skrl_writer")
    session.close()

    assert session.summary() == {
        "status": "complete",
        "integrations": {
            "resource_monitor": {"attached": True, "closed": True},
            "skrl_writer": {"attached": True, "closed": True},
        },
    }


def test_summary_reports_partial_when_one_closer_failed():
    session = IntegrationSession()
    session.register(lambda: None, name="ok")

    def boom() -> None:
        raise RuntimeError("simulated close failure")

    session.register(boom, name="broken")

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        session.close()

    assert session.summary() == {
        "status": "partial",
        "integrations": {
            "ok": {"attached": True, "closed": True},
            "broken": {"attached": True, "closed": False},
        },
    }
