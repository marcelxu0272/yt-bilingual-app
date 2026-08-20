"""视频学习导读：章节、重点表达和理解题的结构化生成与校验。"""
import json

from llm import chat_json


def _valid_ids(transcript: list) -> set[int]:
    return {
        int(block["id"])
        for block in transcript
        if isinstance(block, dict) and str(block.get("id", "")).isdigit()
    }


def normalize_study_guide(raw: dict, transcript: list, fallback_summary: str = "") -> dict:
    """Keep only model output that points at real transcript blocks."""
    valid_ids = _valid_ids(transcript)
    chapters = []
    for item in raw.get("chapters", []) if isinstance(raw, dict) else []:
        if not isinstance(item, dict):
            continue
        try:
            start_id = int(item.get("start_id"))
        except (TypeError, ValueError):
            continue
        if start_id in valid_ids and item.get("title"):
            chapters.append({
                "title": str(item["title"])[:80],
                "start_id": start_id,
                "description": str(item.get("description", ""))[:240],
            })

    expressions = []
    for item in raw.get("expressions", []) if isinstance(raw, dict) else []:
        if not isinstance(item, dict):
            continue
        try:
            source_id = int(item.get("source_id"))
        except (TypeError, ValueError):
            continue
        if source_id in valid_ids and item.get("phrase") and item.get("meaning"):
            expressions.append({
                "phrase": str(item["phrase"])[:100],
                "meaning": str(item["meaning"])[:160],
                "example": str(item.get("example", ""))[:240],
                "source_id": source_id,
            })

    questions = []
    for item in raw.get("questions", []) if isinstance(raw, dict) else []:
        if not isinstance(item, dict):
            continue
        options = item.get("options", [])
        if not isinstance(options, list):
            continue
        try:
            answer = int(item.get("answer"))
        except (TypeError, ValueError):
            continue
        if item.get("question") and len(options) == 4 and 0 <= answer < 4:
            questions.append({
                "question": str(item["question"])[:240],
                "options": [str(option)[:160] for option in options],
                "answer": answer,
                "explanation": str(item.get("explanation", ""))[:240],
            })

    return {
        "summary": str(raw.get("summary") or fallback_summary)[:3000] if isinstance(raw, dict) else fallback_summary,
        "chapters": chapters[:8],
        "expressions": expressions[:10],
        "questions": questions[:5],
    }


async def generate_study_guide(transcript: list, summary: str, model: str) -> dict:
    source = [
        {"id": block.get("id"), "en": block.get("en_text", ""), "zh": block.get("zh_text", "")}
        for block in transcript
    ]
    text = json.dumps(source, ensure_ascii=False)
    if len(text) > 26000:
        text = text[:26000] + "]"
    prompt = f"""
You are an English teacher creating a practical study guide for a Chinese learner.
Use only the transcript blocks below. Do not invent facts or timestamps.
Return one valid JSON object with exactly these keys:
{{
  "summary": "a concise Chinese overview in 3-5 sentences",
  "chapters": [{{"title": "Chinese chapter title", "start_id": 1, "description": "one short Chinese sentence"}}],
  "expressions": [{{"phrase": "exact English phrase", "meaning": "concise Chinese meaning", "example": "short English example", "source_id": 1}}],
  "questions": [{{"question": "Chinese comprehension question", "options": ["A", "B", "C", "D"], "answer": 0, "explanation": "short Chinese explanation"}}]
}}
Create 3-8 chapters, 6-10 useful expressions, and 5 questions. Every start_id/source_id must match a transcript block id.
Existing summary:
{summary}
Transcript blocks:
{text}
"""
    raw = await chat_json(prompt, model)
    return normalize_study_guide(raw if isinstance(raw, dict) else {}, transcript, summary)
