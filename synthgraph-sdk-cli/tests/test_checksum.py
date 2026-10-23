"""Opt-in content hashing: correctness, determinism and failing before any network call."""

from __future__ import annotations

import hashlib
from pathlib import Path

import httpx
import pytest

from synthgraph.checksum import compute_local_digest, local_path_from_uri
from synthgraph.errors import SynthGraphValidationError

from .test_datasets import DATASET, DATASET_VERSION


def _route(backend) -> None:
    backend.route("POST", "/datasets", httpx.Response(201, json=DATASET))
    backend.route("POST", "/datasets/d1/versions", httpx.Response(201, json=DATASET_VERSION))
    backend.route("POST", "/generations/g1/datasets", httpx.Response(201, json={}))


# -- the hashing itself -------------------------------------------------------


def test_a_file_hashes_to_what_sha256sum_would_print(tmp_path: Path):
    target = tmp_path / "frames.bin"
    target.write_bytes(b"rendered frames")

    digest = compute_local_digest(str(target))

    assert digest.checksum == "sha256:" + hashlib.sha256(b"rendered frames").hexdigest()
    assert digest.size == len(b"rendered frames")
    assert digest.files == 1


def test_a_file_larger_than_one_chunk_is_hashed_completely(tmp_path: Path):
    payload = b"x" * (2 * 1024 * 1024 + 17)
    target = tmp_path / "big.bin"
    target.write_bytes(payload)

    expected = "sha256:" + hashlib.sha256(payload).hexdigest()
    assert compute_local_digest(str(target)).checksum == expected


def _make_tree(root: Path, files: dict[str, bytes]) -> None:
    for relative, content in files.items():
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)


def test_a_directory_hash_does_not_depend_on_creation_order(tmp_path: Path):
    files = {"a.txt": b"one", "sub/b.txt": b"two", "sub/deeper/c.txt": b"three"}
    first, second = tmp_path / "first", tmp_path / "second"
    _make_tree(first, files)
    _make_tree(second, dict(reversed(list(files.items()))))

    one = compute_local_digest(str(first))
    two = compute_local_digest(str(second))

    assert one.checksum == two.checksum
    assert one.checksum.startswith("sha256-tree:")
    assert one.files == 3
    assert one.size == len(b"one") + len(b"two") + len(b"three")


def test_a_directory_hash_changes_when_content_changes(tmp_path: Path):
    _make_tree(tmp_path, {"a.txt": b"one", "b.txt": b"two"})
    before = compute_local_digest(str(tmp_path)).checksum

    (tmp_path / "b.txt").write_bytes(b"TWO")

    assert compute_local_digest(str(tmp_path)).checksum != before


def test_a_directory_hash_changes_when_a_file_is_renamed(tmp_path: Path):
    _make_tree(tmp_path, {"a.txt": b"same"})
    before = compute_local_digest(str(tmp_path)).checksum

    (tmp_path / "a.txt").rename(tmp_path / "renamed.txt")

    assert compute_local_digest(str(tmp_path)).checksum != before


def test_an_empty_directory_is_valid(tmp_path: Path):
    digest = compute_local_digest(str(tmp_path))

    assert digest.files == 0
    assert digest.size == 0
    assert digest.checksum.startswith("sha256-tree:")


def test_file_uris_are_accepted(tmp_path: Path):
    target = tmp_path / "x.bin"
    target.write_bytes(b"abc")

    from_uri = compute_local_digest(target.as_uri())
    assert from_uri.checksum == compute_local_digest(str(target)).checksum


# -- what is and isn't a local path ------------------------------------------


@pytest.mark.parametrize("uri", ["s3://bucket/rain", "gs://bucket/x", "https://host/data.tar"])
def test_remote_uris_are_not_local(uri: str):
    assert local_path_from_uri(uri) is None


@pytest.mark.parametrize("uri", ["/data/rain", "relative/rain", "C:\\data\\rain", "C:/data/rain"])
def test_plain_and_drive_paths_are_local(uri: str):
    assert local_path_from_uri(uri) is not None


def test_a_remote_uri_is_an_error_not_a_silent_skip():
    with pytest.raises(SynthGraphValidationError, match="never downloads data"):
        compute_local_digest("s3://bucket/rain")


def test_a_missing_path_is_an_error(tmp_path: Path):
    with pytest.raises(SynthGraphValidationError, match="no file or directory exists"):
        compute_local_digest(str(tmp_path / "nope"))


# -- wired into dataset creation ---------------------------------------------


def test_compute_checksum_fills_in_checksum_and_size(client, backend, tmp_path: Path):
    _route(backend)
    target = tmp_path / "frames.bin"
    target.write_bytes(b"rendered frames")

    client.datasets.create(
        generation_id="g1", name="rain_v1", uri=str(target), compute_checksum=True
    )

    version_body = backend.requests[1].body
    assert version_body["checksum"] == "sha256:" + hashlib.sha256(b"rendered frames").hexdigest()
    assert version_body["size"] == len(b"rendered frames")


def test_an_explicit_size_is_kept_when_hashing(client, backend, tmp_path: Path):
    _route(backend)
    target = tmp_path / "frames.bin"
    target.write_bytes(b"abc")

    client.datasets.create(
        generation_id="g1", name="rain_v1", uri=str(target), compute_checksum=True, size=999
    )

    assert backend.requests[1].body["size"] == 999


def test_nothing_is_hashed_by_default(client, backend, tmp_path: Path):
    _route(backend)
    target = tmp_path / "frames.bin"
    target.write_bytes(b"abc")

    client.datasets.create(generation_id="g1", name="rain_v1", uri=str(target))

    assert "checksum" not in backend.requests[1].body
    assert "size" not in backend.requests[1].body


def test_asking_for_both_a_checksum_and_hashing_is_ambiguous(client, backend, tmp_path: Path):
    target = tmp_path / "x.bin"
    target.write_bytes(b"abc")

    with pytest.raises(SynthGraphValidationError, match="not both"):
        client.datasets.create(
            generation_id="g1",
            name="rain_v1",
            uri=str(target),
            checksum="sha256:abc",
            compute_checksum=True,
        )

    assert backend.requests == []


def test_a_hashing_failure_sends_nothing(client, backend):
    with pytest.raises(SynthGraphValidationError, match="never downloads data"):
        client.datasets.create(
            generation_id="g1", name="rain_v1", uri="s3://bucket/rain", compute_checksum=True
        )

    # No orphan Dataset was created before the failure.
    assert backend.requests == []
