"""PDF → JPEG page images for AI vision feedback.

Pages are rasterized with poppler (pdf2image), downscaled to a bounded
long edge and JPEG-compressed to keep vision-token cost predictable.
"""
import base64
import io

from pdf2image import convert_from_bytes, pdfinfo_from_bytes

MAX_EDGE = 1024
JPEG_QUALITY = 70


def pdf_to_jpeg_pages(
    pdf_bytes: bytes,
    page_limit: int = 3,
    dpi: int = 96,
) -> tuple[list[str], int, bool]:
    """Rasterize up to page_limit pages as base64 JPEG strings.

    Returns (pages, total_page_count, truncated). Only the pages that are
    returned get rendered — the total count comes from pdfinfo.
    """
    page_count = int(pdfinfo_from_bytes(pdf_bytes)["Pages"])
    truncated = page_count > page_limit

    images = convert_from_bytes(
        pdf_bytes,
        dpi=dpi,
        first_page=1,
        last_page=min(page_limit, page_count),
    )

    pages: list[str] = []
    for image in images:
        image.thumbnail((MAX_EDGE, MAX_EDGE))
        buffer = io.BytesIO()
        image.convert("RGB").save(buffer, format="JPEG", quality=JPEG_QUALITY)
        pages.append(base64.b64encode(buffer.getvalue()).decode())

    return pages, page_count, truncated
