"""Authentication identity (spec 45).

``whoami`` answers "which account is this API key attached to?". The key itself
is never returned, logged or displayed.
"""

from __future__ import annotations

from .http import SynthGraphHTTPClient
from .models import User
from .routes import Routes


class AuthAPI:
    """API operations for the authenticated identity."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def me(self) -> User:
        """Retrieve the account behind the configured API key."""
        data = self._http.get(Routes.auth_me(), operation="auth.me")
        return User.model_validate(data)

    #: Readable alias used by the CLI.
    whoami = me
