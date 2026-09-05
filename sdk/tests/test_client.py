import httpx
import pytest

from synthgraph import (
    SynthGraphClient,
    SynthGraphConfig,
)


def test_client_creates_default_config() -> None:
    client = SynthGraphClient()

    try:
        assert isinstance(client.config, SynthGraphConfig)
    finally:
        client.close()


def test_client_accepts_api_key() -> None:
    client = SynthGraphClient(
        api_key="test-key",
    )

    try:
        assert client.config.api_key == "test-key"
    finally:
        client.close()


def test_client_accepts_custom_api_url() -> None:
    client = SynthGraphClient(
        api_url="https://example.com",
    )

    try:
        assert str(client.config.api_url) == "https://example.com"
    finally:
        client.close()


def test_client_accepts_config_object() -> None:
    config = SynthGraphConfig(
        api_key="test-key",
        api_url="https://example.com",
    )

    client = SynthGraphClient(config=config)

    try:
        assert client.config is config
    finally:
        client.close()


def test_client_rejects_mixed_config_arguments() -> None:
    config = SynthGraphConfig()

    with pytest.raises(ValueError, match="config cannot be combined"):
        SynthGraphClient(
            config=config,
            api_key="test-key",
        )


def test_client_exposes_projects_api() -> None:
    client = SynthGraphClient()

    try:
        assert client.projects is not None
    finally:
        client.close()


def test_client_context_manager() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "id": "project_123",
                "name": "Test Project",
                "created_at": "2026-09-05T12:00:00Z",
            },
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphClient(
        transport=transport,
    ) as client:
        assert client.projects.get("project_123").id == "project_123"