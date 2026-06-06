from pydantic import BaseModel
from typing import Optional


class CmykConvertRequest(BaseModel):
    pdf_base64: str


class HealthResponse(BaseModel):
    status: str = "ok"
