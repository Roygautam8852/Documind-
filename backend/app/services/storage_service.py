"""Local file storage service.

Provides atomic file writes to the configured upload directory.
Files are stored under: {upload_dir}/{owner_id}/{document_id}/{safe_filename}

Design:
- Filenames are sanitised before storage to prevent path traversal.
- Original filenames are preserved in the database, not in the filesystem path.
- Each document gets its own subdirectory for isolation.
"""

from __future__ import annotations

import hashlib
import logging
import re
from pathlib import Path

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_SAFE_FILENAME_RE = re.compile(r"[^\w\-.]")
_MAX_STORED_FILENAME_LEN = 100


def _safe_filename(original: str) -> str:
    """Sanitise a filename to prevent path traversal and special characters."""
    # Keep only alphanumeric, dash, underscore, dot
    name = _SAFE_FILENAME_RE.sub("_", original)
    # Truncate while preserving extension
    if len(name) > _MAX_STORED_FILENAME_LEN:
        stem, _, ext = name.rpartition(".")
        name = stem[: _MAX_STORED_FILENAME_LEN - len(ext) - 1] + "." + ext
    return name


def _document_dir(owner_id: str, document_id: str) -> Path:
    settings = get_settings()
    return Path(settings.upload_dir) / owner_id / document_id


def get_object_key(owner_id: str, document_id: str, original_filename: str) -> str:
    """Return the relative storage key for a document file."""
    safe = _safe_filename(original_filename)
    return f"{owner_id}/{document_id}/{safe}"


def save_upload(
    content: bytes,
    owner_id: str,
    document_id: str,
    original_filename: str,
) -> tuple[Path, str]:
    """Save uploaded file content to local storage.

    Returns:
        (absolute_path, object_key) — the full filesystem path and the
        relative storage key stored in the database.

    Raises:
        OSError: If the directory cannot be created or the file cannot be written.
    """
    key = get_object_key(owner_id, document_id, original_filename)
    abs_path = Path(get_settings().upload_dir) / key
    abs_path.parent.mkdir(parents=True, exist_ok=True)

    # Write atomically via a temp file then rename
    tmp_path = abs_path.with_suffix(abs_path.suffix + ".tmp")
    try:
        tmp_path.write_bytes(content)
        tmp_path.replace(abs_path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise

    logger.debug("Saved upload: size=%d", len(content))
    return abs_path, key


def resolve_path(object_key: str) -> Path:
    """Return the absolute filesystem path for a stored object key."""
    root = Path(get_settings().upload_dir).resolve()
    path = (root / object_key).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Stored object key resolves outside the upload directory")
    return path


def delete_file(object_key: str) -> None:
    """Delete a stored file. Silently ignores missing files."""
    try:
        path = resolve_path(object_key)
        path.unlink(missing_ok=True)
        # Remove the document's directory if empty
        _try_rmdir(path.parent)
    except (OSError, ValueError) as exc:
        logger.warning("Could not delete stored upload: %s", type(exc).__name__)


def _try_rmdir(directory: Path) -> None:
    """Remove a directory if it is empty."""
    try:
        directory.rmdir()
    except OSError:
        pass  # Not empty or doesn't exist — ignore


def compute_sha256(content: bytes) -> str:
    """Return the hex SHA-256 digest of the given bytes."""
    return hashlib.sha256(content).hexdigest()
