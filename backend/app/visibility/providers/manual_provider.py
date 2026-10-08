from app.visibility.providers.base import AIProvider, ProviderResult

class ManualProvider(AIProvider):
    @property
    def name(self) -> str:
        return "manual"

    @property
    def display_name(self) -> str:
        return "Manual Import (Direct User Observation)"

    def is_configured(self) -> bool:
        return True

    async def execute_query(self, question: str) -> ProviderResult:
        # Manual provider does not query remote APIs directly;
        # user supplies response text via import workflow
        return ProviderResult(
            provider=self.name,
            raw_response="",
            status="error",
            error_message="Manual provider requires user-supplied response text.",
            is_manual=True
        )

    def process_manual_input(self, raw_text: str, source_provider_label: str = "manual") -> ProviderResult:
        return ProviderResult(
            provider=source_provider_label,
            raw_response=raw_text.strip(),
            citations=[],
            citations_available=False,
            latency_ms=0,
            status="success",
            is_manual=True
        )
