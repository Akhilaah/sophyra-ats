import pdfplumber
import docx2txt
from typing import Optional


def extract_text(file_path: str) -> str:
    """Extract text from .pdf or .docx files. Returns empty string on unsupported/failed extraction."""
    try:
        if file_path.lower().endswith(".pdf"):
            text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            return text

        elif file_path.lower().endswith(".docx"):
            return docx2txt.process(file_path) or ""

    except Exception:
        # keep function safe to call; caller can log/raise if needed
        return ""

    return ""
