import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, ActivityIndicator,
  Animated, useWindowDimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { getBookById, startReading, savePage, markAsDone } from '../api/bookApi';
import { colors } from '../theme';

const SAVE_DEBOUNCE = 1500;
const SWIPE_THRESHOLD = 40;
const SWIPE_VELOCITY = 400;
const FLIP_DURATION = 200;

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

  // 3D flip animation
  const flipAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);
  const currentPageRef = useRef(0);
  const pagesRef = useRef([]);
  const saveTimer = useRef(null);

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

  // direction: 'next' → 왼쪽으로 넘기기, 'prev' → 오른쪽으로 넘기기
  const doFlip = useCallback((direction) => {
    if (isAnimating.current) return;
    const next = direction === 'next'
      ? currentPageRef.current + 1
      : currentPageRef.current - 1;
    if (next < 0 || next >= pagesRef.current.length) return;

    isAnimating.current = true;

    // Phase 1: 현재 페이지 접기 (0 → 나가는 방향)
    Animated.timing(flipAnim, {
      toValue: direction === 'next' ? 1 : -1,
      duration: FLIP_DURATION,
      useNativeDriver: true,
    }).start(() => {
      // 페이지 교체
      currentPageRef.current = next;
      setCurrentPage(next);
      goToPage(next);

      // 반대편에서 들어오는 시작 각도로 리셋
      flipAnim.setValue(direction === 'next' ? -1 : 1);

      // Phase 2: 새 페이지 펼치기 (반대 방향 → 0)
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: FLIP_DURATION,
        useNativeDriver: true,
      }).start(() => {
        isAnimating.current = false;
      });
    });
  }, [flipAnim, goToPage]);

  const onHandlerStateChange = useCallback(({ nativeEvent }) => {
    if (nativeEvent.state === State.END) {
      const { translationX, velocityX } = nativeEvent;
      const swipeLeft = translationX < -SWIPE_THRESHOLD || velocityX < -SWIPE_VELOCITY;
      const swipeRight = translationX > SWIPE_THRESHOLD || velocityX > SWIPE_VELOCITY;
      if (swipeLeft) doFlip('next');
      else if (swipeRight) doFlip('prev');
    }
  }, [doFlip]);

  // flipAnim: -1 = 90deg(우측), 0 = 0deg(정면), 1 = -90deg(좌측)
  const rotateY = flipAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['90deg', '0deg', '-90deg'],
  });

  // 페이지 뒤집힐수록 약간 어두워지는 효과
  const shadowOpacity = flipAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0.18, 0, 0.18],
  });

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

      {/* 3D 페이지 플립 */}
      <PanGestureHandler
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-12, 12]}
        failOffsetY={[-20, 20]}
      >
        <View style={styles.pageOuter}>
          <Animated.View
            style={[
              styles.pageWrapper,
              {
                transform: [
                  { perspective: 1200 },
                  { rotateY },
                ],
              },
            ]}
          >
            {/* 본문 */}
            <View style={styles.pageContent}>
              <Text style={styles.pageText}>{pages[currentPage]}</Text>
            </View>

            {/* 페이지 넘길 때 어두워지는 오버레이 */}
            <Animated.View
              pointerEvents="none"
              style={[styles.shadowOverlay, { opacity: shadowOpacity }]}
            />
          </Animated.View>

          {/* 좌우 탭 영역 */}
          <TouchableOpacity
            style={styles.tapLeft}
            onPress={() => doFlip('prev')}
            activeOpacity={1}
          />
          <TouchableOpacity
            style={styles.tapRight}
            onPress={() => doFlip('next')}
            activeOpacity={1}
          />
        </View>
      </PanGestureHandler>

      {/* 페이지 번호 */}
      <View style={styles.pageNumBar}>
        <Text style={styles.pageNum}>{currentPage + 1} / {pages.length}</Text>
      </View>
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
  errorText: { color: colors.error ?? '#CC3333', fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },

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

  pageOuter: { flex: 1, position: 'relative' },

  pageWrapper: {
    flex: 1,
    backgroundColor: '#FFFEF5',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },

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

  shadowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    borderRadius: 2,
  },

  // 좌우 탭: 화면 양쪽 20% 터치 시 페이지 이동
  tapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '20%',
  },
  tapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '20%',
  },

  pageNumBar: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  pageNum: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },

  backBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
