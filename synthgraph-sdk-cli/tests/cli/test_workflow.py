"""The CLI half of the acceptance test: query and export what the SDK captured.

Runs the whole documented CLI surface in one pass, through the real
CLI -> SDK -> HTTP path (spec 71).
"""

from __future__ import annotations

import json

import httpx

from synthgraph.cli.errors import ExitCode

from ..conftest import experiment_payload, generation_payload, project_payload


def test_cli_query_and_export_workflow(run_cli, backend, tmp_path):
    backend.route("GET", "/auth/me", httpx.Response(200, json={"id": "u1", "email": "r@lab.edu"}))
    backend.route("GET", "/projects", httpx.Response(200, json=[project_payload()]))
    backend.route("GET", "/projects/p1", httpx.Response(200, json=project_payload()))
    backend.route(
        "GET", "/projects/p1/experiments", httpx.Response(200, json=[experiment_payload()])
    )
    backend.route("GET", "/experiments/e1", httpx.Response(200, json=experiment_payload()))
    backend.route(
        "GET",
        "/experiments/e1/generations",
        httpx.Response(200, json=[generation_payload(status="completed")]),
    )
    backend.route(
        "GET", "/generations/g1", httpx.Response(200, json=generation_payload(status="completed"))
    )
    backend.route(
        "POST",
        "/generations/compare",
        httpx.Response(
            200,
            json={
                "generation_ids": ["g1", "g2"],
                "differences": {"parameters": {"weather": {"g1": "rain", "g2": "snow"}}},
            },
        ),
    )
    backend.route(
        "GET",
        "/generations/g1/reproduction-manifest",
        httpx.Response(
            200,
            json={"generation_id": "g1", "parameters": {"weather": "rain"}, "missing": []},
        ),
    )
    backend.route(
        "GET",
        "/generations/g1/documentation",
        httpx.Response(
            200,
            text="# vehicle_detection_rain\n",
            headers={"content-type": "text/markdown"},
        ),
    )

    manifest_path = tmp_path / "reproduction.json"
    docs_path = tmp_path / "experiment.md"

    invocations = [
        ("auth", "whoami"),
        ("projects", "list"),
        ("projects", "get", "p1"),
        ("experiments", "list", "--project", "p1"),
        ("experiments", "search", "--project", "p1", "rain"),
        ("experiments", "get", "e1"),
        ("generations", "list", "--experiment", "e1"),
        ("generations", "list", "--experiment", "e1", "--parameters", '{"weather":"rain"}'),
        ("generations", "get", "g1"),
        ("compare", "g1", "g2"),
        ("manifest", "g1", "--output", str(manifest_path)),
        ("docs", "g1", "--output", str(docs_path)),
    ]

    for invocation in invocations:
        result = run_cli(*invocation)
        assert result.exit_code == ExitCode.SUCCESS, (invocation, result.stderr)

    assert json.loads(manifest_path.read_text())["generation_id"] == "g1"
    assert docs_path.read_text() == "# vehicle_detection_rain\n"

    # every command really went out over HTTP with authentication attached
    assert len(backend.requests) == len(invocations)
    for request in backend.requests:
        assert request.headers["authorization"].startswith("Bearer ")


def test_every_command_supports_json(run_cli, backend, tmp_path):
    backend.route("GET", "/auth/me", httpx.Response(200, json={"id": "u1"}))
    backend.route("GET", "/projects", httpx.Response(200, json=[project_payload()]))
    backend.route("GET", "/projects/p1", httpx.Response(200, json=project_payload()))
    backend.route(
        "GET", "/projects/p1/experiments", httpx.Response(200, json=[experiment_payload()])
    )
    backend.route("GET", "/experiments/e1", httpx.Response(200, json=experiment_payload()))
    backend.route(
        "GET", "/experiments/e1/generations", httpx.Response(200, json=[generation_payload()])
    )
    backend.route("GET", "/generations/g1", httpx.Response(200, json=generation_payload()))
    backend.route(
        "POST", "/generations/compare", httpx.Response(200, json={"generation_ids": ["g1", "g2"]})
    )
    backend.route(
        "GET",
        "/generations/g1/reproduction-manifest",
        httpx.Response(200, json={"generation_id": "g1"}),
    )
    backend.route(
        "GET",
        "/generations/g1/documentation",
        httpx.Response(200, text="# doc\n", headers={"content-type": "text/markdown"}),
    )

    for invocation in [
        ("auth", "whoami"),
        ("projects", "list"),
        ("projects", "get", "p1"),
        ("experiments", "list", "--project", "p1"),
        ("experiments", "search", "--project", "p1", "rain"),
        ("experiments", "get", "e1"),
        ("generations", "list", "--experiment", "e1"),
        ("generations", "get", "g1"),
        ("compare", "g1", "g2"),
        ("manifest", "g1"),
        ("docs", "g1"),
    ]:
        result = run_cli("--json", *invocation)
        assert result.exit_code == ExitCode.SUCCESS, (invocation, result.stderr)
        json.loads(result.stdout)  # must parse, with no decorative text
