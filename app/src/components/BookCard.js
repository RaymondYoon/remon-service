import React from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet, Platform,
} from 'react-native';
import { colors } from '../theme';

export default function BookCard({ item, onPress, navigation }) {
  const handleAuthorPress = (e) => {
    if (item.publishedBy && navigation) {
      navigation.navigate('UserProfile', { userId: item.publishedBy });
    }
  };

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
        <TouchableOpacity
          onPress={handleAuthorPress}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <Text style={styles.cardAuthor} numberOfLines={1}>
            ✍️ {item.authorNickname ?? item.author ?? '익명'}
          </Text>
        </TouchableOpacity>
        {item.averageRating > 0 && (
          <Text style={styles.rating}>⭐ {item.averageRating.toFixed(1)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  cover: {
    width: 96,
    backgroundColor: '#FFF9E6',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  coverImg: { width: 96, height: 120, resizeMode: 'cover' },
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
});
