import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUser, updateUser, clearAuth } from '../utils/auth';
import { getLemon, updateNickname, logoutApi } from '../api/bookApi';
import { colors } from '../theme';

export default function MyPageScreen({ onLogout }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [lemon, setLemon] = useState(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUser().then(u => {
      setUser(u);
      setNicknameInput(u?.nickname ?? '');
    });
    getLemon().then(({ data }) => setLemon(data)).catch(() => {});
  }, []);

  const handleSaveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) {
      Alert.alert('알림', '닉네임을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await updateNickname(trimmed);
      await updateUser({ nickname: trimmed });
      setUser(prev => ({ ...prev, nickname: trimmed }));
      setEditing(false);
      Alert.alert('완료', '닉네임이 변경되었습니다.');
    } catch (e) {
      const msg = e.response?.data?.error ?? e.response?.data?.message ?? '닉네임 변경에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try { await logoutApi(); } catch {}
          await clearAuth();
          onLogout();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>마이페이지</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <Text style={styles.nickname}>{user?.nickname ?? '닉네임 없음'}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
        </View>

        {/* Lemon */}
        {lemon && (
          <View style={styles.lemonCard}>
            <Text style={styles.lemonLabel}>🍋 보유 레몬</Text>
            <Text style={styles.lemonCount}>{lemon.lemonCount}개</Text>
            <Text style={styles.lemonSub}>오늘 {lemon.usedToday}/{lemon.maxDaily}회 사용</Text>
          </View>
        )}

        {/* Nickname Edit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>닉네임 변경</Text>
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.input}
                value={nicknameInput}
                onChangeText={setNicknameInput}
                placeholder="새 닉네임 입력"
                placeholderTextColor={colors.textMuted}
                maxLength={20}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSaveNickname}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={styles.saveBtnText}>저장</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setNicknameInput(user?.nickname ?? '');
                  setEditing(false);
                }}
              >
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Text style={styles.editBtnText}>닉네임 변경하기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.primary },
  scroll: { padding: 20, gap: 16 },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    padding: 28,
    gap: 8,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarEmoji: { fontSize: 36 },
  nickname: { fontSize: 20, fontWeight: '800', color: colors.text },
  email: { fontSize: 13, color: colors.textMuted },
  lemonCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0D060',
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  lemonLabel: { fontSize: 14, fontWeight: '700', color: '#8B6914' },
  lemonCount: { fontSize: 32, fontWeight: '900', color: '#8B6914' },
  lemonSub: { fontSize: 12, color: '#A07820' },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  editRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: { color: colors.textMuted, fontSize: 13 },
  editBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#EEF5E8',
    borderWidth: 1,
    borderColor: '#C8DFBB',
  },
  editBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  logoutBtn: {
    backgroundColor: '#FFF0F0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCCCC',
    marginTop: 8,
  },
  logoutBtnText: { color: '#CC3333', fontSize: 16, fontWeight: '700' },
});
