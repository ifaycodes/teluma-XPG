import json
import re
from datetime import datetime, timezone
from typing import Optional


def extract_json(text: str):
    """Parse LLM JSON output, tolerating mark down code fences
    and leading/trailing prose the model possibly added despite instructions not to."""
    text = text.strip()
    fence_match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if fence_match:
        text = fence_match.group(1).strip()
    else:
        # fall back to the outermost [...] or {...} block
        bracket_match = re.search(r"(\[.*\]|\{.*\})", text, re.DOTALL)
        if bracket_match:
            text = bracket_match.group(1).strip()
    return json.loads(text)


def parse_deadline(value) -> Optional[datetime]:
    """Parse of provided deadline string into a UTC datetime.
    Returns None if the value is missing or unparseable, rather than raising."""
    if not value or not isinstance(value, str):
        return None
    value = value.strip()
    if not value or value.lower() in ("none", "n/a", "unknown", "tbd", "rolling"):
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%B %d, %Y", "%b %d, %Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None
