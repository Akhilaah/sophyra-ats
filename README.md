# Sophyra ATS (Local)

An AI-powered system that generates ATS-friendly resumes and evaluates them against job descriptions with an ATS compatibility score.

This project is designed to help students and early-career professionals create resumes that align with Applicant Tracking Systems used by recruiters.

---

## 🚀 Features

- AI-generated, ATS-friendly resume creation
- Job-description–aware keyword alignment
- ATS score (0–100) with explanations
- Resume download in DOCX format
- Resume upload and ATS scanning (PDF/DOCX)
- Clean, minimal UI with live preview

---

## 🧠 How the AI works

- Resume generation is powered by **Google Gemini (via Google AI Studio)**
- The LLM is prompted to:
  - generate standard ATS-compliant sections
  - prioritize skills and keywords from the job description
  - avoid formatting that breaks ATS parsing
- The output is plain text and later formatted into a DOCX file

---

## 📊 ATS Scoring Logic

The ATS score is computed using lightweight text analysis:
- Extracts keywords from the job description
- Compares them with resume content
- Scores based on keyword match ratio, role relevance, and formatting rules
- Provides matched keywords, missing keywords, and improvement suggestions

Scoring logic is implemented in `ats_scoring.py`.

---

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python)
- **LLM**: Google Gemini (AI Studio)
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Document Generation**: python-docx
- **Scoring**: Custom keyword-based ATS logic

---

## ⚡ Quick Start

### 1. Create a virtual environment and install dependencies
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt


2. Set environment variable `GOOGLE_API_KEY` (used by Gemini client):

```bash
export GOOGLE_API_KEY="your_key_here"
```

3. Run the FastAPI app (development):

```bash
uvicorn main:app --reload
```

Notes
- Generated resume files are saved as `resume_<uuid>.docx` in the project root. Download via `/download?filename=...`.
- This repo includes lightweight tokenization and scoring logic in `ats_scoring.py`.
