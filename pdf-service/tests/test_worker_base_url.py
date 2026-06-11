"""RED tests: the PDF worker must honor the request's base_url.

The previous behavior let the NEXTJS_URL env var silently override the
base_url sent with the request, which breaks presigned-S3 asset URLs.
"""

from app.pdf_worker import resolve_base_url


def test_request_base_url_wins_over_env(monkeypatch):
    monkeypatch.setenv("NEXTJS_URL", "http://nextjs:3000")
    assert resolve_base_url({"base_url": "http://example.com/"}) == "http://example.com/"


def test_empty_base_url_when_absent(monkeypatch):
    monkeypatch.setenv("NEXTJS_URL", "http://nextjs:3000")
    assert resolve_base_url({}) == ""
