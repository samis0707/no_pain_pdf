"""RED tests for the WeasyPrint PDF service API.

These tests will fail until the app code is implemented.
Run with: pytest tests/ -v
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """RED: GET /health returns status ok."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


@pytest.mark.asyncio
async def test_generate_returns_pdf(client):
    """RED: POST /generate with HTML returns PDF bytes."""
    response = await client.post("/generate", json={
        "html": "<html><body><p>Hello PDF</p></body></html>",
    })
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:5] == b"%PDF-"
    assert len(response.content) > 0


@pytest.mark.asyncio
async def test_generate_rejects_missing_html(client):
    """RED: POST /generate without html returns 422."""
    response = await client.post("/generate", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_generate_with_css_and_options(client):
    """RED: POST /generate with CSS + options returns valid PDF."""
    response = await client.post("/generate", json={
        "html": "<html><body><p>Styled</p></body></html>",
        "css": "@page { size: A4; margin: 2cm; }",
        "options": {"pdf_variant": "pdf/ua-1"},
    })
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:5] == b"%PDF-"


@pytest.mark.asyncio
async def test_generate_with_font_face(client):
    """RED: POST /generate with @font-face does not crash."""
    response = await client.post("/generate", json={
        "html": "<html><body><p style='font-family: TestFont'>Styled</p></body></html>",
        "css": """
            @font-face {
                font-family: 'TestFont';
                src: local('Arial');
            }
            @page { size: A4; margin: 1cm; }
        """,
    })
    assert response.status_code == 200
    assert response.content[:5] == b"%PDF-"


@pytest.mark.asyncio
async def test_generate_process_isolation_timeout(client, monkeypatch):
    """RED: PDF process with very short timeout is killed before completion."""
    import app.pdf as pdf_mod
    monkeypatch.setattr(pdf_mod, "PDF_TIMEOUT", 0.001)
    html = "<html><body><p>" + ("x" * 10_000_000) + "</p></body></html>"
    response = await client.post("/generate", json={"html": html})
    assert response.status_code in (504, 500)
