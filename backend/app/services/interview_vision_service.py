import base64
import binascii

import cv2
import numpy as np

from app.schemas.interview import InterviewFrameAnalysis, InterviewFrameRequest


_FACE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
_EYE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_eye_tree_eyeglasses.xml"
)


def analyze_interview_frame(payload: InterviewFrameRequest) -> InterviewFrameAnalysis:
    """Analyse one ephemeral webcam snapshot with OpenCV; never persist the image."""
    encoded = payload.image_base64.split(",", 1)[-1]
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("The camera frame was not valid base64 image data.") from exc

    if not raw or len(raw) > 1_800_000:
        raise ValueError("The camera frame is empty or larger than 1.8 MB.")

    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("OpenCV could not decode this camera frame.")

    height, width = image.shape[:2]
    if width < 160 or height < 120:
        raise ValueError("The camera frame is too small. Use a camera preview of at least 160×120.")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = round(float(np.mean(gray)), 1)
    faces = _FACE_CASCADE.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48)
    )
    face_count = len(faces)
    eyes_detected = False
    face_centered = False

    if face_count == 1:
        x, y, face_width, face_height = faces[0]
        face_center_x = x + face_width / 2
        face_center_y = y + face_height / 2
        face_centered = (
            abs(face_center_x - width / 2) < width * 0.22
            and abs(face_center_y - height / 2) < height * 0.25
        )
        face_roi = gray[y : y + face_height, x : x + face_width]
        eyes = _EYE_CASCADE.detectMultiScale(
            face_roi, scaleFactor=1.1, minNeighbors=4, minSize=(10, 10)
        )
        eyes_detected = len(eyes) >= 2

    if face_count == 0:
        note = "No face was detected. Check lighting and camera position."
    elif face_count > 1:
        note = "More than one face was detected. Make sure only the interview candidate is in frame."
    elif brightness < 55:
        note = "The image is quite dark. Add light in front of you."
    elif brightness > 220:
        note = "The image is very bright. Reduce backlighting or exposure."
    elif not face_centered:
        note = "Your face is visible but close to the edge of the frame. Centre your camera position."
    elif not eyes_detected:
        note = "Your face is visible. Eye detection is uncertain; adjust lighting or camera angle."
    else:
        note = "Face and eye regions are visible. Keep a comfortable, natural posture."

    return InterviewFrameAnalysis(
        face_count=face_count,
        eyes_detected=eyes_detected,
        brightness=brightness,
        face_centered=face_centered,
        camera_note=note,
    )
