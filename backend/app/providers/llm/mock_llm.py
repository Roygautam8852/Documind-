"""Deterministic Mock LLM provider for zero-dependency offline testing."""

from __future__ import annotations

import re

from app.providers.llm.base import BaseLLMProvider

_SOURCE_PATTERN = re.compile(r"\[Source (S\d+)\]")
ABSTENTION_TEXT = (
    "The uploaded documents do not contain sufficient information to answer this question."
)


class MockLLMProvider(BaseLLMProvider):
    """Deterministic LLM provider generating citations from input evidence."""

    def __init__(
        self,
        model_name: str = "mock-gpt-4o-mini",
        canned_response: str | None = None,
    ) -> None:
        self._model_name = model_name
        self.canned_response = canned_response

    @property
    def model_name(self) -> str:
        return self._model_name

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.0,
    ) -> str:
        if self.canned_response is not None:
            return self.canned_response

        # Detect sources available in the prompt evidence
        sources = _SOURCE_PATTERN.findall(prompt)
        if not sources:
            return ABSTENTION_TEXT

        primary_source = sources[0]
        secondary_source = sources[1] if len(sources) > 1 else primary_source

        # Extract user question from prompt
        question_match = re.search(r"User Question:\s*([^\n\r]+)", prompt, re.IGNORECASE)
        question = question_match.group(1).strip() if question_match else ""
        q_lower = question.lower()

        # Extract source evidence blocks
        source_blocks = re.findall(
            r"\[Source (S\d+)\].*?Text:\s*(.*?)(?=\n\n\[Source S\d+\]|\n\n---|\Z)",
            prompt,
            re.DOTALL,
        )

        system_lower = (system_prompt or "").lower()
        evidence_items = [(sid, text.strip()) for sid, text in source_blocks if text.strip()]

        if "specialized in synthesizing and summarizing documents" in system_lower:
            cited_evidence = [f"- {text} [{sid}]" for sid, text in evidence_items]
            if "comprehensive detailed summary" in prompt.lower():
                return "### Detailed Breakdown\n\n" + "\n\n".join(cited_evidence)
            if "key takeaways summary" in prompt.lower():
                return "### Key Takeaways\n\n" + "\n".join(cited_evidence)
            return (
                "### Executive Summary\n\n"
                + (cited_evidence[0][2:] if cited_evidence else "No source text was available.")
                + "\n\n### Key Highlights\n\n"
                + "\n".join(cited_evidence)
            )

        if "specialized in comparative analysis across multiple documents" in system_lower:
            highlights = [f"- {text} [{sid}]" for sid, text in evidence_items]
            return (
                "### Cross-Document Comparison\n\n"
                "### Comparison Overview\n\n"
                "The deterministic mock lists the supplied evidence without inferring analysis.\n\n"
                "### Key Similarities\n\n"
                "No similarities are inferred by the deterministic mock.\n\n"
                "### Key Differences & Divergences\n\n"
                "No differences are inferred by the deterministic mock.\n\n"
                "### Document-Specific Highlights\n\n" + "\n".join(highlights)
            )

        first_text = source_blocks[0][1] if source_blocks else ""
        first_lines = [line.strip() for line in first_text.strip().splitlines() if line.strip()]

        # 1. Name query
        if any(k in q_lower for k in ["name", "who am i", "who is this", "candidate"]):
            candidate_name = None
            name_sid = primary_source
            for sid, text in source_blocks:
                for line in text.splitlines():
                    cleaned = line.strip()
                    if (
                        cleaned
                        and 2 <= len(cleaned.split()) <= 4
                        and not any(char.isdigit() for char in cleaned)
                        and not any(
                            c in cleaned
                            for c in [
                                ":",
                                "@",
                                "/",
                                "-",
                                "•",
                                "(",
                                ")",
                                "+",
                                "|",
                                "–",
                                "—",
                                "’",
                                "'",
                            ]
                        )
                        and not any(
                            w in cleaned.lower()
                            for w in [
                                "tech",
                                "stack",
                                "training",
                                "university",
                                "skills",
                                "project",
                                "overview",
                                "experience",
                                "link",
                                "education",
                                "certificates",
                                "achievement",
                                "data science",
                                "cloud computing",
                                "data analytics",
                            ]
                        )
                    ):
                        candidate_name = cleaned.title()
                        name_sid = sid
                        break
                if candidate_name:
                    break

            name = candidate_name or "Gautam Kumar"
            return f"Based on your document, your name is **{name}** [{name_sid}]."

        # 2. Contact query
        if any(k in q_lower for k in ["contact", "email", "phone", "mobile", "number", "reach"]):
            emails = re.findall(r"[\w\.-]+@[\w\.-]+", first_text)
            phones = re.findall(r"\+?\d[\d\s-]{8,}\d", first_text)
            ans = f"Based on your document [{primary_source}], your contact details are:\n"
            if emails:
                ans += f"- **Email:** {emails[0]} [{primary_source}]\n"
            if phones:
                ans += f"- **Phone:** {phones[0].strip()} [{primary_source}]\n"
            return ans.strip()

        # 3. Skills / Tech stack query
        if any(
            k in q_lower for k in ["skill", "stack", "technolog", "tool", "programming", "language"]
        ):
            skill_lines = [
                line
                for line in first_lines
                if any(
                    kw in line.lower()
                    for kw in [
                        "skill",
                        "stack",
                        "language",
                        "python",
                        "java",
                        "c++",
                        "framework",
                        "sql",
                        "git",
                    ]
                )
            ]
            if skill_lines:
                formatted = "\n".join(f"- {line.lstrip('• ')}" for line in skill_lines[:5])
                return (
                    f"According to your document [{primary_source}], "
                    f"key skills and technologies include:\n\n{formatted} [{primary_source}]"
                )

        # 4. Education query
        if any(
            k in q_lower
            for k in [
                "education",
                "degree",
                "university",
                "college",
                "school",
                "bachelor",
                "master",
            ]
        ):
            edu_lines = [
                line
                for line in first_lines
                if any(
                    kw in line.lower()
                    for kw in [
                        "university",
                        "college",
                        "school",
                        "b.tech",
                        "degree",
                        "percentage",
                        "cgpa",
                        "matriculation",
                        "intermediate",
                    ]
                )
            ]
            if edu_lines:
                formatted = "\n".join(f"- {line.lstrip('• ')}" for line in edu_lines[:4])
                return (
                    f"According to your document [{primary_source}], "
                    f"educational background includes:\n\n{formatted} [{primary_source}]"
                )

        # 5. Experience / Projects query
        if any(
            k in q_lower
            for k in ["project", "experience", "work", "dashboard", "training", "achievement"]
        ):
            proj_lines = [
                line
                for line in first_lines
                if any(
                    kw in line.lower()
                    for kw in [
                        "project",
                        "dashboard",
                        "training",
                        "achievement",
                        "developed",
                        "created",
                        "solved",
                        "designed",
                    ]
                )
            ]
            if proj_lines:
                formatted = "\n".join(f"- {line.lstrip('• ')}" for line in proj_lines[:4])
                return (
                    f"Key projects and experience highlighted in your document "
                    f"[{primary_source}]:\n\n{formatted} [{primary_source}]"
                )

        # 6. Comparison query (only when user explicitly asks to compare)
        if (
            "compare" in q_lower
            or "comparison" in q_lower
            or "versus" in q_lower
            or "diff" in q_lower
        ):
            return (
                f"### Cross-Document Comparison\n\n"
                f"Both documents address key domain standards [{primary_source}].\n\n"
                f"### Key Similarities\n\n"
                f"- Both documents establish standard protocols [{primary_source}].\n\n"
                f"### Key Differences\n\n"
                f"- The initial documentation outlines primary architecture [{primary_source}], "
                f"whereas subsequent material focuses on guidelines [{secondary_source}]."
            )

        # 7. Summary / Key points query
        if any(
            k in q_lower
            for k in ["summar", "key point", "highlight", "overview", "what is this", "about"]
        ):
            points = [line for line in first_lines if line.startswith("•") or len(line) > 35][:5]
            if points:
                items = "\n".join(f"- {p.lstrip('• ')}" for p in points)
                return (
                    f"### Document Summary [{primary_source}]\n\n{items}\n\n"
                    f"Key operational details are further documented in [{secondary_source}]."
                )

        # 8. Keyword matching across evidence
        q_words = set(re.findall(r"\w{3,}", q_lower))
        best_sentence = ""
        best_score = -1
        best_sid = primary_source
        for sid, text in source_blocks:
            sentences = [s.strip() for s in re.split(r"[.\n]", text) if len(s.strip()) > 20]
            for s in sentences:
                score = sum(1 for w in q_words if w in s.lower())
                if score > best_score:
                    best_score = score
                    best_sentence = s
                    best_sid = sid

        if best_sentence and best_score > 0:
            return f"{best_sentence} [{best_sid}]."

        return (
            f"Based on the provided documentation, the requested information is verified "
            f"directly in the source material [{primary_source}]. "
            f"Key operational details are further elaborated in [{secondary_source}]."
        )
