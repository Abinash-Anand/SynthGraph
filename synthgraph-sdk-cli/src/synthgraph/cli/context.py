"""Shared CLI state: global options and the one SDK client (spec 43, 56)."""

from __future__ import annotations

from dataclasses import dataclass, field

from ..client import SynthGraphClient
from ..config import SynthGraphConfig
from .output import Output

__all__ = ["CLIContext"]


@dataclass
class CLIContext:
    """Global options plus a lazily created SDK client.

    The client is created on first use so ``--help`` and ``--version`` work
    without credentials.
    """

    json_mode: bool = False
    api_url: str | None = None
    timeout: float | None = None
    _client: SynthGraphClient | None = field(default=None, repr=False, init=False)

    def output(self, json_override: bool = False) -> Output:
        """The renderer for this invocation."""
        return Output(json_mode=self.json_mode or json_override)

    def client(self) -> SynthGraphClient:
        """The SDK client, configured from CLI options and the environment.

        Credentials come from the environment only. There is deliberately no
        ``--api-key`` option: it would land the key in shell history, in ``ps``
        output and in CI logs (spec 57).
        """
        if self._client is None:
            config = SynthGraphConfig.from_env(
                api_url=self.api_url,
                timeout=self.timeout,
            )
            config.require_api_key()
            self._client = SynthGraphClient(config=config)
        return self._client

    def close(self) -> None:
        """Release the HTTP client, if one was ever created."""
        if self._client is not None:
            self._client.close()
            self._client = None
