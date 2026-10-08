import csv
import io
from typing import List, Dict, Any, Tuple
from urllib.parse import urlparse
from app.gsc.parser import clean_numeric, clean_ctr

def clean_numeric_int(val: Any, default: int = 0) -> int:
    try:
        return int(clean_numeric(val, default=float(default)))
    except Exception:
        return default

def clean_numeric_float(val: Any, default: float = 0.0) -> float:
    try:
        return float(clean_numeric(val, default=default))
    except Exception:
        return default

def clean_rate(val: Any, default: float = 0.0) -> float:
    return clean_ctr(val)

def clean_page_path(url_or_path: str) -> str:
    if not url_or_path:
        return "/"
    p = str(url_or_path).strip()
    if p.startswith("http://") or p.startswith("https://"):
        try:
            parsed = urlparse(p)
            p = parsed.path
        except Exception:
            pass
    if "?" in p:
        p = p.split("?")[0]
    p = p.rstrip("/")
    if not p:
        return "/"
    return p if p.startswith("/") else f"/{p}"

def parse_ga4_csv(csv_content: str) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
    """
    Parses a Google Analytics 4 (GA4) CSV export.
    Supports pages, landing pages, and traffic reports.
    Returns: (parsed_rows, columns_detected, errors)
    """
    rows: List[Dict[str, Any]] = []
    errors: List[str] = []

    content = csv_content.lstrip("\ufeff")
    f = io.StringIO(content)
    try:
        reader = csv.reader(f)
    except Exception as e:
        return [], [], [f"Failed to read CSV: {str(e)}"]

    header_row = None
    header_line_num = 0

    for line_idx, line in enumerate(reader):
        if not line:
            continue
        lower_line = [c.strip().lower() for c in line]
        # Match GA4 standard columns
        if any(h in lower_line for h in ["page path", "page path and screen class", "page title", "views", "sessions", "users"]):
            header_row = line
            header_line_num = line_idx + 1
            break

    if not header_row:
        return [], [], ["Could not identify valid GA4 header row (expected columns like 'Page path', 'Views', 'Users', 'Sessions')."]

    col_map: Dict[str, int] = {}
    columns_detected: List[str] = []

    for idx, col in enumerate(header_row):
        clean_col = col.strip().lower()
        columns_detected.append(col.strip())

        if any(k in clean_col for k in ["page path and screen class", "page path", "path"]):
            col_map["page_path"] = idx
        elif any(k in clean_col for k in ["page title and screen name", "page title", "title"]):
            col_map["page_title"] = idx
        elif clean_col in ["page", "page url", "landing page", "landing page + query string"]:
            col_map["page_path"] = idx
        elif any(k in clean_col for k in ["views", "screen views"]):
            col_map["views"] = idx
        elif any(k in clean_col for k in ["total users", "active users", "users"]):
            col_map["users"] = idx
        elif any(k in clean_col for k in ["sessions"]):
            col_map["sessions"] = idx
        elif any(k in clean_col for k in ["engagement rate", "user engagement"]):
            col_map["engagement_rate"] = idx
        elif any(k in clean_col for k in ["conversions", "key events"]):
            col_map["conversions"] = idx
        elif clean_col == "date":
            col_map["date"] = idx

    for row_idx, line in enumerate(reader, start=header_line_num + 1):
        if not line or all(not cell.strip() for cell in line):
            continue

        try:
            page_path_val = ""
            if "page_path" in col_map and col_map["page_path"] < len(line):
                page_path_val = line[col_map["page_path"]].strip()

            page_title_val = ""
            if "page_title" in col_map and col_map["page_title"] < len(line):
                page_title_val = line[col_map["page_title"]].strip()

            if not page_path_val and not page_title_val:
                continue
            if not page_path_val and page_title_val:
                page_path_val = f"/{page_title_val.lower().replace(' ', '-')}"

            views_val = int(clean_numeric(line[col_map["views"]] if "views" in col_map and col_map["views"] < len(line) else 0))
            users_val = int(clean_numeric(line[col_map["users"]] if "users" in col_map and col_map["users"] < len(line) else 0))
            sessions_val = int(clean_numeric(line[col_map["sessions"]] if "sessions" in col_map and col_map["sessions"] < len(line) else 0))
            
            eng_rate_val = 0.0
            if "engagement_rate" in col_map and col_map["engagement_rate"] < len(line):
                eng_rate_val = clean_ctr(line[col_map["engagement_rate"]])

            conversions_val = int(clean_numeric(line[col_map["conversions"]] if "conversions" in col_map and col_map["conversions"] < len(line) else 0))

            date_val = None
            if "date" in col_map and col_map["date"] < len(line):
                date_val = line[col_map["date"]].strip()

            rows.append({
                "page_path": page_path_val,
                "page_title": page_title_val or None,
                "views": views_val,
                "users": users_val,
                "sessions": sessions_val,
                "engagement_rate": round(eng_rate_val, 4),
                "conversions": conversions_val,
                "date": date_val
            })
        except Exception as err:
            errors.append(f"Row {row_idx}: {str(err)}")

    return rows, columns_detected, errors
