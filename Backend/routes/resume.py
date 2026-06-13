from fastapi import APIRouter
from pydantic import BaseModel
from services.ai_service import enhance_resume, match_with_jd

# APIRouter groups related endpoints together
router = APIRouter()


# Define what data shape we expect from the frontend
class ResumeData(BaseModel):
    fullName: str = ""
    email: str = ""
    phone: str = ""
    jobRole: str = ""
    skills: str = ""
    experience: str = ""
    projects: str = ""
    degree: str = ""
    college: str = ""
    gradYear: str = ""
    gpa: str = ""
    linkedin: str = ""
    github: str = ""


class JDMatchRequest(BaseModel):
    resume: ResumeData
    job_description: str


# Endpoint 1 — Enhance resume with AI
@router.post("/enhance")
async def enhance_resume_route(data: ResumeData):
    result = enhance_resume(data.dict())
    return {"success": True, "enhanced": result}


# Endpoint 2 — Match resume with job description
@router.post("/match-jd")
async def match_jd_route(data: JDMatchRequest):
    result = match_with_jd(data.resume.dict(), data.job_description)
    return {"success": True, "match": result}