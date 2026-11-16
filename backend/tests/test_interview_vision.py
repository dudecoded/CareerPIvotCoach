import base64

import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def _blank_png_base64():
    image = np.zeros((240, 320, 3), dtype=np.uint8)
    success, encoded = cv2.imencode(".png", image)
    assert success
    return base64.b64encode(encoded.tobytes()).decode("ascii")


def test_interview_frame_endpoint_returns_camera_guidance():
    response = client.post(
        "/api/interview/analyze-frame",
        json={"image_base64": _blank_png_base64()},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["face_count"] == 0
    assert data["eyes_detected"] is False
    assert "No face" in data["camera_note"]
    assert "not saved" in data["privacy_note"]


def test_interview_frame_rejects_invalid_image():
    response = client.post(
        "/api/interview/analyze-frame",
        json={"image_base64": "not-an-image" * 20},
    )
    assert response.status_code == 422
