from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.resume import router as resume_router
from routes import interview 
from routes.voice import router as voice_router 
from routes.rag import router as rag_router

# Create the FastAPI app
app = FastAPI(title="CareerPrep AI API", version="1.0.0")

# CORS — allows your React frontend to talk to this backend
# Without this, the browser will block requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the resume routes under /resume prefix
app.include_router(resume_router, prefix="/resume")
app.include_router(interview.router, prefix="/interview", tags=["Interview"])
app.include_router(voice_router) 
app.include_router(rag_router)

# Health check endpoint — confirms API is running
@app.get("/")
async def root():
    return {"message": "CareerPrep AI Backend is running! 🚀"}