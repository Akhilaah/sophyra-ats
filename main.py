from fastapi import FastAPI, HTTPException
from fastapi import UploadFile, File, Form
from pydantic import BaseModel, Field
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
import asyncio
from typing import Optional

from resume_generator import generate_resume, save_docx, clean_text
from ats_scoring import calculate_ats_score
from resume_parser import extract_text

app = FastAPI()

# Serve a small static frontend if present in the workspace.
# Mount static assets under /static so API routes (POST/PUT/etc) are not intercepted by the static handler.
if os.path.isdir("frontend"):
    app.mount("/static", StaticFiles(directory="frontend"), name="static")


@app.get("/")
def root_index():
    """Serve the frontend index page."""
    index_path = os.path.join("frontend", "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="Frontend index not found")
    return FileResponse(index_path, media_type="text/html")


@app.get('/favicon.ico')
def favicon():
    svg_path = os.path.join('frontend', 'favicon.svg')
    if not os.path.exists(svg_path):
        raise HTTPException(status_code=404, detail='favicon not found')
    return FileResponse(svg_path, media_type='image/svg+xml')


class ResumeRequest(BaseModel):
    name: str = Field(..., max_length=120)
    email: str = Field(..., max_length=120)
    phone: str = Field(..., max_length=40)
    role: str = Field(..., max_length=200)
    jd: Optional[str] = Field(default="")
    content: Optional[str] = Field(default="")


@app.post("/generate")
async def generate(data: ResumeRequest):
    # run blocking operations in a thread to avoid blocking the event loop
    try:
        raw_text = await asyncio.to_thread(generate_resume, data.dict())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Resume generation failed: {exc}")

    # Clean the model output before scoring and previewing
    cleaned = await asyncio.to_thread(clean_text, raw_text)

    score, explanation = await asyncio.to_thread(calculate_ats_score, cleaned, data.jd or "")

    filename = f"{data.name.strip()}.docx"
    try:
        saved = await asyncio.to_thread(save_docx, cleaned, filename)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save resume: {exc}")

    return {
        "ats_score": score,
        "explanation": explanation,
        "resume_file": saved,
        "resume_text": cleaned,
    }


@app.post("/ATS Score")
async def parse_upload(file: UploadFile = File(...), jd: str = Form("")):
    """Accept a .pdf or .docx upload with optional JD form field, extract text, compute an ATS score (JD optional), and return a preview, length, and score."""
    import shutil
    from tempfile import NamedTemporaryFile

    suffix = ""
    if file.filename.lower().endswith(".pdf"):
        suffix = ".pdf"
    elif file.filename.lower().endswith(".docx"):
        suffix = ".docx"

    tmp_path = None
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            # write upload to disk
            shutil.copyfileobj(file.file, tmp)

        # extraction can be blocking; run in thread
        text = await asyncio.to_thread(extract_text, tmp_path)

        # compute ATS score using provided JD if present, otherwise score with empty JD
        jd_to_use = jd.strip() if jd and jd.strip() else ""
        score, explanation = await asyncio.to_thread(calculate_ats_score, text, jd_to_use)

        # return a truncated preview to keep responses small
        preview = text[:5000]
        return {
            "filename": file.filename,
            #"extracted_preview": preview,
            "full_length": len(text),
            "ats_score": score,
            "explanation": explanation,
        }
    finally:
        try:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass



@app.get("/download")
def download_resume(filename: str):
    file_path = filename

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Resume file not found")

    return FileResponse(
        path=file_path,
        filename=os.path.basename(file_path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


