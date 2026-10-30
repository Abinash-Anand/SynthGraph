from __future__ import annotations

from typing import Literal, get_args

from pydantic import Field

from .base import SynthGraphModel

#: What a researcher can say about a metric: a bigger value is better
#: (``"maximize"``), a smaller one is (``"minimize"``), or there is no better
#: direction (``"neutral"``). A metric with no declaration has no direction at
#: all; the SDK never guesses one from its name.
Direction = Literal["maximize", "minimize", "neutral"]

DIRECTIONS: tuple[str, ...] = get_args(Direction)


class ExperimentMetricDirections(SynthGraphModel):
    """The directions declared for an experiment's metrics.

    A metric that is not listed has no declared direction (it is unknown).
    """

    experiment_id: str
    directions: dict[str, Direction] = Field(default_factory=dict)
