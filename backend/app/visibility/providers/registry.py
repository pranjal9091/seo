from typing import Dict, List, Optional, Any
from app.visibility.providers.base import AIProvider
from app.visibility.providers.openai_provider import OpenAIProvider
from app.visibility.providers.gemini_provider import GeminiProvider
from app.visibility.providers.perplexity_provider import PerplexityProvider
from app.visibility.providers.manual_provider import ManualProvider

_PROVIDERS: Dict[str, AIProvider] = {
    "openai": OpenAIProvider(),
    "gemini": GeminiProvider(),
    "perplexity": PerplexityProvider(),
    "manual": ManualProvider(),
}

def get_provider(name: str) -> Optional[AIProvider]:
    return _PROVIDERS.get(name.lower())

def list_providers_status() -> List[Dict[str, Any]]:
    results = []
    for key, p in _PROVIDERS.items():
        results.append({
            "id": p.name,
            "display_name": p.display_name,
            "is_configured": p.is_configured(),
            "status_label": "Configured & Active" if p.is_configured() else "Not configured (Set API Key)"
        })
    return results
