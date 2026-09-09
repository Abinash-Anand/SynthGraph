"""Integration fixtures - real backend, real network.

Skipped unless SYNTHGRAPH_INTEGRATION_TESTS=1 and an API key is present::

    export SYNTHGRAPH_INTEGRATION_TESTS=1
    export SYNTHGRAPH_API_KEY="..."
    export SYNTHGRAPH_API_URL="http://localhost:3000"
    pytest -m integration
"""

from __future__ import annotations

import os
import uuid
from collections.abc import Iterator

import pytest

from synthgraph import SynthGraph, SynthGraphClient

ENABLED = os.environ.get("SYNTHGRAPH_INTEGRATION_TESTS") == "1"

pytestmark = pytest.mark.integration


def requires_backend() -> None:
    if not ENABLED:
        pytest.skip("set SYNTHGRAPH_INTEGRATION_TESTS=1 to run integration tests")
    if not os.environ.get("SYNTHGRAPH_API_KEY"):
        pytest.skip("SYNTHGRAPH_API_KEY is not set")


@pytest.fixture(scope="session")
def live_client() -> Iterator[SynthGraphClient]:
    requires_backend()
    with SynthGraph() as client:
        yield client


@pytest.fixture(scope="session")
def live_project(live_client: SynthGraphClient):
    return live_client.projects.create(
        name=f"sdk-integration-{uuid.uuid4().hex[:8]}",
        description="Created by the SynthGraph SDK integration suite.",
    )
