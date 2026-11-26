/**
 * [파일 목적] 화면 C(종목 선택) + 측정·활용 가이드 + 화면 D(15초 영상 자동 기준 길이 맞추기) + 화면 E(계산 단계)
 * [책임]
 *   1) 영상 업로드(15초 이하 검증) 즉시 별도 버튼 클릭 없이 자동으로 기준 길이 설정 화면으로 전환
 *   2) AI 자세 추정(영상) 또는 내 MCV 직접 입력(출처 선택) 방식 지원
 *   3) 스쿼트 / 데드리프트 2종목 선택, 3중량 입력 검증 및 브라우저 내 계산 진행 표시
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Film,
  Keyboard,
  Plus,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import {
  ErrorAlert,
  VelocitySourceTag,
} from '../components/Notices';
import { VideoCalibrationModal } from '../components/VideoCalibrationModal';
import { getMvtSetting } from '../config/mvt';
import { runFullE1RMAnalysis } from '../services/analysis';
import {
  MAX_VIDEO_DURATION_SEC,
  videoAnalysisService,
} from '../services/videoAnalysis';
import type {
  AnalysisDraftResult,
  ExerciseType,
  LoadVelocityPoint,
  MediaPipeMcvResult,
  UserProfile,
  VelocityOrigin,
  VelocitySource,
  VideoPreviewMeta,
} from '../types/domain';
import {
  DIRECT_MCV_ORIGIN_OPTIONS,
  formatFileSize,
  getExerciseLabelKo,
  getUserGroupLabelKo,
} from '../utils/format';
import {
  MAX_MEASUREMENT_SETS,
  MIN_MEASUREMENT_SETS,
  validateMeasurementPoints,
} from '../utils/validation';

interface MeasurePageProps {
  user: UserProfile;
  initialExercise?: ExerciseType;
  onAnalysisComplete: (result: AnalysisDraftResult) => void;
  onCancel: () => void;
}

interface SetRowInput {
  loadKg: string;
  mcvMs: string;
}

type EstimationMethod = 'video_ai' | 'direct_mcv';

/**
 * [컴포넌트] 추정 방식 선택, 종목 선택, 측정·활용 가이드, 15초 영상 자동 캘리브레이션(총 중량 포함) 및 MCV 오차 보정 입력 페이지
 */
export const MeasurePage: React.FC<MeasurePageProps> = ({
  user,
  initialExercise = 'squat',
  onAnalysisComplete,
  onCancel,
}) => {
  // 사용자가 측정 분석 탭에 들어오면 먼저 두 가지 추정 방식 중 하나를 선택하도록 관리
  const [estimationMethod, setEstimationMethod] =
    useState<EstimationMethod | null>(null);
  const [exercise, setExercise] = useState<ExerciseType>(initialExercise);
  const [velocitySource, setVelocitySource] = useState<VelocitySource>('manual');
  const [velocityOrigin, setVelocityOrigin] =
    useState<VelocityOrigin>('gymaware_powertool');
  const [guideOpen, setGuideOpen] = useState(true);

  const [rows, setRows] = useState<SetRowInput[]>([
    { loadKg: '', mcvMs: '' },
    { loadKg: '', mcvMs: '' },
    { loadKg: '', mcvMs: '' },
  ]);

  // 동영상 메타데이터 및 로컬 미리보기 상태 (3개 슬롯, 각 15초 이하 제한)
  const [videos, setVideos] = useState<Array<VideoPreviewMeta | null>>([
    null,
    null,
    null,
  ]);
  const videosRef = useRef(videos);
  videosRef.current = videos;

  // 캘리브레이션 & MediaPipe 모달 대상 슬롯 인덱스
  const [calibrationSlot, setCalibrationSlot] = useState<number | null>(null);

  // 검증 오류 및 계산 단계 상태 (화면 E 역할)
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const calcTimerRef = useRef<number | null>(null);

  // 컴포넌트 언마운트 시 Object URL 및 계산 타이머 정리
  useEffect(() => {
    return () => {
      if (calcTimerRef.current !== null) {
        window.clearInterval(calcTimerRef.current);
        calcTimerRef.current = null;
      }
      videosRef.current.forEach((v) =>
        videoAnalysisService.revokeLocalVideoPreview(v)
      );
    };
  }, []);

  const mvtInfo = getMvtSetting(exercise, user.userGroup);

  /**
   * [기능] e1RM 추정 방식(1. 영상 AI 자세 추정 vs 2. 직접 MCV 입력) 선택/전환 핸들러
   */
  const handleSelectEstimationMethod = (method: EstimationMethod) => {
    const prevMethod = estimationMethod;
    setEstimationMethod(method);
    setErrors([]);
    setFieldErrors({});

    if (method === 'video_ai') {
      setVelocitySource('mediapipe');
      setVelocityOrigin('velomax_raw');
      setRows((prev) =>
        prev.map((row, idx) =>
          videos[idx]?.mediapipeResult ? row : { loadKg: '', mcvMs: '' }
        )
      );
    } else {
      setVelocitySource('manual');
      setVelocityOrigin('gymaware_powertool');
      setRows((prev) => {
        if (prevMethod === 'direct_mcv') {
          return prev;
        }
        return prev.map((_, idx) =>
          videos[idx]?.mediapipeResult ? { loadKg: '', mcvMs: '' } : prev[idx]
        );
      });
    }
  };

  /** '내 MCV를 알고 있어요' 모드에서 MCV 출처 변경 핸들러 */
  const handleOriginChange = (nextOrigin: VelocityOrigin) => {
    setVelocityOrigin(nextOrigin);
  };

  /** 종목 변경 핸들러 */
  const handleSelectExercise = (nextExercise: ExerciseType) => {
    setExercise(nextExercise);
    setErrors([]);
    setFieldErrors({});
  };

  /** 무게 또는 MCV 입력값 변경 핸들러 */
  const handleRowChange = (
    idx: number,
    field: keyof SetRowInput,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
    if (estimationMethod === 'direct_mcv' && velocitySource !== 'manual') {
      setVelocitySource('manual');
    }
  };

  /** + 버튼으로 추가 데이터(또는 영상) 슬롯 생성 (기본 3개 -> 최대 5개) */
  const handleAddSet = () => {
    if (rows.length >= MAX_MEASUREMENT_SETS) return;
    setRows((prev) => [...prev, { loadKg: '', mcvMs: '' }]);
    setVideos((prev) => [...prev, null]);
    setErrors([]);
    setFieldErrors({});
  };

  /** 추가된 4~5번째 세트 슬롯 제거 (기본 3개 세트는 항상 유지) */
  const handleRemoveSet = (idx: number) => {
    if (rows.length <= MIN_MEASUREMENT_SETS || idx < MIN_MEASUREMENT_SETS) return;
    setVideos((prev) => {
      videoAnalysisService.revokeLocalVideoPreview(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setCalibrationSlot((prev) => {
      if (prev === null) return null;
      if (prev === idx) return null;
      return prev > idx ? prev - 1 : prev;
    });
    setErrors([]);
    setFieldErrors({});
  };

  /**
   * 동영상 파일 선택 시:
   *   1) 15초 이하 길이 및 해상도 검증
   *   2) 미리보기 메타데이터 저장
   *   3) 사용자가 별도 버튼을 누르지 않아도 즉시 캘리브레이션 화면(총 중량 입력 포함)으로 진입
   */
  const handleVideoUpload = async (idx: number, file: File | undefined) => {
    if (!file) return;
    setErrors([]);
    try {
      const meta = await videoAnalysisService.createValidatedVideoPreview(
        idx,
        file
      );
      setVideos((prev) => {
        const next = [...prev];
        videoAnalysisService.revokeLocalVideoPreview(next[idx]);
        next[idx] = meta;
        return next;
      });
      setCalibrationSlot(idx);
    } catch (err) {
      setErrors([
        err instanceof Error
          ? err.message
          : '동영상 파일을 불러오는 중 오류가 발생했습니다.',
      ]);
    }
  };

  /** 선택한 동영상 슬롯 비우기 */
  const handleRemoveVideo = (idx: number) => {
    setVideos((prev) => {
      const next = [...prev];
      videoAnalysisService.revokeLocalVideoPreview(next[idx]);
      next[idx] = null;
      return next;
    });
    if (estimationMethod === 'video_ai') {
      setRows((prev) =>
        prev.map((row, i) =>
          i === idx ? { ...row, mcvMs: '' } : row
        )
      );
    }
  };

  /** AI 자세 추정 모달에서 입력한 총 무게(kg)와 계산된 MCV를 반영 */
  const handleApplyMediaPipeMcv = (
    slotIndex: number,
    mpResult: MediaPipeMcvResult,
    loadKg: string
  ) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === slotIndex
          ? { loadKg, mcvMs: mpResult.mcvMs.toFixed(4) }
          : row
      )
    );
    setVideos((prev) =>
      prev.map((v, i) =>
        i === slotIndex && v ? { ...v, mediapipeResult: mpResult } : v
      )
    );
    setVelocitySource('mediapipe');
    setVelocityOrigin('velomax_raw');
    setErrors([]);
    setFieldErrors({});
  };

  const isVideoMode = estimationMethod === 'video_ai';

  const analysisSteps = [
    `1단계: 입력한 ${rows.length}개 무게와 MCV 수치 확인`,
    isVideoMode
      ? '2단계: AI 자세 추정 기반 영상 MCV 정리'
      : '2단계: 입력한 MCV 수치 확정',
    '3단계: 무게–속도 직선 분석',
    '4단계: 기준 MVT 적용 및 최대근력(e1RM) 예측',
    '5단계: 운동 목적별 권장 무게 계산 완료',
  ];

  /** 분석 실행 (검증 -> 실제 수학 계산 -> 단계별 진행 표시 -> 결과 화면 이동) */
  const handleRunAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setFieldErrors({});

    const parsedPoints: LoadVelocityPoint[] = rows.map((r) => ({
      loadKg: r.loadKg.trim() === '' ? NaN : Number(r.loadKg),
      mcvMs: r.mcvMs.trim() === '' ? NaN : Number(r.mcvMs),
    }));

    const validation = validateMeasurementPoints(parsedPoints);
    if (!validation.valid) {
      setErrors(validation.errors);
      setFieldErrors(validation.fieldErrors);
      return;
    }

    const isVideoAiMode = estimationMethod === 'video_ai';
    const effectiveSource: VelocitySource = isVideoAiMode
      ? 'mediapipe'
      : velocitySource;
    const effectiveOrigin: VelocityOrigin = isVideoAiMode
      ? 'velomax_raw'
      : velocityOrigin;

    let computedResult: AnalysisDraftResult;
    try {
      computedResult = runFullE1RMAnalysis({
        userId: user.id,
        exercise,
        userGroup: user.userGroup,
        velocitySource: effectiveSource,
        velocityOrigin: effectiveOrigin,
        points: parsedPoints,
        attachedVideoNames: videos
          .filter((v): v is VideoPreviewMeta => v !== null)
          .map((v) => v.fileName),
      });
    } catch (err) {
      setErrors([
        err instanceof Error
          ? err.message
          : '무게–속도 직선 분석 및 e1RM 계산 중 오류가 발생했습니다.',
      ]);
      return;
    }

    if (calcTimerRef.current !== null) {
      window.clearInterval(calcTimerRef.current);
      calcTimerRef.current = null;
    }

    setIsCalculating(true);
    setActiveStepIdx(0);

    let step = 0;
    calcTimerRef.current = window.setInterval(() => {
      step += 1;
      if (step < analysisSteps.length) {
        setActiveStepIdx(step);
      } else {
        if (calcTimerRef.current !== null) {
          window.clearInterval(calcTimerRef.current);
          calcTimerRef.current = null;
        }
        onAnalysisComplete(computedResult);
      }
    }, 180);
  };

  // 화면 E: 계산 단계 진행 중 화면
  if (isCalculating) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-8 space-y-6">
          <div className="space-y-1.5">
            <p className="font-mono text-xs text-blue-700 font-semibold">
              VELOMAX 분석 중
            </p>
            <h1 className="text-xl font-bold text-slate-900">
              무게–속도 분석 및 최대근력(e1RM) 예측 중
            </h1>
            <p className="text-sm text-slate-600">
              입력하신 {rows.length}개 무게와 MCV 수치를 바탕으로 기기 안에서 직접 계산하고 있습니다.
            </p>
          </div>

          <div className="space-y-3">
            {analysisSteps.map((label, idx) => {
              const completed = idx <= activeStepIdx;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md border text-sm ${
                    completed
                      ? 'border-blue-200 bg-blue-50/60 text-slate-900 font-medium'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      completed ? 'text-blue-700' : 'text-slate-300'
                    }`}
                  />
                  <span>{label}</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
            안내: 모든 계산은 외부 서버 전송 없이 브라우저 안에서 안전하게 처리됩니다.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleRunAnalysis} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            {!user.isGuest && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> 대시보드로 돌아가기
              </button>
            )}
            <h1 className="font-display text-2xl font-bold text-slate-900">
              새로운 e1RM 측정 분석
            </h1>
          </div>
          <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-md px-3.5 py-2">
            적용 분류: <strong>{getUserGroupLabelKo(user.userGroup)}</strong> · 기준 MVT{' '}
            <span className="font-mono font-semibold tabular-nums">
              {mvtInfo.valueMs.toFixed(2)} m/s
            </span>
          </div>
        </div>

        {/* 측정 및 활용 가이드 패널 */}
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setGuideOpen((prev) => !prev)}
            className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-blue-700 shrink-0" />
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  측정 및 이용 가이드 (15초 이하 영상 · 최초 2회만 반영 · 기준 길이 맞추기)
                </h2>
                <p className="text-xs text-slate-500">
                  측정 방식을 먼저 고르시면, 영상 분석 시 업로드 즉시 기준 길이 설정 화면이 열립니다.
                </p>
              </div>
            </div>
            {guideOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
            )}
          </button>

          {guideOpen && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs leading-relaxed">
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-1.5">
                <p className="font-mono text-[11px] font-bold text-blue-700">
                  STEP 01 · 영상 촬영 조건
                </p>
                <p className="font-semibold text-slate-900">
                  15초 이하 · 최초 2회까지만 반영
                </p>
                <p className="text-slate-600">
                  영상 길이는 <strong>최대 {MAX_VIDEO_DURATION_SEC}초 이하</strong>로 올려 주세요. <strong>2회 이상 반복한 영상은 3회차부터 피로로 인해 속도가 느려질 수 있어 최초 2회까지만</strong> MCV 계산에 사용합니다.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-1.5">
                <p className="font-mono text-[11px] font-bold text-blue-700">
                  STEP 02 · 무게 구성 &amp; 동작
                </p>
                <p className="font-semibold text-slate-900">
                  서로 다른 3~5개 무게 + 힘차게 들기
                </p>
                <p className="text-slate-600">
                  기본 3개(<strong>+ 버튼으로 최대 5개</strong>)의 서로 다른 무게를 정하고 <strong>최대한 빠르게</strong> 들어 올릴수록 직선 상관관계(R²)와 예측 정확도가 높아집니다.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-1.5">
                <p className="font-mono text-[11px] font-bold text-blue-700">
                  STEP 03 · 업로드 즉시 길이 맞추기
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  총 무게 입력 + 두 점 클릭 → AI 자세 추정
                </p>
                <p className="text-slate-600">
                  영상을 올리면 <strong>바로 기준 길이 설정 창</strong>이 열립니다. 창 안에서 <strong>총 무게(kg)</strong>와 원판(예: 45cm) 양 끝 두 점을 클릭해 AI 자세 추정을 실행하세요.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-1.5">
                <p className="font-mono text-[11px] font-bold text-blue-700">
                  STEP 04 · 방식별 MCV 계산 규칙
                </p>
                <p className="font-semibold text-slate-900">
                  영상 AI 추적 또는 측정값 직접 입력
                </p>
                <p className="text-slate-600">
                  <strong>영상 분석</strong>은 AI 자세 추정으로 추적한 손목 구심성 속도를 바로 MCV로 반영하며, <strong>내 MCV 직접 입력</strong>은 장비에서 측정한 값을 그대로 사용합니다.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* STEP 0: e1RM 추정 방식 선택 (측정 분석 탭 진입 시 가장 먼저 선택) */}
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                어떤 방식으로 e1RM을 예측할까요?
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                운동 영상으로 AI 자세 추정을 실행하거나, 이미 알고 있는 MCV 수치를 직접 입력해 계산할 수 있습니다.
              </p>
            </div>
            {estimationMethod && (
              <span className="font-mono text-xs text-blue-700 font-semibold">
                선택됨:{' '}
                {estimationMethod === 'video_ai'
                  ? '1. 영상으로 MCV 구하기 (AI 자세 추정)'
                  : '2. 내 MCV 직접 입력'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleSelectEstimationMethod('video_ai')}
              className={`p-5 rounded-md border text-left transition-colors cursor-pointer space-y-2 ${
                estimationMethod === 'video_ai'
                  ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-base font-bold text-slate-900">
                  <Video className="w-4 h-4 text-blue-700" />
                  1. 영상으로 MCV를 알고싶어요.
                </span>
                <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  AI 자세 추정
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                영상을 올리고 기준 길이와 무게를 입력하면 AI 자세 추정으로 MCV를 자동 계산해 e1RM을 예측합니다. (2회 이상 반복 시 최초 2회만 반영)
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectEstimationMethod('direct_mcv')}
              className={`p-5 rounded-md border text-left transition-colors cursor-pointer space-y-2 ${
                estimationMethod === 'direct_mcv'
                  ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-base font-bold text-slate-900">
                  <Keyboard className="w-4 h-4 text-cyan-700" />
                  2. 내 MCV를 알고 있어요.
                </span>
                <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  직접 입력
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                영상 업로드 없이 기본 3개(최대 5개) 무게(kg)와 MCV(m/s) 및 측정 장비 출처를 입력해 그대로 e1RM을 예측합니다.
              </p>
            </button>
          </div>
        </section>

        {estimationMethod !== null && (
          <>
            {/* 화면 C: 운동 종목 선택 */}
            <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  1. 운동 종목 선택
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  현재 버전에서는 스쿼트와 데드리프트 두 가지 종목을 지원합니다.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleSelectExercise('squat')}
                  className={`p-5 rounded-md border text-left transition-colors cursor-pointer space-y-1.5 ${
                    exercise === 'squat'
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900">
                      스쿼트 (Squat)
                    </span>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      기준 MVT{' '}
                      {getMvtSetting('squat', user.userGroup).valueMs.toFixed(
                        2
                      )}{' '}
                      m/s
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    앉았다가 일어서는 동작에서 가장 낮은 지점부터 완전히 일어서기까지의 평균 속도(MCV)를 분석합니다.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectExercise('deadlift')}
                  className={`p-5 rounded-md border text-left transition-colors cursor-pointer space-y-1.5 ${
                    exercise === 'deadlift'
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900">
                      데드리프트 (Deadlift)
                    </span>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      기준 MVT{' '}
                      {getMvtSetting(
                        'deadlift',
                        user.userGroup
                      ).valueMs.toFixed(2)}{' '}
                      m/s
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    바닥에서 바벨을 들어 올려 몸을 완전히 펼 때까지 들어 올리는 구간의 평균 속도(MCV)를 분석합니다.
                  </p>
                </button>
              </div>
            </section>

            {/* 화면 D: 선택된 추정 방식에 맞춘 3~5개 세트 데이터 입력 */}
            <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {estimationMethod === 'video_ai'
                        ? `2. 영상 올리기 및 AI 자세 추정 (${getExerciseLabelKo(exercise)})`
                        : `2. 무게와 MCV 직접 입력 (${getExerciseLabelKo(exercise)})`}
                    </h2>
                    <VelocitySourceTag source={velocitySource} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {estimationMethod === 'video_ai'
                      ? '기본 3개 세트(최대 5개)의 15초 이하 영상을 올리면 바로 총 무게 입력과 기준 길이 맞추기 창이 열립니다. 데이터가 많을수록 직선 상관관계가 높아집니다.'
                      : '기본 3개의 서로 다른 무게(kg)와 MCV(m/s)를 입력해야 계산할 수 있으며, + 버튼으로 최대 5개까지 추가할수록 상관관계가 높아집니다.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 tabular-nums">
                    입력 세트: {rows.length} / {MAX_MEASUREMENT_SETS}개
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSet}
                    disabled={rows.length >= MAX_MEASUREMENT_SETS}
                    className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:bg-slate-100 disabled:text-slate-400 border border-blue-200 disabled:border-slate-200 rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {rows.length >= MAX_MEASUREMENT_SETS
                      ? '최대 5개 도달'
                      : `세트 추가 (${rows.length}/${MAX_MEASUREMENT_SETS})`}
                  </button>
                </div>
              </div>

              <ErrorAlert messages={errors} />

              {/* 3~5개 세트 입력 카드 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {rows.map((row, idx) => {
                  const videoMeta = videos[idx];
                  const loadErr = fieldErrors[`load_${idx}`];
                  const mcvErr = fieldErrors[`mcv_${idx}`];
                  const parsedRawMcv = Number(row.mcvMs);
                  const videoPreviewMcv =
                    estimationMethod === 'video_ai' &&
                    row.mcvMs.trim() !== '' &&
                    Number.isFinite(parsedRawMcv)
                      ? parsedRawMcv.toFixed(2)
                      : '';
                  const setSubLabel =
                    idx === 0
                      ? '가벼운 무게'
                      : idx === 1
                      ? '중간 무게'
                      : idx === 2
                      ? '무거운 무게'
                      : '추가 데이터 · 정밀도 향상';

                  return (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-md p-4 space-y-4 bg-slate-50/40"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          세트 {idx + 1}{' '}
                          <span className="text-xs font-semibold text-slate-600">
                            ({setSubLabel})
                          </span>
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {idx >= MIN_MEASUREMENT_SETS && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSet(idx)}
                              className="text-[11px] font-medium text-rose-600 hover:text-rose-800 inline-flex items-center gap-0.5 cursor-pointer"
                              title="추가된 세트 삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                              삭제
                            </button>
                          )}
                          <span className="font-mono text-xs text-slate-500">
                            {idx + 1} / {rows.length}
                          </span>
                        </div>
                      </div>

                      {/* 방식 1: 영상 AI 자세 추정 모드에서는 영상 업로드를 가장 먼저 배치 */}
                      {estimationMethod === 'video_ai' && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                              <Film className="w-3.5 h-3.5 text-blue-700" />
                              세트 영상 올리기 (최대 15초)
                            </span>
                            {videoMeta && (
                              <button
                                type="button"
                                onClick={() => handleRemoveVideo(idx)}
                                className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" /> 제거
                              </button>
                            )}
                          </div>

                          {videoMeta ? (
                            <div className="space-y-2">
                              <video
                                src={videoMeta.objectUrl}
                                controls
                                muted
                                playsInline
                                className="w-full h-32 object-cover rounded border border-slate-300 bg-slate-900"
                              />
                              <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono tabular-nums">
                                <span className="truncate max-w-[160px]">
                                  {videoMeta.fileName}
                                </span>
                                <span>
                                  {videoMeta.durationSec.toFixed(1)}s ·{' '}
                                  {formatFileSize(videoMeta.fileSizeBytes)}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setCalibrationSlot(idx)}
                                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                                {videoMeta.mediapipeResult
                                  ? `무게·길이 다시 맞추기 (${videoMeta.mediapipeResult.mcvMs.toFixed(
                                      2
                                    )} m/s)`
                                  : '무게 입력 · 기준 길이 맞추기'}
                              </button>

                              {videoMeta.mediapipeResult && (
                                <div className="text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5 font-mono tabular-nums space-y-0.5">
                                  <div>
                                    총 {videoMeta.mediapipeResult.totalRepsDetected}회 중{' '}
                                    <strong>
                                      최초 {videoMeta.mediapipeResult.usedRepsCount}회
                                    </strong>{' '}
                                    반영
                                    {videoMeta.mediapipeResult.totalRepsDetected > 2
                                      ? ' (3회~ 피로 제외)'
                                      : ''}
                                  </div>
                                  <div>
                                    들어 올린 구간{' '}
                                    {videoMeta.mediapipeResult.concentricStartSec.toFixed(2)}s~
                                    {videoMeta.mediapipeResult.concentricEndSec.toFixed(2)}s · 이동 거리{' '}
                                    {(
                                      videoMeta.mediapipeResult
                                        .verticalDisplacementMeters * 100
                                    ).toFixed(1)}
                                    cm
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center h-28 border border-dashed border-blue-300 rounded-md bg-white hover:bg-blue-50/40 cursor-pointer transition-colors px-3 text-center">
                              <Upload className="w-4 h-4 text-blue-600 mb-1" />
                              <span className="text-xs text-slate-800 font-semibold">
                                영상 선택 (15초 이하)
                              </span>
                              <span className="text-[11px] text-slate-500 mt-0.5">
                                선택 즉시 무게 입력 · 기준 길이 맞추기 창이 열립니다
                              </span>
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={(e) => {
                                  const selected = e.target.files?.[0];
                                  e.target.value = '';
                                  void handleVideoUpload(idx, selected);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      )}

                      {/* 무게(kg) 입력 */}
                      <div>
                        <label
                          htmlFor={`load-${idx}`}
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          바벨 포함 총 무게 (kg) *
                        </label>
                        <input
                          id={`load-${idx}`}
                          type="number"
                          step="0.5"
                          min="1"
                          max="600"
                          value={row.loadKg}
                          onChange={(e) =>
                            handleRowChange(idx, 'loadKg', e.target.value)
                          }
                          placeholder={
                            estimationMethod === 'video_ai'
                              ? '길이 설정 창에서 입력'
                              : '예: 60'
                          }
                          className={`w-full px-3 py-2 text-sm bg-white border rounded-md font-mono tabular-nums focus:outline-none ${
                            loadErr
                              ? 'border-rose-500 focus:border-rose-600'
                              : 'border-slate-300 focus:border-blue-600'
                          }`}
                          required
                        />
                        {loadErr && (
                          <p className="mt-1 text-xs text-rose-700">{loadErr}</p>
                        )}
                      </div>

                      {/* 대표 MCV(m/s) 표시 또는 입력 */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label
                            htmlFor={`mcv-${idx}`}
                            className="block text-xs font-semibold text-slate-700"
                          >
                            {estimationMethod === 'video_ai'
                              ? 'AI 측정 MCV (m/s) *'
                              : '평균 속도 MCV (m/s) *'}
                          </label>
                          <span className="text-[11px] text-slate-500">
                            {videoMeta?.mediapipeResult
                              ? 'AI 자세 추정 완료'
                              : estimationMethod === 'video_ai'
                              ? '영상 분석 대기'
                              : '직접 입력'}
                          </span>
                        </div>
                        <input
                          id={`mcv-${idx}`}
                          type="number"
                          step="0.01"
                          min="0.05"
                          max="3.00"
                          value={
                            estimationMethod === 'video_ai'
                              ? videoPreviewMcv
                              : row.mcvMs
                          }
                          readOnly={estimationMethod === 'video_ai'}
                          onChange={(e) =>
                            handleRowChange(idx, 'mcvMs', e.target.value)
                          }
                          placeholder={
                            estimationMethod === 'video_ai'
                              ? 'AI 자세 추정 후 자동 입력'
                              : '예: 0.70'
                          }
                          className={`w-full px-3 py-2 text-sm border rounded-md font-mono tabular-nums focus:outline-none ${
                            estimationMethod === 'video_ai'
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-white'
                          } ${
                            mcvErr
                              ? 'border-rose-500 focus:border-rose-600'
                              : 'border-slate-300 focus:border-blue-600'
                          }`}
                          required
                        />
                        {mcvErr && (
                          <p className="mt-1 text-xs text-rose-700">{mcvErr}</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {rows.length < MAX_MEASUREMENT_SETS && (
                  <button
                    type="button"
                    onClick={handleAddSet}
                    className="min-h-[220px] border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-md bg-blue-50/30 hover:bg-blue-50/70 p-5 flex flex-col items-center justify-center gap-2.5 text-center transition-colors cursor-pointer"
                  >
                    <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Plus className="w-5 h-5" />
                    </span>
                    <span className="text-sm font-bold text-blue-900">
                      + 세트 {rows.length + 1} 추가하기
                    </span>
                    <span className="text-xs text-slate-600 leading-relaxed max-w-[220px]">
                      {estimationMethod === 'video_ai'
                        ? '추가 무게 영상을 올려 최대 5개까지 분석할수록 직선 상관관계가 높아집니다.'
                        : '서로 다른 무게와 MCV를 최대 5개까지 추가할수록 직선 상관관계가 높아집니다.'}
                    </span>
                  </button>
                )}
              </div>

              {/* 3. 선택된 측정 방식에 따른 MCV 측정 기준 / 출처 안내 */}
              {estimationMethod === 'video_ai' ? (
                <div className="border border-blue-200 rounded-md p-4 sm:p-5 bg-blue-50/50 space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-900">
                    3. 영상 AI 자세 추정 MCV 계산 안내
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    영상 속 기준 물체 길이를 바탕으로 AI 자세 추정이 손목 상승 속도를 계산해 MCV로 반영합니다. 다회 반복 영상은 근피로 영향을 줄이기 위해 최초 2회 평균만 사용합니다.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-md p-4 sm:p-5 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      3. MCV 측정 출처 선택
                    </h3>
                    <p className="text-xs text-slate-600">
                      사용하신 속도 측정 장비 또는 출처를 선택한 뒤 입력하신 수치로 최대근력(e1RM)을 계산합니다.
                    </p>
                  </div>

                  <div className="shrink-0 min-w-[220px]">
                    <label
                      htmlFor="velocity-origin-select"
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      MCV 출처
                    </label>
                    <select
                      id="velocity-origin-select"
                      value={velocityOrigin}
                      onChange={(e) =>
                        handleOriginChange(e.target.value as VelocityOrigin)
                      }
                      className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                    >
                      {DIRECT_MCV_ORIGIN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 분석 실행 CTA */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-xs text-slate-500">
                  {estimationMethod === 'video_ai'
                    ? '영상 AI 자세 추정으로 계산된 MCV가 결과 화면과 보고서에 반영됩니다.'
                    : '입력하신 MCV 수치를 그대로 사용하여 계산합니다.'}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (user.isGuest) {
                        setEstimationMethod(null);
                      } else {
                        onCancel();
                      }
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
                  >
                    {user.isGuest ? '방식 다시 선택' : '취소'}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Calculator className="w-4 h-4" />
                    최대근력(e1RM) 예측하기
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </form>

      {/* 기준점 캘리브레이션 + 총 중량 입력 + MediaPipe 손 추적 모달 */}
      <VideoCalibrationModal
        open={calibrationSlot !== null}
        slotIndex={calibrationSlot ?? 0}
        exercise={exercise}
        initialLoadKg={
          calibrationSlot !== null ? rows[calibrationSlot]?.loadKg ?? '' : ''
        }
        videoMeta={calibrationSlot !== null ? videos[calibrationSlot] : null}
        onApplyMcv={handleApplyMediaPipeMcv}
        onClose={() => setCalibrationSlot(null)}
      />
    </>
  );
};
