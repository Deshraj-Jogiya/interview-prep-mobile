import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { postAttempt } from '../api/questionsApi';

const QUEUE_KEY = 'pendingAttemptQueue';

export interface QueuedAttempt {
  questionId: number;
  selfRating: number;
  queuedAt: string;
}

// The real reason this app needs to be a native client and not a thin
// wrapper around the web API: practicing for an interview happens on a
// train, on a walk, in a waiting room -- exactly where connectivity is
// unreliable. An attempt made offline is never lost: it's recorded
// locally immediately and synced the next time a real network request
// succeeds, rather than the whole UI blocking on connectivity.
export function useOfflineAttemptQueue() {
  const [queue, setQueue] = useState<QueuedAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(QUEUE_KEY).then((raw) => {
      setQueue(raw ? JSON.parse(raw) : []);
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next: QueuedAttempt[]) => {
    setQueue(next);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  }, []);

  // Tries the real network call first -- only falls back to the local
  // queue on a genuine failure (offline, server unreachable), never
  // queues an attempt that could have gone through immediately.
  const recordAttempt = useCallback(
    async (questionId: number, selfRating: number): Promise<{ synced: boolean }> => {
      try {
        await postAttempt(questionId, selfRating);
        return { synced: true };
      } catch {
        const entry: QueuedAttempt = { questionId, selfRating, queuedAt: new Date().toISOString() };
        await persist([...queue, entry]);
        return { synced: false };
      }
    },
    [queue, persist]
  );

  // Real sync, not a guess: each queued attempt is POSTed for real: a
  // success removes it from the queue, a failure (still offline) leaves
  // it queued for the next attempt rather than being dropped.
  const flushQueue = useCallback(async () => {
    if (queue.length === 0) {
      return { synced: 0, remaining: 0 };
    }
    const stillQueued: QueuedAttempt[] = [];
    let synced = 0;
    for (const entry of queue) {
      try {
        await postAttempt(entry.questionId, entry.selfRating);
        synced++;
      } catch {
        stillQueued.push(entry);
      }
    }
    await persist(stillQueued);
    return { synced, remaining: stillQueued.length };
  }, [queue, persist]);

  return { queue, loaded, recordAttempt, flushQueue };
}
