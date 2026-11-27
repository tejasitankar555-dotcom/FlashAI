import os

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

interaction = client.interactions.create(
    model="gemini-3.6-flash",
    input="What is machine learning? Explain it in one short sentence."
)

print(interaction.output_text)