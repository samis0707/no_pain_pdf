from pydantic import BaseModel
from typing import Optional, Dict


class GenerateRequest(BaseModel):
    html: str
    css: Optional[str] = ""
    options: Optional[Dict[str, object]] = None
    base_url: Optional[str] = ""
    assets: Optional[Dict[str, str]] = None
    metadata: Optional[Dict[str, str]] = None


class PreviewImagesRequest(BaseModel):
    html: str
    css: Optional[str] = ""
    options: Optional[Dict[str, object]] = None
    base_url: Optional[str] = ""
    page_limit: int = 3
    dpi: int = 96


class PreviewImagesResponse(BaseModel):
    pages: list[str]
    page_count: int
    truncated: bool


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = ""
