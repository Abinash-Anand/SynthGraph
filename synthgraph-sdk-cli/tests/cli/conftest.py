"""CLI fixtures.

The CLI is exercised through its real entry point. ``CLIContext.client`` is
pointed at a genuine ``SynthGraphClient`` whose transport is a mock, so every
invocation travels the real path:

    CLI command -> SDK resource -> HTTP layer -> transport

Nothing about the CLI's own code is stubbed.
"""

from __future__ import annotations

import io
from collections.abc import Callable, Iterator
from contextlib import redirect_stderr, redirect_stdout
from dataclasses import dataclass

import pytest

from synthgraph import SynthGraphClient
from synthgraph.cli.context import CLIContext
from synthgraph.cli.main import run as run_command

from ..conftest import API_KEY, API_URL, MockBackend


@dataclass
class CLIResult:
    exit_code: int
    stdout: str
    stderr: str

    @property
    def output(self) -> str:
        return self.stdout + self.stderr


@pytest.fixture(autouse=True)
def isolated_cli_state(tmp_path, monkeypatch) -> None:
    """Never let a test read or write the real ~/.synthgraph/cli-state.json.

    Without this, a test that exercises the interactive resolvers would
    silently pollute (or depend on) whatever remembered state happens to
    exist on the machine running the suite.
    """
    monkeypatch.setenv("SYNTHGRAPH_CLI_STATE_PATH", str(tmp_path / "cli-state.json"))


@pytest.fixture
def run_cli(backend: MockBackend, monkeypatch) -> Iterator[Callable[..., CLIResult]]:
    """Run the CLI end to end against the mock backend."""
    created: list[SynthGraphClient] = []

    def client(self: CLIContext) -> SynthGraphClient:
        if not created:
            created.append(
                SynthGraphClient(
                    api_key=API_KEY,
                    api_url=self.api_url or API_URL,
                    timeout=self.timeout,
                    transport=backend.transport,
                )
            )
        return created[0]

    monkeypatch.setattr(CLIContext, "client", client)

    def invoke(*args: str) -> CLIResult:
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = run_command(list(args))
        return CLIResult(exit_code=code, stdout=out.getvalue(), stderr=err.getvalue())

    yield invoke

    for sdk in created:
        sdk.close()
