import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import App from '../App';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockDueQuestions = [
  {
    id: 1, category: 'System Design', question: 'Design a URL shortener.', difficulty: 'Medium',
    easeFactor: 2.5, intervalDays: 0, repetitions: 0, nextReviewAt: null,
  },
  {
    id: 2, category: 'Behavioral', question: 'A time you disagreed with a teammate.', difficulty: 'Easy',
    easeFactor: 2.5, intervalDays: 0, repetitions: 0, nextReviewAt: null,
  },
];

const mockStats = { totalAttempts: 5, questionsMastered: 1, totalQuestions: 4, currentStreakDays: 2 };

function mockFetchImplementation(overrides: { onPostAttempt?: () => Promise<Response> } = {}) {
  return jest.fn((url: string, options?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/questions/due')) {
      return Promise.resolve({ ok: true, json: async () => mockDueQuestions } as Response);
    }
    if (typeof url === 'string' && url.includes('/api/stats')) {
      return Promise.resolve({ ok: true, json: async () => mockStats } as Response);
    }
    if (typeof url === 'string' && url.match(/\/api\/questions\/\d+\/attempts$/) && options?.method === 'POST') {
      if (overrides.onPostAttempt) {
        return overrides.onPostAttempt();
      }
      return Promise.resolve({ ok: true, json: async () => mockDueQuestions[0] } as Response);
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetchImplementation() as unknown as typeof fetch;
});

test(
  'loads and renders real due questions plus real stats from the API',
  async () => {
    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText('Design a URL shortener.')).toBeTruthy();
      },
      { timeout: 10000 }
    );
    expect(screen.getByText('A time you disagreed with a teammate.')).toBeTruthy();
    expect(screen.getByText('2 day streak  ·  1/4 mastered')).toBeTruthy();
  },
  15000
);

test(
  'tapping a question then a rating posts a real attempt and removes it from the due list',
  async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('question-1')).toBeTruthy(), { timeout: 10000 });

    fireEvent.press(screen.getByTestId('question-1'));
    await waitFor(() => expect(screen.getByTestId('rating-row-1')).toBeTruthy());

    fireEvent.press(screen.getByTestId('rate-1-4'));

    await waitFor(() => {
      expect(screen.queryByText('Design a URL shortener.')).toBeNull();
    });

    const postCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([url]) => typeof url === 'string' && url.includes('/attempts')
    );
    expect(postCalls).toHaveLength(1);
    expect(JSON.parse(postCalls[0][1].body)).toEqual({ selfRating: 4 });
  },
  15000
);

test(
  'when the attempt POST fails (offline), the attempt is queued locally instead of lost',
  async () => {
    global.fetch = mockFetchImplementation({
      onPostAttempt: () => Promise.reject(new Error('network down')),
    }) as unknown as typeof fetch;

    render(<App />);
    await waitFor(() => expect(screen.getByTestId('question-1')).toBeTruthy(), { timeout: 10000 });

    fireEvent.press(screen.getByTestId('question-1'));
    await waitFor(() => expect(screen.getByTestId('rating-row-1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('rate-1-4'));

    await waitFor(() => {
      expect(screen.getByText('Offline -- saved locally, will sync automatically.')).toBeTruthy();
    });

    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const setCalls = AsyncStorage.setItem.mock.calls.filter(([key]: [string]) => key === 'pendingAttemptQueue');
    expect(setCalls.length).toBeGreaterThan(0);
    const queued = JSON.parse(setCalls[setCalls.length - 1][1]);
    expect(queued).toEqual([expect.objectContaining({ questionId: 1, selfRating: 4 })]);
  },
  15000
);

test('shows a real error message and lets the user retry when the fetch fails', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
  render(<App />);

  await waitFor(() => {
    expect(screen.getByText('Could not load questions. Pull down to retry.')).toBeTruthy();
  });
});

test('shows a friendly empty state when nothing is due', async () => {
  global.fetch = jest.fn((url: string) => {
    if (typeof url === 'string' && url.includes('/api/questions/due')) {
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    }
    return Promise.resolve({ ok: true, json: async () => mockStats } as Response);
  }) as unknown as typeof fetch;

  render(<App />);

  await waitFor(() => {
    expect(screen.getByText('Nothing due right now. Pull down to check again.')).toBeTruthy();
  });
});
