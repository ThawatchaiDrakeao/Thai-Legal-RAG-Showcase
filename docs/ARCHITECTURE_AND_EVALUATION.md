# Thai Legal RAG - สรุปโปรเจกต์

## เป้าหมาย

สร้างระบบ RAG (Retrieval-Augmented Generation) สำหรับตอบคำถามด้านกฎหมายไทย โดยใช้เอกสารกฎหมายจริงเป็นฐานความรู้ แล้วให้ AI ตอบโดยอ้างอิงจากบริบทที่ค้นพบเท่านั้น

ระบบนี้เป็นต้นแบบเพื่อการศึกษา ไม่ใช่คำปรึกษากฎหมายจากทนายความ

## Tech Stack

| ส่วนประกอบ | เครื่องมือที่ใช้ |
|---|---|
| ภาษา | Python |
| LLM | Google Gemini (`gemini-2.5-flash`, free tier) |
| SDK | `google-genai` |
| Embedding | `alphaedge-ai/multilingual-e5-small-tha-16384` via `sentence-transformers` |
| Vector search | FAISS + normalized inner product (cosine similarity) |
| Retrieval | Hybrid: exact article-number match + semantic search |
| Backend API | FastAPI + Uvicorn พร้อม global rate limiting |
| Frontend | React + Vite (`frontend/`) |
| Environment | Python venv ที่ `venv/` |
| OS / Terminal | Windows + PowerShell/Git Bash |

## Corpus ปัจจุบัน (production index)

| แหล่งข้อมูล | รูปแบบ | สถานะ |
|---|---|---|
| `sample_law.txt` | ข้อความตัวอย่าง | ใช้งานจริง (3 chunks) |
| ประมวลกฎหมายแพ่งและพาณิชย์ | PDF (text-based, สะอาด) | ใช้งานจริง (~2,900 chunks) |
| ประมวลกฎหมายอาญา | CSV จาก [PyThaiNLP/thai-law](https://github.com/PyThaiNLP/thai-law) (hand-labeled, public domain) | ใช้งานจริง (452 มาตรา, มาตรา 1-398 ครบ) |
| ประมวลกฎหมายอาญา (PDF + OCR) | PDF scan + Tesseract OCR | **ไม่ใช้ใน production** — ดู "ข้อจำกัดที่ทราบ" ด้านล่าง |

รวม FAISS index ปัจจุบัน: **3,361 vectors**

## ข้อจำกัดที่ทราบ (Known Limitations)

### 1. PDF อาญา (penal_code_snapshot.pdf) ถูกตัดออกจาก production pipeline

**สาเหตุ**: หน้า PDF ต้นฉบับมีปัญหา font encoding (Private Use Area characters แทนสระ/วรรณยุกต์) ลองแก้หลายทาง:
- เปลี่ยนไลบรารี extract (pypdf, pdfplumber, PyMuPDF) → ได้ผลเหมือนกันหมด ไม่ช่วย
- OCR ด้วย Tesseract (250 DPI) → อ่านสระ/วรรณยุกต์ถูกแล้ว แต่เลขมาตราคลาดเคลื่อนหนัก (297/435 suspicious findings)
- ปรับปรุง OCR (400 DPI + binarization + deskew + psm 6) → แทบไม่ต่างจากเดิม (298/435) ยืนยันว่าไม่ใช่ปัญหา config

**ทางแก้ที่ใช้จริง**: เปลี่ยนไปใช้ PyThaiNLP/thai-law CSV dataset แทน (hand-labeled, public domain, มาจาก krisdika.go.th) sanity check ผ่าน 100% (0 out-of-order, 0 duplicate, 0 gap)

**เก็บไว้เป็นทางเลือกสำรอง**: โค้ด PDF/OCR (`src/ingest_pdf.py`) และไฟล์ PDF เดิมยังอยู่ครบ เผื่อในอนาคตหา PDF ต้นฉบับที่ encoding ถูกต้องได้ ดู `scripts/validate_ocr_quality.py`, `scripts/sample_ocr_findings.py` สำหรับกระบวนการตรวจสอบที่ใช้

### 2. Gemini API free tier — quota ต่ำมาก

**ยืนยันจาก production**: `gemini-2.5-flash` free tier จำกัดที่ **5 requests/นาที และ 20 requests/วัน** (quota ระดับ project ไม่ใช่ per-user)

**การป้องกัน**: `src/api.py` มี global rate limiter (4/นาที, 15/วัน — ต่ำกว่า quota จริงของ Gemini เพื่อเผื่อ buffer) และแยก HTTP 429 (quota exceeded) ออกจาก 500 (server error จริง) ชัดเจน

**ผลกระทบ**: เหมาะสำหรับ demo เฉพาะกิจ/สัมภาษณ์งาน ไม่เหมาะสำหรับใช้งานจริงที่มีผู้ใช้พร้อมกันหลายคน — ถ้าจะ deploy ใช้งานจริงต้องอัปเกรดเป็น paid tier

## ความคืบหน้า

- [x] Pipeline หลัก: chunking → embedding → FAISS → Gemini ทำงานสมบูรณ์
- [x] Hybrid retrieval: ถามเลขมาตราตรงๆ ได้ exact match เสมอ (แก้ปัญหา semantic search พลาดมาตราที่ใกล้เคียงกันทางตัวเลข)
- [x] Automated tests: `tests/` ผ่านครบ 5/5 (`pytest tests/ -v`)
- [x] FastAPI backend (`/health`, `/ask`) พร้อม global rate limiting และ error handling ที่แยก 429/500
- [x] React/Vite frontend พร้อม source citation, loading state, disclaimer
- [x] Corpus 3 แหล่งครบ (sample + แพ่งพาณิชย์ + อาญา ผ่าน PyThaiNLP CSV)
- [ ] ทดสอบ `/ask` end-to-end ผ่าน API จริงอีกรอบ (รอ Gemini quota reset)
- [ ] Docker
- [ ] Cloud deployment
- [ ] Guardrails เพิ่มเติม (prompt injection defense)
- [ ] Multi-turn conversation memory

## โครงสร้างไฟล์ปัจจุบัน

```text
data/raw/sample_law.txt                        เอกสารกฎหมายตัวอย่าง
data/raw/civil_commercial_code_snapshot.pdf     ประมวลกฎหมายแพ่งและพาณิชย์ (ใช้งานจริง)
data/raw/penal_code_snapshot.pdf                ประมวลกฎหมายอาญา PDF (สำรอง ไม่ใช้ใน production)
data/raw/penal_code_pythainlp.csv               ประมวลกฎหมายอาญา จาก PyThaiNLP (ใช้งานจริง)
data/raw/SOURCES.md                             แหล่งที่มาและข้อจำกัดของข้อมูลทุกแหล่ง
data/processed/chunks.json                      chunks ปัจจุบัน (3,361 รายการ)
data/processed/faiss_index.bin, meta.json       production index
data/processed/pythainlp_articles.json          ข้อมูล CSV ที่ normalize แล้ว
data/processed/pdf_pages.json                   ข้อความ PDF รายหน้า (รวมของที่ไม่ได้ใช้)
src/ingest_pdf.py                               อ่าน PDF + OCR fallback (สำรอง)
src/ingest_csv.py                               อ่าน PyThaiNLP CSV (ใช้งานจริง)
src/chunk_documents.py                          รวม chunks จากทุกแหล่ง (กรอง penal_code_snapshot.pdf ออก)
src/build_embeddings.py                         สร้าง embeddings และ FAISS index
src/query.py                                    hybrid retrieval (exact match + semantic)
src/rag_pipeline.py                             retrieval + Gemini answer + citation
src/api.py                                      FastAPI backend พร้อม rate limiting
scripts/validate_ocr_quality.py                 ตรวจสอบคุณภาพ OCR (diagnostic, ไม่ใช้ใน production)
scripts/sample_ocr_findings.py                  สุ่มตรวจผล OCR ด้วยตา
scripts/compare_pdf_extract.py                  เทียบ pypdf/pdfplumber/PyMuPDF
scripts/validate_pythainlp_csv.py               ตรวจสอบคุณภาพ CSV ก่อน rebuild
frontend/                                       React/Vite web demo
tests/                                          automated tests (5 passed)
context.md                                      บริบทสำหรับ AI assistant
README.md                                       คู่มือติดตั้งและรัน

## Latest verified state (2026-09-11)

This section records the latest verified Docker and production-embedding work. Earlier sections remain historical project context.

### Current status

- The CPU-only production image was built and tested locally.
- The Render deployment was not pushed or deployed after this work, so production recovery is not yet verified.
- The previous Render incident remains the operational context: `/ask` failed while lazy-loading embedding resources. This change removes runtime Hugging Face dependency and CUDA/Torch ambiguity, but does not prove that the 512 MiB Render limit is sufficient.

### Root cause and Docker changes

- The verified runtime risks addressed here were an unpinned Torch dependency that could resolve to a non-CPU build and runtime model loading that could contact Hugging Face.
- `requirements-docker.txt` now installs `torch==2.13.0+cpu` from the official PyTorch CPU wheel index and explicitly pins `numpy==1.26.4`.
- The Docker build still uses `alphaedge-ai/multilingual-e5-small-tha-16384`, downloads it into `/app/.sentence_transformers_cache`, and sets `HF_HUB_OFFLINE=1` for runtime.
- Runtime model loading uses `local_files_only=True` in `src/query.py`; the index-building path in `src/build_embeddings.py` uses the same local-only behavior.
- SentenceTransformers version verified in the image: `6.0.1`.

### Image and runtime evidence

- `docker build --no-cache --progress=plain -t thai-legal-rag-diagnostic .` completed successfully.
- Image verification reported: `torch=2.13.0+cpu`, `cuda=False`, `sentence_transformers=6.0.1`, `numpy=1.26.4`, and `faiss=1.15.0`.
- The image contains the model weights (`model.safetensors`) and tokenizer/config/SentenceTransformer files. Cache size was approximately 108 MB.
- The build produced `data/processed/chunks.json`, `meta.json`, and `faiss_index.bin` with 3,361 records/vectors; the expected vector count is 3,361.
- No NVIDIA/CUDA packages were present in the image package inspection.
- Container RSS after model load reached `526.5 MiB` locally. Docker Desktop had 15.28 GiB available, so this is not Render evidence; it remains a blocker/risk against Render's 512 MiB limit.

### API and regression evidence

- Local container `/` and `/health` returned HTTP 200.
- One valid local `/ask` request for `มาตรา 420 มีความรับผิดอย่างไร` returned HTTP 200 with an answer, `found_context: true`, and sources from `civil_commercial_code_snapshot.pdf` (page 75, score 1.0). Article 420 behavior therefore remained verified for this request.
- Article 288 exact-match metadata verification found two matching records, from `civil_commercial_code_snapshot.pdf` and `pythainlp_thai_law`; no second `/ask` request was used for this check.
- Container logs confirmed baked-model loading without a runtime Hugging Face download/retry and showed the complete `[ASK]` sequence through a successful response.
- `python -m compileall src` passed.
- `pytest tests -q` passed: 6 tests.
- `git diff --check` passed with no whitespace errors.

### Files and commits

- The implementation commit changed only: `Dockerfile`, `requirements-docker.txt`, `src/build_embeddings.py`, and `src/query.py`.
- Previous diagnostic commit: `00e3c91 debug: add ask request diagnostics`.
- Current implementation commit: `5248818 fix: use CPU torch and offline baked embedding model`.
- `origin/main` remained at `00e3c91`; no push or Render deployment was performed.
- No secrets were included in the image or committed. `.env` was injected only for the local container test and remained excluded by `.dockerignore`.

### Remaining blockers

- Render must still be tested with the new commit. The local post-load RSS of 526.5 MiB exceeds the stated Render 512 MiB limit, so production success cannot be claimed.
- Experimental reranker work and its known limitations remain separate from this production image change.

## Production verification (2026-09-11)

- Commits `5248818` and `44d845b` were pushed to `origin/main`; the push completed as `00e3c91..44d845b main -> main`.
- The live service subsequently responded from Render/Uvicorn. `GET /` returned HTTP 200 with `{"service":"Thai Legal RAG API","status":"ok"}`.
- `GET /health` returned HTTP 200 with `{"status":"ok","service":"Thai Legal RAG API","daily_requests_used":0,"daily_requests_limit":15,"minute_requests_used":0,"minute_requests_limit":4}` at verification time.
- Production Article 420 request (`มาตรา 420 มีความรับผิดอย่างไร`) returned HTTP 200, an answer, `found_context: true`, and a matching `civil_commercial_code_snapshot.pdf` source on page 75 with score 1.0.
- Production Article 288 request (`มาตรา 288 มีโทษอย่างไร`) returned HTTP 200, an answer, `found_context: true`, and the criminal Article 288 source from `pythainlp_thai_law`; the response also contained a civil-code Article 288 collision as another retrieved source, which is a known multi-domain exact-number limitation.
- The two valid production requests completed successfully after deployment. Render runtime logs were not available through the current repository/session, so no direct log-based claim is made about runtime Hugging Face downloads, exact deployed commit, or production peak RSS.
- Render memory limit and production peak memory remain `UNKNOWN`; the local Docker peak of 526.5 MiB must not be treated as Render measurement.
- Current production verification is positive for these smoke/regression requests, but it is not a claim of long-term production stability.

## Production frontend and E2E verification (2026-09-11)

- Production frontend: `https://thai-legal-rag.vercel.app`.
- Production backend: `https://thai-legal-rag.onrender.com`.
- Frontend stack: React + Vite on Vercel; `VITE_API_URL` points to the Render backend.
- Production frontend build passed, the Vercel deployment passed, and the frontend is publicly accessible.
- The production JavaScript artifact does not contain the localhost fallback `http://127.0.0.1:8000`.
- No browser runtime test was performed before deployment; the production browser smoke test was subsequently completed successfully.

### Production E2E checks

- Article 420 question `มาตรา 420 มีความรับผิดอย่างไร`: Vercel to Render request succeeded, the answer rendered, `found_context=true`, and `civil_commercial_code_snapshot.pdf` page 75 was shown with score `1.000`. The answer described Article 420 tort liability. Result: **PASS**.
- Article 288 question `มาตรา 288 คืออะไร`: the frontend surfaced both contexts with score `1.000`: Civil and Commercial Code page 55 concerning a preferential right related to a real-estate sale, and the PyThaiNLP criminal context concerning killing another person. Result: **PASS**.

### Future quality backlog

Article-number ambiguity / retrieval noise remains a future quality improvement. Article numbers can collide across legal sources, and `มาตรา 288` demonstrates that the current result list can contain multiple contexts and noisier Civil Code passages. Possible future directions include stronger source disambiguation, metadata filtering, intent/source classification, or reranking. No fix was implemented in this milestone.

## STEP 11 — Expanded Legal Benchmark

- **Objective:** Expand the legal-aware retrieval benchmark and independently evaluate BASELINE vs FULL_LEGAL on a broader labeled test set.
- **Methodology:** 39 independently labeled legal queries covering exact article, cross-reference, nighttime theft, snatching, snatching ทวิ, embezzlement/possession, found property, intentional killing, no-intent-to-kill, negligent death, bodily harm, self-defense, civil/criminal article collisions, and no-signal controls. Candidate generation and semantic scoring were performed without using expected labels; expected labels were used only for final evaluation.
- **Result:** BASELINE 23/39 (58.97%); FULL_LEGAL 28/39 (71.79%); improved 5 cases; regressed 0; top-1 changed 7; accuracy delta +12.82 percentage points.
- **Known failure modes:** PASS. Remaining failures include cross-reference cases, nighttime theft, embezzlement/possession, found-property cases, and some bodily-harm queries.
- **Safety:** Expected leakage PASS; synthetic score PASS; production tracked diff CLEAN.
- **Limitation:** Metadata stores 335 ทวิ and 336 ทวิ under the same numeric article values as 335 and 336, so article/source identity cannot fully distinguish subarticle text.
- **Decision:** PASS — FULL_LEGAL remains the preferred experimental configuration.
- **Next step:** Proceed to STEP 12 for evidence-based tuning/threshold analysis using the expanded 39-case benchmark. Do not modify production until tuning is validated.

## STEP 11.8 — Source-Aware + Candidate Recall Validation

- **Objective:** ตรวจสอบว่า source-aware scoring สามารถแก้ ambiguity ระหว่างกฎหมายแพ่ง/อาญาได้หรือไม่ และตรวจสอบว่า remaining failures ของ FULL_LEGAL เกิดจาก retrieval/candidate recall หรือ ranking discrimination
- **Scope:** Experimental only. ไม่แก้ production retrieval/reranker, ไม่ rebuild production index และไม่ deploy

### Source-aware experiment

- เพิ่ม experimental source-aware bonus `+0.12` เมื่อ query มี explicit legal-source cue (`civil` / `criminal`) ที่ตรงกับ candidate source
- Positive controls ผ่าน:
  - Article 420 + explicit civil cue → civil candidate ชนะ
  - Article 295 + explicit criminal cue → criminal candidate ชนะ
- Cross-reference Article 69 และ 290 ไม่มี explicit source cue จึงไม่ให้ source bonus และไม่ hard-code ให้เลือก criminal
- Result:
  - FULL_LEGAL: **28/39 (71.79%)**
  - SOURCE_AWARE: **28/39 (71.79%)**
  - Accuracy delta from source-aware scoring: **0.00 percentage points**
- **Decision:** ไม่ integrate source-aware scoring เข้า production หรือ FULL_LEGAL configuration เพราะไม่เพิ่ม benchmark accuracy และยังไม่แก้ root cause ของ remaining failures

### Candidate recall validation

- `step11_8_candidate_recall_check.py` ตรวจสอบ expected article/source identity ใน:
  1. full semantic catalog
  2. reranked top-3
  3. expanded candidate pool
- FAISS loading ใช้ temporary copied index เช่นเดียวกับ benchmark เพื่อหลีกเลี่ยง Windows native file-I/O issue ที่พบกับ direct repository/OneDrive path
- ผลตรวจสอบยืนยันว่า expected candidates ส่วนใหญ่มีอยู่ใน full catalog และ candidate pool แล้ว
- ตัวอย่าง remaining ranking ambiguities:
  - nighttime theft: expected Article 335 อยู่ใน pool แต่ Article 365/334/336 ถูกจัดอันดับสูงกว่า
  - bodily harm: expected Article 295 อยู่ใน pool แต่ Article 391 ถูกจัดอันดับสูงกว่าในบาง queries
  - embezzlement/possession: Article 352 อยู่ใน pool แต่บาง query ถูก Article 1377 civil candidate จัดอันดับสูงกว่า
  - cross-reference Articles 69/290: expected criminal candidates อยู่ใน pool แต่มี semantic rank ต่ำมาก
- มีบางกรณี candidate expansion ไม่ดึง expected candidate เข้า pool ทั้งที่ candidate อยู่ใน full catalog แต่ไม่ใช่ pattern หลักของ failures
- **Finding:** remaining benchmark failures ส่วนใหญ่เป็น **ranking discrimination / legal-neighbor ambiguity** มากกว่า missing-document retrieval
- **Important:** ไม่แก้ปัญหาด้วย article-specific hard-coding หรือ arbitrary score bonuses เนื่องจากเสี่ยง overfitting benchmark

### Overall STEP 11.8 result

- BASELINE: **23/39 (58.97%)**
- FULL_LEGAL: **28/39 (71.79%)**
- Improvement: **+5 cases / +12.82 percentage points**
- SOURCE_AWARE: **28/39 (71.79%)**
- Source-aware additional improvement: **0 cases / 0.00 percentage points**
- Expected candidate recall: **ส่วนใหญ่ PASS**
- Remaining root cause: **ranking discrimination among legally similar candidates**
- Production files/index: **ไม่ถูกแก้**
- Production deployment: **ไม่มี**
- Production integration of source-aware experiment: **ไม่มี**

### Decision

**PASS — STEP 11.8 experimental investigation complete.**

FULL_LEGAL remains the preferred experimental configuration. Source-aware scoring is not promoted. The next quality work should focus on evidence-based ranking discrimination / threshold analysis rather than source bonus tuning.
