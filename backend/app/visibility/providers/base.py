import time
from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel

class ProviderResult(BaseModel):
    provider: str
    raw_response: str
    citations: List[str] = []
    citations_available: bool = False
    latency_ms: int = 0
    status: str = "success"
    error_message: Optional[str] = None
    is_manual: bool = False

class AIProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def display_name(self) -> str:
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    async def execute_query(self, question: str) -> ProviderResult:
        pass
