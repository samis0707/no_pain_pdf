"""FastAPI application for Ghostscript PDF/X-1a conversion service.

Endpoints:
- GET /health — Health check
- POST /convert — Convert a PDF to PDF/X-1a (CMYK)

Runs on port 3002.
"""
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .models import CmykConvertRequest, HealthResponse
from .ghostscript import convert_to_pdfx1a, GsConversionError

app = FastAPI(title="No Pain PDF — Ghostscript Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse()


@app.post("/convert")
async def convert(req: CmykConvertRequest):
    try:
        pdf_bytes = convert_to_pdfx1a(req.pdf_base64)
        return Response(content=pdf_bytes, media_type="application/pdf")
    except GsConversionError as e:
        return Response(
            content=json.dumps({"error": str(e)}),
            status_code=500,
            media_type="application/json",
        )
