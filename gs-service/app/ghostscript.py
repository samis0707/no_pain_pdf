"""Ghostscript PDF/X-1a conversion via subprocess."""

import base64
import subprocess
import tempfile
from pathlib import Path


PDF_TIMEOUT = 30  # seconds


class GsConversionError(Exception):
    pass


def convert_to_pdfx1a(pdf_base64: str) -> bytes:
    """Convert a PDF to PDF/X-1a using Ghostscript.

    Args:
        pdf_base64: Base64-encoded PDF bytes.

    Returns:
        PDF/X-1a bytes.

    Raises:
        GsConversionError: If Ghostscript fails or times out.
    """
    pdf_bytes = base64.b64decode(pdf_base64)

    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = Path(tmpdir) / "input.pdf"
        output_path = Path(tmpdir) / "output.pdf"

        input_path.write_bytes(pdf_bytes)

        try:
            proc = subprocess.run(
                [
                    "gs",
                    "-dPDFX",
                    "-dBATCH",
                    "-dNOPAUSE",
                    "-dPDFXCompatibilityPolicy=1",
                    "-sColorConversionStrategy=CMYK",
                    "-sProcessColorModel=DeviceCMYK",
                    "-sDEVICE=pdfwrite",
                    f"-sOutputFile={output_path}",
                    str(input_path),
                ],
                capture_output=True,
                timeout=PDF_TIMEOUT,
            )
        except subprocess.TimeoutExpired:
            raise GsConversionError(
                f"Ghostscript conversion timed out after {PDF_TIMEOUT}s"
            )

        if proc.returncode != 0:
            error_msg = proc.stderr.decode().strip() or f"Exit code {proc.returncode}"
            raise GsConversionError(f"Ghostscript failed: {error_msg}")

        if not output_path.exists():
            raise GsConversionError("Ghostscript produced no output")

        return output_path.read_bytes()
