"""The SynthGraph command-line interface.

The CLI is a query, inspection and export surface. It is a thin adapter over
the SDK: it opens no HTTP connections of its own, builds no URLs, defines no
models, and duplicates no backend logic (spec 43).

Writing provenance is the SDK's job (spec 58), and reproducing an experiment is
the researcher's (spec 59).
"""

from __future__ import annotations

# ``main`` is deliberately not re-exported here: it would shadow the
# ``synthgraph.cli.main`` submodule of the same name.
from .main import app, run

__all__ = ["app", "run"]
