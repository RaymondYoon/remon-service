import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExploreBooks, getFeedBooks } from '../api/bookApi';
import { colors } from '../theme';

const TABS = [
  { key: 'explore', label: '전체 공개' },
  { key: 'feed', label: '팔로우 피드' },
];

function BookCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.88}>
      <View style={styles.cover}>
        {item.coverImageUrl
          ? <Image source={{ uri: item.coverImageUrl }} style={styles.coverImg} />
          : <Text style={styles.coverEmoji}>🍋</Text>
        }
      </View>
      <View style={styles.cardBody}>
        <View style={styles.genreBadge}>
          <Text style={styles.genreText}>{item.genre ?? '일상'}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardAuthor} numberOfLines={1}>
          ✍️ {item.authorNickname ?? item.author ?? '익명'}
        </Text>
        {item.averageRating > 0 && (
          <Text style={styles.rating}>⭐ {item.averageRating.toFixed(1)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ExploreScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('explore');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBooks = useCallback(async (tab = activeTab) => {
    try {
      const { data } = tab === 'explore' ? await getExploreBooks() : await getFeedBooks();
      setBooks(Array.isArray(data) ? data : (data.content ?? []));
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    setBooks([]);
    fetchBooks(activeTab);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = () => {
    setRefreshing(true);
    fetchBooks(activeTab);
  };

  const openBook = (book) => {
    navigation.navigate('BookDetail', { bookId: book.id });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>🔍 둘러보기</Text>
      </View>

      {/* 탭 */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color={colors.primary} style={styles.centered} size="large" />
        : (
          <FlatList
            data={books}
            keyExtractor={b => b.id.toString()}
            renderItem={({ item }) => <BookCard item={item} onPress={openBook} />}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {activeTab === 'feed' ? '팔로우한 사람의 책이 없습니다.' : '공개된 책이 없습니다.'}
              </Text>
            }
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.primary },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  centered: { flex: 1 },
  list: { padding: 16, gap: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  cover: { width: 96, backgroundColor: '#FFF9E6', alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  coverImg: { width: 96, height: 120, resizeMode: 'cover' },
  coverEmoji: { fontSize: 42 },
  cardBody: { flex: 1, padding: 14, justifyContent: 'center', gap: 5 },
  genreBadge: { alignSelf: 'flex-start', backgroundColor: '#EEF5E8', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  genreText: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 21 },
  cardAuthor: { fontSize: 12, color: colors.textMuted },
  rating: { fontSize: 12, color: '#B8860B', fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 60, fontSize: 15 },
});
