from groq import Groq
from dotenv import load_dotenv
import json 


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
    resume_data: dict = None,
    question_types: list = None,
    num_questions: int = 5,
) -> list:

    if question_types is None:
        question_types = ["technical", "behavioral", "situational"]

    resume_context = ""
    if resume_data:
        skills = resume_data.get("skills", [])
        experience = resume_data.get("experience", [])
        projects = resume_data.get("projects", [])
        resume_context = f"""
Candidate Profile:
- Skills: {', '.join(skills) if isinstance(skills, list) else skills}
- Experience: {json.dumps(experience)}
- Projects: {json.dumps(projects)}
"""

    prompt = f"""You are an expert technical interviewer for {job_role} positions.
Generate exactly {num_questions} interview questions.
Types to include: {', '.join(question_types)}.
{resume_context}

Return ONLY a valid JSON array. Each object must have exactly these fields:
[
  {{
    "id": 1,
    "question": "Full question text here",
    "type": "technical",
    "difficulty": "medium",
    "hint": "Brief tip on how to approach this question"
  }}
]
Difficulty must be one of: easy, medium, hard.
Type must be one of: technical, behavioral, situational.
Return ONLY the JSON array. No markdown, no explanation, no code fences."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )

    content = response.choices[0].message.content.strip()
    # Strip markdown code fences if present
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
) -> dict:

    prompt = f"""You are an expert interview coach for {job_role} positions.
Evaluate this candidate's interview answer strictly and constructively.

Question: {question}
Candidate's Answer: {answer}

Return ONLY a valid JSON object with exactly these fields:
{{
  "score": 7,
  "grade": "B",
  "overall_feedback": "2-3 sentence summary of the answer quality.",
  "strengths": ["strength one", "strength two"],
  "improvements": ["area to improve one", "area to improve two"],
  "sample_answer": "A strong model answer to this question.",
  "keywords_used": ["keyword found in their answer"],
  "keywords_missing": ["important keyword they should have used"]
}}
score must be an integer 1–10. grade must be A/B/C/D/F.
Return ONLY the JSON object. No markdown, no explanation, no code fences."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    content = response.choices[0].message.content.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    return json.loads(content)