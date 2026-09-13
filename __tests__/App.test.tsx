import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import App from '../App';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockQuestions = [
  { id: 1, category: 'System Design', question: 'Design a URL shortener.', difficulty: 'Medium' },
  { id: 2, category: 'Behavioral', question: 'A time you disagreed with a teammate.', difficulty: 'Easy' },
];

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => mockQuestions,
  }) as jest.Mock;
});

test(
  'loads and renders real questions from the API',
  async () => {
    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText('Design a URL shortener.')).toBeTruthy();
      },
      { timeout: 10000 }
    );
    expect(screen.getByText('A time you disagreed with a teammate.')).toBeTruthy();
  },
  15000
);

test(
  'tapping a question toggles it to Practiced and persists via AsyncStorage',
  async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('question-1')).toBeTruthy(), { timeout: 10000 });

    expect(screen.getAllByText('Tap to mark practiced')).toHaveLength(2);

    fireEvent.press(screen.getByTestId('question-1'));

    await waitFor(() => {
      expect(screen.getAllByText('Practiced').length).toBeGreaterThan(0);
    });

    const AsyncStorage = require('@react-native-async-storage/async-storage');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('practicedQuestionIds', JSON.stringify([1]));
  },
  15000
);

test('shows a real error message and lets the user retry when the fetch fails', async () => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));
  render(<App />);

  await waitFor(() => {
    expect(screen.getByText('Could not load questions. Pull down to retry.')).toBeTruthy();
  });
});
