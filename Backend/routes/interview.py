# backend/routes/interview.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.ai_service import generate_interview_questions, evaluate_interview_answer

router = APIRouter()


class GenerateQuestionsRequest(BaseModel):
    job_role: str
    question_types: List[str]
    count: int
    resume_context: str = ""
    session_id: str = ""


class EvaluateAnswerRequest(BaseModel):
    question: str
    answer: str
    job_role: str
    session_id: str = ""


@router.post("/generate-questions")
async def generate_questions(request: GenerateQuestionsRequest):
    try:
        questions = await generate_interview_questions(
            job_role=request.job_role,
            question_types=request.question_types,
            count=request.count,
            resume_context=request.resume_context,
            session_id=request.session_id,
        )
        return {"questions": questions, "job_role": request.job_role}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate-answer")
async def evaluate_answer(request: EvaluateAnswerRequest):
    try:
        if not request.answer.strip():
            raise HTTPException(status_code=400, detail="Answer cannot be empty")
        feedback = await evaluate_interview_answer(
            question=request.question,
            answer=request.answer,
            job_role=request.job_role,
            session_id=request.session_id,
        )
        return feedback
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))