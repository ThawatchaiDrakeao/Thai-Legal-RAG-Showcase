import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

try:
    import faiss
except Exception:
    faiss = None
import numpy as np
import torch
from sentence_transformers import SentenceTransformer

try:
    import resource
except ImportError:  # Windows local development does not provide resource.
    resource = None

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PROJECT_DIR = Path(__file__).resolve().parents[1]
INDEX_PATH = PROJECT_DIR / "data" / "processed" / "faiss_index.bin"
META_PATH = PROJECT_DIR / "data" / "processed" / "meta.json"
MODEL_NAME = "alphaedge-ai/multilingual-e5-small-tha-16384"
MODEL_CACHE_DIR = PROJECT_DIR / ".sentence_transformers_cache"


def _log_rss(label):
    if resource is None:
        return
    rss_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    print(f"[MEMDIAG] {label}: {rss_kb / 1024:.1f} MiB", flush=True)


RELEVANCE_THRESHOLD = 0.5

_THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙"
_ARABIC_DIGITS = "0123456789"
_DIGIT_TABLE = str.maketrans(_THAI_DIGITS, _ARABIC_DIGITS)


def has_relevant_context(results, threshold=RELEVANCE_THRESHOLD):
    return any(item["score"] >= threshold for item in results)


def _thai_to_arabic_digits(text):
    return text.translate(_DIGIT_TABLE)


def extract_article_number(query):
    """Return the article number (int) if the query explicitly asks about
    'มาตรา <number>', else None. Handles both Thai and Arabic digits."""
    normalized = _thai_to_arabic_digits(query)
    match = re.search(r"มาตรา\s*(\d+)", normalized)
    if match:
        return int(match.group(1))
    return None


def _normalize_article_field(value):
    """Extract the leading integer from an article_id/article_number field
    such as '289', '371/1', or 'intro-1'. Returns None if no leading digits."""
    if value is None:
        return None
    match = re.search(r"\d+", str(value))
    return int(match.group()) if match else None


def _matches_category(item, category):
    if not category or str(category).lower() in ("all", "ทั้งหมด", ""):
        return True
    cat = str(category).lower()
    source = str(item.get("source", "")).lower()
    source_file = str(item.get("source_file", "")).lower()
    text = str(item.get("text", "")).lower()
    item_cat = str(item.get("category", "")).lower()

    if cat in ("criminal", "อาญา"):
        return (
            item_cat == "criminal"
            or "pythainlp" in source
            or "อาญา" in source_file
            or "อาญา" in text[:60]
        )
    if cat in ("civil", "แพ่ง", "แพ่งและพาณิชย์"):
        return (
            item_cat == "civil"
            or "civil" in source_file
            or "แพ่ง" in source_file
            or "แพ่ง" in text[:60]
        )
    if cat in ("finance", "การเงิน", "ธุรกิจ"):
        return item_cat == "finance" or any(
            w in (source_file + text)
            for w in ("บริษัท", "หุ้น", "หลักทรัพย์", "การเงิน", "สถาบันการเงิน")
        )
    if cat in ("tax", "ภาษี", "ภาษีอากร"):
        return item_cat == "tax" or any(
            w in (source_file + text)
            for w in ("รัษฎากร", "ภาษี", "อากร", "แสตมป์")
        )
    return True


def _build_result(item, score, exact_match=False):
    return {
        "score": float(score),
        "exact_match": exact_match,
        "text": item["text"],
        "source": item["source"],
        "source_file": item.get("source_file", item["source"]),
        "page_number": item.get("page_number"),
        "article_id": item.get("article_id"),
        "article_number": item.get("article_number"),
        "phak": item.get("phak"),
        "laksana": item.get("laksana"),
        "muad": item.get("muad"),
        "suan": item.get("suan"),
        "source_url": item.get("source_url"),
        "license": item.get("license"),
        "category": item.get("category"),
    }


def load():
    if faiss is None:
        raise RuntimeError(
            "FAISS library is unavailable or blocked by system security policy. In production/Linux Docker, faiss-cpu runs natively."
        )
    if not INDEX_PATH.exists() or not META_PATH.exists():
        raise FileNotFoundError(
            "FAISS index is missing. Run chunk_documents.py, then build_embeddings.py first."
        )
    with tempfile.NamedTemporaryFile(
        prefix="thai_legal_rag_", suffix=".bin", delete=False
    ) as tmp_file:
        tmp_path = Path(tmp_file.name)

    try:
        shutil.copy2(INDEX_PATH, tmp_path)
        index = faiss.read_index(str(tmp_path))
    finally:
        if tmp_path.exists():
            tmp_path.unlink()
    with open(META_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)
    _log_rss("before_model_load")
    torch.set_num_threads(1)
    try:
        model_kwargs = {}
        if MODEL_CACHE_DIR.exists():
            model_kwargs["cache_folder"] = str(MODEL_CACHE_DIR)
        model = SentenceTransformer(
            MODEL_NAME,
            local_files_only=True,
            **model_kwargs,
        )
    except Exception:
        _log_rss("crash_point")
        raise
    _log_rss("after_model_load")
    return index, meta, model


def search(query, index, meta, model, top_k=3, category=None):
    results = []
    seen_indices = set()

    # Step 1: exact article-number match, if the question names one explicitly.
    target_article = extract_article_number(query)
    if target_article is not None:
        for idx, item in enumerate(meta):
            if not _matches_category(item, category):
                continue
            article_num = _normalize_article_field(
                item.get("article_id")
            ) or _normalize_article_field(item.get("article_number"))
            if article_num == target_article:
                results.append(_build_result(item, score=1.0, exact_match=True))
                seen_indices.add(idx)

    # Step 2: semantic search fills in the rest (or all of it, if no exact match).
    raw_vec = np.asarray(
        model.encode_query(
            [query],
            normalize_embeddings=True,
            convert_to_numpy=True,
        )[0],
        dtype="float32",
    )
    norm = np.linalg.norm(raw_vec)
    if norm > 0:
        raw_vec = raw_vec / norm
    query_vec = raw_vec.reshape(1, -1)

    search_k = (
        top_k * 5
        if (category and str(category).lower() not in ("all", "ทั้งหมด", ""))
        else top_k
    )
    scores, indices = index.search(query_vec, min(search_k, len(meta)))

    for score, idx in zip(scores[0], indices[0]):
        if idx == -1 or idx in seen_indices:
            continue
        item = meta[idx]
        if not _matches_category(item, category):
            continue
        if len(results) >= top_k:
            break
        results.append(_build_result(meta[idx], score=float(score)))
        seen_indices.add(idx)

    # Fallback to general results if category filter yields zero candidates
    if (
        len(results) == 0
        and category
        and str(category).lower() not in ("all", "ทั้งหมด", "")
    ):
        return search(query, index, meta, model, top_k=top_k, category=None)

    return results[:top_k]


if __name__ == "__main__":
    index, meta, model = load()
    print("พิมพ์คำถาม (พิมพ์ 'exit' เพื่อออก)")
    while True:
        q = input("\n❓ คำถาม: ")
        if q.strip().lower() == "exit":
            break
        results = search(q, index, meta, model)
        for i, r in enumerate(results, 1):
            location = r["source_file"]
            if r["page_number"] is not None:
                location += f" page={r['page_number']}"
            tag = " [EXACT MATCH]" if r.get("exact_match") else ""
            print(
                f"\n[{i}] score={r['score']:.4f} source={r['source']} ({location}){tag}"
            )
            print(r["text"][:300])
