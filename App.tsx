import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchDueQuestions, fetchStats, InterviewQuestion, Stats } from './src/api/questionsApi';
import { useOfflineAttemptQueue } from './src/hooks/useOfflineAttemptQueue';

const RATINGS = [1, 2, 3, 4, 5];

export default function App() {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lastSyncNote, setLastSyncNote] = useState<string | null>(null);
  const { queue, loaded, recordAttempt, flushQueue } = useOfflineAttemptQueue();

  const load = useCallback(async () => {
    try {
      setError(null);
      const [due, realStats] = await Promise.all([fetchDueQuestions(), fetchStats()]);
      setQuestions(due);
      setStats(realStats);
    } catch (e) {
      setError('Could not load questions. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // A queued offline attempt gets a real chance to sync every time the
  // app loads or the user pulls to refresh -- not just once.
  useEffect(() => {
    if (loaded && queue.length > 0) {
      flushQueue();
    }
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = () => {
    setRefreshing(true);
    if (queue.length > 0) {
      flushQueue();
    }
    load();
  };

  const onRate = async (questionId: number, rating: number) => {
    setExpandedId(null);
    // Optimistic: this question was just practiced, so it's very likely
    // no longer due -- remove it from the visible list immediately
    // rather than waiting on a full reload.
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    const result = await recordAttempt(questionId, rating);
    setLastSyncNote(result.synced ? 'Saved.' : 'Offline -- saved locally, will sync automatically.');
  };

  if (loading || !loaded) {
    return (
      <View style={styles.center} testID="loading-indicator">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Interview Prep</Text>
      {stats && (
        <Text style={styles.statsLine} testID="stats-line">
          {`${stats.currentStreakDays > 0 ? `${stats.currentStreakDays} day streak` : 'Start a streak today'}  ·  ${stats.questionsMastered}/${stats.totalQuestions} mastered`}
        </Text>
      )}
      {queue.length > 0 && (
        <Text style={styles.pendingNote} testID="pending-queue-note">
          {queue.length} attempt{queue.length > 1 ? 's' : ''} waiting to sync
        </Text>
      )}
      {lastSyncNote && <Text style={styles.syncNote}>{lastSyncNote}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {questions.length === 0 && !error && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nothing due right now. Pull down to check again.</Text>
        </View>
      )}
      <FlatList
        data={questions}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const expanded = expandedId === item.id;
          return (
            <View style={styles.row}>
              <Pressable
                testID={`question-${item.id}`}
                onPress={() => setExpandedId(expanded ? null : item.id)}
              >
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.question}>{item.question}</Text>
                <Text style={styles.status}>
                  {item.repetitions === 0 ? 'Never practiced' : `Practiced ${item.repetitions}x`}
                </Text>
              </Pressable>
              {expanded && (
                <View style={styles.ratingRow} testID={`rating-row-${item.id}`}>
                  <Text style={styles.ratingPrompt}>How well did you know it?</Text>
                  <View style={styles.ratingButtons}>
                    {RATINGS.map((rating) => (
                      <Pressable
                        key={rating}
                        testID={`rate-${item.id}-${rating}`}
                        style={styles.ratingButton}
                        onPress={() => onRate(item.id, rating)}
                      >
                        <Text style={styles.ratingButtonText}>{rating}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        }}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  statsLine: { textAlign: 'center', color: '#555', marginBottom: 8 },
  pendingNote: { textAlign: 'center', color: '#a66a00', marginBottom: 4 },
  syncNote: { textAlign: 'center', color: '#007a33', marginBottom: 4 },
  emptyText: { color: '#666', padding: 24, textAlign: 'center' },
  error: { color: 'red', textAlign: 'center', marginBottom: 8 },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  category: { fontSize: 12, color: '#666', textTransform: 'uppercase' },
  question: { fontSize: 16, marginTop: 4 },
  status: { fontSize: 12, marginTop: 6, color: '#888' },
  ratingRow: { marginTop: 12 },
  ratingPrompt: { fontSize: 13, color: '#333', marginBottom: 6 },
  ratingButtons: { flexDirection: 'row', gap: 8 },
  ratingButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#007a33',
    alignItems: 'center', justifyContent: 'center',
  },
  ratingButtonText: { color: '#fff', fontWeight: 'bold' },
});
