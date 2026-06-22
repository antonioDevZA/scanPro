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

            self.assertEqual(
                [item["path"] for item in scanned],
                ["invoice.pdf", "nested/photo.jpg", "notes.TXT"],
            )
            self.assertTrue(all(item["size_bytes"] > 0 for item in scanned))

    def test_scan_documents_raises_when_directory_is_missing(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            missing = Path(tmpdir) / "missing"
            with self.assertRaises(FileNotFoundError):
                scan_documents(missing)


if __name__ == "__main__":
    unittest.main()
