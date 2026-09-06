from pydantic import BaseModel, ConfigDict, Field, field_validator


class SynthGraphConfig(BaseModel):
    """Configuration for communicating with the SynthGraph backend."""

    model_config = ConfigDict(frozen=True)

    api_url: str = Field(
        default="https://synthgraph.onrender.com",
        min_length=1,
    )
    api_key: str | None = None
    timeout: float = Field(
        default=30.0,
        gt=0,
    )

    @field_validator("api_url")
    @classmethod
    def normalize_api_url(cls, value: str) -> str:
        """Remove trailing slashes from the API URL."""
        return value.rstrip("/")
