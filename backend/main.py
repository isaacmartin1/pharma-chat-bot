import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()

import database  # noqa: F401 — ensures tables are created on import

from routers import auth, sessions, messages, assets, uploads, compliance, brand_collection

app = FastAPI(title="Pharma Asset Creator API", version="1.0.0")

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
_static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(_static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=_static_dir), name="static")

# ---------------------------------------------------------------------------
# Routers — all prefixed under /api
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(compliance.router, prefix="/api")
app.include_router(brand_collection.router, prefix="/api")

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    from database import get_db, create_all
    create_all()

    db_gen = get_db()
    db = next(db_gen)
    try:
        from seed.seed_all import seed_all
        seed_all(db)
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok"}
