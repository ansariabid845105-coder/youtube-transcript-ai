from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from urllib.parse import urlparse, parse_qs

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable
)

from database import engine, SessionLocal
import database_model


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
database_model.Base.metadata.create_all(bind=engine)


class TranscriptRequest(BaseModel):
    youtube_url: str


def extract_video_id(url: str):
    parsed_url = urlparse(url)

    # Normal YouTube URL
    if parsed_url.hostname in ["www.youtube.com", "youtube.com"]:
        query_params = parse_qs(parsed_url.query)
        return query_params.get("v", [None])[0]

    # Short YouTube URL
    if parsed_url.hostname == "youtu.be":
        return parsed_url.path.lstrip("/")

    return None


@app.post("/transcripts")
def create_transcript(request: TranscriptRequest):

    # Extract video ID
    video_id = extract_video_id(request.youtube_url)

    # Validate video ID
    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid YouTube URL"
        )


    # Fetch transcript
    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)

    except VideoUnavailable:
        raise HTTPException(
            status_code=404,
            detail="YouTube video not found or unavailable"
        )

    except TranscriptsDisabled:
        raise HTTPException(
            status_code=404,
            detail="Transcripts are disabled for this video"
        )

    except NoTranscriptFound:
        raise HTTPException(
            status_code=404,
            detail="No transcript found for this video"
        )

    # Convert transcript to plain text
    transcript_text = " ".join(
        item.text for item in transcript
    )

    # Create database session
    db = SessionLocal()

    # Create new transcript record
    new_transcript = database_model.Transcript(
        video_id=video_id,
        youtube_url=request.youtube_url,
        transcript=transcript_text
    )

    # Save to PostgreSQL
    db.add(new_transcript)
    db.commit()
    db.refresh(new_transcript)
    db.close()

    return {
        "message": "Transcript fetched and saved successfully",
        "id": new_transcript.id,
        "video_id": video_id,
        "transcript": transcript_text
    }

@app.get("/transcripts")
def get_transcripts():
    db = SessionLocal()

    try:
        transcripts = db.query(database_model.Transcript).all()
        return transcripts

    finally:
        db.close()

@app.get("/transcripts/{transcript_id}")
def get_transcript(transcript_id: int):
    db = SessionLocal()

    try:
        transcript = (
            db.query(database_model.Transcript)
            .filter(database_model.Transcript.id == transcript_id)
            .first()
        )

        if not transcript:
            raise HTTPException(
                status_code=404,
                detail="Transcript not found"
            )

        return transcript

    finally:
        db.close()

@app.delete("/transcripts/{transcript_id}")
def delete_transcript(transcript_id: int):
    db = SessionLocal()

    try:
        transcript = (
            db.query(database_model.Transcript)
            .filter(database_model.Transcript.id == transcript_id)
            .first()
        )

        if not transcript:
            raise HTTPException(
                status_code=404,
                detail="Transcript not found"
            )

        db.delete(transcript)
        db.commit()

        return {
            "message": "Transcript deleted successfully",
            "id": transcript_id
        }

    finally:
        db.close()
