import json
import shutil
import tempfile
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


PROJECT_DIR = Path(__file__).resolve().parents[1]
PROCESSED_DIR = PROJECT_DIR / "data" / "processed"

CHUNKS_PATH = PROCESSED_DIR / "chunks.json"
INDEX_PATH = PROCESSED_DIR / "faiss_index_e5.bin"

MODEL_NAME = "alphaedge-ai/multilingual-e5-small-tha-16384"


def main():
    print("Loading chunks...")

    with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    if not chunks:
        raise ValueError("No chunks found.")

    print("Total chunks:", len(chunks))
    print("Loading model:", MODEL_NAME)

    model = SentenceTransformer(MODEL_NAME)

    texts = [c["text"] for c in chunks]

    print("Encoding documents...")

    embeddings = model.encode_document(
        texts,
        batch_size=32,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    embeddings = np.asarray(embeddings, dtype="float32")

    print("Embedding shape:", embeddings.shape)

    dim = embeddings.shape[1]

    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    print("FAISS vectors:", index.ntotal)
    print("Dimension:", dim)

    with tempfile.NamedTemporaryFile(
        prefix="thai_legal_rag_e5_",
        suffix=".bin",
        delete=False,
    ) as tmp_file:
        tmp_path = Path(tmp_file.name)

    try:
        faiss.write_index(index, str(tmp_path))
        shutil.move(str(tmp_path), str(INDEX_PATH))
    finally:
        if tmp_path.exists():
            tmp_path.unlink()

    print()
    print("Saved:", INDEX_PATH)
    print("Done!")


if __name__ == "__main__":
    main()