/**
 * [파일 목적] VELOMAX v1 애플리케이션 루트 컴포넌트 및 해시 기반 라우팅 오케스트레이터
 * [책임]
 *   - Firebase Authentication 상태 구독 및 초기 진입 시 로그인 화면(AuthPage) 라우팅
 *   - Cloud Firestore 측정 기록 실시간 구독(회원 전용) 및 비회원(guest) 접근 제한 관리
 *   - 로그인 시 생일(월·일 일치) 여부 확인 및 풍선·폭죽 생일 축하 모달 표시
 *   - 상단 헤더 아래 및 메인 콘텐츠 하단 반응형 광고 자리 + 전 페이지 공통 푸터(정책/참고문헌 링크) 배치
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AdBannerSlot } from './components/AdBannerSlot';
import { AppFooter } from './components/AppFooter';
import { AppHeader } from './components/AppHeader';
import { BirthdayCelebrationModal } from './components/BirthdayCelebrationModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ErrorAlert } from './components/Notices';
import { formatFirestoreErrorMessage } from './firebase';
import { firestoreMeasurementRepository } from './repositories/firestoreRepository';
import { firebaseAuthService } from './services/auth.firebase';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { MeasurePage } from './pages/MeasurePage';
import { PolicyPages, type PolicyRoute } from './pages/PolicyPages';
import { ProfilePage } from './pages/ProfilePage';
import { ReportPage } from './pages/ReportPage';
import { ResultPage } from './pages/ResultPage';
import type {
  AnalysisDraftResult,
  AppRoute,
  ExerciseType,
  MeasurementRecord,
  UserProfile,
} from './types/domain';
import { isBirthdayToday } from './utils/format';

type ConfirmModalState =
  | { type: 'none' }
  | { type: 'delete_one'; recordId: string }
  | { type: 'clear_user_records' };

const POLICY_ROUTES: readonly PolicyRoute[] = [
  'about',
  'references',
  'terms',
  'privacy',
  'contact',
];

const ALL_ROUTES: readonly AppRoute[] = [
  'auth',
  'dashboard',
  'measure',
  'result',
  'history',
  'report',
  'profile',
  'about',
  'references',
  'terms',
  'privacy',
  'contact',
];

function isPolicyRoute(route: AppRoute): route is PolicyRoute {
  return (POLICY_ROUTES as readonly string[]).includes(route);
}

/**
 * [헬퍼] 현재 window.location.hash(#/about 등)에서 유효한 AppRoute 추출
 */
function parseRouteFromHash(): AppRoute | null {
  if (typeof window === 'undefined') return null;
  const rawHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (!rawHash) return null;
  return (ALL_ROUTES as readonly string[]).includes(rawHash)
    ? (rawHash as AppRoute)
    : null;
}

/**
 * [헬퍼] 사용자 상태(미로그인 / 비회원 / 일반 회원)에 맞게 허용된 라우트로 보정
 */
function resolveAllowedRoute(
  requested: AppRoute | null,
  user: UserProfile | null,
  hasDraftResult: boolean
): AppRoute {
  if (requested && isPolicyRoute(requested)) {
    return requested;
  }
  if (!user) {
    return 'auth';
  }
  if (!requested || requested === 'auth') {
    return user.isGuest ? 'measure' : 'dashboard';
  }
  if (
    user.isGuest &&
    (requested === 'dashboard' ||
      requested === 'history' ||
      requested === 'profile')
  ) {
    return 'measure';
  }
  if (requested === 'result' && !hasDraftResult) {
    return 'measure';
  }
  return requested;
}

/**
 * [루트 컴포넌트] VELOMAX v1 웹서비스
 */
export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [route, setRoute] = useState<AppRoute>(() => {
    const hashRoute = parseRouteFromHash();
    if (hashRoute && isPolicyRoute(hashRoute)) return hashRoute;
    return 'auth';
  });

  // 현재 로그인한 회원의 측정 기록 목록 (비회원은 빈 배열 유지)
  const [measurements, setMeasurements] = useState<MeasurementRecord[]>([]);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [dataErrorBanner, setDataErrorBanner] = useState<string | null>(null);
  const [fatalDataError, setFatalDataError] = useState<Error | null>(null);

  // 생일 축하 모달 대상 사용자명
  const [birthdayCelebrationName, setBirthdayCelebrationName] = useState<
    string | null
  >(null);

  // 측정 화면 초기 선택 종목 및 최신 분석 결과 상태
  const [measureInitialExercise, setMeasureInitialExercise] =
    useState<ExerciseType>('squat');
  const [draftResult, setDraftResult] = useState<AnalysisDraftResult | null>(null);
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  // 결과 보고서에서 선택된 특정 기록 ID
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // 삭제 확인 모달 상태
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    type: 'none',
  });

  // hashchange 이벤트에서 React 상태 반영 전 이전 클로저 값을 읽지 않도록 동기 참조 유지
  const currentUserRef = useRef<UserProfile | null>(currentUser);
  currentUserRef.current = currentUser;
  const draftResultRef = useRef<AnalysisDraftResult | null>(draftResult);
  draftResultRef.current = draftResult;

  if (fatalDataError) {
    throw fatalDataError;
  }

  /** 해시 URL과 React 라우트 상태를 함께 전환 */
  const navigateTo = useCallback(
    (
      nextRoute: AppRoute,
      overrideUser?: UserProfile | null,
      overrideHasDraft?: boolean
    ) => {
      const targetUser =
        overrideUser !== undefined ? overrideUser : currentUserRef.current;
      const targetHasDraft =
        overrideHasDraft !== undefined
          ? overrideHasDraft
          : Boolean(draftResultRef.current);
      const allowed = resolveAllowedRoute(nextRoute, targetUser, targetHasDraft);
      setRoute(allowed);
      if (typeof window !== 'undefined') {
        const nextHash = `#/${allowed}`;
        if (window.location.hash !== nextHash) {
          window.location.hash = nextHash;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    []
  );

  /** Firebase Auth 세션 구독 (새로고침 시 자동 복원, 미로그인 시 로그인 화면 유지) */
  useEffect(() => {
    const unsubscribe = firebaseAuthService.subscribeAuthState(
      (resolvedUser) => {
        currentUserRef.current = resolvedUser;
        setCurrentUser(resolvedUser);
        setAuthReady(true);

        const hashRoute = parseRouteFromHash();
        const allowed = resolveAllowedRoute(
          hashRoute,
          resolvedUser,
          Boolean(draftResultRef.current)
        );
        setRoute(allowed);
        if (typeof window !== 'undefined') {
          const expectedHash = `#/${allowed}`;
          if (window.location.hash !== expectedHash) {
            window.history.replaceState(null, '', expectedHash);
          }
        }
      },
      (err) => {
        setAuthReady(true);
        setFatalDataError(err);
      }
    );

    return () => unsubscribe();
  }, []);

  /** 브라우저 뒤로/앞으로가기 및 해시 링크 직접 변경 동기화 */
  useEffect(() => {
    const syncHashToState = () => {
      if (!authReady) return;
      const hashRoute = parseRouteFromHash();
      const allowed = resolveAllowedRoute(
        hashRoute,
        currentUserRef.current,
        Boolean(draftResultRef.current)
      );
      setRoute(allowed);
      const expectedHash = `#/${allowed}`;
      if (window.location.hash !== expectedHash) {
        window.history.replaceState(null, '', expectedHash);
      }
    };

    window.addEventListener('hashchange', syncHashToState);
    return () => window.removeEventListener('hashchange', syncHashToState);
  }, [authReady]);

  /** 현재 로그인 회원의 Cloud Firestore 측정 기록 실시간 구독 (비회원은 구독 안 함) */
  useEffect(() => {
    if (!authReady || !currentUser || currentUser.isGuest) {
      setMeasurements([]);
      return;
    }

    const unsubscribe = firestoreMeasurementRepository.subscribeByUser(
      currentUser.id,
      (records) => {
        setMeasurements(records);
      },
      (err) => {
        setFatalDataError(err);
      }
    );

    return () => unsubscribe();
  }, [authReady, currentUser]);

  /** 로그인 / 회원가입 / 비회원 시작 성공 핸들러 */
  const handleLoginSuccess = (user: UserProfile, noticeMessage?: string) => {
    currentUserRef.current = user;
    draftResultRef.current = null;
    setCurrentUser(user);
    setDraftResult(null);
    setIsDraftSaved(false);
    setSelectedReportId(null);
    setStatusBanner(noticeMessage ?? null);

    if (isBirthdayToday(user.birthDate)) {
      setBirthdayCelebrationName(user.name);
    }

    navigateTo(user.isGuest ? 'measure' : 'dashboard', user, false);
  };

  /** 로그아웃 (또는 비회원이 로그인 화면으로 이동) 핸들러 */
  const handleLogout = async () => {
    await firebaseAuthService.logout();
    currentUserRef.current = null;
    draftResultRef.current = null;
    setCurrentUser(null);
    setMeasurements([]);
    setDraftResult(null);
    setIsDraftSaved(false);
    setSelectedReportId(null);
    setStatusBanner(null);
    setBirthdayCelebrationName(null);
    navigateTo('auth', null, false);
  };

  /** 종목을 지정하여 측정 화면으로 이동 */
  const handleStartMeasureForExercise = (exercise: ExerciseType) => {
    setMeasureInitialExercise(exercise);
    navigateTo('measure');
  };

  /** 분석 완료 후 결과 화면으로 이동 */
  const handleAnalysisComplete = (result: AnalysisDraftResult) => {
    draftResultRef.current = result;
    setDraftResult(result);
    setIsDraftSaved(false);
    navigateTo('result', currentUserRef.current, true);
  };

  /** 분석 결과 Firestore 저장 (회원 전용, 비회원은 차단) */
  const handleSaveDraftResult = async () => {
    if (!currentUser || currentUser.isGuest || !draftResult || isDraftSaved) return;
    setDataErrorBanner(null);
    try {
      await firestoreMeasurementRepository.save(currentUser.id, draftResult.record);
      setIsDraftSaved(true);
      setStatusBanner('측정 결과가 클라우드 히스토리에 저장되었습니다.');
    } catch (err) {
      setDataErrorBanner(formatFirestoreErrorMessage(err));
    }
  };

  /** 결과 화면에서 바로 보고서 보기로 이동 */
  const handleViewReportFromResult = async () => {
    if (!currentUser || !draftResult) return;
    setDataErrorBanner(null);
    try {
      if (!currentUser.isGuest && !isDraftSaved) {
        await firestoreMeasurementRepository.save(currentUser.id, draftResult.record);
        setIsDraftSaved(true);
      }
      setSelectedReportId(draftResult.record.id);
      navigateTo('report', currentUser, true);
    } catch (err) {
      setDataErrorBanner(formatFirestoreErrorMessage(err));
    }
  };

  /** 특정 기록 ID의 결과 보고서 화면 열기 */
  const handleOpenReport = (recordId: string) => {
    setSelectedReportId(recordId);
    navigateTo('report');
  };

  /** 확인 모달 승인 시 Firestore 삭제 실행 */
  const handleConfirmAction = async () => {
    const activeModal = confirmModal;
    setConfirmModal({ type: 'none' });
    setDataErrorBanner(null);

    try {
      if (activeModal.type === 'delete_one' && currentUser && !currentUser.isGuest) {
        await firestoreMeasurementRepository.delete(
          currentUser.id,
          activeModal.recordId
        );
        if (selectedReportId === activeModal.recordId) {
          setSelectedReportId(null);
        }
        setStatusBanner('선택한 측정 기록이 삭제되었습니다.');
      } else if (
        activeModal.type === 'clear_user_records' &&
        currentUser &&
        !currentUser.isGuest
      ) {
        await firestoreMeasurementRepository.deleteAllByUser(currentUser.id);
        setSelectedReportId(null);
        setStatusBanner('현재 계정의 측정 기록이 모두 삭제되었습니다.');
      }
    } catch (err) {
      setDataErrorBanner(formatFirestoreErrorMessage(err));
    }
  };

  const selectedReportRecord = currentUser?.isGuest
    ? draftResult?.record ?? null
    : measurements.find((m) => m.id === selectedReportId) ??
      measurements[0] ??
      draftResult?.record ??
      null;

  // 공개 정책/참고문헌 페이지는 로그인 여부와 무관하게 즉시 접근 가능
  if (!currentUser && isPolicyRoute(route)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <a
              href="#/auth"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('auth');
              }}
              className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap"
            >
              VELOMAX
            </a>
            <button
              type="button"
              onClick={() => navigateTo('auth')}
              className="px-4 py-1.5 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              로그인 / 시작하기
            </button>
          </div>
        </header>

        <AdBannerSlot position="top-header" />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <PolicyPages
            page={route}
            onNavigate={(r) => navigateTo(r)}
            onBack={() => navigateTo('auth')}
          />
        </main>

        <AdBannerSlot position="bottom-content" />
        <AppFooter currentRoute={route} onNavigate={(r) => navigateTo(r)} />
      </div>
    );
  }

  // Firebase Auth 초기 상태 확인 중 화면
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-blue-700" />
        <p className="text-sm font-medium text-slate-600">
          VELOMAX 로그인 상태를 확인하는 중입니다...
        </p>
      </div>
    );
  }

  // 미로그인 상태 -> 초기 화면(로그인/회원가입/비회원 시작) 렌더링
  if (!currentUser || route === 'auth') {
    return (
      <AuthPage
        onLoginSuccess={handleLoginSuccess}
        onNavigate={(r) => navigateTo(r)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppHeader
        currentUser={currentUser}
        currentRoute={route}
        onNavigate={(nextRoute) => navigateTo(nextRoute)}
        onLogout={() => void handleLogout()}
      />

      <AdBannerSlot position="top-header" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {dataErrorBanner && (
          <div className="mb-4 space-y-2">
            <ErrorAlert messages={[dataErrorBanner]} />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setDataErrorBanner(null)}
                className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
              >
                오류 안내 닫기
              </button>
            </div>
          </div>
        )}
        {isPolicyRoute(route) && (
          <PolicyPages
            page={route}
            onNavigate={(r) => navigateTo(r)}
            onBack={() =>
              navigateTo(currentUser.isGuest ? 'measure' : 'dashboard')
            }
          />
        )}

        {route === 'dashboard' && !currentUser.isGuest && (
          <DashboardPage
            user={currentUser}
            measurements={measurements}
            statusBanner={statusBanner}
            onDismissBanner={() => setStatusBanner(null)}
            onNavigate={(r) => navigateTo(r)}
            onStartMeasureForExercise={handleStartMeasureForExercise}
            onOpenReport={handleOpenReport}
          />
        )}

        {route === 'measure' && (
          <div className="space-y-4">
            {currentUser.isGuest && statusBanner && (
              <div className="border border-blue-200 bg-blue-50 text-blue-950 rounded-md px-4 py-3 flex items-center justify-between gap-4 text-sm">
                <span>{statusBanner}</span>
                <button
                  type="button"
                  onClick={() => setStatusBanner(null)}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer shrink-0"
                >
                  닫기
                </button>
              </div>
            )}
            <MeasurePage
              user={currentUser}
              initialExercise={measureInitialExercise}
              onAnalysisComplete={handleAnalysisComplete}
              onCancel={() =>
                navigateTo(currentUser.isGuest ? 'measure' : 'dashboard')
              }
            />
          </div>
        )}

        {route === 'result' && draftResult && (
          <ResultPage
            result={draftResult}
            isGuest={currentUser.isGuest === true}
            isSaved={isDraftSaved}
            onSaveResult={() => void handleSaveDraftResult()}
            onReanalyze={() => navigateTo('measure')}
            onViewReport={() => void handleViewReportFromResult()}
            onRequireLogin={() => void handleLogout()}
          />
        )}

        {route === 'history' && !currentUser.isGuest && (
          <HistoryPage
            user={currentUser}
            measurements={measurements}
            onOpenReport={handleOpenReport}
            onDeleteRecord={(recordId) =>
              setConfirmModal({ type: 'delete_one', recordId })
            }
            onStartMeasure={() => navigateTo('measure')}
          />
        )}

        {route === 'report' && (
          <ReportPage
            user={currentUser}
            measurements={measurements}
            selectedRecord={selectedReportRecord}
            onSelectRecord={(id) => setSelectedReportId(id)}
            onBackToHistory={() =>
              navigateTo(currentUser.isGuest ? 'measure' : 'history')
            }
            onStartMeasure={() => navigateTo('measure')}
            onRequireLogin={() => void handleLogout()}
          />
        )}

        {route === 'profile' && !currentUser.isGuest && (
          <ProfilePage
            user={currentUser}
            measurementCount={measurements.length}
            onProfileUpdated={(updated, notice) => {
              currentUserRef.current = updated;
              setCurrentUser(updated);
              setStatusBanner(notice);
            }}
            onLogout={() => void handleLogout()}
            onRequestClearMyRecords={() =>
              setConfirmModal({ type: 'clear_user_records' })
            }
          />
        )}
      </main>

      <AdBannerSlot position="bottom-content" />

      <AppFooter currentRoute={route} onNavigate={(r) => navigateTo(r)} />

      <BirthdayCelebrationModal
        open={birthdayCelebrationName !== null}
        userName={birthdayCelebrationName ?? ''}
        onClose={() => setBirthdayCelebrationName(null)}
      />

      <ConfirmDialog
        open={confirmModal.type !== 'none'}
        title={
          confirmModal.type === 'delete_one'
            ? '측정 기록 삭제'
            : '현재 계정 측정 기록 전체 삭제'
        }
        description={
          confirmModal.type === 'delete_one'
            ? '선택한 측정 기록을 클라우드 저장소에서 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.'
            : '현재 로그인한 계정의 모든 측정 기록을 삭제하시겠습니까? 계정 정보는 유지됩니다.'
        }
        confirmLabel="삭제하기"
        destructive
        onConfirm={() => void handleConfirmAction()}
        onCancel={() => setConfirmModal({ type: 'none' })}
      />
    </div>
  );
}
