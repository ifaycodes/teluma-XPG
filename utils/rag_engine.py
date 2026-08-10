import json
import re
import logging
from sqlalchemy.orm import Session
from models import VaultDocument
from storage import download_text, GCS_BUCKET_VAULT

logger = logging.getLogger(__name__)

def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"\w+", text.lower()))

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

def retrieve_relevant_vault_context(
    user_id: str,
    grant_query: str,
    db: Session,
    top_k: int = 5
) -> list[dict]:
    """RAG retriever: fetches Vault documents for the user, extracts text chunks,
    ranks them by keyword relevance against the target grant query, and returns
    only the top_k most relevant passages."""
    vault_docs = db.query(VaultDocument).filter_by(user_id=user_id).all()
    if not vault_docs:
        return []

    query_tokens = _tokenize(grant_query)
    scored_chunks = []

    for doc in vault_docs:
        doc_text = f"Document Name: {doc.name}\nTag: {doc.tag}\n"
        try:
            raw_content = download_text(gcs_path=doc.gcs_path, bucket_name=GCS_BUCKET_VAULT)
            doc_text += raw_content
        except Exception:
            # Fall back to metadata if binary or unavailable
            doc_text += f"Metadata: {doc.name} ({doc.tag})"

        chunks = chunk_text(doc_text, chunk_size=300, overlap=30)
        for chunk in chunks:
            chunk_tokens = _tokenize(chunk)
            if not chunk_tokens:
                continue
            # Jaccard / token overlap scoring
            intersection = query_tokens.intersection(chunk_tokens)
            score = len(intersection) / float(len(query_tokens) + 1e-5)

            # Boost if document tag matches common requirement domains
            if doc.tag in ("financial", "organizational", "proposal"):
                score *= 1.25

            scored_chunks.append({
                "doc_name": doc.name,
                "tag": doc.tag,
                "score": score,
                "content": chunk[:800]
            })

    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    top_chunks = scored_chunks[:top_k]

    return [
        {
            "doc_name": item["doc_name"],
            "tag": item["tag"],
            "relevance_score": round(item["score"], 4),
            "content": item["content"]
        }
        for item in top_chunks
    ]
