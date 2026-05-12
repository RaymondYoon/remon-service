import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, ActivityIndicator,
  Animated, PanResponder, useWindowDimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBookById, startReading, savePage, markAsDone } from '../api/bookApi';
import { colors } from '../theme';

const SAVE_DEBOUNCE = 1500;
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 0.3;
const CHROME_HEIGHT = 52 + 4 + 36;
const LINE_HEIGHT = 28;
const FONT_SIZE = 16;
const H_PADDING = 28;

function estimateCharsPerPage(pageWidth, pageHeight) {
  const contentW = pageWidth - H_PADDING * 2;
  const charsPerLine = Math.floor(contentW / (FONT_SIZE * 0.58));
  const linesPerPage = Math.floor(pageHeight / LINE_HEIGHT);
  return Math.max(150, charsPerLine * linesPerPage);
}

function buildPages(content, charsPerPage) {
  if (!content) return [''];
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
  return pages.length > 0 ? pages : [''];
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
  const isAnimating = useRef(false);
  const currentPageRef = useRef(0);
  const pagesRef = useRef([]);
  const saveTimer = useRef(null);

  const pageAreaHeight = height - insets.top - insets.bottom - CHROME_HEIGHT;

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getBookById(bookId);
        setBook(data);
        const charsPerPage = estimateCharsPerPage(width, pageAreaHeight);
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

  const doSave = useCallback((pageIndex) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePage(bookId, pageIndex).catch(() => {});
      if (pageIndex === pagesRef.current.length - 1) markAsDone(bookId).catch(() => {});
    }, SAVE_DEBOUNCE);
  }, [bookId]);

  const goToPage = useCallback((direction) => {
    if (isAnimating.current) return;
    const next = currentPageRef.current + (direction === 'next' ? 1 : -1);
    if (next < 0 || next >= pagesRef.current.length) return;

    isAnimating.current = true;
    const toValue = direction === 'next' ? -width : width;

    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start(() => {
      translateX.setValue(0);
      currentPageRef.current = next;
      setCurrentPage(next);
      doSave(next);
      isAnimating.current = false;
    });
  }, [width, translateX, doSave]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (!isAnimating.current) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (isAnimating.current) return;
        const swipeLeft = g.dx < -SWIPE_THRESHOLD || g.vx < -SWIPE_VELOCITY;
        const swipeRight = g.dx > SWIPE_THRESHOLD || g.vx > SWIPE_VELOCITY;

        if (swipeLeft && currentPageRef.current < pagesRef.current.length - 1) {
          goToPage('next');
        } else if (swipeRight && currentPageRef.current > 0) {
          goToPage('prev');
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
            bounciness: 4,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 0,
        }).start();
      },
    })
  ).current;

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
      {/* 헤더 */}
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

      {/* 진행률 바 */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* 스와이프 영역 */}
      <Animated.View
        style={[styles.pageWrapper, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.pageContent}>
          <Text style={styles.pageText}>{pages[currentPage]}</Text>
        </View>
        <View style={styles.pageNumBar}>
          <Text style={styles.pageNum}>{currentPage + 1} / {pages.length}</Text>
        </View>
      </Animated.View>
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
  errorText: { fontSize: 15, color: '#CC3333', textAlign: 'center', paddingHorizontal: 24 },

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

  pageWrapper: { flex: 1, backgroundColor: '#FFFEF5' },
  pageContent: {
    flex: 1,
    paddingHorizontal: H_PADDING,
    paddingTop: 24,
    paddingBottom: 8,
  },
  pageText: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    color: '#2C2C2C',
    letterSpacing: 0.2,
  },
  pageNumBar: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  pageNum: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },

  backBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
