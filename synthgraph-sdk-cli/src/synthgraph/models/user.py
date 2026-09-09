from __future__ import annotations

from datetime import datetime

from .base import SynthGraphModel


class User(SynthGraphModel):
    """The account behind the configured API key (``GET /auth/me``).

    Never carries the API key itself.
    """

    id: str
    email: str | None = None
    name: str | None = None
    created_at: datetime | None = None
