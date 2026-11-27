import os
import json

from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is not set.")

client = genai.Client(
    api_key=api_key,
    http_options={"api_version": "v1"}
)

transcript = """
Machine learning is a branch of artificial intelligence.
It allows computers to learn patterns from data and make
predictions without being explicitly programmed for every task.
Supervised learning uses labeled data to train a model.
Unsupervised learning works with unlabeled data and can find
hidden patterns or groups within the data.
"""

prompt = f"""
You are an expert educational flashcard generator.

Create 5 high-quality flashcards from the transcript below.

Requirements:
- Focus on important concepts.
- Do not create trivial questions.
- Each question must have one clear answer.
- Keep answers concise but informative.
- Do not use information that is not present in the transcript.
- Return ONLY valid JSON.
- Use exactly this structure:

{{
  "flashcards": [
    {{
      "question": "Question here",
      "answer": "Answer here"
    }}
  ]
}}

Transcript:
{transcript}
"""

interaction = client.interactions.create(
    model="gemini-3.6-flash",
    input=prompt
)

result = interaction.output_text

print(result)