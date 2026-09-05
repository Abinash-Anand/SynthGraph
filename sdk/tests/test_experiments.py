import httpx

from synthgraph.client import SynthGraphClient


def test_create_experiment() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert str(request.url) == (
            "https://api.example.com/projects/project_123/experiments"
        )
        assert request.content == (
            b'{"name":"Rainy Scene Experiment",'
            b'"description":"Testing rainy scenes"}'
        )

        return httpx.Response(
            201,
            json={
                "id": "experiment_123",
                "project_id": "project_123",
                "name": "Rainy Scene Experiment",
                "description": "Testing rainy scenes",
                "created_at": "2026-09-05T12:00:00Z",
                "updated_at": "2026-09-05T12:00:00Z",
            },
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphClient(
        api_url="https://api.example.com",
        transport=transport,
    ) as client:
        experiment = client.experiments.create(
            project_id="project_123",
            name="Rainy Scene Experiment",
            description="Testing rainy scenes",
        )

    assert experiment.id == "experiment_123"
    assert experiment.project_id == "project_123"
    assert experiment.name == "Rainy Scene Experiment"


def test_create_experiment_without_description() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.content == b'{"name":"Rainy Scene Experiment"}'

        return httpx.Response(
            201,
            json={
                "id": "experiment_123",
                "project_id": "project_123",
                "name": "Rainy Scene Experiment",
                "created_at": "2026-09-05T12:00:00Z",
            },
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphClient(
        api_url="https://api.example.com",
        transport=transport,
    ) as client:
        experiment = client.experiments.create(
            project_id="project_123",
            name="Rainy Scene Experiment",
        )

    assert experiment.id == "experiment_123"


def test_get_experiment() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert str(request.url) == (
            "https://api.example.com/experiments/experiment_123"
        )

        return httpx.Response(
            200,
            json={
                "id": "experiment_123",
                "project_id": "project_123",
                "name": "Rainy Scene Experiment",
                "created_at": "2026-09-05T12:00:00Z",
            },
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphClient(
        api_url="https://api.example.com",
        transport=transport,
    ) as client:
        experiment = client.experiments.get("experiment_123")

    assert experiment.id == "experiment_123"
    assert experiment.project_id == "project_123"


def test_list_experiments() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert str(request.url) == (
            "https://api.example.com/projects/project_123/experiments"
        )

        return httpx.Response(
            200,
            json=[
                {
                    "id": "experiment_123",
                    "project_id": "project_123",
                    "name": "Experiment One",
                    "created_at": "2026-09-05T12:00:00Z",
                },
                {
                    "id": "experiment_456",
                    "project_id": "project_123",
                    "name": "Experiment Two",
                    "created_at": "2026-09-05T12:00:00Z",
                },
            ],
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphClient(
        api_url="https://api.example.com",
        transport=transport,
    ) as client:
        experiments = client.experiments.list(
            project_id="project_123",
        )

    assert len(experiments) == 2
    assert experiments[0].id == "experiment_123"
    assert experiments[1].id == "experiment_456"