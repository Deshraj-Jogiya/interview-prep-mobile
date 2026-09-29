import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useOfflineAttemptQueue } from '../src/hooks/useOfflineAttemptQueue';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(() => {
  jest.clearAllMocks();
});

test('a successful POST is never queued', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
  const { result } = renderHook(() => useOfflineAttemptQueue());
  await waitFor(() => expect(result.current.loaded).toBe(true));

  let outcome;
  await act(async () => {
    outcome = await result.current.recordAttempt(1, 5);
  });

  expect(outcome).toEqual({ synced: true });
  expect(result.current.queue).toHaveLength(0);
});

test('a failed POST is queued locally, not dropped', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
  const { result } = renderHook(() => useOfflineAttemptQueue());
  await waitFor(() => expect(result.current.loaded).toBe(true));

  let outcome;
  await act(async () => {
    outcome = await result.current.recordAttempt(7, 3);
  });

  expect(outcome).toEqual({ synced: false });
  expect(result.current.queue).toEqual([
    expect.objectContaining({ questionId: 7, selfRating: 3 }),
  ]);
});

test('flushQueue retries each queued attempt for real and clears the ones that succeed', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
  const { result } = renderHook(() => useOfflineAttemptQueue());
  await waitFor(() => expect(result.current.loaded).toBe(true));

  await act(async () => {
    await result.current.recordAttempt(1, 4);
    await result.current.recordAttempt(2, 5);
  });
  expect(result.current.queue).toHaveLength(2);

  // Connectivity returns -- subsequent real POSTs succeed.
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;

  let flushResult;
  await act(async () => {
    flushResult = await result.current.flushQueue();
  });

  expect(flushResult).toEqual({ synced: 2, remaining: 0 });
  expect(result.current.queue).toHaveLength(0);
});

test('flushQueue leaves attempts queued if still offline, never loses them', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
  const { result } = renderHook(() => useOfflineAttemptQueue());
  await waitFor(() => expect(result.current.loaded).toBe(true));

  await act(async () => {
    await result.current.recordAttempt(1, 4);
  });

  let flushResult;
  await act(async () => {
    flushResult = await result.current.flushQueue();
  });

  expect(flushResult).toEqual({ synced: 0, remaining: 1 });
  expect(result.current.queue).toHaveLength(1);
});
