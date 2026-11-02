const API_BASE = "http://127.0.0.1:8000";

export type AssessmentRequest = {
  current_role: string;
  target_role: string;
  experience_years: number;
  skills: string[];
};

export type AssessmentResult = {
  id?: number;
  current_role: string;
  target_role: string;
  experience_years: number;
  readiness_score: number;
  matched_skills: string[];
  skill_gaps: {
    skill: string;
    importance: number;
    priority: string;
  }[];
  recommendation: string;
  roadmap: {
    period: string;
    title: string;
    tasks: {
      task: string;
      completed: boolean;
    }[];
  }[];
  score_note: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function analyzeCareer(data: AssessmentRequest) {
  return request<AssessmentResult>("/api/careers/analyze", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function saveAssessment(data: AssessmentRequest) {
  return request<AssessmentResult>("/api/assessments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getAssessmentHistory() {
  return request<{
    assessments: {
      id: number;
      current_role: string;
      target_role: string;
      experience_years: number;
      readiness_score: number;
      created_at: string;
    }[];
  }>("/api/assessments");
}
