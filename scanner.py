from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import TypedDict

DEFAULT_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".tif",
    ".tiff",
    ".bmp",
    ".doc",
    ".docx",
    ".txt",
}


class ScanResult(TypedDict):
    path: str
    size_bytes: int


def scan_documents(directory: str | Path, extensions: set[str] | None = None) -> list[ScanResult]:
    """Recursively find supported document files in a directory.

    Args:
        directory: Root directory to scan.
        extensions: Optional set of file extensions to include (e.g. {".pdf"}).

    Returns:
        A list of dictionaries containing the file's path relative to `directory`
        and its size in bytes.
    """
    root = Path(directory)
    if not root.exists():
        raise FileNotFoundError(f"Directory does not exist: {root}")
    if not root.is_dir():
        raise NotADirectoryError(f"Path is not a directory: {root}")

    allowed_extensions = {ext.lower() for ext in (extensions or DEFAULT_EXTENSIONS)}
    matches: list[ScanResult] = []

    for path in sorted(root.rglob("*")):
        if path.is_file() and path.suffix.lower() in allowed_extensions:
            stat = path.stat()
            matches.append(
                {
                    "path": str(path.relative_to(root)),
                    "size_bytes": stat.st_size,
                }
            )

    return matches


def main() -> int:
    """Run the scanner CLI.

    Returns:
        0 when scanning succeeds, otherwise 1 for a user input error.
    """
    parser = argparse.ArgumentParser(
        description="Recursively scan a directory for document files."
    )
    parser.add_argument("directory", help="Directory to scan")
    args = parser.parse_args()

    try:
        result = scan_documents(args.directory)
    except (FileNotFoundError, NotADirectoryError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
