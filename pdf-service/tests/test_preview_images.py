"""RED tests for POST /preview-images — renders HTML and returns page images.

Feeds the AI vision loop: the model gets JPEG snapshots of the WeasyPrint
output so it can see (and correct) its own work.
"""

import base64
import io

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


MULTIPAGE_HTML = (
    "<html><body>"
    + "".join(
        f'<div style="page-break-after: always">Page {i}</div>' for i in range(3)
    )
    + "</body></html>"
)


@pytest.mark.asyncio
async def test_returns_base64_jpeg_pages(client):
    response = await client.post(
        "/preview-images", json={"html": "<h1>Hello preview</h1>"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["page_count"] == 1
    assert data["truncated"] is False
    assert len(data["pages"]) == 1
    img_bytes = base64.b64decode(data["pages"][0])
    assert img_bytes[:3] == b"\xff\xd8\xff"  # JPEG magic number


@pytest.mark.asyncio
async def test_page_limit_truncates_but_reports_total(client):
    response = await client.post(
        "/preview-images", json={"html": MULTIPAGE_HTML, "page_limit": 2}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["page_count"] == 3
    assert data["truncated"] is True
    assert len(data["pages"]) == 2


@pytest.mark.asyncio
async def test_applies_css(client):
    """A 3-page document via @page-driven breaks proves CSS is applied."""
    response = await client.post(
        "/preview-images",
        json={"html": MULTIPAGE_HTML, "css": "@page { size: A6 }", "page_limit": 10},
    )
    data = response.json()
    assert data["page_count"] == 3
    assert data["truncated"] is False
    assert len(data["pages"]) == 3


@pytest.mark.asyncio
async def test_missing_html_rejected(client):
    response = await client.post("/preview-images", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_images_downscaled_to_max_edge(client):
    from PIL import Image

    response = await client.post(
        "/preview-images", json={"html": "<h1>big</h1>", "dpi": 300}
    )
    img = Image.open(io.BytesIO(base64.b64decode(response.json()["pages"][0])))
    assert max(img.size) <= 1024
