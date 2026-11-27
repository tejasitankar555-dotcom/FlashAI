from youtube_transcript_api import YouTubeTranscriptApi

video_id = "dQw4w9WgXcQ"

api = YouTubeTranscriptApi()

transcript_list = api.list(video_id)

for transcript in transcript_list:
    print(
        transcript.language,
        "|",
        transcript.language_code,
        "| generated:",
        transcript.is_generated
    )