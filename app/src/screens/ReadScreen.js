import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, ActivityIndicator, ScrollView,
  Animated, useWindowDimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { getBookById, startReading, savePage, markAsDone } from '../api/bookApi';
import { colors } from '../theme';

const SAVE_DEBOUNCE = 1500;
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 500;

// 헤더(52) + 진행바(4) + 페이지번호(36) + 여백
const CHROME_HEIGHT = 52 + 4 + 36 + 32;
const LINE_HEIGHT = 28;
const FONT_SIZE = 16;
const H_PADDING = 28;

function estimateCharsPerPage(pageWidth, pageHeight) {
  const contentW = pageWidth - H_PADDING * 2;
  const charsPerLine = Math.floor(contentW / (FONT_SIZE * 0.98));
  const linesPerPage = Math.floor(pageHeight / LINE_HEIGHT);
  return Math.max(200, charsPerLine * linesPerPage);
}

function buildPages(content, charsPerPage) {
  if (!content) return [];
  const cleaned = content
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const paragraphs = cleaned.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const pages = [];
  let current = '';
  for (const para of paragraphs) {
    const candidate = current ? current + '\n\n' + para : para;
    if (candidate.length > charsPerPage && current.length > 0) {
      pages.push(current.trim());
      current = para;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) pages.push(current.trim());
  return pages;
}

export default function ReadScreen({ route, navigation }) {
  const { bookId } = route.params ?? {};
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [book, setBook] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const translateX = useRef(new Animated.Value(0)).current;
  const saveTimer = useRef(null);
  const pagesRef = useRef([]);

  const contentHeight = height - insets.top - insets.bottom - CHROME_HEIGHT;

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getBookById(bookId);
        setBook(data);
        const charsPerPage = estimateCharsPerPage(width, contentHeight);
        const built = buildPages(data.content, charsPerPage);
        setPages(built);
        pagesRef.current = built;
        startReading(bookId).catch(() => {});
      } catch {
        setError('책을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [bookId]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage = useCallback((nextPage) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePage(bookId, nextPage).catch(() => {});
      if (nextPage === pagesRef.current.length - 1) markAsDone(bookId).catch(() => {});
    }, SAVE_DEBOUNCE);
  }, [bookId]);

  const animateToNext = useCallback((direction) => {
    // direction: 'next' | 'prev'
    const toValue = direction === 'next' ? -width : width;
    Animated.timing(translateX, {
      toValue,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setCurrentPage(prev => {
        const next = direction === 'next' ? prev + 1 : prev - 1;
        goToPage(next);
        return next;
      });
      translateX.setValue(0);
    });
  }, [width, translateX, goToPage]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = useCallback(({ nativeEvent }) => {
    if (nativeEvent.state === State.END) {
      const { translationX, velocityX } = nativeEvent;
      const isSwipeLeft = translationX < -SWIPE_THRESHOLD || velocityX < -SWIPE_VELOCITY;
      const isSwipeRight = translationX > SWIPE_THRESHOLD || velocityX > SWIPE_VELOCITY;

      if (isSwipeLeft && currentPage < pagesRef.current.length - 1) {
        animateToNext('next');
      } else if (isSwipeRight && currentPage > 0) {
        animateToNext('prev');
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 10,
        }).start();
      }
    }
  }, [currentPage, animateToNext, translateX]);

  const progress = pages.length > 0 ? (currentPage + 1) / pages.length : 0;

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>불러오는 중...</Text>
      </View>
    );
  }

  if (error || !book) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>😥 {error ?? '책을 찾을 수 없습니다.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backTouch}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{book.title}</Text>
        <Text style={styles.pageIndicator}>{currentPage + 1} / {pages.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Swipeable page */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-20, 20]}
      >
        <Animated.View style={[styles.pageWrapper, { transform: [{ translateX }] }]}>
          <ScrollView
            style={styles.pageScroll}
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.pageText}>{pages[currentPage]}</Text>
          </ScrollView>
          <Text style={styles.pageNum}>{currentPage + 1} / {pages.length}</Text>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFEF5' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 16,
  },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  errorText: { color: colors.error, fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },

  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    gap: 8,
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
  backTouch: { padding: 4 },
  backArrow: { fontSize: 22, color: colors.primary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  pageIndicator: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },

  progressTrack: { height: 4, backgroundColor: colors.border },
  progressFill: { height: 4, backgroundColor: colors.primary },

  pageWrapper: { flex: 1 },
  pageScroll: { flex: 1 },
  pageContent: { paddingHorizontal: H_PADDING, paddingTop: 24, paddingBottom: 8 },
  pageText: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    color: '#2C2C2C',
    letterSpacing: 0.2,
  },
  pageNum: {
    height: 36,
    textAlign: 'center',
    lineHeight: 36,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  backBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
