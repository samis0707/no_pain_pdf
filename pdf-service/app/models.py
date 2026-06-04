from pydantic import BaseModel
from typing import Optional, Dict


class GenerateRequest(BaseModel):
    html: str
    css: Optional[str] = ""
    options: Optional[Dict[str, object]] = None
    assets: Optional[Dict[str, str]] = None
    metadata: Optional[Dict[str, str]] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = ""
