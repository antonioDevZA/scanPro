from __future__ import annotations

import argparse
import json
from pathlib import Path

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


def scan_documents(directory: str | Path, extensions: set[str] | None = None) -> list[dict[str, int | str]]:
    root = Path(directory)
    if not root.exists():
        raise FileNotFoundError(f"Directory does not exist: {root}")
    if not root.is_dir():
        raise NotADirectoryError(f"Path is not a directory: {root}")

    allowed_extensions = {ext.lower() for ext in (extensions or DEFAULT_EXTENSIONS)}
    matches: list[dict[str, int | str]] = []

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


def main() -> None:
    parser = argparse.ArgumentParser(description="Scan a directory for document files.")
    parser.add_argument("directory", help="Directory to scan")
    args = parser.parse_args()

    print(json.dumps(scan_documents(args.directory), indent=2))


if __name__ == "__main__":
    main()
