from __future__ import annotations

from fastapi import APIRouter

from ..models import Result


__all__ = ("root_router",)
root_router = APIRouter(prefix="/")


@root_router.get("/", summary="Root endpoint for health checking")
async def root() -> Result[None]:
    return Result(data=None)
