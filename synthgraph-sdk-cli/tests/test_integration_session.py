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
