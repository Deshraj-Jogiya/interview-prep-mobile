import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'practicedQuestionIds';

export function usePracticedQuestions() {
  const [practicedIds, setPracticedIds] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        setPracticedIds(new Set(JSON.parse(raw)));
      }
      setLoaded(true);
    });
  }, []);

  const togglePracticed = useCallback((id: number) => {
    setPracticedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  return { practicedIds, togglePracticed, loaded };
}
