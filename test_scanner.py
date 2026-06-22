import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from scanner import scan_documents


class ScanDocumentsTests(unittest.TestCase):
    def test_scan_documents_returns_supported_files_recursively(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / "invoice.pdf").write_text("invoice", encoding="utf-8")
            (root / "notes.TXT").write_text("notes", encoding="utf-8")
            nested = root / "nested"
            nested.mkdir()
            (nested / "photo.jpg").write_text("photo", encoding="utf-8")
            (nested / "ignore.csv").write_text("ignore", encoding="utf-8")

            scanned = scan_documents(root)

            expected_paths = sorted(["invoice.pdf", "nested/photo.jpg", "notes.TXT"])
            self.assertEqual([item["path"] for item in scanned], expected_paths)
            self.assertTrue(all(item["size_bytes"] > 0 for item in scanned))

    def test_scan_documents_raises_when_directory_is_missing(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            missing = Path(tmpdir) / "missing"
            with self.assertRaises(FileNotFoundError):
                scan_documents(missing)

    def test_cli_returns_error_for_missing_directory(self) -> None:
        result = subprocess.run(
            [sys.executable, "scanner.py", "missing-path"],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn("Directory does not exist", result.stderr)


if __name__ == "__main__":
    unittest.main()
