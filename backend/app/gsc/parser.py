import csv
import io
import re
from typing import List, Dict, Any, Tuple, Optional

def clean_numeric(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    
    s = str(val).strip().replace(",", "")
    if not s:
        return default
        
    # Handle percentage strings like "5.2%"
    if s.endswith("%"):
        try:
            return float(s[:-1].strip()) / 100.0
        except ValueError:
            return default
            
    try:
        return float(s)
    except ValueError:
        return default

def clean_ctr(val: Any) -> float:
    """
    Normalizes CTR to a decimal between 0.0 and 1.0.
    Handles '5.2%', '0.052', and '5.2' (when exported as percentage without symbol).
    """
    if val is None:
        return 0.0
    s = str(val).strip().replace(",", "")
    if not s:
        return 0.0
        
    if s.endswith("%"):
        try:
            return round(float(s[:-1].strip()) / 100.0, 4)
        except ValueError:
            return 0.0
            
    try:
        num = float(s)
        # If exported as 5.2 (meaning 5.2%), normalize to 0.052
        if num > 1.0:
            return round(num / 100.0, 4)
        return round(max(0.0, min(1.0, num)), 4)
    except ValueError:
        return 0.0

def parse_gsc_csv(csv_content: str) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
    """
    Parses a Google Search Console CSV export.
    Returns: (parsed_rows, columns_detected, errors)
    """
    rows: List[Dict[str, Any]] = []
    errors: List[str] = []
    
    # Strip BOM if present
    content = csv_content.lstrip("\ufeff")
    
    # Use io.StringIO and standard csv reader
    f = io.StringIO(content)
    try:
        reader = csv.reader(f)
    except Exception as e:
        return [], [], [f"Failed to initialize CSV reader: {str(e)}"]
        
    header_row = None
    header_line_num = 0
    
    # Find the header row (skip preamble metadata lines that Google sometimes includes)
    for line_idx, line in enumerate(reader):
        if not line:
            continue
        # Check if line contains known GSC column headers
        lower_line = [c.strip().lower() for c in line]
        if any(h in lower_line for h in ["query", "top queries", "clicks", "impressions", "page", "top pages"]):
            header_row = line
            header_line_num = line_idx + 1
            break
            
    if not header_row:
        return [], [], ["Could not identify valid Google Search Console header row (expected columns like 'Query', 'Clicks', 'Impressions', 'CTR', 'Position')."]
        
    # Map column indexes
    col_map: Dict[str, int] = {}
    columns_detected: List[str] = []
    
    for idx, col in enumerate(header_row):
        col_clean = col.strip().lower()
        columns_detected.append(col.strip())
        
        if col_clean in ["query", "top queries", "top query", "search query", "keyword"]:
            col_map["query"] = idx
        elif col_clean in ["page", "top pages", "url", "landing page"]:
            col_map["page"] = idx
        elif col_clean in ["clicks", "click"]:
            col_map["clicks"] = idx
        elif col_clean in ["impressions", "impression", "imps"]:
            col_map["impressions"] = idx
        elif col_clean in ["ctr", "click through rate", "click-through rate"]:
            col_map["ctr"] = idx
        elif col_clean in ["position", "pos", "avg position", "average position"]:
            col_map["position"] = idx
            
    # Process data rows
    for row_idx, line in enumerate(reader, start=header_line_num + 1):
        if not line or all(not cell.strip() for cell in line):
            continue
            
        try:
            # Extract query
            query_val = ""
            if "query" in col_map and col_map["query"] < len(line):
                query_val = line[col_map["query"]].strip()
                
            # Extract page
            page_val = ""
            if "page" in col_map and col_map["page"] < len(line):
                page_val = line[col_map["page"]].strip()
                
            # If line has no query and no page, skip or flag
            if not query_val and not page_val:
                continue
                
            # If row is a page-only export, use page as identifier
            if not query_val and page_val:
                query_val = f"[Page] {page_val}"
                
            # Numeric fields
            clicks_val = int(clean_numeric(line[col_map["clicks"]] if "clicks" in col_map and col_map["clicks"] < len(line) else 0))
            impressions_val = int(clean_numeric(line[col_map["impressions"]] if "impressions" in col_map and col_map["impressions"] < len(line) else 0))
            
            # CTR
            if "ctr" in col_map and col_map["ctr"] < len(line):
                ctr_val = clean_ctr(line[col_map["ctr"]])
            elif impressions_val > 0:
                ctr_val = round(clicks_val / impressions_val, 4)
            else:
                ctr_val = 0.0
                
            # Position
            position_val = clean_numeric(line[col_map["position"]] if "position" in col_map and col_map["position"] < len(line) else 0.0)
            
            rows.append({
                "query": query_val,
                "page": page_val or None,
                "clicks": clicks_val,
                "impressions": impressions_val,
                "ctr": round(ctr_val, 4),
                "position": round(position_val, 1)
            })
        except Exception as row_err:
            errors.append(f"Row {row_idx}: {str(row_err)}")
            
    return rows, columns_detected, errors
