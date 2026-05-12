import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBookById, getReviews, addToLibrary, startReading } from '../api/bookApi';
import { colors } from '../theme';

function Stars({ rating }) {
  const full = Math.round(rating ?? 0);
  return (
    <Text style={styles.stars}>
      {'⭐'.repeat(full)}{'☆'.repeat(Math.max(0, 5 - full))}
      <Text style={styles.ratingNum}> {rating > 0 ? rating.toFixed(1) : '평점 없음'}</Text>
    </Text>
  );
}

function ReviewItem({ review }) {
  const full = Math.round(review.rating ?? 0);
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewNickname}>{review.reviewerNickname ?? '익명'}</Text>
        <Text style={styles.reviewStars}>{'⭐'.repeat(full)}</Text>
      </View>
      {!!review.content && <Text style={styles.reviewContent}>{review.content}</Text>}
    </View>
  );
}

export default function BookDetailScreen({ route, navigation }) {
  const { bookId } = route.params ?? {};
  const insets = useSafeAreaInsets();

  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingLib, setAddingLib] = useState(false);

  useEffect(() => {
    Promise.all([
      getBookById(bookId),
      getReviews(bookId).catch(() => ({ data: [] })),
    ]).then(([bookRes, reviewRes]) => {
      setBook(bookRes.data);
      setReviews(Array.isArray(reviewRes.data) ? reviewRes.data : []);
    }).catch(() => {
      Alert.alert('오류', '책 정보를 불러오지 못했습니다.');
      navigation.goBack();
    }).finally(() => setLoading(false));
  }, [bookId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRead = async () => {
    await startReading(bookId).catch(() => {});
    navigation.navigate('Read', { bookId, title: book?.title });
  };

  const handleAddToLibrary = async () => {
    setAddingLib(true);
    try {
      await addToLibrary(bookId);
      Alert.alert('완료', '서재에 추가되었습니다.');
    } catch (e) {
      const msg = e.response?.data?.error ?? e.response?.data?.message ?? '이미 서재에 있거나 오류가 발생했습니다.';
      Alert.alert('알림', msg);
    } finally {
      setAddingLib(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!book) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>책 상세</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        {/* 표지 */}
        <View style={styles.coverBox}>
          <Text style={styles.coverEmoji}>🍋</Text>
        </View>

        {/* 제목 / 저자 */}
        <Text style={styles.bookTitle}>{book.title}</Text>
        <Text style={styles.bookAuthor}>✍️ {book.authorNickname ?? book.author ?? '익명'}</Text>

        {/* 장르 + 분위기 */}
        <View style={styles.badgeRow}>
          {!!book.genre && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{book.genre}</Text>
            </View>
          )}
          {!!book.tone && (
            <View style={[styles.badge, styles.badgeSecondary]}>
              <Text style={[styles.badgeText, styles.badgeTextSecondary]}>{book.tone}</Text>
            </View>
          )}
        </View>

        {/* 별점 */}
        <Stars rating={book.averageRating} />

        {/* 버튼 */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.readBtn} onPress={handleRead}>
            <Text style={styles.readBtnText}>📖 읽기 시작</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.libBtn, addingLib && styles.libBtnDisabled]}
            onPress={handleAddToLibrary}
            disabled={addingLib}
          >
            {addingLib
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={styles.libBtnText}>📚 서재에 담기</Text>
            }
          </TouchableOpacity>
        </View>

        {/* 리뷰 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>리뷰 {reviews.length > 0 ? `(${reviews.length})` : ''}</Text>
          {reviews.length === 0
            ? <Text style={styles.emptyReview}>아직 리뷰가 없습니다.</Text>
            : reviews.map((r, i) => <ReviewItem key={r.id ?? i} review={r} />)
          }
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  backArrow: { fontSize: 22, color: colors.primary, fontWeight: '700', width: 32 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  scroll: { padding: 24, gap: 12 },
  coverBox: {
    alignSelf: 'center',
    width: 120,
    height: 160,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0D060',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  coverEmoji: { fontSize: 56 },
  bookTitle: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  bookAuthor: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  badge: {
    backgroundColor: '#EEF5E8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeSecondary: { backgroundColor: '#EEF0FF' },
  badgeText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  badgeTextSecondary: { color: '#5566CC' },
  stars: { textAlign: 'center', fontSize: 18 },
  ratingNum: { fontSize: 14, color: colors.textMuted },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  readBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  readBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  libBtn: {
    flex: 1,
    backgroundColor: '#EEF5E8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8DFBB',
  },
  libBtnDisabled: { opacity: 0.6 },
  libBtnText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  section: { marginTop: 8, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  emptyReview: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  reviewCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewNickname: { fontSize: 13, fontWeight: '700', color: colors.text },
  reviewStars: { fontSize: 13 },
  reviewContent: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
