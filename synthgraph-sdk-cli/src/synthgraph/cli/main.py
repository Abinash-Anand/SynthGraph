"""``synthgraph`` entry point (spec 44, 53, 55).

Error handling lives here rather than in each command: commands let SDK
exceptions propagate, and this module turns them into one short message and one
meaningful exit code.
"""

from __future__ import annotations

import sys

import typer

from .. import __version__
from .commands import (
    assets,
    auth,
    compare,
    datasets,
    docs,
    evaluations,
    experiments,
    generations,
    manifest,
    projects,
    training_runs,
)
from .context import CLIContext
from .errors import ExitCode, describe_error

app = typer.Typer(
    name="synthgraph",
    no_args_is_help=True,
    add_completion=True,
    context_settings={"help_option_names": ["-h", "--help"]},
    help=(
        "Query, inspect and export SynthGraph provenance.\n\n"
        "Provenance is captured with the Python SDK while your research runs. "
        "This CLI is how you inspect and export it afterwards.\n\n"
        "Credentials come from the environment:\n\n"
        "\b\n"
        "  export SYNTHGRAPH_API_KEY=...\n"
        "  export SYNTHGRAPH_API_URL=https://your-synthgraph-backend\n\n"
        "There is deliberately no --api-key option: it would put your key into "
        "shell history and process listings."
    ),
)

app.add_typer(auth.app, name="auth")
app.add_typer(projects.app, name="projects")
app.add_typer(experiments.app, name="experiments")
app.add_typer(generations.app, name="generations")
app.add_typer(training_runs.app, name="training-runs")
app.add_typer(evaluations.app, name="evaluations")
app.add_typer(assets.app, name="assets")
app.add_typer(datasets.app, name="datasets")

app.command("compare")(compare.compare)
app.command("manifest")(manifest.manifest)
app.command("docs")(docs.docs)


def _version_callback(value: bool) -> None:
    if value:
        typer.echo(f"synthgraph {__version__}")
        raise typer.Exit()


@app.callback()
def main_callback(
    ctx: typer.Context,
    json_output: bool = typer.Option(
        False,
        "--json",
        help="Print machine-readable JSON from every command.",
    ),
    api_url: str | None = typer.Option(
        None,
        "--api-url",
        help="SynthGraph backend URL. Defaults to $SYNTHGRAPH_API_URL.",
        envvar=None,
    ),
    timeout: float | None = typer.Option(
        None,
        "--timeout",
        help="Request timeout in seconds.",
    ),
    version: bool = typer.Option(
        False,
        "--version",
        callback=_version_callback,
        is_eager=True,
        help="Show the installed version and exit.",
    ),
) -> None:
    """Set up shared state for whichever command runs next."""
    ctx.obj = CLIContext(json_mode=json_output, api_url=api_url, timeout=timeout)
    ctx.call_on_close(ctx.obj.close)


def run(argv: list[str] | None = None) -> int:
    """Run the CLI and return an exit code instead of exiting.

    Kept separate from :func:`main` so tests can assert on exit codes.
    """
    try:
        app(args=argv, standalone_mode=False)
    except SystemExit as exc:  # pragma: no cover - defensive
        return int(exc.code) if isinstance(exc.code, int) else int(ExitCode.FAILURE)
    except KeyboardInterrupt:
        print("Interrupted.", file=sys.stderr)
        return int(ExitCode.FAILURE)
    except BaseException as exc:  # noqa: BLE001 - the CLI is the last line of defence
        return _handle(exc)
    return int(ExitCode.SUCCESS)


def _handle(error: BaseException) -> int:
    """Render an exception and choose an exit code.

    Framework control-flow exceptions are recognized by shape rather than by
    class: Typer vendors its own copies of Click's exception hierarchy in newer
    releases, so ``isinstance`` against ``click`` is not portable across the
    versions this package supports.
    """
    if isinstance(error, typer.Abort):
        print("Aborted.", file=sys.stderr)
        return int(ExitCode.FAILURE)

    exit_code = getattr(error, "exit_code", None)
    if isinstance(exit_code, int):
        show = getattr(error, "show", None)
        if callable(show):
            show()
        return exit_code

    message, code = describe_error(error)
    print(f"Error: {message}", file=sys.stderr)
    return int(code)


def main() -> None:
    """Console-script entry point."""
    raise SystemExit(run())


if __name__ == "__main__":  # pragma: no cover
    main()
