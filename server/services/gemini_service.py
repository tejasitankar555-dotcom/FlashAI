import os
import json
import re
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
logger = logging.getLogger("flashai.gemini")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Candidate models in order of priority for fast & reliable execution
MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-flash-latest"
]

_client = None

def get_gemini_client():
    global _client
    if _client is not None:
        return _client
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set.")
    _client = genai.Client(api_key=api_key)
    return _client

def clean_json_text(text: str) -> str:
    """Extract valid JSON substring from AI output text."""
    text = text.strip()
    # Strip markdown fences if wrapped in ```json ... ``` or ``` ... ```
    if "```" in text:
        # Match ```json ... ``` or ``` ... ```
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if fence_match:
            text = fence_match.group(1).strip()
    # If text still has surrounding text, look for outermost { } or [ ]
    if not (text.startswith("{") or text.startswith("[")):
        start_brace = text.find("{")
        start_bracket = text.find("[")
        if start_brace != -1 and (start_bracket == -1 or start_brace < start_bracket):
            end_brace = text.rfind("}")
            if end_brace != -1:
                text = text[start_brace:end_brace + 1]
        elif start_bracket != -1:
            end_bracket = text.rfind("]")
            if end_bracket != -1:
                text = text[start_bracket:end_bracket + 1]
    return text

def call_gemini(contents: Any, system_instruction: Optional[str] = None) -> str:
    """Execute Gemini request with automatic fallback across available models."""
    client = get_gemini_client()
    last_error = None
    
    config = None
    if system_instruction:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.3
        )
    
    for model_name in MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config
            )
            if response and response.text:
                return response.text
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}. Trying next model...")
            last_error = e
            continue
            
    raise RuntimeError(f"All Gemini models failed. Last error: {last_error}")

def generate_flashcards(text: str, number_of_cards: int = 5, difficulty: str = "medium", language: str = "English") -> Dict[str, Any]:
    prompt = f"""You are an expert educational flashcard generator.

Create exactly {number_of_cards} high-quality flashcards from the learning material below.

Difficulty: {difficulty}
Flashcard language: {language}

Requirements:
- Focus on important concepts, definitions, and core principles.
- Avoid trivial or subjective questions.
- Each question must have one clear, unambiguous correct answer.
- Keep answers concise but informative.
- Use ONLY information contained in the source material.
- Write in {language}.
- Return ONLY valid JSON with no markdown formatting.

Format structure:
{{
  "flashcards": [
    {{
      "question": "Question text here?",
      "answer": "Exact correct answer text",
      "options": [
        "Exact correct answer text",
        "Plausible distractor 1",
        "Plausible distractor 2",
        "Plausible distractor 3"
      ]
    }}
  ]
}}

Rules for every flashcard:
- Create exactly 4 options.
- The "answer" field MUST match exactly one of the 4 options.
- Randomize the position of the correct answer within the options array.

Source Material:
{text[:15000]}
"""
    raw = call_gemini(prompt)
    cleaned = clean_json_text(raw)
    data = json.loads(cleaned)
    if "flashcards" not in data or not isinstance(data["flashcards"], list):
        raise ValueError("Invalid flashcard output structure from AI")
    # Verify each card has 4 options and answer is in options
    for card in data["flashcards"]:
        if "options" not in card or not isinstance(card["options"], list):
            card["options"] = [card["answer"]]
        if card["answer"] not in card["options"]:
            card["options"].insert(0, card["answer"])
        while len(card["options"]) < 4:
            card["options"].append(f"Option {len(card['options']) + 1}")
        if len(card["options"]) > 4:
            # Keep answer and 3 others
            others = [o for o in card["options"] if o != card["answer"]][:3]
            card["options"] = [card["answer"]] + others
    return data

def generate_summary(text: str, language: str = "English") -> Dict[str, Any]:
    prompt = f"""You are an expert educational content summarizer.

Create a concise and structured study summary from the learning material below.

Summary language: {language}

Requirements:
- Summarize ONLY information contained in the material.
- Focus on the main ideas, core concepts, and key definitions.
- Make it easy for a student to understand and revise.
- Extract 5 to 8 important key concepts.
- Write everything in {language}.
- Return ONLY valid JSON with no markdown wrapping.

Format structure:
{{
  "summary": "Concise structured educational summary paragraph or two.",
  "key_concepts": [
    "Important concept 1",
    "Important concept 2",
    "Important concept 3",
    "Important concept 4",
    "Important concept 5"
  ]
}}

Source Material:
{text[:15000]}
"""
    raw = call_gemini(prompt)
    cleaned = clean_json_text(raw)
    data = json.loads(cleaned)
    if "summary" not in data or "key_concepts" not in data:
        raise ValueError("Invalid summary output structure from AI")
    return data

def generate_quiz(text: str, number_of_questions: int = 5, difficulty: str = "medium", language: str = "English") -> Dict[str, Any]:
    prompt = f"""You are an educational assessment expert.

Create a multiple-choice quiz of exactly {number_of_questions} questions from the learning material below.

Difficulty: {difficulty}
Language: {language}

Format:
{{
  "quiz_title": "Quiz Assessment",
  "questions": [
    {{
      "id": 1,
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "Brief explanation why Option A is correct based on the source."
    }}
  ]
}}

Requirements:
- 4 multiple-choice options per question.
- "answer" must match one of the options exactly.
- Include a helpful educational explanation.
- Return ONLY valid JSON.

Source Material:
{text[:15000]}
"""
    raw = call_gemini(prompt)
    cleaned = clean_json_text(raw)
    data = json.loads(cleaned)
    if "questions" not in data:
        raise ValueError("Invalid quiz format from AI")
    return data

def generate_mindmap(text: str, language: str = "English") -> Dict[str, Any]:
    prompt = f"""You are an expert educator and visual learning specialist.

Create a hierarchical mind map structure from the learning material below.

Language: {language}

Format structure:
{{
  "title": "Central Topic",
  "root": {{
    "name": "Central Subject",
    "children": [
      {{
        "name": "Main Branch 1",
        "children": [
          {{"name": "Subtopic A", "children": []}},
          {{"name": "Subtopic B", "children": []}}
        ]
      }},
      {{
        "name": "Main Branch 2",
        "children": [
          {{"name": "Subtopic C", "children": []}}
        ]
      }}
    ]
  }}
}}

Requirements:
- Exactly one root node representing the central topic.
- 3 to 6 main branches with 2 to 4 subtopics each.
- Short, informative labels (2-5 words each).
- Return ONLY valid JSON.

Source Material:
{text[:15000]}
"""
    raw = call_gemini(prompt)
    cleaned = clean_json_text(raw)
    return json.loads(cleaned)

def generate_revision_notes(text: str, language: str = "English") -> Dict[str, Any]:
    prompt = f"""You are an academic coach preparing quick-reference revision notes.

Create structured revision notes from the source material below.

Language: {language}

Format:
{{
  "title": "Quick Revision Notes",
  "sections": [
    {{
      "heading": "Section Heading",
      "bullet_points": [
        "Key point 1",
        "Key point 2"
      ],
      "formula_or_rule": "Optional important formula, syntax, or principle (or empty)"
    }}
  ],
  "quick_takeaway": "One sentence main takeaway."
}}

Return ONLY valid JSON.

Source Material:
{text[:15000]}
"""
    raw = call_gemini(prompt)
    cleaned = clean_json_text(raw)
    return json.loads(cleaned)

def generate_important_questions(text: str, language: str = "English") -> Dict[str, Any]:
    prompt = f"""You are a university professor creating exam and viva revision questions.

Generate 6-8 important academic and interview/viva questions with model answers from the material below.

Language: {language}

Format:
{{
  "questions": [
    {{
      "type": "Conceptual / Exam / Viva",
      "question": "Question text?",
      "model_answer": "Concise, high-scoring model answer based strictly on the source.",
      "importance": "High / Medium"
    }}
  ]
}}

Return ONLY valid JSON.

Source Material:
{text[:15000]}
"""
    raw = call_gemini(prompt)
    cleaned = clean_json_text(raw)
    return json.loads(cleaned)

def ai_tutor_chat(messages: List[Dict[str, str]], source_context: str) -> str:
    """Ground AI tutor chat responses in the provided source material."""
    system_instruction = f"""You are FlashAI Tutor, an empathetic, highly knowledgeable academic tutor.
Your job is to help the student understand their study material.

GROUNDING RULES:
1. Base your explanations PRIMARILY on the provided source material below.
2. If the user asks about something mentioned in the source, explain it clearly with step-by-step reasoning or simple analogies.
3. If the user's question is NOT answered in the source material, explicitly state: "This concept is not covered in your selected study material, but here is the general explanation:" and then provide helpful, accurate knowledge.
4. Never fabricate citations or claim the material says something it does not.
5. Keep explanations engaging, encouraging, and clear. Format with markdown bullet points and bold highlights where appropriate.

SOURCE STUDY MATERIAL:
{source_context[:12000]}
"""
    
    # Format chat conversation for contents
    # Build single prompt or conversation thread
    history_text = ""
    for msg in messages:
        role = "Student" if msg.get("role") == "user" else "Tutor"
        history_text += f"\n{role}: {msg.get('content', '')}\n"
    
    prompt = f"{history_text}\nTutor: "
    return call_gemini(prompt, system_instruction=system_instruction)

def analyze_image_with_gemini(image_bytes: bytes, mime_type: str = "image/png") -> str:
    """Extract study text and transcribe diagrams from image using Gemini vision."""
    client = get_gemini_client()
    prompt = """Analyze this educational document/diagram/screenshot.
1. Extract ALL visible text, formulas, headings, and bullet points accurately (OCR).
2. If there are diagrams, flowcharts, or architecture diagrams, describe their structure and components clearly.
3. Organize the extracted content logically for a student studying this topic.
"""
    part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    
    for model_name in MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[part, prompt]
            )
            if response and response.text:
                return response.text
        except Exception as e:
            logger.warning(f"Image analysis with {model_name} failed: {e}")
            continue
    raise RuntimeError("Failed to analyze image with Gemini vision.")

def transcribe_audio_with_gemini(audio_bytes: bytes, mime_type: str = "audio/mp3") -> str:
    """Transcribe audio lecture or recording using Gemini audio understanding."""
    client = get_gemini_client()
    prompt = """Transcribe this audio recording into clear, punctuated text.
Identify key topics, speaker remarks, and important educational takeaways.
Return the complete transcript with topic headings where natural.
"""
    part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
    
    for model_name in MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[part, prompt]
            )
            if response and response.text:
                return response.text
        except Exception as e:
            logger.warning(f"Audio transcription with {model_name} failed: {e}")
            continue
    raise RuntimeError("Failed to transcribe audio with Gemini.")
