from __future__ import annotations

import httpx

MARKDOWN = "# Generation g1\n\nGenerated with Blender 4.2 in rain conditions.\n"


def test_documentation_returns_markdown(client, backend):
    backend.route(
        "GET",
        "/generations/g1/documentation",
        httpx.Response(200, text=MARKDOWN, headers={"content-type": "text/markdown"}),
    )

    assert client.documentation.get("g1") == MARKDOWN
    assert backend.last().path == "/generations/g1/documentation"


def test_documentation_accepts_a_json_wrapped_document(client, backend):
    backend.route(
        "GET",
        "/generations/g1/documentation",
        httpx.Response(200, json={"documentation": MARKDOWN}),
    )
    assert client.documentation.get("g1") == MARKDOWN


def test_documentation_requests_markdown(client, backend):
    backend.route("GET", "/generations/g1/documentation", httpx.Response(200, text=MARKDOWN))
    client.documentation.get("g1")
    assert "text/markdown" in backend.last().headers["accept"]
