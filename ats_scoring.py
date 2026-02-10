from typing import Dict, List, Tuple
import re

STOPWORDS = {
    "and",
    "or",
    "the",
    "a",
    "an",
    "to",
    "for",
    "with",
    "in",
    "on",
    "of",
    "is",
    "are",
}


def _tokenize(text: str) -> List[str]:
    """Tokenize and normalize text to a list of meaningful tokens.

    - lowercases
    - removes punctuation (keeps hyphenated tokens)
    - removes short tokens and stopwords
    - returns unigrams and bigrams (as tokens)
    """
    text = text.lower()
    # keep letters, numbers and hyphens, replace others with space
    text = re.sub(r"[^a-z0-9\-\s]", " ", text)
    parts = [p for p in text.split() if len(p) > 1 and p not in STOPWORDS]

    tokens = []
    tokens.extend(parts)
    # add bigrams (multi-word skills)
    for i in range(len(parts) - 1):
        tokens.append(f"{parts[i]} {parts[i+1]}")

    # deduplicate while preserving order
    seen = set()
    uniq = []
    for t in tokens:
        if t not in seen:
            seen.add(t)
            uniq.append(t)
    return uniq


def calculate_ats_score(resume_text: str, jd_text: str) -> Tuple[int, Dict]:
    """Calculate a simple ATS-like score between resume text and JD text.

    Returns (score 0-100, explanation dict).
    The scoring is:
      score = base + skill_weight * overlap_ratio + formatting_weight * formatting_score
    where overlap_ratio = matched_keywords / jd_keywords_count
    """
    resume_tokens = set(_tokenize(resume_text or ""))
    jd_tokens = set(_tokenize(jd_text or ""))

    matched = jd_tokens.intersection(resume_tokens)

    jd_count = len(jd_tokens)
    overlap_ratio = (len(matched) / jd_count) if jd_count else 0.0

    # configurable weights (chosen to be intuitive)
    base = 20
    skill_weight = 70
    formatting_weight = 10

    formatting_score = 0.0
    resume_lower = (resume_text or "").lower()
    if "skills" in resume_lower and "experience" in resume_lower:
        formatting_score = 1.0
    elif "skills" in resume_lower or "experience" in resume_lower:
        formatting_score = 0.6

    raw_score = base + skill_weight * overlap_ratio + formatting_weight * formatting_score
    final_score = int(min(round(raw_score), 100))

    explanation = {
        "score_breakdown": {
            "base": base,
            "skill_weight": skill_weight,
            "overlap_ratio": round(overlap_ratio, 4),
            "formatting_score": formatting_score,
            "formatting_weight": formatting_weight,
            "raw_score": round(raw_score, 2),
        },
    }

    # # simple suggestions (top 3 missing tokens)
    # missing = list(jd_tokens - resume_tokens)
    # if missing:
    #     explanation["suggestions"].append(
    #         f"Consider adding keywords like: {', '.join(missing[:3])}"
    #     )

    return final_score, explanation
