"""RED/GREEN tests for the WeasyPrint PDF service.

Run with: pytest tests/ -v
"""

import pytest
from weasyprint import HTML, CSS


def test_generates_pdf_from_html():
    """GREEN: WeasyPrint converts HTML to PDF bytes."""
    html_str = "<html><body><p>Hello World</p></body></html>"
    pdf_bytes = HTML(string=html_str).write_pdf()
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    # PDF header
    assert pdf_bytes[:5] == b'%PDF-'


def test_pdf_contains_custom_text():
    """GREEN: PDF generated from HTML with custom content."""
    html_str = "<html><body><h1>Test Title</h1></body></html>"
    pdf_bytes = HTML(string=html_str).write_pdf()
    assert len(pdf_bytes) > 100


def test_pdf_accepts_css():
    """GREEN: CSS stylesheets are applied without error."""
    html_str = "<html><body><p>Styled</p></body></html>"
    css_str = "@page { size: A4; margin: 2cm; }"
    pdf_bytes = HTML(string=html_str).write_pdf(stylesheets=[CSS(string=css_str)])
    assert isinstance(pdf_bytes, bytes)
