/**
 * [파일 목적] 마이페이지 — Firebase 회원 정보 수정(일반인/운동인 자동 재분류), 로그아웃, 내 측정 기록 삭제
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Lock,
  LogOut,
  Save,
  Trash2,
} from 'lucide-react';
import { ErrorAlert } from '../components/Notices';
import { formatFirestoreErrorMessage } from '../firebase';
import {
  classifyUserGroup,
  firebaseAuthService,
} from '../services/auth.firebase';
import type {
  GenderOption,
  ParticipationType,
  TrainingExperience,
  UserProfile,
} from '../types/domain';
import {
  calculateInternationalAge,
  getUserGroupLabelKo,
  TRAINING_EXPERIENCE_OPTIONS,
} from '../utils/format';

interface ProfilePageProps {
  user: UserProfile;
  measurementCount: number;
  onProfileUpdated: (updated: UserProfile, notice: string) => void;
  onLogout: () => void;
  onRequestClearMyRecords: () => void;
}

/**
 * [컴포넌트] VELOMAX v1 마이페이지
 */
export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  measurementCount,
  onProfileUpdated,
  onLogout,
  onRequestClearMyRecords,
}) => {
  const [name, setName] = useState(user.name);
  const [birthDate, setBirthDate] = useState(user.birthDate || '1999-05-15');
  const [gender, setGender] = useState<GenderOption>(user.gender);
  const [trainingExperience, setTrainingExperience] =
    useState<TrainingExperience>(
      user.trainingExperience === 'under1year'
        ? '6to12months'
        : user.trainingExperience
    );
  const [participationType, setParticipationType] =
    useState<ParticipationType>(user.participationType);

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  if (user.isGuest) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-lg p-8 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
          <Lock className="w-5 h-5 text-slate-600" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">
          마이페이지 이용 제한
        </h1>
        <p className="text-sm text-slate-600">
          비회원 모드에서는 마이페이지 기능을 제공하지 않습니다. 해당 기능을 사용하려면 로그인하세요.
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-md cursor-pointer"
        >
          로그인 / 회원가입 화면으로 이동
        </button>
      </div>
    );
  }

  const predictedGroup = classifyUserGroup(participationType);
  const computedAge = calculateInternationalAge(birthDate);
  const todayIso = new Date().toISOString().slice(0, 10);

  /** Firestore 프로필 저장 및 사용자 자동 분류·만나이 재계산 */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setErrors([]);
    setSavedNotice(null);
    setIsSaving(true);

    try {
      const updated = await firebaseAuthService.updateProfile(
        user.id,
        user.email,
        user.createdAt,
        {
          name,
          birthDate,
          gender,
          trainingExperience,
          participationType,
        }
      );
      const groupKo = getUserGroupLabelKo(updated.userGroup);
      const msg = `프로필이 저장되었습니다. 현재 만나이는 만 ${updated.age}세, 분류는 '${groupKo}'입니다.`;
      setSavedNotice(msg);
      onProfileUpdated(updated, msg);
    } catch (err) {
      setErrors([formatFirestoreErrorMessage(err)]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          마이페이지 및 계정 관리
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          생년월일을 기준으로 만나이가 자동 계산되며, 운동 참여 형태를 바꾸면 일반인/운동인 구분이 자동으로 업데이트됩니다.
        </p>
      </div>

      {/* 회원 정보 수정 폼 */}
      <form
        onSubmit={(e) => void handleSave(e)}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            프로필 정보 수정
          </h2>
          <span className="text-xs text-slate-500">
            현재 저장된 측정 기록:{' '}
            <strong className="font-mono text-slate-900 tabular-nums">
              {measurementCount}
            </strong>
            건
          </span>
        </div>

        <ErrorAlert messages={errors} />

        {savedNotice && (
          <div className="border border-emerald-200 bg-emerald-50 text-emerald-900 rounded-md px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="profile-name"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              이름 / 닉네임 *
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              로그인 이메일 (계정 식별자)
            </label>
            <input
              id="profile-email"
              type="email"
              value={user.email}
              readOnly
              className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-100 text-slate-600 rounded-md cursor-not-allowed"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="profile-birthdate"
                className="block text-xs font-semibold text-slate-700"
              >
                생년월일 *
              </label>
              <span className="text-xs font-mono font-semibold text-blue-700">
                만 {computedAge}세
              </span>
            </div>
            <input
              id="profile-birthdate"
              type="date"
              min="1930-01-01"
              max={todayIso}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono tabular-nums focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label
              htmlFor="profile-gender"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              성별 *
            </label>
            <select
              id="profile-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderOption)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="male">남성</option>
              <option value="female">여성</option>
              <option value="unspecified">응답하지 않음</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="profile-exp"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              운동 경력 *
            </label>
            <select
              id="profile-exp"
              value={trainingExperience}
              onChange={(e) =>
                setTrainingExperience(e.target.value as TrainingExperience)
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-600"
            >
              {TRAINING_EXPERIENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="profile-participation"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              운동 참여 형태 (자동 분류 기준) *
            </label>
            <select
              id="profile-participation"
              value={participationType}
              onChange={(e) =>
                setParticipationType(e.target.value as ParticipationType)
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="recreational">일반 운동 (취미·건강·피트니스)</option>
              <option value="athlete_training">
                선수 또는 체계적인 선수 훈련 참여
              </option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
          <div className="text-xs text-slate-600">
            저장 시 자동 분류 결과:{' '}
            <strong className="text-blue-800">
              {getUserGroupLabelKo(predictedGroup)}
            </strong>{' '}
            · 계산 만나이:{' '}
            <strong className="font-mono text-slate-900">만 {computedAge}세</strong>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-sm font-semibold rounded-md flex items-center gap-2 cursor-pointer disabled:cursor-wait"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                회원정보 저장 및 분류 반영
              </>
            )}
          </button>
        </div>
      </form>

      {/* 계정 세션 및 측정 기록 관리 패널 */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          계정 및 측정 데이터 관리
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          로그아웃하거나 내 계정에 저장된 모든 측정 기록을 클라우드에서 삭제할 수 있습니다.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>

          <button
            type="button"
            onClick={onRequestClearMyRecords}
            disabled={measurementCount === 0}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-rose-700 bg-white hover:bg-rose-50 disabled:opacity-40 border border-rose-200 rounded-md flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            내 측정 기록 전체 삭제 ({measurementCount}건)
          </button>
        </div>
      </section>
    </div>
  );
};
