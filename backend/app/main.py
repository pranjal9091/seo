from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.storage.db import init_db, SessionLocal
from app.visibility.seed import seed_database_defaults
from app.content.manager import seed_default_articles
from app.api.routes import router
from app.api.visibility_routes import router as visibility_router, schema_router
from app.api.gsc_routes import router as gsc_router
from app.api.content_routes import router as content_router, seo_router
from app.api.ga4_routes import router as ga4_router
from app.api.system_routes import router as system_router
from app.api.evidence_routes import router as evidence_router, seed_default_evidence

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    init_db()
    db = SessionLocal()
    try:
        seed_database_defaults(db)
        seed_default_articles(db)
        seed_default_evidence(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(visibility_router)
app.include_router(schema_router)
app.include_router(gsc_router)
app.include_router(content_router)
app.include_router(seo_router)
app.include_router(ga4_router)
app.include_router(system_router)
app.include_router(evidence_router)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "documentation": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": settings.APP_VERSION,
        "site_url": settings.SITE_URL,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
