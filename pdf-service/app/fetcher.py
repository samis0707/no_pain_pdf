"""Custom URLFetcher for WeasyPrint to resolve asset URLs.

Supports:
- `assets://` protocol for local asset resolution
- Falls back to default fetcher for http/https
"""

from weasyprint import default_url_fetcher
from typing import Optional


def asset_fetcher(url: str, timeout: Optional[float] = 10.0) -> dict:
    """Custom URL fetcher for WeasyPrint.

    Handles `assets://` URLs by resolving to local files.
    Delegates http/https to the default fetcher.
    """
    if url.startswith("assets://"):
        # For now, strip the protocol and treat as a local path
        # In production, this would resolve against S3/MinIO
        local_path = url[len("assets://"):]
        with open(local_path, "rb") as f:
            return {
                "mime_type": _guess_mime(local_path),
                "string": f.read(),
                "filename": local_path,
            }

    return default_url_fetcher(url, timeout=timeout)


def _guess_mime(path: str) -> str:
    ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
    mime_map = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "svg": "image/svg+xml",
        "webp": "image/webp",
        "pdf": "application/pdf",
        "woff": "font/woff",
        "woff2": "font/woff2",
        "ttf": "font/ttf",
        "otf": "font/otf",
    }
    return mime_map.get(ext, "application/octet-stream")
