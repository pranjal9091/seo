import os
from typing import List, Optional
from pydantic import BaseModel, Field

class Settings(BaseModel):
    APP_NAME: str = "OmniGEO Intelligence Suite"
    APP_VERSION: str = "1.0.0-m5"
    DESCRIPTION: str = "AI Search Visibility, AEO & Technical SEO Intelligence Platform"
    ENVIRONMENT: str = Field(default_factory=lambda: os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower())
    
    # Crawler settings
    USER_AGENT: str = "OmniGEO-Auditor/1.0 (Mozilla/5.0 compatible; Research/SEO Engine; +https://github.com/omnigeo)"
    REQUEST_TIMEOUT_SECONDS: float = 12.0
    MAX_RESPONSE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB safety limit
    FOLLOW_REDIRECTS: bool = True
    MAX_REDIRECTS: int = 5
    
    # Public canonical domain (used for sitemaps, robots.txt, canonical URLs)
    SITE_URL: str = Field(default_factory=lambda: os.getenv("SITE_URL", "http://localhost:5173").rstrip("/"))
    
    # Database
    DATABASE_URL: str = Field(default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///./omnigeo.db"))
    
    # Allowed frontend origins (comma-separated in env)
    FRONTEND_ORIGIN: str = Field(default_factory=lambda: os.getenv("FRONTEND_ORIGIN", ""))
    
    # Optional AI provider keys
    OPENAI_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY"))
    GEMINI_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY"))
    PERPLEXITY_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("PERPLEXITY_API_KEY"))
    
    # Optional GA4 measurement id (server-side verification)
    GA4_MEASUREMENT_ID: Optional[str] = Field(default_factory=lambda: os.getenv("GA4_MEASUREMENT_ID", os.getenv("VITE_GA4_MEASUREMENT_ID")))

    @property
    def cors_origins(self) -> List[str]:
        origins = set()
        
        # Add configured frontend origins
        if self.FRONTEND_ORIGIN:
            for item in self.FRONTEND_ORIGIN.split(","):
                clean = item.strip()
                if clean:
                    origins.add(clean.rstrip("/"))
                    
        # Add SITE_URL if set
        if self.SITE_URL:
            origins.add(self.SITE_URL.rstrip("/"))

        # In non-production, include localhost origins for smooth development
        if self.ENVIRONMENT != "production":
            origins.update([
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:8000",
                "http://127.0.0.1:8000",
            ])
            
        return sorted(list(origins)) if origins else ["http://localhost:5173"]

    @property
    def CORS_ORIGINS(self) -> List[str]:
        # Backward-compatible property alias
        return self.cors_origins

settings = Settings()

