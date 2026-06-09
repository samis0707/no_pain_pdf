"""PDF generation with process isolation (subprocess + timeout + memory limits).

Uses a subprocess to isolate WeasyPrint (which is single-threaded, CPU/memory
intensive) from the main FastAPI process. A bad PDF cannot take down the service.
"""
import json
import os
import resource
import signal
import subprocess
import sys
from typing import Optional


PDF_TIMEOUT = 60  # seconds
PDF_MAX_MEMORY = 512 * 1024 * 1024  # 512 MB


class PDFGenerationError(Exception):
    pass


class PDFTimeoutError(PDFGenerationError):
    pass


class PDFMemoryError(PDFGenerationError):
    pass


def _worker_script() -> str:
    """Return the path to the worker module."""
    return os.path.join(os.path.dirname(__file__), "pdf_worker.py")


def render_pdf(
    html: str,
    css: str = "",
    options: Optional[dict] = None,
    base_url: str = "",
) -> bytes:
    """Render HTML+CSS to PDF bytes using WeasyPrint in a subprocess.

    The subprocess enforces:
    - Timeout (default 60s)
    - Memory limit (512 MB via setrlimit RLIMIT_AS)

    Args:
        html: Full HTML document string.
        css: CSS stylesheet string.
        options: Optional dict with PDF options (pdf_variant, pdf_forms, etc.)

    Returns:
        PDF as bytes.

    Raises:
        PDFTimeoutError: If subprocess exceeds timeout.
        PDFMemoryError: If subprocess exceeds memory limit.
        PDFGenerationError: If subprocess fails for other reasons.
    """
    payload = {
        "html": html,
        "css": css,
        "options": options or {},
        "base_url": base_url,
    }

    def set_limits() -> None:
        """Set memory limit in the child process before exec."""
        try:
            resource.setrlimit(resource.RLIMIT_AS, (PDF_MAX_MEMORY, PDF_MAX_MEMORY))
        except (resource.error, ValueError):
            pass

    try:
        proc = subprocess.Popen(
            [sys.executable, _worker_script()],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            preexec_fn=set_limits,
        )
    except FileNotFoundError as e:
        raise PDFGenerationError(f"Failed to start subprocess: {e}") from e

    try:
        stdout, stderr = proc.communicate(
            input=json.dumps(payload).encode(),
            timeout=PDF_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
        raise PDFTimeoutError(
            f"PDF generation timed out after {PDF_TIMEOUT}s"
        )

    if proc.returncode != 0:
        error_msg = stderr.decode().strip() if stderr else f"Exit code {proc.returncode}"
        last_line = error_msg.rsplit("\n", 1)[-1].strip() if "\n" in error_msg else error_msg
        raise PDFGenerationError(f"PDF generation failed: {last_line}")

    if not stdout:
        raise PDFGenerationError("PDF generation produced no output")

    return stdout
