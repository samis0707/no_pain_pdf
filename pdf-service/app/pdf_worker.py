"""Subprocess worker for process-isolated PDF generation.

Called as: python -m app.pdf_worker
Reads JSON from stdin, writes PDF bytes to stdout.
"""
import json
import sys
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration


def main() -> None:
    raw = sys.stdin.read()
    data = json.loads(raw)
    html = data["html"]
    css = data.get("css", "")
    options = data.get("options") or {}

    font_config = FontConfiguration()

    stylesheets = []
    if css:
        stylesheets.append(CSS(string=css))

    pdf_bytes = HTML(string=html).write_pdf(
        stylesheets=stylesheets,
        font_config=font_config,
        pdf_variant=options.get("pdf_variant"),
        pdf_forms=options.get("pdf_forms"),
    )

    sys.stdout.buffer.write(pdf_bytes)
    sys.stdout.buffer.flush()


if __name__ == "__main__":
    main()
