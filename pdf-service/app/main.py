"""FastAPI application for WeasyPrint PDF generation service.

Endpoints:
- GET /health — Health check
- POST /generate — Generate PDF from HTML+CSS

Runs on port 3001.
"""
import json

import weasyprint
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .models import GenerateRequest, HealthResponse
from .pdf import render_pdf, PDFGenerationError, PDFTimeoutError

app = FastAPI(title="No Pain PDF — WeasyPrint Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(version=weasyprint.__version__)


@app.post("/generate")
async def generate(req: GenerateRequest):
    try:
        pdf_bytes = render_pdf(
            html=req.html,
            css=req.css or "",
            options=req.options or {},
            base_url=req.base_url or "",
        )
        return Response(content=pdf_bytes, media_type="application/pdf")
    except PDFTimeoutError as e:
        return Response(
            content=json.dumps({"error": str(e)}),
            status_code=504,
            media_type="application/json",
        )
    except PDFGenerationError as e:
        return Response(
            content=json.dumps({"error": str(e)}),
            status_code=500,
            media_type="application/json",
        )
