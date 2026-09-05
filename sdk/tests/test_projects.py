import httpx

from synthgraph import SynthGraphClient


def test_create_project() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert str(request.url) == "https://api.example.com/projects"

        assert request.content == (
            b'{"name":"Synthetic Driving Dataset",'
            b'"description":"Rainy driving scenes"}'
        )

        return httpx.Response(
            201,
            json={
                "id": "project_123",
                "name": "Synthetic Driving Dataset",
                "description": "Rainy driving scenes",
                "created_at": "2026-09-05T12:00:00Z",
            },
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphClient(
        api_url="https://api.example.com",
        transport=transport,
    ) as client:
        project = client.projects.create(
            name="Synthetic Driving Dataset",
            description="Rainy driving scenes",
        )

    assert project.id == "project_123"
    assert project.name == "Synthetic Driving Dataset"
    assert project.description == "Rainy driving scenes"


def test_create_project_without_description() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.content == (
            b'{"name":"Synthetic Driving Dataset"}'
        )

        return httpx.Response(
            201,
            json={
                "id": "project_123",
                "name": "Synthetic Driving Dataset",
                "created_at": "2026-09-05T12:00:00Z",
            },
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphClient(
        api_url="https://api.example.com",
        transport=transport,
    ) as client:
        project = client.projects.create(
            name="Synthetic Driving Dataset",
        )

    assert project.id == "project_123"
    assert project.name == "Synthetic Driving Dataset"


def test_get_project() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert str(request.url) == (
            "https://api.example.com/projects/project_123"
        )

        return httpx.Response(
            200,
            json={
                "id": "project_123",
                "name": "Synthetic Driving Dataset",
                "description": "Rainy driving scenes",
                "created_at": "2026-09-05T12:00:00Z",
            },
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphClient(
        api_url="https://api.example.com",
        transport=transport,
    ) as client:
        project = client.projects.get("project_123")

    assert project.id == "project_123"
    assert project.name == "Synthetic Driving Dataset"
    assert project.description == "Rainy driving scenes"