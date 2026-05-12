import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, ActivityIndicator,
  useWindowDimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageFlipper from '@thanhdong272/react-native-page-flipper';
import { getBookById, startReading, savePage, markAsDone } from '../api/bookApi';
import { colors } from '../theme';

const SAVE_DEBOUNCE = 1500;
const LINE_HEIGHT = 26;
const FONT_SIZE = 15;
const H_PADDING = 24;
const V_PADDING = 20;
// 헤더(52) + 진행바(4) + 하단 페이지번호(36) + SafeArea
const CHROME_HEIGHT = 52 + 4 + 36;

function estimateCharsPerPage(pageWidth, pageHeight) {
  const contentW = pageWidth - H_PADDING * 2;
  const contentH = pageHeight - V_PADDING * 2;
  const charsPerLine = Math.floor(contentW / (FONT_SIZE * 0.58));
  const linesPerPage = Math.floor(contentH / LINE_HEIGHT);
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

function PageContent({ text, pageIndex, totalPages }) {
  return (
    <View style={pageStyles.page}>
      <Text style={pageStyles.text}>{text}</Text>
      <Text style={pageStyles.pageNum}>{pageIndex + 1} / {totalPages}</Text>
    </View>
  );
}

const pageStyles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFEF5',
    paddingHorizontal: H_PADDING,
    paddingVertical: V_PADDING,
    justifyContent: 'space-between',
  },
  text: {
    flex: 1,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    color: '#2C2C2C',
    letterSpacing: 0.15,
  },
  pageNum: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 11,
    paddingTop: 8,
  },
});

export default function ReadScreen({ route, navigation }) {
  const { bookId } = route.params ?? {};
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [book, setBook] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const saveTimer = useRef(null);
  const pagesRef = useRef([]);

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

  const handleFlippedEnd = useCallback((index) => {
    setCurrentPage(index);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePage(bookId, index).catch(() => {});
      if (index === pagesRef.current.length - 1) {
        markAsDone(bookId).catch(() => {});
      }
    }, SAVE_DEBOUNCE);
  }, [bookId]);

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

      {/* PageFlipper */}
      <View style={styles.flipperWrap}>
        {pages.length > 0 && (
          <PageFlipper
            data={pages}
            portrait
            pressable
            renderPage={(pageData) => {
              const idx = pages.indexOf(pageData);
              return (
                <PageContent
                  text={pageData}
                  pageIndex={idx >= 0 ? idx : currentPage}
                  totalPages={pages.length}
                />
              );
            }}
            onFlippedEnd={handleFlippedEnd}
            pageSize={{ width, height: pageAreaHeight }}
            contentContainerStyle={styles.flipperContent}
          />
        )}
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

  flipperWrap: { flex: 1 },
  flipperContent: { backgroundColor: '#FFFEF5' },

  backBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
