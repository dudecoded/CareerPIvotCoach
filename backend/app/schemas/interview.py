from pydantic import BaseModel, Field


class InterviewFrameRequest(BaseModel):
    image_base64: str = Field(min_length=100, max_length=2_500_000)


class InterviewFrameAnalysis(BaseModel):
    face_count: int
    eyes_detected: bool
    brightness: float
    face_centered: bool
    camera_note: str
    privacy_note: str = "This frame was analysed in memory and was not saved."
