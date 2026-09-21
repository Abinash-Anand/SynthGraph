"""Bundles cleanup for every integration attached to one training run.

``ResourceMonitor.stop()`` and the skrl writer's ``close()`` each flush state
that is otherwise silently lost - confirmed directly, not assumed: a training
script that starts a resource monitor and simply ends (no explicit
``stop()``) logs every periodic sample it took, but never the one that would
have captured the run's actual final state, and produces no warning of any
kind that anything is missing. A researcher combining two or three
integrations on one training run has to remember every one of their
close/stop calls, in a script whose normal control flow gives them no
reminder to.

``IntegrationSession`` moves that responsibility from the researcher to the
integration itself: ``ResourceMonitor`` and ``create_writer()`` each register
their own cleanup here at attach time (see the ``getattr(training,
"_integration_session", None)`` guard in ``environment.ResourceMonitor`` and
``integrations.skrl.create_writer()``), and ``TrainingHandle.close()`` - or
leaving a ``with experiment.training(...) as training:`` block - runs every
registered cleanup together, once. Nothing here reaches into a third-party
framework or intercepts anything; it only coordinates SynthGraph's own
integration objects.
"""

from __future__ import annotations

import warnings
from typing import Callable

__all__ = ["IntegrationSession"]


class IntegrationSession:
    """Tracks and closes every integration attached to one training run."""

    def __init__(self) -> None:
        self._closers: list[tuple[str, Callable[[], None]]] = []
        self._closed = False

    def register(self, closer: Callable[[], None], *, name: str) -> None:
        """Register a zero-argument cleanup callable to run on ``close()``.

        Registering after ``close()`` has already run does not invoke
        *closer* retroactively - close it yourself in that case.
        """
        self._closers.append((name, closer))

    def close(self) -> None:
        """Run every registered closer, once, in registration order.

        Idempotent - a second call is a no-op. A closer that raises is
        caught and turned into a warning rather than allowed to stop the
        rest from running: the whole point of bundling cleanup here is that
        one integration's failure must not cause another's data to be lost
        too.
        """
        if self._closed:
            return
        self._closed = True

        for name, closer in self._closers:
            try:
                closer()
            except Exception as error:  # noqa: BLE001 - isolate each closer from the others
                warnings.warn(
                    f"SynthGraph integration '{name}' failed to close cleanly: {error}",
                    stacklevel=2,
                )
