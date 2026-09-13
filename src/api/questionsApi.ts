export interface InterviewQuestion {
  id: number;
  category: string;
  question: string;
  difficulty: string;
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
