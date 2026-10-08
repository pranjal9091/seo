import time
from typing import Tuple, Dict, Any, Optional
from urllib.parse import urlparse
import httpx
from app.config import settings

class FetchError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details

class FetchedWebpage:
    def __init__(
        self,
        requested_url: str,
        final_url: str,
        status_code: int,
        html_content: str,
        response_time_ms: int,
        headers: Dict[str, str],
        redirect_count: int,
        content_length_bytes: int,
    ):
        self.requested_url = requested_url
        self.final_url = final_url
        self.status_code = status_code
        self.html_content = html_content
        self.response_time_ms = response_time_ms
        self.headers = headers
        self.redirect_count = redirect_count
        self.content_length_bytes = content_length_bytes

def validate_url(url: str) -> str:
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    
    parsed = urlparse(url)
    if not parsed.netloc:
        raise FetchError(f"Invalid URL: '{url}' missing domain host.")
    return url

async def fetch_webpage(url: str) -> FetchedWebpage:
    target_url = validate_url(url)
    
    headers = {
        "User-Agent": settings.USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
    }
    
    start_time = time.perf_counter()
    
    try:
        async with httpx.AsyncClient(
            follow_redirects=settings.FOLLOW_REDIRECTS,
            max_redirects=settings.MAX_REDIRECTS,
            timeout=settings.REQUEST_TIMEOUT_SECONDS,
            verify=False  # allow auditing staging / self-signed domains safely without crashing
        ) as client:
            response = await client.get(target_url, headers=headers)
            
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            
            # Check content length safety
            content_bytes = response.content
            if len(content_bytes) > settings.MAX_RESPONSE_SIZE_BYTES:
                raise FetchError(
                    f"Page response exceeds maximum allowed size ({settings.MAX_RESPONSE_SIZE_BYTES // (1024*1024)}MB).",
                    status_code=response.status_code
                )
            
            content_type = response.headers.get("content-type", "").lower()
            # Decode HTML text
            html_text = response.text
            
            return FetchedWebpage(
                requested_url=target_url,
                final_url=str(response.url),
                status_code=response.status_code,
                html_content=html_text,
                response_time_ms=elapsed_ms,
                headers={k.lower(): v for k, v in response.headers.items()},
                redirect_count=len(response.history),
                content_length_bytes=len(content_bytes),
            )
            
    except httpx.TimeoutException:
        raise FetchError(
            f"Connection timed out after {settings.REQUEST_TIMEOUT_SECONDS}s while fetching '{target_url}'.",
            status_code=408
        )
    except httpx.ConnectError as ce:
        raise FetchError(
            f"Failed to connect to host '{urlparse(target_url).netloc}'. Server may be unreachable or domain does not exist.",
            details=str(ce)
        )
    except httpx.HTTPError as he:
        raise FetchError(
            f"HTTP network error occurred: {str(he)}",
            details=str(he)
        )
    except Exception as e:
        if isinstance(e, FetchError):
            raise
        raise FetchError(f"Unexpected fetch error: {str(e)}", details=str(e))
