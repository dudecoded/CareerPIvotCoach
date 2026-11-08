const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type AssessmentRequest = {
  current_role: string;
  target_role: string;
  experience_years: number;
  skills: string[];
  skill_proficiencies?: Record<string, "Beginner" | "Intermediate" | "Advanced">;
};

export type AssessmentResult = {
  id?: number;
  current_role: string;
  target_role: string;
  experience_years: number;
  readiness_score: number;
  matched_skills: string[];
  skill_gaps: { skill: string; importance: number; priority: string }[];
  recommendation: string;
  roadmap: { period: string; title: string; tasks: { task: string; completed: boolean }[] }[];
  score_note: string;
};

export type CoachRequest = {
  message: string;
  current_role: string;
  target_role: string;
  experience_years: number;
  skills: string[];
  goal: string;
  history: { role: "user" | "coach"; content: string }[];
};

export type CoachResponse = { reply: string; mode: "offline" };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
  } catch {
    throw new Error("Cannot reach the CareerPivotCoach API. Start the FastAPI backend and try again.");
  }

  if (!response.ok) {
    let message = `API error: ${response.status}`;
    try {
      const body = await response.json() as { detail?: string };
      message = body.detail ?? message;
    } catch {
      // Keep the useful status message when the response is not JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function analyzeCareer(data: AssessmentRequest) {
  return request<AssessmentResult>("/api/careers/analyze", { method: "POST", body: JSON.stringify(data) });
}

export function saveAssessment(data: AssessmentRequest) {
  return request<AssessmentResult>("/api/assessments", { method: "POST", body: JSON.stringify(data) });
}

export function getAssessmentHistory() {
  return request<{ assessments: { id: number; current_role: string; target_role: string; experience_years: number; readiness_score: number; created_at: string }[] }>("/api/assessments");
}

export function sendCoachMessage(data: CoachRequest) {
  return request<CoachResponse>("/api/coach/chat", { method: "POST", body: JSON.stringify(data) });
}

export type ResumeReviewResult = {
  target_role: string;
  detected_skills: string[];
  missing_keywords: string[];
  strengths: string[];
  improvements: string[];
  summary: string;
};

export type InterviewPrepResult = {
  target_role: string;
  questions: { category: string; question: string; what_to_cover: string }[];
  preparation_tip: string;
};

export function reviewResume(resume_text: string, target_role: string) {
  return request<ResumeReviewResult>("/api/tools/resume-review", {
    method: "POST",
    body: JSON.stringify({ resume_text, target_role }),
  });
}

export function generateInterviewPrep(target_role: string, skills: string[], experience_level: string) {
  return request<InterviewPrepResult>("/api/tools/interview-prep", {
    method: "POST",
    body: JSON.stringify({ target_role, skills, experience_level }),
  });
}

export type InterviewFrameAnalysis = {
  face_count: number;
  eyes_detected: boolean;
  brightness: number;
  face_centered: boolean;
  camera_note: string;
  privacy_note: string;
};

export function analyzeInterviewFrame(image_base64: string) {
  return request<InterviewFrameAnalysis>("/api/interview/analyze-frame", {
    method: "POST",
    body: JSON.stringify({ image_base64 }),
  });
}
