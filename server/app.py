from __future__ import annotations

from fastapi import FastAPI

from .config import ROOT
from .routes import root_router


with open(ROOT / "README.md", "r", encoding="utf-8") as f:
    readme = f.read()

app = FastAPI(
    title="Pet House API",
    description=readme,
    version="0.0.1",
)
app.include_router(root_router)
