from urllib.parse import urlparse, parse_qs
import os
import json
import logging
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from youtube_transcript_api import YouTubeTranscriptApi
from dotenv import load_dotenv

import asyncio
from services import gemini_service, document_service, website_service, db_service, email_service

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("flashai.server")

app = FastAPI(title="FlashAI Universal AI Learning Platform API", version="2.0.0")

# =========================================================
# CORS
# =========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# REQUEST & RESPONSE MODELS
# =========================================================
class VideoRequest(BaseModel):
    url: str
    language: Optional[str] = None

class FlashcardRequest(BaseModel):
    transcript: str
    number_of_cards: int = 5
    difficulty: str = "medium"
    language: str = "English"

class SummaryRequest(BaseModel):
    transcript: str
    language: str = "English"

class QuizRequest(BaseModel):
    text: str
    number_of_questions: int = 5
    difficulty: str = "medium"
    language: str = "English"

class MindMapRequest(BaseModel):
    text: str
    language: str = "English"

class RevisionNotesRequest(BaseModel):
    text: str
    language: str = "English"

class ImportantQuestionsRequest(BaseModel):
    text: str
    language: str = "English"

class TutorChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    source_context: str

class UrlSourceRequest(BaseModel):
    url: str

class NotesSourceRequest(BaseModel):
    notes: str
    title: Optional[str] = "Study Notes"

class UserRegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class UserLoginRequest(BaseModel):
    email: str
    password: str

class CreateGroupRequest(BaseModel):
    name: str
    description: str
    user_id: int
    user_name: str
    user_email: str

class JoinGroupRequest(BaseModel):
    invite_code: str
    user_id: int
    user_name: str
    user_email: str

class ShareStudySetRequest(BaseModel):
    user_id: int
    user_name: str
    study_set: Dict[str, Any]

class DiscussionMessageRequest(BaseModel):
    user_id: int
    author_name: str
    message: str

class QuizSubmissionRequest(BaseModel):
    user_id: int
    user_name: str
    study_set_id: str
    study_set_title: str
    score: int
    total: int

class RevisionItemRequest(BaseModel):
    user_id: int
    card_id: str
    study_set_id: Optional[str] = ""
    question: str
    answer: str
    options: List[str] = []
    known: bool

class CombinedSummaryRequest(BaseModel):
    study_set_ids: List[str]
    texts: List[str]
    language: str = "English"

class TestEmailRequest(BaseModel):
    user_name: str = "Scholar"
    to_email: str

class TriggerRemindersRequest(BaseModel):
    force_all: bool = False

class CustomReminderRequest(BaseModel):
    user_id: int
    reminder_type: str = "daily"  # "daily" or "inactivity"
    days_inactive: int = 4

# =========================================================
# YOUTUBE VIDEO ID EXTRACTION
# =========================================================
def extract_video_id(url: str) -> Optional[str]:
    try:
        parsed_url = urlparse(url)
        if parsed_url.hostname in ["www.youtube.com", "youtube.com"]:
            if parsed_url.path == "/watch":
                return parse_qs(parsed_url.query).get("v", [None])[0]
            if parsed_url.path.startswith("/shorts/"):
                return parsed_url.path.split("/shorts/")[1].split("/")[0]
        if parsed_url.hostname in ["youtu.be", "www.youtu.be"]:
            return parsed_url.path.strip("/").split("/")[0]
        return None
    except Exception:
        return None

# =========================================================
# ROOT & HEALTH
# =========================================================
@app.get("/")
def root():
    return {
        "message": "FlashAI Universal AI Learning Platform Backend is running!",
        "version": "2.0.0",
        "status": "online"
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "2.0.0"
    }

# =========================================================
# TRANSCRIPT ENDPOINTS (PRESERVED)
# =========================================================
@app.post("/transcript")
def get_transcript(request: VideoRequest):
    try:
        video_id = extract_video_id(request.url)
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")

        ytt_api = YouTubeTranscriptApi()
        if request.language:
            transcript = ytt_api.fetch(video_id, languages=[request.language])
        else:
            transcript = ytt_api.fetch(video_id)

        text = " ".join(snippet.text for snippet in transcript)
        return {
            "video_id": video_id,
            "language": getattr(transcript, "language", "Unknown"),
            "language_code": getattr(transcript, "language_code", "en"),
            "is_generated": getattr(transcript, "is_generated", False),
            "transcript": text
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch transcript: {str(e)}")

@app.get("/transcript-languages/{video_id}")
def get_transcript_languages(video_id: str):
    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)
        languages = []
        for transcript in transcript_list:
            languages.append({
                "name": transcript.language,
                "code": transcript.language_code,
                "is_generated": transcript.is_generated
            })
        return {
            "video_id": video_id,
            "languages": languages
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not get transcript languages: {str(e)}")

# =========================================================
# FLASHCARD & SUMMARY GENERATION (PRESERVED & STABILIZED)
# =========================================================
@app.post("/generate-flashcards")
def generate_flashcards_endpoint(request: FlashcardRequest):
    if not request.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript content is empty.")
    try:
        result = gemini_service.generate_flashcards(
            text=request.transcript,
            number_of_cards=request.number_of_cards,
            difficulty=request.difficulty,
            language=request.language
        )
        return result
    except Exception as e:
        logger.error(f"Flashcard generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Flashcard generation failed: {str(e)}")

@app.post("/generate-summary")
def generate_summary_endpoint(request: SummaryRequest):
    if not request.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript content is empty.")
    try:
        result = gemini_service.generate_summary(
            text=request.transcript,
            language=request.language
        )
        return result
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")

# =========================================================
# MAJOR FEATURE: UNIVERSAL SOURCE INPUTS
# =========================================================
@app.post("/sources/upload")
async def upload_source_file(file: UploadFile = File(...)):
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    content = await file.read()
    
    # Check max file size (15MB)
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds maximum size limit of 15MB.")

    try:
        if ext == ".pdf":
            extracted = document_service.extract_text_from_pdf(content, filename)
        elif ext in [".docx", ".doc"]:
            extracted = document_service.extract_text_from_docx(content, filename)
        elif ext in [".pptx", ".ppt"]:
            extracted = document_service.extract_text_from_pptx(content, filename)
        elif ext in [".png", ".jpg", ".jpeg", ".webp"]:
            mime = file.content_type or "image/png"
            text = gemini_service.analyze_image_with_gemini(content, mime)
            extracted = {
                "filename": filename,
                "source_type": "image",
                "text": text,
                "word_count": len(text.split())
            }
        elif ext in [".mp3", ".wav", ".m4a", ".ogg"]:
            mime = file.content_type or "audio/mp3"
            text = gemini_service.transcribe_audio_with_gemini(content, mime)
            extracted = {
                "filename": filename,
                "source_type": "audio",
                "text": text,
                "word_count": len(text.split())
            }
        elif ext in [".txt", ".md"]:
            text = content.decode("utf-8", errors="ignore")
            extracted = document_service.extract_text_from_notes(text, filename)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}. Supported types: PDF, PPTX, DOCX, TXT, PNG, JPG, MP3, WAV.")
            
        return extracted
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File extraction error: {e}")
        raise HTTPException(status_code=400, detail=f"Processing failed: {str(e)}")

@app.post("/sources/url")
def extract_from_website_url(request: UrlSourceRequest):
    try:
        extracted = website_service.extract_text_from_url(request.url)
        return extracted
    except Exception as e:
        logger.error(f"URL extraction error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to extract webpage: {str(e)}")

@app.post("/sources/notes")
def process_notes_input(request: NotesSourceRequest):
    try:
        extracted = document_service.extract_text_from_notes(request.notes, request.title or "Study Notes")
        return extracted
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# =========================================================
# UNIVERSAL WORKSPACE EXTENSIONS
# =========================================================
@app.post("/generate-quiz")
def generate_quiz_endpoint(request: QuizRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Content is empty.")
    try:
        return gemini_service.generate_quiz(
            text=request.text,
            number_of_questions=request.number_of_questions,
            difficulty=request.difficulty,
            language=request.language
        )
    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

@app.post("/generate-mindmap")
def generate_mindmap_endpoint(request: MindMapRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Content is empty.")
    try:
        return gemini_service.generate_mindmap(
            text=request.text,
            language=request.language
        )
    except Exception as e:
        logger.error(f"Mindmap generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Mindmap generation failed: {str(e)}")

@app.post("/generate-notes")
def generate_notes_endpoint(request: RevisionNotesRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Content is empty.")
    try:
        return gemini_service.generate_revision_notes(
            text=request.text,
            language=request.language
        )
    except Exception as e:
        logger.error(f"Notes generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Notes generation failed: {str(e)}")

@app.post("/generate-questions")
def generate_questions_endpoint(request: ImportantQuestionsRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Content is empty.")
    try:
        return gemini_service.generate_important_questions(
            text=request.text,
            language=request.language
        )
    except Exception as e:
        logger.error(f"Questions generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Questions generation failed: {str(e)}")

@app.post("/ai-tutor/chat")
def ai_tutor_chat_endpoint(request: TutorChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Chat message history cannot be empty.")
    try:
        reply = gemini_service.ai_tutor_chat(
            messages=request.messages,
            source_context=request.source_context
        )
        return {"reply": reply}
    except Exception as e:
        logger.error(f"AI Tutor chat error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Tutor error: {str(e)}")

# =========================================================
# BACKEND AUTHENTICATION
# =========================================================
@app.post("/auth/register")
def register_user(request: UserRegisterRequest):
    try:
        user = db_service.create_user(request.name, request.email, request.password)
        logger.info(f"Registered user: {user.get('email')}")
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(status_code=500, detail="Registration failed.")

@app.post("/auth/login")
def login_user(request: UserLoginRequest):
    logger.info(f"Login attempt for: {request.email}")
    user = db_service.authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    logger.info(f"Login successful for: {user.get('email')}")
    return user

# =========================================================
# COLLABORATIVE STUDY GROUPS
# =========================================================
@app.post("/groups/create")
def create_group(request: CreateGroupRequest):
    try:
        group = db_service.create_study_group(
            name=request.name,
            description=request.description,
            owner_id=request.user_id,
            owner_name=request.user_name,
            owner_email=request.user_email
        )
        return group
    except Exception as e:
        logger.error(f"Create group error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/groups/join")
def join_group(request: JoinGroupRequest):
    try:
        group = db_service.join_study_group(
            invite_code=request.invite_code,
            user_id=request.user_id,
            user_name=request.user_name,
            user_email=request.user_email
        )
        return group
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/groups")
def get_user_groups(user_id: int = Query(...)):
    try:
        groups = db_service.list_user_groups(user_id)
        return {"groups": groups}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/groups/{group_id}")
def get_group_details_endpoint(group_id: int, user_id: int = Query(...)):
    try:
        details = db_service.get_group_details(group_id, user_id)
        return details
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=404, detail="Group not found.")

@app.delete("/groups/{group_id}")
def delete_group_endpoint(group_id: int, user_id: int = Query(...)):
    try:
        result = db_service.delete_study_group(group_id, user_id)
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Delete group error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/groups/{group_id}/share")
def share_study_set_endpoint(group_id: int, request: ShareStudySetRequest):
    try:
        shared = db_service.share_study_set(group_id, request.user_id, request.user_name, request.study_set)
        return shared
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/groups/{group_id}/discussions")
def get_discussions_endpoint(group_id: int, user_id: int = Query(...)):
    try:
        posts = db_service.get_group_discussions(group_id, user_id)
        return {"discussions": posts}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/groups/{group_id}/discussions")
def post_discussion_endpoint(group_id: int, request: DiscussionMessageRequest):
    try:
        post = db_service.add_discussion_post(group_id, request.user_id, request.author_name, request.message)
        return post
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/groups/{group_id}/quiz-submit")
def submit_group_quiz_endpoint(group_id: int, request: QuizSubmissionRequest):
    try:
        res = db_service.submit_quiz_score(
            group_id=group_id,
            user_id=request.user_id,
            user_name=request.user_name,
            study_set_id=request.study_set_id,
            study_set_title=request.study_set_title,
            score=request.score,
            total=request.total
        )
        return res
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/groups/{group_id}/leaderboard")
def get_leaderboard_endpoint(group_id: int, user_id: int = Query(...)):
    try:
        leaderboard = db_service.get_group_leaderboard(group_id, user_id)
        return {"leaderboard": leaderboard}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/groups/{group_id}/combined-summary")
def generate_group_combined_summary(group_id: int, request: CombinedSummaryRequest):
    if not request.texts:
        raise HTTPException(status_code=400, detail="No source material selected.")
    try:
        combined_text = "\n\n=== NEXT MATERIAL ===\n\n".join(request.texts)
        summary_data = gemini_service.generate_summary(combined_text, language=request.language)
        return summary_data
    except Exception as e:
        logger.error(f"Combined summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================
# SPACED REPETITION & REVISION
# =========================================================
@app.post("/revision/card")
def save_revision_endpoint(request: RevisionItemRequest):
    try:
        res = db_service.save_revision_item(
            user_id=request.user_id,
            card_id=request.card_id,
            study_set_id=request.study_set_id or "",
            question=request.question,
            answer=request.answer,
            options=request.options,
            known=request.known
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/revision/due")
def get_due_revisions_endpoint(user_id: int = Query(...)):
    try:
        due = db_service.get_due_revisions(user_id)
        return {"due_cards": due}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/revision/all")
def get_all_revisions_endpoint(user_id: int = Query(...)):
    try:
        all_cards = db_service.get_all_revisions(user_id)
        return {"cards": all_cards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/revision/set/{study_set_id}")
def delete_revision_set_endpoint(study_set_id: str, user_id: int = Query(...)):
    try:
        res = db_service.delete_revision_set(user_id, study_set_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================
# LEARNING ANALYTICS
# =========================================================
@app.get("/analytics/{user_id}")
def get_user_analytics(user_id: int):
    try:
        cards = db_service.get_all_revisions(user_id)
        due_cards = db_service.get_due_revisions(user_id)
        groups = db_service.list_user_groups(user_id)
        
        mastered = sum(1 for c in cards if c.get("status") == "mastered")
        learning = sum(1 for c in cards if c.get("status") == "due")
        review = sum(1 for c in cards if c.get("status") == "review")
        
        return {
            "total_cards_tracked": len(cards),
            "due_for_review_today": len(due_cards),
            "mastered_cards": mastered,
            "in_review": review,
            "needs_work": learning,
            "groups_joined": len(groups)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================
# EMAIL NOTIFICATIONS & STUDY REMINDERS
# =========================================================
@app.get("/notifications/status")
def get_notification_status():
    configured = email_service.is_smtp_configured()
    users_needing = db_service.get_users_needing_reminders()
    return {
        "smtp_configured": configured,
        "smtp_host": email_service.SMTP_HOST,
        "smtp_port": email_service.SMTP_PORT,
        "sender_email": email_service.FROM_EMAIL if configured else "Not configured",
        "pending_reminders_count": len(users_needing),
        "pending_users": users_needing
    }

@app.post("/notifications/test-email")
def test_email_endpoint(request: TestEmailRequest):
    if not email_service.is_smtp_configured():
        raise HTTPException(
            status_code=400,
            detail="SMTP credentials are not configured in server/.env. Please set SMTP_USER and SMTP_PASSWORD with your Gmail App Password."
        )
    try:
        email_service.send_test_email(request.user_name, request.to_email)
        return {
            "status": "success",
            "message": f"Test verification email successfully dispatched to {request.to_email}"
        }
    except Exception as e:
        logger.error(f"Test email failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/notifications/trigger-reminders")
def trigger_study_reminders(request: TriggerRemindersRequest):
    if not email_service.is_smtp_configured():
        raise HTTPException(
            status_code=400,
            detail="SMTP credentials not configured in server/.env. Please configure SMTP_USER and SMTP_PASSWORD."
        )
    
    users = db_service.get_users_needing_reminders()
    dispatched = []
    errors = []

    for u in users:
        try:
            if u["reminder_type"] == "inactivity_alert":
                email_service.send_inactivity_alert(
                    user_name=u["name"],
                    to_email=u["email"],
                    days_inactive=u["days_inactive"]
                )
            else:
                email_service.send_daily_reminder(
                    user_name=u["name"],
                    to_email=u["email"],
                    due_cards_count=u["due_cards_count"]
                )
            db_service.update_user_reminded(u["user_id"])
            dispatched.append({
                "email": u["email"],
                "type": u["reminder_type"],
                "days_inactive": u["days_inactive"]
            })
        except Exception as e:
            errors.append({"email": u["email"], "error": str(e)})

    return {
        "status": "completed",
        "dispatched_count": len(dispatched),
        "dispatched": dispatched,
        "errors": errors
    }

@app.post("/notifications/send-user-reminder")
def send_user_reminder_endpoint(request: CustomReminderRequest):
    if not email_service.is_smtp_configured():
        raise HTTPException(
            status_code=400,
            detail="SMTP credentials not configured in server/.env."
        )
    
    # Fetch user from db
    conn = db_service.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email FROM users WHERE id = ?", (request.user_id,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user_dict = dict(user)
    try:
        if request.reminder_type == "inactivity":
            email_service.send_inactivity_alert(
                user_name=user_dict["name"],
                to_email=user_dict["email"],
                days_inactive=request.days_inactive
            )
        else:
            email_service.send_daily_reminder(
                user_name=user_dict["name"],
                to_email=user_dict["email"],
                due_cards_count=3
            )
        db_service.update_user_reminded(user_dict["id"])
        return {
            "status": "success",
            "message": f"{request.reminder_type.capitalize()} reminder sent to {user_dict['email']}"
        }
    except Exception as e:
        logger.error(f"User reminder failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================
# PERIODIC BACKGROUND REMINDER SCHEDULER
# =========================================================
@app.on_event("startup")
async def start_reminder_scheduler():
    async def reminder_worker():
        # Wait 10 seconds after server boot
        await asyncio.sleep(10)
        while True:
            try:
                if email_service.is_smtp_configured():
                    users = db_service.get_users_needing_reminders()
                    for u in users:
                        try:
                            if u["reminder_type"] == "inactivity_alert":
                                email_service.send_inactivity_alert(u["name"], u["email"], u["days_inactive"])
                            else:
                                email_service.send_daily_reminder(u["name"], u["email"], u["due_cards_count"])
                            db_service.update_user_reminded(u["user_id"])
                            logger.info(f"Automated email reminder sent to {u['email']} ({u['reminder_type']})")
                        except Exception as e:
                            logger.error(f"Automated reminder failed for {u['email']}: {e}")
            except Exception as e:
                logger.error(f"Reminder scheduler loop exception: {e}")
            # Check every 2 hours
            await asyncio.sleep(2 * 3600)

    asyncio.create_task(reminder_worker())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)