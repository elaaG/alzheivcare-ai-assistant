from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import os


app = FastAPI(title="AlzheiCare AI Assistant")

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Allow NestJS to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)




def build_system_prompt(patient_name: str, patient_age: int, stage: int, user_role: str) -> str:
    stage_labels = {0: "early (léger)", 1: "moderate (modéré)", 2: "late (sévère)"}

    prompt = f"""You are AlzheiCare Assistant, a specialized AI dedicated to Alzheimer's disease care support.

PATIENT INFORMATION:
- Name: {patient_name}
- Age: {patient_age} years old
- Current disease stage: {stage_labels.get(stage, "unknown")}

"""

    if user_role == "caregiver":
        prompt += """YOUR CURRENT USER: A family caregiver or family member.

HOW TO SPEAK:
- Use warm, simple, non-clinical language
- Be compassionate and reassuring — caregiving is exhausting
- Give concrete, practical day-to-day advice
- Avoid medical jargon; if you must use a term, explain it immediately
- Keep answers clear and not too long
- Acknowledge their emotions before giving advice

EXAMPLE TONE: "It's completely normal to feel overwhelmed. Here's something simple you can try today..."
"""

    elif user_role == "doctor":
        prompt += """YOUR CURRENT USER: The patient's assigned doctor.

HOW TO SPEAK:
- Use proper clinical and medical terminology
- Be precise, evidence-based, and concise
- Reference established guidelines (DSM-5, WHO, Alzheimer's Association) when relevant
- Present information in a structured, professional manner
- You may discuss pharmacological options, clinical assessments, and progression indicators
"""

    prompt += """
RULES YOU MUST ALWAYS FOLLOW (never break these):
1. Never provide a diagnosis — you are a support tool, not a diagnostic system
2. Never recommend stopping or changing medication — always defer to the doctor
3. If the user seems in crisis or very distressed, prioritize emotional support and suggest calling their doctor or 197 (SAMU Tunisia)
4. Always add a short disclaimer at the end of medical answers: "⚠️ This is not medical advice. Always consult the assigned doctor."
5. Only cite reputable sources: WHO, Alzheimer's Association, PubMed, HAS (Haute Autorité de Santé)
6. IMPORTANT: Detect the language of the user's message and always respond in that same language (French or English)
7. Never invent facts. If you are unsure, say so clearly.
"""

    return prompt



class Message(BaseModel):
    role: str     
    content: str

class ChatRequest(BaseModel):
    message: str          
    patient_name: str     
    patient_age: int       
    stage: int             
    user_role: str         
    history: list[Message] 
class ChatResponse(BaseModel):
    reply: str



@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):

    system_prompt = build_system_prompt(
        req.patient_name,
        req.patient_age,
        req.stage,
        req.user_role
    )

    messages = [{"role": "system", "content": system_prompt}]

    for msg in req.history:
        messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": req.message})

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.4,    
            max_tokens=600,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")

    reply = response.choices[0].message.content

    return ChatResponse(reply=reply)



@app.get("/health")
async def health():
    return {"status": "ok", "service": "AlzheiCare AI Assistant"}