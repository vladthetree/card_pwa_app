#!/usr/bin/env python3
"""Build English MCQs with distractors from the practice-video transcript."""

from __future__ import annotations

import difflib
import importlib.util
import json
import re
from collections import OrderedDict, defaultdict
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
COVERAGE_PATH = HERE / "practice-questions-coverage-mapping.json"
TRANSCRIPT_PATH = HERE / "transcripts/CompTIA SECURITY+ FULL Practice Questions - SY0-701 EXAM PREP (2025) [u6G40H6JPok].txt"
AUDIT_PATH = HERE / "possible-question-mapping-audit.md"


def load_acronyms() -> dict[str, str]:
    source = HERE / "add_possible_questions.py"
    spec = importlib.util.spec_from_file_location("possible_question_source", source)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module.ACRONYMS


ACRONYMS = load_acronyms()
ACRONYMS.update({
    "ECB": "Electronic Codebook",
    "GCM": "Galois/Counter Mode",
    "IDEA": "International Data Encryption Algorithm",
    "IaaS": "Infrastructure as a Service",
    "PaaS": "Platform as a Service",
    "SaaS": "Software as a Service",
})
SPECIAL_ACRONYM_TOPICS = {
    "ECB-Betriebsmodus": "ECB",
    "GCM-Betriebsmodus": "GCM",
    "IDEA-Algorithmus": "IDEA",
    "IaaS-Cloud-Servicemodell": "IaaS",
    "PaaS-Cloud-Servicemodell": "PaaS",
    "SaaS-Cloud-Servicemodell": "SaaS",
}
ACRONYM_TOPIC_RE = re.compile(r"^(?:Akronym\s+(.+)|(.+?)-Akronym)$", re.IGNORECASE)
QUESTION_KEY_RE = re.compile(r"^possibleQuestion\d+$")
QUESTION_START_RE = re.compile(
    r"\b(?:which|what|why|how|when|where|who|in\s+(?:a|an|the))\b",
    re.IGNORECASE,
)

VERIFIED_ANSWERS_BY_TOPIC = {
    "Aktivisten-Motivation": "Philosophical or political beliefs",
    "Chaos ohne Motiv": "Disruption or chaos",
    "Caller-ID-Spoofing": "Voice call-based phishing (vishing)",
    "Firewall auf L4 und L7": "Layer 4/Layer 7 firewall",
    "IR-Phase Recovery": "Restore systems and services to normal operations",
}
VERIFIED_QUESTIONS_BY_TOPIC = {
    "DDoS-Motivation": "A DDoS attack overloads a network and makes a service unavailable. What type of motivation does this represent?",
    "Aktivisten-Motivation": "Activists conduct cyberattacks to promote or oppose ideologies. What is their primary motivation?",
    "verärgerter Ex-Mitarbeiter": "A disgruntled employee attacks a former employer's network to cause damage. What is the primary motivation?",
    "Chaos ohne Motiv": "Attackers act without a clear financial or ideological motive and simply create disorder. What is this motivation called?",
    "Code in Bilddatei": "Steganography is commonly used in which type of cyberattack?",
    "Caller-ID-Spoofing": "Caller ID spoofing is often used in which type of attack?",
}


def acronym_from_topic(topic: str) -> str | None:
    if topic in SPECIAL_ACRONYM_TOPICS:
        return SPECIAL_ACRONYM_TOPICS[topic]
    match = ACRONYM_TOPIC_RE.match(topic)
    if not match:
        return None
    return (match.group(1) or match.group(2)).strip(" \"„“")


def clean_space(value: str) -> str:
    return " ".join(value.split()).strip()


def clean_caption(value: str) -> str:
    """Repair only unmistakable automatic-caption errors in MCQ text."""
    value = clean_space(value)
    replacements = (
        (r"\bstenography\b", "steganography"),
        (r"\bfishing\b", "phishing"),
        (r"\bcross[- ]sight\b", "cross-site"),
        (r"\bhoneyet\b", "honeynet"),
        (r"\bballards\b", "bollards"),
        (r"\bmultiffactor\b", "multifactor"),
        (r"\bphilosoph\s+philosophical\b", "philosophical"),
        (r"\bwhich\s+tack\b", "which attack"),
        (r"\bwitchtack\b", "which attack"),
        (r"\bthirdparty\b", "third-party"),
        (r"\borganizational's\b", "organization's"),
        (r"^He is a certificate\b", "A certificate"),
        (r"\bfilebased\b", "file-based"),
        (r"\bhostbased\b", "host-based"),
        (r"\bonpath\b", "on-path"),
        (r"\bofuse\b", "of-use"),
        (r"\bairgapped\b", "air-gapped"),
        (r"\bsoftwaredefined\b", "software-defined"),
        (r"\bdomainbased\b", "domain-based"),
        (r"\bdevices's\b", "device's"),
        (r"\bC\s+YOD\b", "CYOD"),
        (r"\bOOTH\b", "OAuth"),
        (r"\bdemark\b", "DMARC"),
        (r"\bSIM\s+system\b", "SIEM system"),
        (r"\barbback\b", "RBAC"),
        (r"\bRO\s+based\b", "role-based"),
        (r"\bobfiscation\b", "obfuscation"),
        (r"\bharm\s+seemingly\s+harmless\b", "harmless"),
        (r"\binfrastructure as code or A\b", "infrastructure as code or IaC"),
        (r"\bIA enforces\b", "IaC enforces"),
        (r"\bor AL used\b", "or ALE used"),
        (r"\borou\b", "MOU"),
        (r"organization security system", "organization's security system"),
        (r"\bmeasure involves uh measure involves\b", "measure involves"),
        (r"organizational's\s+in\s+internal", "organization's internal"),
    )
    for pattern, replacement in replacements:
        value = re.sub(pattern, replacement, value, flags=re.IGNORECASE)
    return value


def clean_transcript_options(options: list[str], answer: str, question: str) -> list[str]:
    if len(options) != 4:
        return []
    options = [clean_caption(option).removeprefix("or ").strip() for option in options]
    folded = [option.casefold() for option in options]
    contaminated_fragments = (
        "correct answer",
        "which of the following is true",
        "what does it aim to achieve",
        "what is the purpose",
        "what does ",
        "is an example of",
        "commonly used in",
        "is often used in",
        "caller id spoofing to impersonate",
    )
    if any(len(option) > 260 for option in options):
        return []
    if any(any(fragment in option for fragment in contaminated_fragments) for option in folded):
        return []
    answer_norm = normalized(answer)
    contained = [
        index
        for index, option in enumerate(options)
        if len(normalized(option)) >= 4 and normalized(option) in answer_norm
    ]
    closest_index = (
        max(contained, key=lambda index: len(normalized(options[index])))
        if contained
        else max(range(4), key=lambda index: similarity(answer, options[index]))
    )
    if similarity(answer, options[closest_index]) < 0.45:
        return []
    # The parsed spoken answer is more reliable than a caption option that may
    # have swallowed an adjacent distractor. Preserve the three other options
    # and replace only the intended correct slot.
    options[closest_index] = answer
    answer_words = set(normalized(answer).split())
    for index, option in enumerate(options):
        if index == closest_index:
            continue
        option_words = set(normalized(option).split())
        if option_words and answer_words and (
            option_words <= answer_words or answer_words <= option_words
        ):
            return []
    return options


def normalized(value: str) -> str:
    value = value.casefold()
    replacements = {
        "fishing": "phishing",
        "stenography": "steganography",
        "honeyet": "honeynet",
        "ballards": "bollards",
        "rolebased": "role based",
        "policydriven": "policy driven",
        "multiffactor": "multifactor",
        "hostbased": "host based",
        "cross sight": "cross site",
        "voice calls": "vishing",
    }
    for source, target in replacements.items():
        value = value.replace(source, target)
    return " ".join(re.findall(r"[a-z0-9+]+", value))


def stem(word: str) -> str:
    for suffix in ("izations", "ization", "ations", "ation", "ments", "ment", "ities", "ity", "ing", "ed", "es", "s"):
        if word.endswith(suffix) and len(word) > len(suffix) + 3:
            return word[: -len(suffix)]
    return word


STOPWORDS = {
    "which", "what", "why", "how", "when", "where", "who", "the", "and",
    "for", "with", "from", "that", "this", "security", "following", "best",
    "does", "used", "using", "into", "within", "between", "system", "systems",
    "concept", "purpose", "primary", "type", "types", "term", "refers", "most",
    "main", "objective", "categories", "considerations", "activities", "tools",
    "based",
}


def tokens(value: str) -> set[str]:
    return {
        stem(word)
        for word in normalized(value).split()
        if len(word) > 2 and word not in STOPWORDS
    }


def similarity(left: str, right: str) -> float:
    left_norm = normalized(left)
    right_norm = normalized(right)
    if not left_norm or not right_norm:
        return 0.0
    return difflib.SequenceMatcher(None, left_norm, right_norm).ratio()


def question_candidates(block: str) -> list[tuple[int, int, str]]:
    candidates = []
    for start in QUESTION_START_RE.finditer(block):
        end = block.find("?", start.start())
        if 18 <= end - start.start() < 550:
            candidates.append(
                (start.start(), end + 1, clean_space(block[start.start() : end + 1]))
            )
    # QUESTION_START_RE can find a nested phrase such as "in an organization"
    # inside a longer "What ... in an organization?" stem. Candidates ending
    # at the same question mark are one question; keep its earliest start.
    by_end: dict[int, tuple[int, int, str]] = {}
    for candidate in candidates:
        current = by_end.get(candidate[1])
        if current is None or candidate[0] < current[0]:
            by_end[candidate[1]] = candidate
    return sorted(by_end.values(), key=lambda candidate: candidate[0])


def select_question(candidates: list[tuple[int, int, str]]) -> tuple[int, int, str] | None:
    if not candidates:
        return None
    # A marker resolves the question spoken immediately before it. A previous
    # question can remain in the same caption block when the presenter answers
    # it without saying "correct answer"; choosing by length then associates
    # that older question with the newer answer. The last question is the
    # temporally correct one.
    return candidates[-1]


def extract_question_and_option_text(block: str) -> tuple[str, str]:
    candidates = question_candidates(block)
    selected = select_question(candidates)
    if not selected:
        return "", ""

    selected_tokens = tokens(selected[2])
    repeated = []
    for candidate in candidates:
        if candidate == selected:
            continue
        candidate_tokens = tokens(candidate[2])
        overlap = len(candidate_tokens & selected_tokens) / max(
            1, min(len(candidate_tokens), len(selected_tokens))
        )
        if overlap >= 0.55:
            distance = min(abs(candidate[0] - selected[1]), abs(selected[0] - candidate[1]))
            repeated.append((distance, candidate))

    if repeated:
        counterpart = min(repeated, key=lambda item: item[0])[1]
        if counterpart[0] < selected[0]:
            option_text = clean_space(block[counterpart[1] : selected[0]])
        else:
            option_text = clean_space(block[selected[1] : counterpart[0]])
        # Prefer the fuller wording when the presenter first states a complete
        # scenario and then repeats only a short form of the same question.
        question = max((selected[2], counterpart[2]), key=lambda value: len(tokens(value)))
    else:
        option_text = clean_space(block[selected[1] :])
        question = selected[2]
    return question, option_text


def parse_answer(post_marker: str) -> str:
    sentence = clean_space(post_marker.split(".", 1)[0])
    if sentence.startswith("."):
        return ""
    markers = list(re.finditer(r"\b(?:is|are)\s+", sentence, re.IGNORECASE))
    if markers:
        return sentence[markers[-1].end() :].strip()
    return re.sub(r"^(?:of|and)\s+", "", sentence, flags=re.IGNORECASE).strip()


def split_options(option_text: str, answer: str) -> list[str]:
    text = option_text.strip(" .?")
    if not text:
        return []
    fragments = [
        part.strip(" .?")
        for part in re.split(
            r"(?:,\s+(?:or\s+)?|[.?]\s+|\s+or\s+)",
            text,
            flags=re.IGNORECASE,
        )
        if part.strip(" .?")
    ]

    # Common automatic-caption error: "Firewall security policy" lacks the
    # comma between two short answer options.
    answer_without_article = re.sub(r"^(?:a|an|the)\s+", "", answer, flags=re.IGNORECASE)
    normalized_answer = normalized(answer_without_article)
    split_glued_answer = False
    if len(fragments) in (3, 4):
        for index, fragment in enumerate(fragments):
            normalized_fragment = normalized(fragment)
            if normalized_answer and normalized_fragment.startswith(normalized_answer + " "):
                answer_words = answer_without_article.split()
                original_words = fragment.split()
                cut = len(answer_words)
                fragments = (
                    fragments[:index]
                    + [" ".join(original_words[:cut]), " ".join(original_words[cut:])]
                    + fragments[index + 1 :]
                )
                split_glued_answer = True
                break

    if split_glued_answer and len(fragments) == 5:
        # The fifth fragment is normally the spoken repetition of the question
        # topic immediately before "Correct answer".
        fragments = fragments[:4]

    if len(fragments) == 4:
        return fragments

    # Rejoin fragments when commas inside a long answer option caused too many
    # splits. All contiguous four-way partitions are considered.
    if 4 < len(fragments) <= 12:
        best: tuple[float, list[str]] | None = None
        count = len(fragments)
        for first in range(1, count - 2):
            for second in range(first + 1, count - 1):
                for third in range(second + 1, count):
                    groups = [
                        " ".join(fragments[:first]),
                        " ".join(fragments[first:second]),
                        " ".join(fragments[second:third]),
                        " ".join(fragments[third:]),
                    ]
                    answer_score = max(similarity(answer, group) for group in groups)
                    lengths = [len(group.split()) for group in groups]
                    score = answer_score * 10 - (max(lengths) - min(lengths)) * 0.15
                    if best is None or score > best[0]:
                        best = (score, groups)
        if best and max(similarity(answer, group) for group in best[1]) >= 0.35:
            return best[1]
    return []


def parse_transcript_section(text: str) -> list[dict]:
    matches = []
    for marker in re.finditer(r"correct\s+answer", text, re.IGNORECASE):
        preview = clean_space(text[marker.end() : marker.end() + 180])
        folded = preview.casefold()
        if preview.startswith(",") or folded.startswith("or ") or folded.startswith("s until"):
            continue
        if not re.match(r"^(?:is|are|of\b|and\b|\.)", preview, re.IGNORECASE):
            continue
        matches.append(marker)

    parsed = []
    block_start = 0
    for marker in matches:
        period = text.find(".", marker.end())
        if period < 0:
            period = len(text)
        post = text[marker.end() : period + 1]
        answer = parse_answer(post)
        answer_end = marker.end() + 1 if clean_space(post).startswith(".") else period + 1
        if not answer and clean_space(post).startswith("."):
            next_period = text.find(".", period + 1)
            candidate = clean_space(text[period + 1 : next_period]) if next_period >= 0 else ""
            folded_candidate = candidate.casefold()
            commentary = (
                "they say",
                "i feel",
                "i'm ",
                "this one",
                "surprising",
                "sorry",
            )
            if (
                1 <= len(candidate.split()) <= 40
                and "?" not in candidate
                and not folded_candidate.startswith(commentary)
            ):
                answer = candidate
                answer_end = next_period + 1
        block = text[block_start : marker.start()]
        question, option_text = extract_question_and_option_text(block)
        options = split_options(option_text, answer)
        parsed.append(
            {
                "question": question,
                "transcriptAnswer": answer,
                "options": options,
                "optionText": option_text,
                "line": text.count("\n", 0, marker.start()) + 1,
            }
        )
        block_start = answer_end
    return parsed


def entry_match_text(entry: dict, topics: list[str]) -> str:
    parts = [entry["sourcePath"], *topics]
    path = entry["sourcePath"]
    for acronym, expansion in ACRONYMS.items():
        if re.search(rf"(?<![A-Za-z0-9]){re.escape(acronym)}(?![A-Za-z0-9])", path, re.IGNORECASE):
            parts.append(expansion)
    return " ".join(parts)


def match_score(entry_text: str, leaf: str, raw: dict) -> float:
    expected_tokens = tokens(entry_text)
    primary_text = " ".join((raw["question"], raw["transcriptAnswer"]))
    option_text = raw["optionText"]
    primary_tokens = tokens(primary_text)
    option_tokens = tokens(option_text)
    score = len(expected_tokens & primary_tokens) * 4.0
    score += len((expected_tokens & option_tokens) - primary_tokens) * 0.35
    leaf_norm = normalized(leaf)
    raw_norm = normalized(primary_text)
    compact_leaf = leaf_norm.replace(" ", "")
    compact_raw = raw_norm.replace(" ", "")
    if leaf_norm and leaf_norm in raw_norm:
        score += 15
    elif compact_leaf and compact_leaf in compact_raw:
        score += 12
    leaf_tokens = tokens(leaf)
    if leaf_tokens and len(leaf_tokens & primary_tokens) / len(leaf_tokens) >= 0.5:
        score += 9
    if not expected_tokens & primary_tokens and not leaf_tokens & primary_tokens:
        score -= 6
    return score


def align_main_questions(expected: list[dict], raw: list[dict]) -> tuple[dict[int, int], list[int], list[int], dict[int, float]]:
    expected_meta = []
    for item in expected:
        entry_text = entry_match_text(item["entry"], item["topics"])
        leaf = item["entry"]["sourcePath"].split(" > ")[-1]
        leaf_norm = normalized(leaf)
        expected_meta.append(
            {
                "tokens": tokens(entry_text),
                "leafNorm": leaf_norm,
                "compactLeaf": leaf_norm.replace(" ", ""),
                "leafTokens": tokens(leaf),
            }
        )

    raw_meta = []
    for item in raw:
        primary_text = " ".join((item["question"], item["transcriptAnswer"]))
        option_text = item["optionText"]
        raw_norm = normalized(primary_text)
        raw_meta.append(
            {
                "primaryTokens": tokens(primary_text),
                "optionTokens": tokens(option_text),
                "norm": raw_norm,
                "compact": raw_norm.replace(" ", ""),
            }
        )

    def score(expected_index: int, raw_index: int) -> float:
        expected_item = expected_meta[expected_index]
        raw_item = raw_meta[raw_index]
        intersection = expected_item["tokens"] & raw_item["primaryTokens"]
        option_intersection = (
            expected_item["tokens"] & raw_item["optionTokens"]
        ) - raw_item["primaryTokens"]
        value = len(intersection) * 4.0 + len(option_intersection) * 0.35
        if expected_item["leafNorm"] and expected_item["leafNorm"] in raw_item["norm"]:
            value += 15
        elif expected_item["compactLeaf"] and expected_item["compactLeaf"] in raw_item["compact"]:
            value += 12
        leaf_tokens = expected_item["leafTokens"]
        if leaf_tokens and len(leaf_tokens & raw_item["primaryTokens"]) / len(leaf_tokens) >= 0.5:
            value += 9
        if not intersection and not leaf_tokens & raw_item["primaryTokens"]:
            value -= 6
        return value

    count_expected = len(expected)
    count_raw = len(raw)
    gap_expected = -20.0
    gap_raw = -4.0
    previous = [gap_raw * index for index in range(count_raw + 1)]
    trace = [bytearray(count_raw + 1) for _ in range(count_expected + 1)]
    for raw_index in range(1, count_raw + 1):
        trace[0][raw_index] = 2

    for expected_index in range(1, count_expected + 1):
        row = [0.0] * (count_raw + 1)
        row[0] = gap_expected * expected_index
        trace[expected_index][0] = 1
        for raw_index in range(1, count_raw + 1):
            choices = (
                previous[raw_index - 1] + score(expected_index - 1, raw_index - 1) + 2,
                previous[raw_index] + gap_expected,
                row[raw_index - 1] + gap_raw,
            )
            choice = max(range(3), key=choices.__getitem__)
            row[raw_index] = choices[choice]
            trace[expected_index][raw_index] = choice
        previous = row

    expected_index = count_expected
    raw_index = count_raw
    mapping: dict[int, int] = {}
    skipped_expected = []
    skipped_raw = []
    scores: dict[int, float] = {}
    while expected_index or raw_index:
        choice = trace[expected_index][raw_index]
        if choice == 0:
            mapping[expected_index - 1] = raw_index - 1
            scores[expected_index - 1] = score(expected_index - 1, raw_index - 1)
            expected_index -= 1
            raw_index -= 1
        elif choice == 1:
            skipped_expected.append(expected_index - 1)
            expected_index -= 1
        else:
            skipped_raw.append(raw_index - 1)
            raw_index -= 1

    # Repair local reorderings and skipped leaves using currently unused raw
    # questions. Low-score matches are reopened before greedy reassignment.
    # Objective ordering in the video is not always identical to the ordering
    # in the official requirement tree. Re-open every merely lexical/weak
    # match so nearby omissions cannot shift a whole run of otherwise clear
    # questions onto the next requirement.
    low_confidence = [index for index, value in scores.items() if value < 15]
    pool_expected = set(skipped_expected + low_confidence)
    pool_raw = set(skipped_raw + [mapping[index] for index in low_confidence])
    for index in low_confidence:
        mapping.pop(index, None)
        scores.pop(index, None)

    candidates = []
    for expected_item in pool_expected:
        predicted = expected_item * count_raw / max(1, count_expected)
        for raw_item in pool_raw:
            value = score(expected_item, raw_item) - abs(raw_item - predicted) * 0.08
            candidates.append((value, expected_item, raw_item))
    candidates.sort(reverse=True)
    used_expected = set(mapping)
    used_raw = set(mapping.values())
    for value, expected_item, raw_item in candidates:
        if expected_item in used_expected or raw_item in used_raw:
            continue
        mapping[expected_item] = raw_item
        scores[expected_item] = score(expected_item, raw_item)
        used_expected.add(expected_item)
        used_raw.add(raw_item)

    return mapping, sorted(set(range(count_expected)) - set(mapping)), sorted(set(range(count_raw)) - set(mapping.values())), scores


def sibling_distractors(entry: dict, all_entries: list[dict], answer: str) -> list[str]:
    parent = " > ".join(entry["sourcePath"].split(" > ")[:-1])
    candidates = [
        candidate["sourcePath"].split(" > ")[-1]
        for candidate in all_entries
        if candidate["requirementId"] != entry["requirementId"]
        and " > ".join(candidate["sourcePath"].split(" > ")[:-1]) == parent
    ]
    if len(candidates) < 3:
        candidates.extend(
            candidate["sourcePath"].split(" > ")[-1]
            for candidate in all_entries
            if candidate["requirementId"] != entry["requirementId"]
            and candidate["objective"] == entry["objective"]
        )
    result = []
    answer_words = set(normalized(answer).split())
    for candidate in candidates:
        if normalized(candidate) == normalized(answer):
            continue
        candidate_words = set(normalized(candidate).split())
        if candidate_words and answer_words and (
            candidate_words <= answer_words or answer_words <= candidate_words
        ):
            continue
        if normalized(candidate) in {normalized(item) for item in result}:
            continue
        result.append(candidate)
        if len(result) == 3:
            return result
    return result


def build_mcq(raw: dict, entry: dict, all_entries: list[dict], source_topic: str, quality_flags: list[str], mapping_score: float) -> dict | None:
    question = clean_caption(raw["question"])
    question = VERIFIED_QUESTIONS_BY_TOPIC.get(source_topic, question)
    answer = clean_caption(raw["transcriptAnswer"])
    answer = VERIFIED_ANSWERS_BY_TOPIC.get(source_topic, answer)
    if not question or not answer:
        return None
    later_stem = list(
        re.finditer(
            r"[.!?]\s+(?=(?:Which|What|Why|How|When|Where|Who)\b)",
            question,
            flags=re.IGNORECASE,
        )
    )
    if later_stem:
        question = question[later_stem[-1].end() :]
    question = question[0].upper() + question[1:]
    chatter = ("gimmies", "give you guys", "reminds me", "i'm just letting you know", "i feel like")
    if len(question) > 260 or any(fragment in question.casefold() for fragment in chatter):
        return None
    if not acronym_from_topic(source_topic) and len(question.split()) < 6:
        path_answer_overlap = tokens(entry["sourcePath"]) & tokens(answer)
        if not path_answer_overlap:
            return None

    options = [clean_caption(option) for option in raw["options"] if clean_space(option)]
    option_source = "transcript"
    options = clean_transcript_options(options, answer, question)
    if len(options) != 4:
        distractors = sibling_distractors(entry, all_entries, answer)
        if len(distractors) < 3:
            return None
        options = [answer, *distractors]
        option_source = "transcript answer; requirement-sibling distractor fallback"

    distractors = [option for option in options if normalized(option) != normalized(answer)]
    if len(distractors) != 3:
        return None
    return {
        "question": question,
        "options": options,
        "answer": answer,
        "distractors": distractors,
        "sourceTopic": source_topic,
        "optionSource": option_source,
        "mappingConfidence": "high" if mapping_score >= 5 else "review",
        **({"qualityFlags": quality_flags} if quality_flags else {}),
    }


def render_markdown(domain_data: dict) -> str:
    domain = domain_data["domain"]
    lines = [
        f"# Domain {domain} — Objectives ↔ Transkript-Mapping (destilliert)",
        "",
        f"{domain_data['requirementCount']} Requirements, je mit destilliertem Inhalt aus Messers Einzellektion + Cram-Video.",
        f"{domain_data['conflictCount']} davon mit ⚠ markiertem Quellenkonflikt (Messer und Cram-Video widersprechen sich inhaltlich).",
        "",
    ]
    current_objective = None
    for entry in domain_data["entries"]:
        if entry["objective"] != current_objective:
            current_objective = entry["objective"]
            lines.extend([f"## Objective {current_objective}", ""])
        warning = " ⚠ QUELLENKONFLIKT" if entry["possibleSourceConflict"] else ""
        lines.extend([f"### {entry['sourcePath']}{warning}", f"`{entry['requirementId']}`", ""])
        for key, pair in entry.items():
            if not QUESTION_KEY_RE.match(key):
                continue
            lines.extend([f"**{key}**", "", f"- Question: {pair['question']}"])
            for option_index, option in enumerate(pair["options"]):
                lines.append(f"- {chr(65 + option_index)}. {option}")
            lines.extend([
                f"- Correct answer: {pair['answer']}",
                f"- Distractors: {' | '.join(pair['distractors'])}",
                f"- Source topic: `{pair['sourceTopic']}`",
                f"- Option source: {pair['optionSource']}",
                f"- Mapping confidence: {pair['mappingConfidence']}",
            ])
            if pair.get("qualityFlags"):
                lines.append(f"- Quality flags: {', '.join(pair['qualityFlags'])}")
            lines.append("")
        lines.extend([entry["distilledContent"], ""])
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    coverage = json.loads(COVERAGE_PATH.read_text(encoding="utf-8"))
    coverage_by_id = {item["requirementId"]: item for item in coverage["requirementCoverage"]}
    transcript = TRANSCRIPT_PATH.read_text(encoding="utf-8")
    acronym_start = transcript.casefold().find("first question, what does aaa stand for")
    if acronym_start < 0:
        raise RuntimeError("Acronym section not found")
    raw_main = parse_transcript_section(transcript[:acronym_start])
    raw_acronyms = parse_transcript_section(transcript[acronym_start:])

    domain_data = []
    all_entries = []
    original_content = {}
    for domain in range(1, 6):
        path = ROOT / f"domain-{domain}-requirement-mapping.json"
        data = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=OrderedDict)
        domain_data.append((domain, path, data))
        all_entries.extend(data["entries"])
        original_content.update({entry["requirementId"]: entry["distilledContent"] for entry in data["entries"]})

    main_expected = []
    for entry in all_entries:
        topics = [
            topic
            for topic in coverage_by_id.get(entry["requirementId"], {}).get("topics", [])
            if not acronym_from_topic(topic)
        ]
        # Each coverage topic represents an individual practice question.  Do
        # not collapse multiple questions assigned to the same requirement;
        # they become possibleQuestion1, possibleQuestion2, ... below.
        for topic in topics:
            main_expected.append({"entry": entry, "topics": [topic]})

    mapping, skipped_expected, unused_main, mapping_scores = align_main_questions(main_expected, raw_main)
    pairs_by_id: dict[str, list[dict]] = defaultdict(list)
    excluded = []

    quality_by_topic: dict[tuple[str, str], list[str]] = defaultdict(list)
    for finding in coverage["qualityFindings"]:
        requirement_id = finding.get("requirementId", "")
        if requirement_id.startswith("req:") and "*" not in requirement_id:
            quality_by_topic[(requirement_id, finding.get("topic", ""))].append(finding["flag"])

    for expected_index, raw_index in mapping.items():
        item = main_expected[expected_index]
        entry = item["entry"]
        topic = item["topics"][0]
        flags = sorted(set(quality_by_topic.get((entry["requirementId"], topic), [])))
        mapping_score = mapping_scores.get(expected_index, -4)
        if mapping_score < 5:
            excluded.append((entry["requirementId"], topic, "Low-confidence transcript-to-requirement mapping; not inserted."))
            continue
        if "factually-questionable" in flags:
            excluded.append((entry["requirementId"], topic, "Transcript answer is factually questionable."))
            continue
        pair = build_mcq(
            raw_main[raw_index],
            entry,
            all_entries,
            topic,
            flags,
            mapping_score,
        )
        if pair:
            pairs_by_id[entry["requirementId"]].append(pair)
        else:
            excluded.append((entry["requirementId"], topic, "Question, answer, or four options could not be extracted reliably."))

    # Directly map acronym questions by acronym occurrence and answer expansion.
    used_acronym_rows = set()
    for entry in all_entries:
        topics = coverage_by_id.get(entry["requirementId"], {}).get("topics", [])
        for topic in topics:
            acronym = acronym_from_topic(topic)
            if not acronym:
                continue
            if acronym == "CTM":
                excluded.append((entry["requirementId"], topic, "CTM is not the established abbreviation for Counter Mode; CTR is standard."))
                continue
            expansion = ACRONYMS.get(acronym)
            if not expansion:
                excluded.append((entry["requirementId"], topic, "No verified expansion is available."))
                continue
            candidates = []
            acronym_norm = normalized(acronym).replace(" ", "")
            for raw_index, raw in enumerate(raw_acronyms):
                if raw_index in used_acronym_rows:
                    continue
                question_words = normalized(raw["question"]).split()
                question_forms = set(question_words)
                question_forms.update(
                    question_words[index] + question_words[index + 1]
                    for index in range(len(question_words) - 1)
                )
                exact_acronym = acronym_norm in question_forms
                expansion_similarity = max(
                    [similarity(expansion, raw["transcriptAnswer"])]
                    + [similarity(expansion, option) for option in raw["options"]]
                )
                if not exact_acronym and expansion_similarity < 0.8:
                    continue
                score = expansion_similarity * 10
                if exact_acronym:
                    score += 10
                candidates.append((score, raw_index))
            if not candidates:
                excluded.append((entry["requirementId"], topic, "No unused acronym question remained."))
                continue
            score, raw_index = max(candidates)
            if score < 5:
                excluded.append((entry["requirementId"], topic, "No reliable transcript acronym match."))
                continue
            raw = dict(raw_acronyms[raw_index])
            raw["question"] = f"What does {acronym} stand for?"
            raw["transcriptAnswer"] = expansion
            # Automatic captions occasionally turn an acronym expansion into a
            # plausible but wrong option (for example, PHI as "personal health
            # information"). Keep transcript options only when one of them is
            # effectively the verified expansion; otherwise build distractors
            # without replacing the verified answer.
            if len(raw["options"]) == 4:
                closest_index = max(
                    range(4), key=lambda index: similarity(expansion, raw["options"][index])
                )
                if similarity(expansion, raw["options"][closest_index]) >= 0.8:
                    raw["options"] = list(raw["options"])
                    raw["options"][closest_index] = expansion
                else:
                    raw["options"] = []
            else:
                raw["options"] = []
            pair = build_mcq(raw, entry, all_entries, topic, [], score)
            if not pair:
                excluded.append((entry["requirementId"], topic, "Acronym distractors could not be built."))
                continue
            pairs_by_id[entry["requirementId"]].append(pair)
            used_acronym_rows.add(raw_index)

    mapped_count = 0
    question_entries = 0
    for domain, path, data in domain_data:
        updated_entries = []
        for entry in data["entries"]:
            rebuilt = OrderedDict()
            pairs = pairs_by_id.get(entry["requirementId"], [])
            for key, value in entry.items():
                if QUESTION_KEY_RE.match(key):
                    continue
                rebuilt[key] = value
                if key == "distilledContent":
                    for index, pair in enumerate(pairs, start=1):
                        rebuilt[f"possibleQuestion{index}"] = pair
            mapped_count += len(pairs)
            question_entries += int(bool(pairs))
            updated_entries.append(rebuilt)
        data["entries"] = updated_entries
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (ROOT / f"domain-{domain}-requirement-mapping.md").write_text(render_markdown(data), encoding="utf-8")

    after_content = {
        entry["requirementId"]: entry["distilledContent"]
        for _, _, data in domain_data
        for entry in data["entries"]
    }
    if original_content != after_content:
        raise RuntimeError("Invariant violated: distilledContent changed")

    transcript_option_pairs = sum(
        pair["optionSource"] == "transcript" for pairs in pairs_by_id.values() for pair in pairs
    )
    fallback_pairs = mapped_count - transcript_option_pairs
    review_pairs = sum(
        pair["mappingConfidence"] == "review" for pairs in pairs_by_id.values() for pair in pairs
    )
    main_pairs = sum(
        not acronym_from_topic(pair["sourceTopic"])
        for pairs in pairs_by_id.values()
        for pair in pairs
    )
    acronym_pairs = mapped_count - main_pairs
    acronym_expected = sum(
        bool(acronym_from_topic(topic))
        for item in coverage["requirementCoverage"]
        for topic in item.get("topics", [])
    )
    path_by_id = {entry["requirementId"]: entry["sourcePath"] for entry in all_entries}

    def table_text(value: str) -> str:
        return clean_caption(value).replace("|", "\\|")

    audit_lines = [
        "# Audit: English MCQ mapping",
        "",
        "`distilledContent` was not changed. English questions and answer choices were extracted from the practice-video transcript whenever the automatic captions allowed a reliable parse.",
        "",
        "## Result",
        "",
        f"- {mapped_count} English MCQs added to {question_entries} requirement IDs.",
        f"- {transcript_option_pairs} MCQs use four options extracted from the transcript.",
        f"- {fallback_pairs} MCQs use the transcript answer plus three English sibling-requirement distractors because the captions did not expose four clean options.",
        f"- {review_pairs} mappings are marked `review` because lexical mapping confidence is low.",
        f"- {main_pairs} of {len(main_expected)} non-acronym coverage topics were inserted; the remainder are listed below instead of being forced.",
        f"- {acronym_pairs} of {acronym_expected} acronym coverage topics were inserted; the remainder are listed below.",
        f"- {len(unused_main)} main transcript questions were not forced onto a requirement ID.",
        "",
        "## Excluded or unresolved",
        "",
        "| Requirement ID | Topic | Reason |",
        "|---|---|---|",
    ]
    audit_lines.extend(
        f"| `{requirement_id}` | {table_text(topic)} | {table_text(reason)} |"
        for requirement_id, topic, reason in excluded
    )
    audit_lines.extend([
        "",
        "## Requirements with no mapped source question",
        "",
        "These IDs were already marked uncovered by the coverage analysis; no question was invented for them.",
        "",
        "| Requirement ID | Source path |",
        "|---|---|",
    ])
    audit_lines.extend(
        f"| `{requirement_id}` | {table_text(path_by_id.get(requirement_id, 'Unknown'))} |"
        for requirement_id in coverage["uncoveredRequirementIds"]
    )
    audit_lines.extend([
        "",
        "## Unused main-transcript questions",
        "",
        "These parsed questions were not assigned to a requirement ID.",
        "",
        "| Transcript line | Question | Parsed answer |",
        "|---:|---|---|",
    ])
    audit_lines.extend(
        f"| {raw_main[index]['line']} | {table_text(raw_main[index]['question'] or '[no reliable stem]')} | {table_text(raw_main[index]['transcriptAnswer'] or '[no reliable answer]')} |"
        for index in unused_main
    )
    AUDIT_PATH.write_text("\n".join(audit_lines).rstrip() + "\n", encoding="utf-8")
    print(
        f"{mapped_count} English MCQs; {transcript_option_pairs} transcript option sets; "
        f"{fallback_pairs} distractor fallbacks; {review_pairs} review mappings."
    )


if __name__ == "__main__":
    main()
