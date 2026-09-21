"""Optional, zero-cost-when-unused framework integrations.

Nothing under ``synthgraph.integrations`` is imported by the core package
(``synthgraph/__init__.py`` does not touch this subpackage), and nothing here
imports a third-party framework at module load time. Each integration is a
plain function the caller imports and calls explicitly, at the point in their
own script where they already have the framework object in hand - the same
"nothing runs automatically" contract as ``environment.git_metadata()`` and
``environment.environment_metadata()``, just extended to framework-specific
config objects instead of the local Git checkout and interpreter.
"""

from __future__ import annotations

__all__: list[str] = []
