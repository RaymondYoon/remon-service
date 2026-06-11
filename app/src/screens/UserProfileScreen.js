import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axiosInstance from '../api/axiosInstance';
import { colors } from '../theme';

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axiosInstance.get(`/api/users/${userId}/profile`),
      axiosInstance.get('/api/books/explore'),
    ]).then(([profileRes, booksRes]) => {
      setProfile(profileRes.data);
      const userBooks = (Array.isArray(booksRes.data) ? booksRes.data : [])
        .filter((b) => b.publishedBy === Number(userId));
      setBooks(userBooks);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>작가 프로필</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        {profile && (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile.nickname || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.nickname}>{profile.nickname}</Text>
            <View style={styles.statsRow}>
              <Text style={styles.stat}>
                <Text style={styles.statNum}>{profile.followerCount ?? 0}</Text> 팔로워
              </Text>
              <Text style={styles.statDivider}> · </Text>
              <Text style={styles.stat}>
                <Text style={styles.statNum}>{profile.followingCount ?? 0}</Text> 팔로잉
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>공개 책 ({books.length})</Text>

        {books.length === 0 ? (
          <Text style={styles.empty}>아직 공개된 책이 없습니다.</Text>
        ) : (
          <View style={styles.bookList}>
            {books.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={styles.bookItem}
                onPress={() => navigation.navigate('BookDetail', { bookId: book.id })}
                activeOpacity={0.85}
              >
                <View style={styles.bookCover}>
                  {book.coverImageUrl
                    ? <Image source={{ uri: book.coverImageUrl }} style={styles.bookImg} />
                    : <Text style={styles.bookEmoji}>🍋</Text>
                  }
                </View>
                <View style={styles.bookInfo}>
                  {book.genre && (
                    <Text style={styles.bookGenre}>{book.genre}</Text>
                  )}
                  <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                  {book.averageRating > 0 && (
                    <Text style={styles.bookRating}>⭐ {book.averageRating.toFixed(1)}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  scroll: { padding: 20, gap: 16 },
  profileCard: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  nickname: { fontSize: 20, fontWeight: '800', color: colors.text },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { fontSize: 14, color: colors.textMuted },
  statNum: { fontWeight: '700', color: colors.text },
  statDivider: { color: colors.textMuted },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: 14, paddingVertical: 24 },
  bookList: { gap: 12 },
  bookItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  bookCover: {
    width: 80,
    backgroundColor: '#FFF9E6',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  bookImg: { width: 80, height: 100, resizeMode: 'cover' },
  bookEmoji: { fontSize: 32 },
  bookInfo: { flex: 1, padding: 12, gap: 4, justifyContent: 'center' },
  bookGenre: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  bookTitle: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 },
  bookRating: { fontSize: 12, color: '#B8860B', fontWeight: '600' },
});
