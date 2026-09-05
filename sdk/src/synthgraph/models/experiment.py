from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class Experiment(BaseModel):
    """A research experiment belonging to a SynthGraph project."""

    model_config = ConfigDict(frozen=True)

    id: str
    project_id: str
    name: str = Field(min_length=1)
    description: str | None = None
    created_at: datetime
    updated_at: datetime | None = None