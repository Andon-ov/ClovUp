"""
ClovUp Device Agent — Main Entry Point.

FastAPI application that runs on localhost:8001 on each POS terminal.
Bridges the cloud backend with local fiscal printers.
"""

import uvicorn
from fastapi import FastAPI
from contextlib import asynccontextmanager

from config import settings
from bridge.routes import router as bridge_router
from heartbeat import start_heartbeat, stop_heartbeat
from local_buffer import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    init_db()
    start_heartbeat()
    yield
    stop_heartbeat()


app = FastAPI(
    title="ClovUp Device Agent",
    version="1.0.0",
    description="Local agent bridging ClovUp cloud backend to fiscal printers.",
    lifespan=lifespan,
)

app.include_router(bridge_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "device_id": settings.device_id}


if __name__ == "__main__":
    uvicorn.run(
        "agent:app",
        host=settings.host,
        port=settings.port,
        reload=False,
    )
