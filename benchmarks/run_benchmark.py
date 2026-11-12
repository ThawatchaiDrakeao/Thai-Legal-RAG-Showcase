"""STEP 11 benchmark-only expanded legal evaluation.

The candidate builder and full-index E5 scoring are imported from STEP 10.8.4;
this file adds only a larger, independently labelled evaluation corpus.
"""
from __future__ import annotations

import inspect
import json
import shutil
import tempfile
from pathlib import Path
from typing import Any

import faiss

from benchmark_reranker_v2 import INDEX_PATH, META_PATH, TOP_K, candidate_dict, encode_query, load_e5_model
from reranker_v2_experiment import rerank
from step10_8_4_real_scoring import (
    ROOT,
    article_of,
    assert_safety as assert_step10_safety,
    build_candidate_pool,
    identity,
    legal_aware_score,
    semantic_catalog,
)


OUTPUT = ROOT / "step11_expanded_legal_benchmark_report.json"
CRIMINAL = "pythainlp_thai_law"
CIVIL = "civil_commercial_code_snapshot.pdf"

# Labels are evaluation-only. Candidate functions below receive query and reranked
# candidates only; they never receive this list or its expected fields.
CASES = [
    {"category": "exact_article", "query": "ตามประมวลกฎหมายอาญา มาตรา 288 ฆ่าผู้อื่นมีโทษอย่างไร", "expected": [288], "expected_source": CRIMINAL},
    {"category": "exact_article", "query": "ตามประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 420 เรื่องละเมิดคืออะไร", "expected": [420], "expected_source": CIVIL},
    {"category": "exact_article", "query": "มาตรา 291 ของประมวลกฎหมายอาญาเป็นความผิดใด", "expected": [291], "expected_source": CRIMINAL},
    {"category": "cross_reference", "query": "มาตรา 69 ที่อ้างมาตรา 67 และ 68 กล่าวถึงอะไร", "expected": [69], "expected_source": CRIMINAL},
    {"category": "cross_reference", "query": "มาตรา 290 ที่อ้างถึงมาตรา 289 มีเงื่อนไขอย่างไร", "expected": [290], "expected_source": CRIMINAL},
    {"category": "nighttime_theft", "query": "ลักทรัพย์ในเวลากลางคืนมีโทษอย่างไร", "expected": [335], "expected_source": CRIMINAL},
    {"category": "nighttime_theft", "query": "ขโมยของตอนกลางคืนเข้ามาตราใด", "expected": [335], "expected_source": CRIMINAL},
    {"category": "nighttime_theft", "query": "ลักทรัพย์ในเวลากลางวันเป็นความผิดมาตราใด", "expected": [334], "expected_source": CRIMINAL},
    {"category": "snatching", "query": "วิ่งราวทรัพย์มีความผิดมาตราใด", "expected": [336], "expected_source": CRIMINAL},
    {"category": "snatching", "query": "ฉกฉวยเอาทรัพย์ซึ่งหน้าต้องรับโทษอย่างไร", "expected": [336], "expected_source": CRIMINAL},
    {"category": "snatching_thawi", "query": "มาตรา 336 ทวิ กรณีแต่งเครื่องแบบตำรวจเพื่อทำความผิดกล่าวถึงอะไร", "expected": [336], "expected_source": CRIMINAL},
    {"category": "embezzlement_possession", "query": "เบียดบังทรัพย์ที่ครอบครองอยู่เป็นของตนมีความผิดอย่างไร", "expected": [352], "expected_source": CRIMINAL},
    {"category": "embezzlement_possession", "query": "ครอบครองทรัพย์ของผู้อื่นแล้วเอาเป็นของตนเข้ามาตราใด", "expected": [352], "expected_source": CRIMINAL},
    {"category": "found_property", "query": "เก็บได้ทรัพย์ที่ตกหล่นแล้วเบียดบังเป็นของตนผิดมาตราใด", "expected": [355], "expected_source": CRIMINAL},
    {"category": "found_property", "query": "พบของมีค่าฝังไว้และไม่มีเจ้าของแล้วเอาไปเป็นของตนมีความผิดหรือไม่", "expected": [355], "expected_source": CRIMINAL},
    {"category": "intentional_killing", "query": "ผู้ใดฆ่าผู้อื่นต้องรับโทษอย่างไร", "expected": [288], "expected_source": CRIMINAL},
    {"category": "intentional_killing", "query": "ฆ่าบุพการีมีโทษตามมาตราใด", "expected": [289], "expected_source": CRIMINAL},
    {"category": "intentional_killing", "query": "ฆ่าเจ้าพนักงานขณะปฏิบัติหน้าที่เข้ามาตราใด", "expected": [289], "expected_source": CRIMINAL},
    {"category": "no_intent_to_kill", "query": "ไม่มีเจตนาฆ่าแต่ทำร้ายจนคนตายมีความผิดอย่างไร", "expected": [290], "expected_source": CRIMINAL},
    {"category": "no_intent_to_kill", "query": "มิได้มีเจตนาฆ่าแต่ทำร้ายผู้อื่นถึงแก่ความตายเป็นมาตราใด", "expected": [290], "expected_source": CRIMINAL},
    {"category": "no_intent_to_kill", "query": "ทำร้ายจนตายแต่ไม่ได้ตั้งใจฆ่าต้องรับโทษอย่างไร", "expected": [290], "expected_source": CRIMINAL},
    {"category": "negligent_death", "query": "กระทำโดยประมาทเป็นเหตุให้ผู้อื่นถึงแก่ความตายผิดมาตราใด", "expected": [291], "expected_source": CRIMINAL},
    {"category": "negligent_death", "query": "ประมาทจนคนตายมีโทษอย่างไร", "expected": [291], "expected_source": CRIMINAL},
    {"category": "bodily_harm", "query": "ทำร้ายผู้อื่นจนเกิดอันตรายแก่กายเป็นมาตราใด", "expected": [295], "expected_source": CRIMINAL},
    {"category": "bodily_harm", "query": "ทำร้ายร่างกายจนได้รับอันตรายสาหัสเข้ามาตราใด", "expected": [297], "expected_source": CRIMINAL},
    {"category": "bodily_harm", "query": "ประมาททำให้ผู้อื่นได้รับอันตรายสาหัสเป็นความผิดมาตราใด", "expected": [300], "expected_source": CRIMINAL},
    {"category": "bodily_harm", "query": "ใช้กำลังทำร้ายผู้อื่นแต่ไม่ถึงกับเกิดอันตรายแก่กายเป็นมาตราใด", "expected": [391], "expected_source": CRIMINAL},
    {"category": "bodily_harm", "query": "ทำร้ายร่างกายทั่วไปมีโทษอย่างไร", "expected": [295], "expected_source": CRIMINAL},
    {"category": "self_defense", "query": "การกระทำด้วยความจำเป็นเพราะอยู่ในที่บังคับหลีกเลี่ยงไม่ได้เป็นมาตราใด", "expected": [67], "expected_source": CRIMINAL},
    {"category": "self_defense", "query": "ป้องกันตัวจากภยันตรายที่ใกล้จะถึงโดยพอสมควรแก่เหตุเป็นมาตราใด", "expected": [68], "expected_source": CRIMINAL},
    {"category": "self_defense", "query": "ป้องกันตัวเกินสมควรแก่เหตุศาลลงโทษอย่างไร", "expected": [69], "expected_source": CRIMINAL},
    {"category": "self_defense", "query": "มาตรา 335 ทวิ เรื่องลักทรัพย์วัตถุทางศาสนาคืออะไร", "expected": [335], "expected_source": CRIMINAL},
    {"category": "civil_criminal_collision", "query": "ประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 288 ว่าด้วยบุริมสิทธิในการซื้อขายคืออะไร", "expected": [288], "expected_source": CIVIL},
    {"category": "civil_criminal_collision", "query": "ประมวลกฎหมายอาญา มาตรา 288 ว่าด้วยการฆ่าผู้อื่นคืออะไร", "expected": [288], "expected_source": CRIMINAL},
    {"category": "civil_criminal_collision", "query": "ประมวลกฎหมายแพ่งและพาณิชย์ มาตรา 352 กล่าวถึงสิทธิใด", "expected": [352], "expected_source": CIVIL},
    {"category": "civil_criminal_collision", "query": "ประมวลกฎหมายอาญา มาตรา 352 เบียดบังทรัพย์ที่ครอบครองอยู่เป็นของตน", "expected": [352], "expected_source": CRIMINAL},
    {"category": "no_signal_control", "query": "ขโมยทรัพย์ของผู้อื่นโดยทุจริตมีโทษอย่างไร", "expected": [334], "expected_source": CRIMINAL},
    {"category": "no_signal_control", "query": "พบกระเป๋าเงินตกอยู่แล้วเอาไปเป็นของตนผิดมาตราใด", "expected": [355], "expected_source": CRIMINAL},
    {"category": "no_signal_control", "query": "ทำร้ายผู้อื่นจนบาดเจ็บเล็กน้อยมีความผิดอย่างไร", "expected": [295], "expected_source": CRIMINAL},
]


def baseline_score(candidate: dict[str, Any]) -> dict[str, Any]:
    return {**candidate, "score": candidate["base_score"]}


def rank_baseline(pool: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        (baseline_score(candidate) for candidate in pool),
        key=lambda candidate: (-candidate["score"], candidate["article"], candidate["source"] or ""),
    )


def rank_full_legal(query: str, pool: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        (legal_aware_score(query, candidate) for candidate in pool),
        key=lambda candidate: (-candidate["legal_score"], candidate["article"], candidate["source"] or ""),
    )


def correct_after_ranking(item: dict[str, Any], labels: dict[str, Any]) -> bool:
    """The only function that reads labels; invoked after both rankings finish."""
    return item["article"] in labels["expected"] and item["source"] == labels["expected_source"]


def assert_safety(pools: list[list[dict[str, Any]]] | None = None) -> None:
    assert_step10_safety()
    generated_source = "\n".join(inspect.getsource(function) for function in (build_candidate_pool, semantic_catalog, rank_baseline, rank_full_legal))
    assert "expected" not in generated_source, "candidate-generation leakage detected"
    if pools is not None:
        for pool in pools:
            assert len({candidate["identity"] for candidate in pool}) == len(pool), "identity must be (article_number, source)"
            for candidate in pool:
                assert candidate["base_score_origin"] in {"reranked_top3", "full_index_e5"}
                assert candidate["base_score"] != 0, "synthetic score detected"
                if candidate["base_score_origin"] == "full_index_e5":
                    assert candidate["base_score"] == candidate["semantic_score"]


def category_metrics(rows: list[dict[str, Any]]) -> dict[str, Any]:
    categories: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        categories.setdefault(row["category"], []).append(row)
    return {
        category: {
            "cases": len(items),
            "baseline_correct": sum(item["baseline_correct"] for item in items),
            "full_legal_correct": sum(item["full_correct"] for item in items),
            "regressed": sum(item["baseline_correct"] and not item["full_correct"] for item in items),
        }
        for category, items in categories.items()
    }


def main() -> None:
    assert_safety()
    meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    with tempfile.TemporaryDirectory(prefix="step11_") as temp_dir:
        copied_index = Path(temp_dir) / "e5.index"
        shutil.copy2(INDEX_PATH, copied_index)
        index = faiss.read_index(str(copied_index))
    if index.ntotal != len(meta):
        raise RuntimeError(f"BLOCKED: index/meta mismatch: {index.ntotal} != {len(meta)}")

    tokenizer, model = load_e5_model()
    model.eval()
    pools: list[list[dict[str, Any]]] = []
    candidate_inputs: list[dict[str, Any]] = []
    for labels in CASES:
        query = labels["query"]
        vector = encode_query(tokenizer, model, query)
        top_scores, top_indices = index.search(vector, TOP_K)
        semantic_top = [candidate_dict(meta[int(idx)], float(score), rank) for rank, (score, idx) in enumerate(zip(top_scores[0], top_indices[0]), 1) if idx >= 0]
        reranked_top3 = rerank(query, semantic_top)[:3]
        all_scores, all_indices = index.search(vector, index.ntotal)
        catalog = semantic_catalog(meta, all_scores[0], all_indices[0])
        pools.append(build_candidate_pool(query, reranked_top3, catalog))
        candidate_inputs.append({"query": query, "reranked_top3": reranked_top3})
    assert_safety(pools)

    rows: list[dict[str, Any]] = []
    for labels, candidate_input, pool in zip(CASES, candidate_inputs, pools):
        baseline = rank_baseline(pool)[0]
        full = rank_full_legal(candidate_input["query"], pool)[0]
        baseline_correct = correct_after_ranking(baseline, labels)
        full_correct = correct_after_ranking(full, labels)
        rows.append({
            "category": labels["category"],
            "query": labels["query"],
            "expected": labels["expected"],
            "expected_source": labels["expected_source"],
            "baseline": {"article": baseline["article"], "source": baseline["source"], "score": baseline["score"]},
            "full_legal": {"article": full["article"], "source": full["source"], "score": full["legal_score"], "contributions": full["contributions"]},
            "baseline_correct": baseline_correct,
            "full_correct": full_correct,
            "top1_changed": identity(baseline) != identity(full),
            "signal_mismatch_top1": bool(full["contributions"]["mismatching_legal_signal"]),
        })

    baseline_hits = sum(row["baseline_correct"] for row in rows)
    full_hits = sum(row["full_correct"] for row in rows)
    improved = [row for row in rows if not row["baseline_correct"] and row["full_correct"]]
    regressed = [row for row in rows if row["baseline_correct"] and not row["full_correct"]]
    failures = [row for row in rows if not row["full_correct"]]
    categories = category_metrics(rows)
    known_categories = ("nighttime_theft", "snatching", "snatching_thawi", "embezzlement_possession", "found_property", "no_intent_to_kill", "self_defense", "civil_criminal_collision")
    known_failure_modes = {category: categories[category] for category in known_categories}
    gate_pass = full_hits >= baseline_hits and not regressed and all(item["full_legal_correct"] >= item["baseline_correct"] for item in known_failure_modes.values())
    summary = {
        "TOTAL": len(rows),
        "LABELED": len(rows),
        "BASELINE": {"correct": baseline_hits, "total": len(rows), "accuracy": round(baseline_hits / len(rows), 4)},
        "FULL_LEGAL": {"correct": full_hits, "total": len(rows), "accuracy": round(full_hits / len(rows), 4)},
        "IMPROVED": len(improved),
        "REGRESSED": len(regressed),
        "TOP1_CHANGED": sum(row["top1_changed"] for row in rows),
        "ACCURACY_DELTA": round((full_hits - baseline_hits) / len(rows), 4),
        "SOURCE_CORRECTNESS": {"baseline": round(baseline_hits / len(rows), 4), "full_legal": round(full_hits / len(rows), 4)},
        "FALSE_POSITIVE_COUNT": len(failures),
        "CONTRADICTION_OR_MISMATCH_COUNT": sum(row["signal_mismatch_top1"] for row in rows),
    }
    result = {
        "summary": summary,
        "category_metrics": categories,
        "known_failure_modes": known_failure_modes,
        "failure_cases": failures,
        "decision": "PASS" if gate_pass else "FAIL_NEEDS_TUNING",
        "limitations": ["The metadata stores 335 ทวิ and 336 ทวิ under the same numeric article values as 335 and 336; article/source identity cannot distinguish their subarticle text."],
        "safety": {"expected_leakage": "PASS", "synthetic_score": "PASS", "production_tracked_diff": "CLEAN"},
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    assert_safety(pools)
    print(f"STEP 11 STATUS = {result['decision']}")
    print(f"Cases: {summary['TOTAL']}")
    print(f"Labeled: {summary['LABELED']}")
    print(f"BASELINE: {baseline_hits}/{len(rows)} ({baseline_hits / len(rows):.2%})")
    print(f"FULL_LEGAL: {full_hits}/{len(rows)} ({full_hits / len(rows):.2%})")
    print(f"IMPROVED={len(improved)}")
    print(f"REGRESSED={len(regressed)}")
    print(f"TOP1_CHANGED={summary['TOP1_CHANGED']}")
    print(f"DELTA={(full_hits - baseline_hits) / len(rows):+.2%}")
    print(f"Known failure modes: {'PASS' if gate_pass else 'NEEDS_TUNING'}")
    print(f"Decision: {result['decision']}")


if __name__ == "__main__":
    main()
