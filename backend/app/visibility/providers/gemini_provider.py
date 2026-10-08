import os
import time
import httpx
from app.visibility.providers.base import AIProvider, ProviderResult

class GeminiProvider(AIProvider):
    @property
    def name(self) -> str:
        return "gemini"

    @property
    def display_name(self) -> str:
        return "Google Gemini (1.5 Flash)"

    def is_configured(self) -> bool:
        return bool(os.getenv("GEMINI_API_KEY", "").strip())

    async def execute_query(self, question: str) -> ProviderResult:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            return ProviderResult(
                provider=self.name,
                raw_response="",
                status="error",
                error_message="GEMINI_API_KEY is not configured in environment variables."
            )

        start_time = time.perf_counter()
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [
                            {"parts": [{"text": question}]}
                        ]
                    }
                )
                elapsed_ms = int((time.perf_counter() - start_time) * 1000)

                if res.status_code != 200:
                    return ProviderResult(
                        provider=self.name,
                        raw_response="",
                        latency_ms=elapsed_ms,
                        status="error",
                        error_message=f"Gemini API returned HTTP {res.status_code}: {res.text[:300]}"
                    )

                data = res.json()
                candidate = data["candidates"][0]
                text = candidate["content"]["parts"][0]["text"]

                # Extract grounding metadata if exposed
                citations = []
                grounding = candidate.get("groundingMetadata", {})
                web_search_sources = grounding.get("webSearchSources", [])
                for src in web_search_sources:
                    if "uri" in src:
                        citations.append(src["uri"])

                return ProviderResult(
                    provider=self.name,
                    raw_response=text,
                    citations=citations,
                    citations_available=len(citations) > 0,
                    latency_ms=elapsed_ms,
                    status="success"
                )
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            return ProviderResult(
                provider=self.name,
                raw_response="",
                latency_ms=elapsed_ms,
                status="error",
                error_message=f"Network error connecting to Gemini API: {str(e)}"
            )
