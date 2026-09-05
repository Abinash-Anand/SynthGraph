from types import TracebackType
from typing import Any, Self

from .config import SynthGraphConfig
from .experiments import ExperimentsAPI
from .generations import GenerationsAPI
from .http import SynthGraphHTTPClient
from .projects import ProjectsAPI


class SynthGraphClient:
    """Public client for interacting with the SynthGraph API."""

    def __init__(
        self,
        api_key: str | None = None,
        *,
        api_url: str | None = None,
        timeout: float | None = None,
        config: SynthGraphConfig | None = None,
        transport: Any | None = None,
    ) -> None:
        if config is not None:
            if any(
                value is not None
                for value in (api_key, api_url, timeout)
            ):
                raise ValueError(
                    "config cannot be combined with api_key, api_url, "
                    "or timeout"
                )
            self.config = config
        else:
            config_kwargs: dict[str, Any] = {}

            if api_key is not None:
                config_kwargs["api_key"] = api_key

            if api_url is not None:
                config_kwargs["api_url"] = api_url

            if timeout is not None:
                config_kwargs["timeout"] = timeout

            self.config = SynthGraphConfig(**config_kwargs)

        self._http = SynthGraphHTTPClient(
            self.config,
            transport=transport,
        )

        self.projects = ProjectsAPI(self._http)
        self.experiments = ExperimentsAPI(self._http)
        self.generations = GenerationsAPI(self._http)

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._http.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.close()