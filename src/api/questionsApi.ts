export interface InterviewQuestion {
  id: number;
  category: string;
  question: string;
  difficulty: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: string | null;
}

export interface Stats {
  totalAttempts: number;
  questionsMastered: number;
  totalQuestions: number;
  currentStreakDays: number;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

export async function fetchQuestions(category?: string): Promise<InterviewQuestion[]> {
  const url = category
    ? `${API_BASE_URL}/api/questions?category=${encodeURIComponent(category)}`
    : `${API_BASE_URL}/api/questions`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch questions: ${response.status}`);
  }
  return response.json();
}

export async function fetchDueQuestions(): Promise<InterviewQuestion[]> {
  const response = await fetch(`${API_BASE_URL}/api/questions/due`);
  if (!response.ok) {
    throw new Error(`Failed to fetch due questions: ${response.status}`);
  }
  return response.json();
}

export async function postAttempt(questionId: number, selfRating: number): Promise<InterviewQuestion> {
  const response = await fetch(`${API_BASE_URL}/api/questions/${questionId}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selfRating }),
  });
  if (!response.ok) {
    throw new Error(`Failed to post attempt: ${response.status}`);
  }
  return response.json();
}

export async function fetchStats(): Promise<Stats> {
  const response = await fetch(`${API_BASE_URL}/api/stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.status}`);
  }
  return response.json();
}
