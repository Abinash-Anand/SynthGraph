from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class Project(BaseModel):
    """A top-level SynthGraph research project."""

    model_config = ConfigDict(frozen=True)

    id: str
    name: str = Field(min_length=1)
    description: str | None = None
    created_at: datetime
    updated_at: datetime