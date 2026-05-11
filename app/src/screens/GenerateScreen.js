import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateBook, getGenerationStatus, getLemon } from '../api/bookApi';
import { colors } from '../theme';

const GENRES = ['SF', '판타지', '로맨스', '일상', '공포'];
const TONES = [
  { label: '따뜻하게', value: 'WARM' },
  { label: '긴장감 있게', value: 'DARK' },
  { label: '유쾌하게', value: 'HUMOROUS' },
];
const ENDINGS = [
  { label: '해피엔딩', value: 'HAPPY' },
  { label: '새드엔딩', value: 'SAD' },
  { label: '열린결말', value: 'OPEN' },
];

function OptionRow({ label, options, selected, onSelect }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map(opt => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const text = typeof opt === 'string' ? opt : opt.label;
          const active = selected === val;
          return (
            <TouchableOpacity
              key={val}
              style={[styles.optBtn, active && styles.optBtnActive]}
              onPress={() => onSelect(val)}
            >
              <Text style={[styles.optBtnText, active && styles.optBtnTextActive]}>{text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function GenerateScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [keywords, setKeywords] = useState([]);
  const [kwInput, setKwInput] = useState('');
  const [genre, setGenre] = useState('일상');
  const [tone, setTone] = useState('WARM');
  const [ending, setEnding] = useState('HAPPY');
  const [protagonist, setProtagonist] = useState('');
  const [lemon, setLemon] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    getLemon().then(({ data }) => setLemon(data)).catch(() => {});
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  const addKeyword = () => {
    const kw = kwInput.trim();
    if (!kw || keywords.length >= 4) return;
    if (!keywords.includes(kw)) setKeywords(prev => [...prev, kw]);
    setKwInput('');
  };

  const removeKeyword = (kw) => setKeywords(prev => prev.filter(k => k !== kw));

  const stopGenerating = (msg) => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    setGenerating(false);
    setStatusMsg('');
    if (msg) Alert.alert('생성 실패', msg);
  };

  const handleGenerate = async () => {
    if (keywords.length === 0) {
      Alert.alert('알림', '키워드를 1개 이상 입력해주세요.');
      return;
    }
    if (lemon && lemon.lemonCount <= 0) {
      Alert.alert('레몬 부족', '레몬이 없습니다. 내일 다시 시도해주세요.');
      return;
    }

    // 기존 폴링이 남아 있으면 정리
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }

    setGenerating(true);
    setStatusMsg('AI가 소설을 쓰고 있어요... ✍️');

    let bookId;
    try {
      const { data } = await generateBook({
        keywords,
        genre,
        tone,
        ending,
        protagonistName: protagonist.trim() || null,
      });
      bookId = data?.id;
      if (!bookId) {
        stopGenerating('생성 요청은 성공했지만 책 ID를 받지 못했습니다. 다시 시도해주세요.');
        return;
      }
    } catch (e) {
      setGenerating(false);
      setStatusMsg('');
      const msg = e.response?.data?.message ?? '생성 요청에 실패했습니다.';
      Alert.alert('오류', msg);
      return;
    }

    // 재귀 setTimeout 폴링 (최대 60회 × 3초 = 3분)
    let attempts = 0;
    const MAX_ATTEMPTS = 60;

    const poll = async () => {
      if (attempts >= MAX_ATTEMPTS) {
        stopGenerating('생성 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      attempts += 1;
      try {
        const { data: st } = await getGenerationStatus(bookId);
        const status = st?.status ?? st;
        if (status === 'DONE') {
          stopGenerating(null);
          navigation.navigate('Read', { bookId, title: '생성된 책' });
        } else if (status === 'FAILED') {
          stopGenerating('소설 생성에 실패했습니다. 다시 시도해주세요.');
        } else {
          // PENDING | GENERATING — 3초 후 재시도
          pollRef.current = setTimeout(poll, 3000);
        }
      } catch (e) {
        const msg = e.response?.data?.message ?? '상태 확인 중 오류가 발생했습니다. 다시 시도해주세요.';
        stopGenerating(msg);
      }
    };

    pollRef.current = setTimeout(poll, 3000);
  };

  const canGenerate = !generating && keywords.length > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>✨</Text>
          <Text style={styles.headerTitle}>책 만들기</Text>
        </View>
        {lemon && (
          <View style={styles.lemonBadge}>
            <Text style={styles.lemonText}>🍋 {lemon.lemonCount}개 · {lemon.usedToday}/{lemon.maxDaily}회</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Keywords */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>키워드 (최대 4개)</Text>
          <View style={styles.kwInputRow}>
            <TextInput
              style={styles.kwInput}
              value={kwInput}
              onChangeText={setKwInput}
              placeholder="키워드 입력 후 추가"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={addKeyword}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.kwAddBtn, keywords.length >= 4 && styles.kwAddBtnDisabled]}
              onPress={addKeyword}
              disabled={keywords.length >= 4}
            >
              <Text style={styles.kwAddBtnText}>추가</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagRow}>
            {keywords.map(kw => (
              <TouchableOpacity key={kw} style={styles.tag} onPress={() => removeKeyword(kw)}>
                <Text style={styles.tagText}>{kw} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <OptionRow label="장르" options={GENRES} selected={genre} onSelect={setGenre} />
        <OptionRow label="분위기" options={TONES} selected={tone} onSelect={setTone} />
        <OptionRow label="결말" options={ENDINGS} selected={ending} onSelect={setEnding} />

        {/* Protagonist */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>주인공 이름 (선택)</Text>
          <TextInput
            style={styles.input}
            value={protagonist}
            onChangeText={setProtagonist}
            placeholder="비워두면 AI가 결정"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Generate Button */}
        {generating ? (
          <View style={styles.generatingBox}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.generatingText}>{statusMsg}</Text>
            <Text style={styles.generatingHint}>최대 30초 소요될 수 있어요</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.generateBtn, !canGenerate && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={!canGenerate}
          >
            <Text style={styles.generateBtnText}>🍋 소설 생성하기</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  lemonBadge: {
    backgroundColor: '#FFF3C4',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lemonText: { fontSize: 12, fontWeight: '600', color: '#8B6914' },
  scroll: { padding: 20, paddingBottom: 48 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  kwInputRow: { flexDirection: 'row', gap: 8 },
  kwInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  kwAddBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  kwAddBtnDisabled: { backgroundColor: colors.border },
  kwAddBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: {
    backgroundColor: '#EEF5E8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#C8DFBB',
  },
  tagText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optBtnText: { fontSize: 13, color: colors.textMuted },
  optBtnTextActive: { color: colors.white, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  generatingBox: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.card,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  generatingText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  generatingHint: { fontSize: 12, color: colors.textMuted },
  generateBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  generateBtnDisabled: { backgroundColor: colors.border },
  generateBtnText: { color: colors.white, fontSize: 17, fontWeight: '800' },
});
