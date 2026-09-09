from __future__ import annotations

import pytest
from pydantic import ValidationError as PydanticValidationError

from synthgraph import RetryPolicy, SynthGraphConfig
from synthgraph.config import DEFAULT_API_URL, DEFAULT_TIMEOUT
from synthgraph.errors import SynthGraphConfigurationError


def test_defaults():
    config = SynthGraphConfig()
    assert config.api_url == DEFAULT_API_URL
    assert config.timeout == DEFAULT_TIMEOUT
    assert config.api_key is None
    assert config.project_id is None


def test_api_url_trailing_slashes_removed():
    assert SynthGraphConfig(api_url="http://localhost:3000///").api_url == "http://localhost:3000"


def test_api_url_requires_scheme():
    with pytest.raises(PydanticValidationError):
        SynthGraphConfig(api_url="localhost:3000")


def test_blank_api_key_rejected():
    with pytest.raises(PydanticValidationError):
        SynthGraphConfig(api_key="   ")


def test_config_is_frozen():
    config = SynthGraphConfig(api_key="k")
    with pytest.raises(PydanticValidationError):
        config.api_key = "other"


def test_explicit_arguments_beat_environment():
    config = SynthGraphConfig.from_env(
        api_key="explicit",
        api_url="http://explicit.test",
        env={"SYNTHGRAPH_API_KEY": "from-env", "SYNTHGRAPH_API_URL": "http://env.test"},
    )
    assert config.api_key == "explicit"
    assert config.api_url == "http://explicit.test"


def test_environment_beats_defaults():
    config = SynthGraphConfig.from_env(
        env={
            "SYNTHGRAPH_API_KEY": "from-env",
            "SYNTHGRAPH_API_URL": "http://env.test",
            "SYNTHGRAPH_TIMEOUT": "12.5",
            "SYNTHGRAPH_PROJECT_ID": "p9",
            "SYNTHGRAPH_MAX_ATTEMPTS": "5",
        }
    )
    assert config.api_key == "from-env"
    assert config.api_url == "http://env.test"
    assert config.timeout == 12.5
    assert config.project_id == "p9"
    assert config.retry.max_attempts == 5


def test_base_url_environment_alias_supported():
    config = SynthGraphConfig.from_env(env={"SYNTHGRAPH_BASE_URL": "http://alias.test"})
    assert config.api_url == "http://alias.test"


def test_defaults_when_environment_is_empty():
    config = SynthGraphConfig.from_env(env={})
    assert config.api_url == DEFAULT_API_URL
    assert config.api_key is None


@pytest.mark.parametrize(
    "env",
    [
        {"SYNTHGRAPH_TIMEOUT": "soon"},
        {"SYNTHGRAPH_MAX_ATTEMPTS": "many"},
    ],
)
def test_unparseable_environment_values_are_reported(env):
    with pytest.raises(SynthGraphConfigurationError):
        SynthGraphConfig.from_env(env=env)


def test_require_api_key_explains_how_to_set_one():
    with pytest.raises(SynthGraphConfigurationError) as excinfo:
        SynthGraphConfig().require_api_key()
    assert "SYNTHGRAPH_API_KEY" in str(excinfo.value)


def test_retry_backoff_is_exponential_and_capped():
    policy = RetryPolicy(backoff_factor=1.0, max_backoff=4.0)
    assert policy.backoff_seconds(1) == 1.0
    assert policy.backoff_seconds(2) == 2.0
    assert policy.backoff_seconds(3) == 4.0
    assert policy.backoff_seconds(9) == 4.0


def test_masked_api_key_shows_only_a_suffix():
    assert SynthGraphConfig(api_key="sg-abcdef123456").masked_api_key == "****3456"
    assert SynthGraphConfig(api_key="abc").masked_api_key == "****"
    assert SynthGraphConfig().masked_api_key == "<not set>"
