from groq import Groq
from dotenv import load_dotenv
import json 
from services.rag_service import retrieve, has_index

print("OK")
import os

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def enhance_resume(form_data: dict) -> dict:
    """
    Takes raw resume form data and returns AI-enhanced content.
    """

    prompt = f"""
    You are a professional resume writer. A user is applying for the role of: {form_data.get('jobRole', 'a professional role')}.

    Here is their raw resume information:

    SKILLS: {form_data.get('skills', 'Not provided')}
    EXPERIENCE: {form_data.get('experience', 'Not provided')}
    PROJECTS: {form_data.get('projects', 'Not provided')}

    Your task:
    1. Rewrite SKILLS as a clean comma-separated list, adding relevant technical skills for the job role.
    2. Rewrite EXPERIENCE as 3-4 strong bullet points using action verbs and measurable results.
    3. Rewrite PROJECTS as 2-3 bullet points highlighting tech used and impact.

    Reply ONLY in this exact format (no extra text):
    SKILLS: <enhanced skills here>
    EXPERIENCE:
    - <bullet 1>
    - <bullet 2>
    - <bullet 3>
    PROJECTS:
    - <bullet 1>
    - <bullet 2>
    """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are an expert resume writer."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=800
    )

    # Extract the text response
    raw_text = response.choices[0].message.content

    # Parse the response into sections
    result = {"skills": "", "experience": "", "projects": ""}

    lines = raw_text.strip().split('\n')
    current_section = None

    for line in lines:
        line = line.strip()
        if line.startswith("SKILLS:"):
            result["skills"] = line.replace("SKILLS:", "").strip()
        elif line.startswith("EXPERIENCE:"):
            current_section = "experience"
        elif line.startswith("PROJECTS:"):
            current_section = "projects"
        elif line.startswith("-") and current_section:
            result[current_section] += line[1:].strip() + "\n"

    return result


def match_with_jd(resume_data: dict, job_description: str) -> dict:
    """
    Compares the resume with a job description and returns a match report.
    """

    prompt = f"""
    You are a hiring manager and ATS (Applicant Tracking System) expert.

    JOB DESCRIPTION:
    {job_description}

    CANDIDATE RESUME:
    Skills: {resume_data.get('skills')}
    Experience: {resume_data.get('experience')}
    Projects: {resume_data.get('projects')}

    Analyze and respond ONLY in this format:
    MATCH_SCORE: <number from 0 to 100>
    MATCHING_SKILLS: <comma separated list of skills that match>
    MISSING_SKILLS: <comma separated list of important missing skills>
    SUGGESTION: <2-3 sentences on how to improve the resume for this JD>
    """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are an ATS and hiring expert."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.5,
        max_tokens=500
    )

    raw_text = response.choices[0].message.content
    result = {
        "match_score": 0,
        "matching_skills": "",
        "missing_skills": "",
        "suggestion": ""
    }

    for line in raw_text.strip().split('\n'):
        if line.startswith("MATCH_SCORE:"):
            try:
                result["match_score"] = int(line.replace("MATCH_SCORE:", "").strip())
            except:
                result["match_score"] = 0
        elif line.startswith("MATCHING_SKILLS:"):
            result["matching_skills"] = line.replace("MATCHING_SKILLS:", "").strip()
        elif line.startswith("MISSING_SKILLS:"):
            result["missing_skills"] = line.replace("MISSING_SKILLS:", "").strip()
        elif line.startswith("SUGGESTION:"):
            result["suggestion"] = line.replace("SUGGESTION:", "").strip()

    return result

async def generate_interview_questions(
    job_role: str,
    question_types: list,
    count: int,
    resume_context: str = "",
    session_id: str = "",
) -> list:

    # Retrieve relevant resume chunks from FAISS
    rag_context = ""
    if session_id and has_index(session_id):
        chunks = retrieve(
            session_id,
            f"{job_role} skills experience projects",
            top_k=5
        )

        if chunks:
            rag_context = "\n\nRelevant Resume Excerpts:\n"
            rag_context += "\n---\n".join(chunks)

    context = rag_context if rag_context else (
        f"\nResume Context:\n{resume_context}" if resume_context else ""
    )

    prompt = f"""
You are an expert interviewer for {job_role} positions.

Generate exactly {count} interview questions.

Question types:
{", ".join(question_types)}

{context}

If resume excerpts are available, personalise the questions using the candidate's projects, skills, technologies and experience.

Return ONLY valid JSON.

[
  {{
    "id": 1,
    "question": "...",
    "type": "technical",
    "difficulty": "easy",
    "hint": "..."
  }}
]
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
    )

    content = response.choices[0].message.content.strip()

    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    return json.loads(content)

async def evaluate_interview_answer(
    question: str,
    answer: str,
    job_role: str,
    session_id: str = "",
) -> dict:

    rag_context = ""

    if session_id and has_index(session_id):
        chunks = retrieve(session_id, question, top_k=3)

        if chunks:
            rag_context = "\nCandidate Resume Context:\n"
            rag_context += "\n---\n".join(chunks)

    prompt = f"""
You are an expert interview coach for {job_role} positions.

Question:
{question}

Candidate Answer:
{answer}

{rag_context}

Return ONLY valid JSON.

{{
  "score": 7,
  "grade": "B",
  "overall_feedback": "...",
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "sample_answer": "...",
  "keywords_used": ["..."],
  "keywords_missing": ["..."]
}}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
    )

    content = response.choices[0].message.content.strip()

    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    return json.loads(content)
