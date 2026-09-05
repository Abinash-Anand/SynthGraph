import json
from typing import Any

from pydantic import BaseModel


def model_to_dict(model: BaseModel) -> dict[str, Any]:
    """Convert a SynthGraph model into JSON-compatible Python data."""
    return model.model_dump(mode="json")


def model_to_json(model: BaseModel) -> str:
    """Convert a SynthGraph model into a JSON string."""
    return json.dumps(model_to_dict(model))