# Sophyra ATS (local)

Small project that generates ATS-friendly resumes and scores them against a job description.

Quick start

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

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
