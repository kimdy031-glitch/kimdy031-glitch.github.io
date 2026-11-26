/**
 * [파일 목적] 화면 A — VELOMAX v1 초기 로그인, 회원가입 및 비회원 시작 화면
 * [책임]
 *   - 브랜드명(VELOMAX / 벨로맥스)과 국·영문 슬로건("Measure Velocity, Predict Strength.", "속도를 분석하고, 근력을 예측하다.") 표시
 *   - Firebase Authentication 기반 이메일/비밀번호 로그인
 *   - Firebase Authentication 회원가입 및 Firestore 회원 프로필 저장 (참여 형태에 따른 일반인/운동인 자동 분류)
 *   - 비회원 바로 시작 (측정 분석 전용, 저장/PDF/추세 제한)
 */

import React, { useState } from 'react';
import {
  Loader2,
  LogIn,
  UserCheck,
  UserPlus,
  Zap,
} from 'lucide-react';
import { AdBannerSlot } from '../components/AdBannerSlot';
import { AppFooter } from '../components/AppFooter';
import { ErrorAlert } from '../components/Notices';
import { formatFirestoreErrorMessage } from '../firebase';
import {
  classifyUserGroup,
  firebaseAuthService,
} from '../services/auth.firebase';
import type {
  AppRoute,
  GenderOption,
  ParticipationType,
  TrainingExperience,
  UserGroup,
  UserProfile,
} from '../types/domain';
import {
  calculateInternationalAge,
  getUserGroupLabelKo,
  TRAINING_EXPERIENCE_OPTIONS,
} from '../utils/format';

interface AuthPageProps {
  onLoginSuccess: (user: UserProfile, noticeMessage?: string) => void;
  onNavigate: (route: AppRoute) => void;
}

/**
 * [컴포넌트] VELOMAX v1 로그인, 회원가입 및 비회원 시작 페이지
 */
export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  onNavigate,
}) => {
  const [authTab, setAuthTab] = useState<'login' | 'signup' | 'guest'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  // 이메일 로그인 폼 상태
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 회원가입 폼 상태
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('2000-01-15');
  const [gender, setGender] = useState<GenderOption>('unspecified');
  const [trainingExperience, setTrainingExperience] =
    useState<TrainingExperience>('6to12months');
  const [participationType, setParticipationType] =
    useState<ParticipationType>('recreational');

  // 비회원 로그인 폼 상태 (이름, 생년월일, 일반인/운동인만 입력)
  const [guestName, setGuestName] = useState('');
  const [guestBirthDate, setGuestBirthDate] = useState('1998-06-15');
  const [guestUserGroup, setGuestUserGroup] = useState<UserGroup>('general');

  const previewGroup = classifyUserGroup(participationType);
  const signupAgePreview = calculateInternationalAge(birthDate);
  const guestAgePreview = calculateInternationalAge(guestBirthDate);
  const todayIso = new Date().toISOString().slice(0, 10);

  /** Firebase 이메일/비밀번호 로그인 핸들러 */
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessages([]);
    setIsSubmitting(true);
    try {
      const user = await firebaseAuthService.loginWithEmail(
        loginEmail,
        loginPassword
      );
      onLoginSuccess(
        user,
        `${user.name} (${getUserGroupLabelKo(user.userGroup)} · 만 ${user.age}세) 계정으로 로그인되었습니다.`
      );
    } catch (err) {
      setErrorMessages([formatFirestoreErrorMessage(err)]);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Firebase 회원가입 + Firestore 프로필 등록 핸들러 */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessages([]);

    if (password !== confirmPassword) {
      setErrorMessages(['비밀번호와 비밀번호 확인이 일치하지 않습니다.']);
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser = await firebaseAuthService.registerWithEmail({
        name,
        email,
        password,
        birthDate,
        gender,
        trainingExperience,
        participationType,
      });
      const groupKo = getUserGroupLabelKo(newUser.userGroup);
      onLoginSuccess(
        newUser,
        `회원가입 완료: 만 ${newUser.age}세 · '${groupKo}' 그룹으로 등록되었습니다.`
      );
    } catch (err) {
      setErrorMessages([formatFirestoreErrorMessage(err)]);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** 비회원 시작 핸들러 */
  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessages([]);
    setIsSubmitting(true);
    try {
      const guestUser = await firebaseAuthService.loginAsGuest({
        name: guestName,
        birthDate: guestBirthDate,
        userGroup: guestUserGroup,
      });
      onLoginSuccess(
        guestUser,
        `${guestUser.name}님 (${getUserGroupLabelKo(
          guestUser.userGroup
        )} · 만 ${guestUser.age}세) 비회원 모드로 측정 분석 화면에 진입했습니다.`
      );
    } catch (err) {
      setErrorMessages([
        err instanceof Error ? err.message : '비회원 시작 중 오류가 발생했습니다.',
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 상단 브랜드 바 */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
            VELOMAX
          </span>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              v1
            </span>
            <span className="hidden sm:inline">
              무게–속도 기반 e1RM 근력 분석 서비스
            </span>
          </div>
        </div>
      </header>

      {/* 상단 헤더 아래 광고 자리 (CLS 방지) */}
      <AdBannerSlot position="top-header" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 lg:py-10 space-y-6">
        {/* 2열 메인 히어로 & 인증 콘솔 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* 좌측: 스포츠테크 브랜드 히어로 패널 */}
          <section className="lg:col-span-7 bg-slate-900 text-white rounded-lg p-8 sm:p-10 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="font-mono text-xs tracking-wider text-cyan-400 uppercase">
                  Velocity-Based Strength Analytics · v1
                </p>
                <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-balance leading-tight">
                  VELOMAX{' '}
                  <span className="text-slate-400 font-semibold text-2xl sm:text-3xl">
                    벨로맥스
                  </span>
                </h1>
                <p className="font-display text-lg sm:text-xl font-semibold text-blue-300">
                  Measure Velocity, Predict Strength.
                </p>
                <p className="text-base sm:text-lg text-slate-200 font-medium">
                  속도를 분석하고, 근력을 예측하다.
                </p>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                스쿼트와 데드리프트의 서로 다른 세 무게와 들어 올리는 평균 속도(MCV)를 분석해
                무게–속도 직선을 만들고, 일반인/운동인 기준 속도(MVT)와 만나는 지점으로
                예측 최대근력(e1RM)과 목적별 추천 무게를 계산해 드립니다.
              </p>

              {/* 핵심 이용 방법 3단계 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                <div className="space-y-1 pt-2">
                  <p className="font-mono text-xs text-cyan-400">01. 무게 · MCV 입력</p>
                  <p className="text-sm font-semibold text-white">영상 분석 · 직접 입력</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    AI 자세 추정(15초 이하 영상) 또는 이미 아는 MCV 바로 입력
                  </p>
                </div>
                <div className="space-y-1 pt-2">
                  <p className="font-mono text-xs text-cyan-400">02. 직선 분석 · 예측</p>
                  <p className="text-sm font-semibold text-white">직선 분석 · e1RM 예측</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    무게–속도 직선 계산 및 일반인/운동인 기준 MVT로 최대근력(e1RM) 예측
                  </p>
                </div>
                <div className="space-y-1 pt-2">
                  <p className="font-mono text-xs text-cyan-400">03. 추세 · 보고서</p>
                  <p className="text-sm font-semibold text-white">변화 추적 · PDF 보고서</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    회원 전용 클라우드 기록 관리, AI 백분위 비교, PDF 결과 보고서 제공
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <span>지원 종목: 스쿼트 · 데드리프트</span>
              <span>회원 계정 및 기록 클라우드 안전 저장</span>
            </div>
          </section>

          {/* 우측: 이메일 로그인 / 회원가입 / 비회원 시작 패널 */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900">
                  계정 로그인 및 시작하기
                </h2>
                <p className="text-xs text-slate-500">
                  회원 계정은 클라우드에 안전하게 기록이 저장되며, 비회원으로도 즉시 측정해 볼 수 있습니다.
                </p>
              </div>

              {/* 이메일 로그인 / 회원가입 / 비회원 시작 3탭 전환 */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setErrorMessages([]);
                  }}
                  className={`py-2 px-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    authTab === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  이메일 로그인
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('signup');
                    setErrorMessages([]);
                  }}
                  className={`py-2 px-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    authTab === 'signup'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  회원가입
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('guest');
                    setErrorMessages([]);
                  }}
                  className={`py-2 px-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    authTab === 'guest'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  비회원 시작
                </button>
              </div>

              <ErrorAlert messages={errorMessages} />

              {/* 1) 이메일 로그인 탭 */}
              {authTab === 'login' && (
                <form onSubmit={(e) => void handleEmailLogin(e)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      이메일 *
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      비밀번호 *
                    </label>
                    <input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="비밀번호 6자 이상 입력"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:cursor-wait flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        로그인 확인 중...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        이메일로 로그인
                      </>
                    )}
                  </button>

                  <p className="text-xs text-slate-500 text-center pt-1">
                    계정이 없으신가요?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('signup');
                        setErrorMessages([]);
                      }}
                      className="text-blue-700 font-semibold hover:underline cursor-pointer"
                    >
                      회원가입하기
                    </button>
                  </p>
                </form>
              )}

              {/* 2) 회원가입 탭 (Firebase Auth + Firestore) */}
              {authTab === 'signup' && (
                <form onSubmit={(e) => void handleSignup(e)} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="signup-name"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        이름 / 닉네임 *
                      </label>
                      <input
                        id="signup-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="예: 홍길동"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="signup-birthdate"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          생년월일 *
                        </label>
                        <span className="text-xs font-mono font-semibold text-blue-700">
                          만 {signupAgePreview}세
                        </span>
                      </div>
                      <input
                        id="signup-birthdate"
                        type="date"
                        min="1930-01-01"
                        max={todayIso}
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono tabular-nums focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-email"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      이메일 *
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="signup-password"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        비밀번호 (6자 이상) *
                      </label>
                      <input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="6자 이상 입력"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="signup-password-confirm"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        비밀번호 확인 *
                      </label>
                      <input
                        id="signup-password-confirm"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="비밀번호 재입력"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="signup-gender"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        성별 *
                      </label>
                      <select
                        id="signup-gender"
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
                        htmlFor="signup-exp"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        운동 경력 *
                      </label>
                      <select
                        id="signup-exp"
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
                  </div>

                  <div>
                    <label
                      htmlFor="signup-participation"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      운동 참여 형태 (자동 분류 기준) *
                    </label>
                    <select
                      id="signup-participation"
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

                  <div className="flex items-center justify-between px-3 py-2 bg-blue-50/70 border border-blue-200 rounded-md text-xs">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                      사용자 분류 · 만나이:
                    </span>
                    <span className="font-bold text-blue-800">
                      {getUserGroupLabelKo(previewGroup)} · 만 {signupAgePreview}세
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:cursor-wait flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        계정 등록 중...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        회원가입 및 시작하기
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* 3) 비회원 시작 탭 */}
              {authTab === 'guest' && (
                <form onSubmit={(e) => void handleGuestLogin(e)} className="space-y-3.5">
                  <div className="bg-blue-50/70 border border-blue-200 rounded-md p-3 text-xs text-blue-950 leading-relaxed">
                    <strong>비회원 바로 시작:</strong> 이름·생년월일·구분만 입력하면 바로 측정 분석 화면으로 이동합니다. (단, 히스토리 저장·마이페이지·PDF 인쇄·추세 그래프는 회원 로그인 후 이용 가능합니다.)
                  </div>

                  <div>
                    <label
                      htmlFor="guest-name"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      이름 *
                    </label>
                    <input
                      id="guest-name"
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="예: 홍길동"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="guest-birthdate"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        생년월일 *
                      </label>
                      <span className="text-xs font-mono font-semibold text-blue-700">
                        만 {guestAgePreview}세
                      </span>
                    </div>
                    <input
                      id="guest-birthdate"
                      type="date"
                      min="1930-01-01"
                      max={todayIso}
                      value={guestBirthDate}
                      onChange={(e) => setGuestBirthDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono tabular-nums focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                      사용자 구분 (MVT 적용 기준) *
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setGuestUserGroup('general')}
                        className={`py-2.5 px-3 rounded-md border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                          guestUserGroup === 'general'
                            ? 'border-blue-600 bg-blue-50 text-blue-800'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        일반인
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuestUserGroup('athlete')}
                        className={`py-2.5 px-3 rounded-md border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                          guestUserGroup === 'athlete'
                            ? 'border-blue-600 bg-blue-50 text-blue-800'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        운동인
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:cursor-wait flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    비회원으로 바로 측정 시작
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>

        {/* 메인 콘텐츠 하단 광고 자리 (CLS 방지) */}
        <AdBannerSlot position="bottom-content" />
      </main>

      {/* 전 페이지 공통 푸터 */}
      <AppFooter currentRoute="auth" onNavigate={onNavigate} />
    </div>
  );
};
