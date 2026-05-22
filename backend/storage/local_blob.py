import os

STORAGE_ROOT = "./storage"


def _abs(path: str) -> str:
    """Resolve a storage-relative path to an absolute path."""
    return os.path.join(STORAGE_ROOT, path)


def save_file(data: bytes, path: str) -> str:
    """
    Save *data* to *path* (relative to STORAGE_ROOT).
    Creates parent directories as needed.
    Returns the resolved path.
    """
    full_path = _abs(path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "wb") as f:
        f.write(data)
    return full_path


def read_file(path: str) -> bytes:
    """
    Read and return the bytes at *path* (relative to STORAGE_ROOT).
    Raises FileNotFoundError if the file does not exist.
    """
    full_path = _abs(path)
    with open(full_path, "rb") as f:
        return f.read()


def delete_file(path: str) -> None:
    """
    Delete the file at *path* (relative to STORAGE_ROOT).
    Silently ignores missing files.
    """
    full_path = _abs(path)
    try:
        os.remove(full_path)
    except FileNotFoundError:
        pass
