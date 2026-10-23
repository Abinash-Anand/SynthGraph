"""Opt-in content hashing for data that lives on the local machine.

The SDK never reads the data behind a URI unless asked to (spec 6, 38): a
hundred-gigabyte render stays where the researcher put it, and recording it
costs one small request. Hashing is the one thing that *does* read it, so it
is only ever done when the caller passes ``compute_checksum=True``.

Why bother: without a checksum a dataset version is a *claim* - "this is what
was at ``/data/rain_v1`` at the time". With one, anyone can later hash the same
location and see whether it is still the same bytes, which is the difference
between provenance that was written down and provenance that can be checked.

Two algorithms, labelled differently so they can never be confused:

* a single file -> ``sha256:<hex>``, identical to what ``sha256sum`` prints, so
  it can be checked with standard tools;
* a directory -> ``sha256-tree:<hex>``, a hash over every file's relative path
  and content hash in sorted order. It is deterministic and independent of
  the order the filesystem lists files in, but it is this SDK's own scheme -
  no standard tool produces it.

Only local paths can be hashed. A remote URI (``s3://``, ``gs://``, ``http://``)
would need the SDK to download the data, which it will not do, so asking for a
checksum of one is an error rather than a silent skip.
"""

from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import url2pathname

from .errors import SynthGraphValidationError

__all__ = ["ContentDigest", "compute_local_digest", "local_path_from_uri"]

_CHUNK_BYTES = 1024 * 1024
# "C:\data" and "C:/data" parse as scheme "c", so a drive letter is checked first.
_WINDOWS_DRIVE = re.compile(r"^[A-Za-z]:[\\/]")


@dataclass(frozen=True)
class ContentDigest:
    """What hashing a local location produced."""

    #: ``sha256:<hex>`` for a file, ``sha256-tree:<hex>`` for a directory.
    checksum: str
    #: Total size in bytes of every file hashed.
    size: int
    #: How many files were hashed (1 for a single file).
    files: int


def local_path_from_uri(uri: str) -> Path | None:
    """Return the local path a URI refers to, or ``None`` if it is remote."""
    if _WINDOWS_DRIVE.match(uri):
        return Path(uri)

    if "://" not in uri:
        return Path(uri).expanduser()

    parsed = urlparse(uri)
    if parsed.scheme.lower() == "file":
        return Path(url2pathname(parsed.path))
    return None


def _hash_file(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    size = 0
    try:
        with path.open("rb") as handle:
            while chunk := handle.read(_CHUNK_BYTES):
                digest.update(chunk)
                size += len(chunk)
    except OSError as error:
        raise SynthGraphValidationError(
            f"could not read {path} to compute its checksum: {error.strerror or error}",
            field="uri",
        ) from error
    return digest.hexdigest(), size


def compute_local_digest(uri: str) -> ContentDigest:
    """Hash the file or directory a local URI points at.

    Raises :class:`SynthGraphValidationError` if the URI is remote, the path
    does not exist, or something under it cannot be read.
    """
    path = local_path_from_uri(uri)
    if path is None:
        raise SynthGraphValidationError(
            f"cannot compute a checksum for {uri!r}: it is not a local path, and the SDK "
            "never downloads data. Hash it where it lives and pass checksum=... yourself.",
            field="uri",
        )

    if path.is_file():
        hex_digest, size = _hash_file(path)
        return ContentDigest(checksum=f"sha256:{hex_digest}", size=size, files=1)

    if not path.is_dir():
        raise SynthGraphValidationError(
            f"cannot compute a checksum for {uri!r}: no file or directory exists at {path}",
            field="uri",
        )

    outer = hashlib.sha256()
    total = 0
    count = 0
    for root, directories, names in os.walk(path, followlinks=False):
        # Sorting both levels is what makes the result independent of the
        # order the filesystem happens to list entries in.
        directories.sort()
        for name in sorted(names):
            file_path = Path(root) / name
            relative = file_path.relative_to(path).as_posix()
            hex_digest, size = _hash_file(file_path)
            outer.update(f"{relative}\0{hex_digest}\n".encode())
            total += size
            count += 1

    return ContentDigest(checksum=f"sha256-tree:{outer.hexdigest()}", size=total, files=count)
