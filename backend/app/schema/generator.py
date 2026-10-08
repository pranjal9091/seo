import json
from typing import Dict, Any, List

def generate_article_schema(
    headline: str,
    description: str,
    url: str,
    author_name: str,
    publisher_name: str,
    date_published: str,
    image_url: str = ""
) -> Dict[str, Any]:
    schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": headline.strip(),
        "description": description.strip(),
        "url": url.strip(),
        "author": {
            "@type": "Person",
            "name": author_name.strip()
        },
        "publisher": {
            "@type": "Organization",
            "name": publisher_name.strip()
        },
        "datePublished": date_published.strip()
    }
    if image_url.strip():
        schema["image"] = image_url.strip()
    return schema

def generate_faq_schema(qa_pairs: List[Dict[str, str]]) -> Dict[str, Any]:
    entities = []
    for pair in qa_pairs:
        q = pair.get("question", "").strip()
        a = pair.get("answer", "").strip()
        if q and a:
            entities.append({
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": a
                }
            })
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": entities
    }

def generate_course_schema(
    name: str,
    description: str,
    provider_name: str,
    provider_url: str = "",
    course_code: str = "",
    credential: str = "",
    price: str = "",
    currency: str = "INR"
) -> Dict[str, Any]:
    schema = {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": name.strip(),
        "description": description.strip(),
        "provider": {
            "@type": "EducationalOrganization",
            "name": provider_name.strip(),
            "url": provider_url.strip() or "https://www.nxtwave.co.in"
        }
    }
    if course_code.strip():
        schema["courseCode"] = course_code.strip()
    if credential.strip():
        schema["educationalCredentialAwarded"] = credential.strip()
    if price.strip():
        schema["offers"] = {
            "@type": "Offer",
            "price": price.strip(),
            "priceCurrency": currency.strip(),
            "category": "Tuition"
        }
    return schema

def generate_organization_schema(
    name: str,
    url: str,
    logo_url: str,
    description: str,
    social_urls: List[str] = None
) -> Dict[str, Any]:
    schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": name.strip(),
        "url": url.strip(),
        "logo": logo_url.strip(),
        "description": description.strip(),
        "sameAs": [s.strip() for s in (social_urls or []) if s.strip()]
    }
    return schema

def generate_howto_schema(
    name: str,
    description: str,
    total_time: str,
    steps: List[Dict[str, str]]
) -> Dict[str, Any]:
    step_entities = []
    for idx, s in enumerate(steps, 1):
        step_entities.append({
            "@type": "HowToStep",
            "position": idx,
            "name": s.get("title", f"Step {idx}").strip(),
            "text": s.get("text", "").strip()
        })
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": name.strip(),
        "description": description.strip(),
        "totalTime": total_time.strip() or "PT30M",
        "step": step_entities
    }
