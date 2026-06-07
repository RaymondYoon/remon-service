import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyLibrary } from '../api/bookApi';
import { colors } from '../theme';

const STATUS_LABELS = {
  SAVED: { label: '저장됨', color: '#888' },
  READING: { label: '읽는 중', color: colors.primary },
  DONE: { label: '완독', color: '#F5C842' },
};

const FILTERS = ['전체', '읽는 중', '완독', '저장됨'];
const FILTER_STATUS = { '전체': null, '읽는 중': 'READING', '완독': 'DONE', '저장됨': 'SAVED' };

function LibraryCard({ item, onPress }) {
  const st = STATUS_LABELS[item.status] ?? STATUS_LABELS.SAVED;
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={styles.cover}>
        {item.book?.coverImageUrl
          ? <Image source={{ uri: item.book.coverImageUrl }} style={styles.coverImg} />
          : <Text style={styles.coverEmoji}>🍋</Text>
        }
      </View>
      <View style={styles.cardBody}>
        <View style={[styles.statusBadge, { backgroundColor: st.color + '22' }]}>
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.book?.title ?? item.title ?? '제목 없음'}</Text>
        <Text style={styles.cardAuthor} numberOfLines={1}>
          ✍️ {item.book?.author ?? item.author ?? item.book?.publishedBy ?? '익명'}
        </Text>
        {item.lastReadPage > 0 && (
          <Text style={styles.pageInfo}>마지막 {item.lastReadPage + 1}페이지</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function LibraryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('전체');

  const fetchLibrary = useCallback(async () => {
    try {
      const { data } = await getMyLibrary();
      setLibrary(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  const onRefresh = () => { setRefreshing(true); fetchLibrary(); };

  const filtered = library.filter(item => {
    const st = FILTER_STATUS[filter];
    return st === null || item.status === st;
  });

  const openBook = (item) => {
    navigation.navigate('Read', {
      bookId: item.book?.id ?? item.bookId,
      title: item.book?.title ?? '책',
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>📚</Text>
          <Text style={styles.headerTitle}>내 서재</Text>
        </View>
        <Text style={styles.countText}>{library.length}권</Text>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={f => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading
        ? <ActivityIndicator color={colors.primary} style={styles.centered} size="large" />
        : (
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id ?? item.book?.id)}
            renderItem={({ item }) => <LibraryCard item={item} onPress={openBook} />}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={styles.emptyText}>서재가 비어있어요</Text>
                <Text style={styles.emptyHint}>책을 읽으면 자동으로 추가됩니다</Text>
              </View>
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
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerEmoji: { fontSize: 22 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.primary },
  countText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  filterContainer: {
    height: 52,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterList: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterChip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textMuted },
  filterTextActive: { color: colors.white, fontWeight: '600' },
  list: { padding: 16, gap: 12 },
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
    width: 80,
    backgroundColor: '#FFF9E6',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    overflow: 'hidden',
  },
  coverImg: { width: 80, height: 110, borderRadius: 8, resizeMode: 'cover' },
  coverEmoji: { fontSize: 40 },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center', gap: 4 },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 2,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardAuthor: { fontSize: 12, color: colors.textMuted },
  pageInfo: { fontSize: 11, color: colors.textMuted },
  centered: { flex: 1 },
  emptyBox: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptyHint: { fontSize: 13, color: colors.textMuted },
});
