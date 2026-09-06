import pytest
from pydantic import ValidationError

from synthgraph.config import SynthGraphConfig


def test_config_defaults() -> None:
    config = SynthGraphConfig()

    assert config.api_url == "https://synthgraph.onrender.com"
    assert config.api_key is None
    assert config.timeout == 30.0


def test_config_accepts_custom_values() -> None:
    config = SynthGraphConfig(
        api_url="https://api.synthgraph.dev/",
        api_key="test-api-key",
        timeout=60.0,
    )

    assert config.api_url == "https://api.synthgraph.dev"
    assert config.api_key == "test-api-key"
    assert config.timeout == 60.0


def test_config_removes_trailing_slash() -> None:
    config = SynthGraphConfig(
        api_url="https://api.synthgraph.dev///",
    )

    assert config.api_url == "https://api.synthgraph.dev"


def test_config_rejects_empty_api_url() -> None:
    with pytest.raises(ValidationError):
        SynthGraphConfig(api_url="")


def test_config_rejects_zero_timeout() -> None:
    with pytest.raises(ValidationError):
        SynthGraphConfig(timeout=0)


def test_config_rejects_negative_timeout() -> None:
    with pytest.raises(ValidationError):
        SynthGraphConfig(timeout=-1)


def test_config_is_immutable() -> None:
    config = SynthGraphConfig()

    with pytest.raises(ValidationError):
        config.timeout = 60.0