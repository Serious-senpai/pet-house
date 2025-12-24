from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI

from models import Result


root = Path(__file__).parent.parent.resolve()
with open(root / "README.md", "r", encoding="utf-8") as f:
    readme = f.read()

app = FastAPI(
    title="Pet House API",
    description=readme,
    version="0.0.1",
)


@app.get("/", summary="Root endpoint for health checking")
async def root() -> Result[None]:
    return Result(data=None)
