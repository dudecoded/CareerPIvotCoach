
let accessToken = localStorage.getItem("cpc-access-token") || "";
export function setAccessToken(token: string) {
  accessToken = token;
  if (token) localStorage.setItem("cpc-access-token", token);
  else localStorage.removeItem("cpc-access-token");
}
export type AuthUser = { id: number; name: string; email: string; profile: Record<string, unknown> };
export async function authenticate(mode: "login" | "signup", payload: { name?: string; email: string; password: string }) {
  const result = await request<{ access_token: string; user: AuthUser }>(`/api/auth/${mode === "signup" ? "register" : "login"}`, { method: "POST", body: JSON.stringify(payload) });
  setAccessToken(result.access_token);
  return result.user;
}
export function getCurrentUser() { return request<AuthUser>("/api/auth/me"); }
export type UserProfile = { education: string; current_role: string; target_domain: string; experience_level: string; interests: string[]; goals: string[]; learning_style: string; hours_per_week: number; skills: string[] };
export function saveUserProfile(profile: UserProfile) { return request<{ profile: UserProfile }>("/api/profile", { method: "PUT", body: JSON.stringify(profile) }); }
export function getDomainLearning(domain: string) { return request<{ domain: string; overview: string; topics: string[]; projects: string[]; practice: string[] }>(`/api/learning/${encodeURIComponent(domain)}`); }
export function getAnalytics() { return request<{ assessment_count: number; latest: number | null; readiness_history: { date: string; score: number; target_role: string }[]; matched_skill_counts: { date: string; count: number }[] }>("/api/analytics/summary"); }

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
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...options?.headers },
      });
    } finally {
      window.clearTimeout(timeout);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The CareerPivotCoach API did not respond within 15 seconds. Check that the backend is running at http://127.0.0.1:8000, then try again.");
    }
    throw new Error("Cannot reach the CareerPivotCoach API at http://127.0.0.1:8000. Start the FastAPI backend and try again.");
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
