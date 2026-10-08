import os
import time
import httpx
from app.visibility.providers.base import AIProvider, ProviderResult

class OpenAIProvider(AIProvider):
    @property
    def name(self) -> str:
        return "openai"

    @property
    def display_name(self) -> str:
        return "OpenAI (GPT-4o / GPT-4o-mini)"

    def is_configured(self) -> bool:
        return bool(os.getenv("OPENAI_API_KEY", "").strip())

    async def execute_query(self, question: str) -> ProviderResult:
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            return ProviderResult(
                provider=self.name,
                raw_response="",
                status="error",
                error_message="OPENAI_API_KEY is not configured in environment variables."
            )

        start_time = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "user", "content": question}
                        ],
                        "temperature": 0.3
                    }
                )
                elapsed_ms = int((time.perf_counter() - start_time) * 1000)

                if res.status_code != 200:
                    return ProviderResult(
                        provider=self.name,
                        raw_response="",
                        latency_ms=elapsed_ms,
                        status="error",
                        error_message=f"OpenAI API returned HTTP {res.status_code}: {res.text[:300]}"
                    )

                data = res.json()
                content = data["choices"][0]["message"]["content"]
                return ProviderResult(
                    provider=self.name,
                    raw_response=content,
                    citations=[],
                    citations_available=False,
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
                error_message=f"Network error connecting to OpenAI: {str(e)}"
            )
