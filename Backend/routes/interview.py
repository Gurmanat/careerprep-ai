# backend/routes/interview.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.ai_service import generate_interview_questions, evaluate_interview_answer

router = APIRouter()


class GenerateQuestionsRequest(BaseModel):
    job_role: str
    resume_data: Optional[dict] = None
    question_types: Optional[List[str]] = ["technical", "behavioral", "situational"]
    num_questions: Optional[int] = 5


class EvaluateAnswerRequest(BaseModel):
    question: str
    answer: str
    job_role: str


@router.post("/generate-questions")
async def generate_questions(request: GenerateQuestionsRequest):
    try:
        questions = await generate_interview_questions(
            job_role=request.job_role,
            resume_data=request.resume_data,
            question_types=request.question_types,
            num_questions=request.num_questions,
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
        )
        return feedback
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))