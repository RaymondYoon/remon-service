import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, RefreshControl, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBooks } from '../api/bookApi';
import { colors } from '../theme';

const GENRES = ['전체', 'SF', '판타지', '로맨스', '일상', '공포'];

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
        <Text style={styles.cardAuthor} numberOfLines={1}>✍️ {item.author ?? item.publishedBy ?? '익명'}</Text>
        {item.averageRating > 0 && (
          <Text style={styles.rating}>⭐ {item.averageRating.toFixed(1)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('전체');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchBooks = useCallback(async (reset = false, kw = query, g = genre) => {
    const pageNum = reset ? 0 : page;
    if (!reset && !hasMore) return;
    if (!reset) setLoadingMore(true);
    try {
      const params = { page: pageNum, size: 20 };
      if (kw.trim()) params.keyword = kw.trim();
      const { data } = await getBooks(params);
      const list = Array.isArray(data) ? data : (data.content ?? data);
      const filtered = g === '전체' ? list : list.filter(b => b.genre === g);
      if (reset) {
        setBooks(filtered);
        setPage(1);
      } else {
        setBooks(prev => [...prev, ...filtered]);
        setPage(p => p + 1);
      }
      setHasMore(list.length === 20);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [query, genre, page, hasMore]);

  useEffect(() => {
    setLoading(true);
    setPage(0);
    setHasMore(true);
    fetchBooks(true);
  }, [genre]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setPage(0);
      setHasMore(true);
      fetchBooks(true, query, genre);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    fetchBooks(true);
  };

  const onEndReached = () => {
    if (!loadingMore && hasMore) fetchBooks(false);
  };

  const openBook = (book) => {
    navigation.navigate('Read', { bookId: book.id, title: book.title });
  };

  return (
    <View style={styles.container}>
      {/* SafeArea header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerInner}>
          <Text style={styles.logoEmoji}>🍋</Text>
          <Text style={styles.logoText}>Remon</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="책 제목, 작가 검색"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {/* Genre Filter */}
      <FlatList
        horizontal
        data={GENRES}
        keyExtractor={g => g}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreList}
        renderItem={({ item: g }) => (
          <TouchableOpacity
            style={[styles.genreChip, genre === g && styles.genreChipActive]}
            onPress={() => setGenre(g)}
          >
            <Text style={[styles.genreChipText, genre === g && styles.genreChipTextActive]}>{g}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Book List */}
      {loading && books.length === 0
        ? <ActivityIndicator color={colors.primary} style={styles.centered} size="large" />
        : (
          <FlatList
            data={books}
            keyExtractor={b => b.id.toString()}
            renderItem={({ item }) => <BookCard item={item} onPress={openBook} />}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={<Text style={styles.empty}>책이 없습니다.</Text>}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : null}
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
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoEmoji: { fontSize: 26 },
  logoText: { fontSize: 24, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
  },
  genreList: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  genreChip: {
    height: 28,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genreChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  genreChipTextActive: { color: colors.white, fontWeight: '700' },
  list: { padding: 16, gap: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  cover: {
    width: 96,
    backgroundColor: '#FFF9E6',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  coverImg: { width: 96, height: '100%', resizeMode: 'cover' },
  coverEmoji: { fontSize: 42 },
  cardBody: { flex: 1, padding: 14, justifyContent: 'center', gap: 5 },
  genreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF5E8',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  genreText: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 21 },
  cardAuthor: { fontSize: 12, color: colors.textMuted },
  rating: { fontSize: 12, color: '#B8860B', fontWeight: '600' },
  centered: { flex: 1 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 60, fontSize: 15 },
});
