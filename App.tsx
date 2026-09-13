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
import { fetchQuestions, InterviewQuestion } from './src/api/questionsApi';
import { usePracticedQuestions } from './src/hooks/usePracticedQuestions';

export default function App() {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { practicedIds, togglePracticed, loaded } = usePracticedQuestions();

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchQuestions();
      setQuestions(data);
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

  const onRefresh = () => {
    setRefreshing(true);
    load();
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
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={questions}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const practiced = practicedIds.has(item.id);
          return (
            <Pressable
              testID={`question-${item.id}`}
              onPress={() => togglePracticed(item.id)}
              style={[styles.row, practiced && styles.rowPracticed]}
            >
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.question}>{item.question}</Text>
              <Text style={styles.status}>{practiced ? 'Practiced' : 'Tap to mark practiced'}</Text>
            </Pressable>
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
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  error: { color: 'red', textAlign: 'center', marginBottom: 8 },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  rowPracticed: { backgroundColor: '#e6ffed' },
  category: { fontSize: 12, color: '#666', textTransform: 'uppercase' },
  question: { fontSize: 16, marginTop: 4 },
  status: { fontSize: 12, marginTop: 6, color: '#007a33' },
});
