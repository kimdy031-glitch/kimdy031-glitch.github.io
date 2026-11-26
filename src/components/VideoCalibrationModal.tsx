/**
 * [파일 목적] 영상 2점 기준점 캘리브레이션 및 MediaPipe 손목 위치 추적 MCV 분석 모달 컴포넌트
 * [책임]
 *   1) 사용자가 업로드한 <=15초 영상의 프레임을 탐색(스크러버)하여 기준 물체가 잘 보이는 장면을 선택
 *   2) 캔버스 위에서 기준 물체(예: 45cm 표준 올림픽 원판) 양 끝 두 점(A, B)을 클릭해 픽셀-미터 축척 확정
 *   3) MediaPipe PoseLandmarker로 전체 프레임을 추적하며 손목 이동 궤적·관절점 오버레이 표시
 *   4) 검출된 1회 구심성 구간(시간, 이동 거리) 및 계산된 MCV(m/s)를 시각 그래프와 함께 확인 후 세트에 적용
 */

import React, { useEffect, useRef, useState } from 'react';
import { Check, Crosshair, Play, RotateCcw, X } from 'lucide-react';
import {
  analyzeVideoWithMediaPipe,
  computeCalibrationFromPoints,
} from '../services/mediapipeMcv';
import type {
  CalibrationData,
  CalibrationPoint,
  ExerciseType,
  MediaPipeMcvResult,
  VideoPreviewMeta,
} from '../types/domain';
import { ErrorAlert } from './Notices';

interface VideoCalibrationModalProps {
  open: boolean;
  slotIndex: number;
  exercise: ExerciseType;
  initialLoadKg: string;
  videoMeta: VideoPreviewMeta | null;
  onApplyMcv: (
    slotIndex: number,
    result: MediaPipeMcvResult,
    loadKg: string
  ) => void;
  onClose: () => void;
}

/**
 * [컴포넌트] 영상 캘리브레이션 + 총 중량 입력 + MediaPipe 손 추적 MCV 계산 모달
 */
export const VideoCalibrationModal: React.FC<VideoCalibrationModalProps> = ({
  open,
  slotIndex,
  exercise,
  initialLoadKg,
  videoMeta,
  onApplyMcv,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);

  // 세트 총 중량 및 캘리브레이션 상태
  const [loadKgInput, setLoadKgInput] = useState<string>(initialLoadKg);
  const [scrubTime, setScrubTime] = useState(0);
  const [referenceLengthCm, setReferenceLengthCm] = useState<string>('45');
  const [pointA, setPointA] = useState<CalibrationPoint | null>(null);
  const [pointB, setPointB] = useState<CalibrationPoint | null>(null);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);

  // MediaPipe 추적 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [mpResult, setMpResult] = useState<MediaPipeMcvResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // 모달 열릴 때 상태 초기화 (기본 프레임 위치: 1프레임 0.00s)
  useEffect(() => {
    if (!open || !videoMeta) return;
    setLoadKgInput(initialLoadKg);
    setScrubTime(0);
    setPointA(null);
    setPointB(null);
    setCalibration(null);
    setMpResult(videoMeta.mediapipeResult ?? null);
    setErrors([]);
    setIsAnalyzing(false);
    setProgressPercent(0);
    setProgressMsg('');

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = videoMeta.width;
      canvas.height = videoMeta.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [open, videoMeta, initialLoadKg]);

  // 현재 프레임 + 캘리브레이션 점/선을 캔버스에 그리기
  const redrawCurrentFrameWithCalibration = () => {
    const canvas = canvasRef.current;
    const video = hiddenVideoRef.current;
    if (!canvas || !video || !videoMeta || isAnalyzing) return;
    if (video.readyState < 2) return;

    if (canvas.width !== videoMeta.width || canvas.height !== videoMeta.height) {
      canvas.width = videoMeta.width;
      canvas.height = videoMeta.height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, videoMeta.width, videoMeta.height);

    const r = Math.max(7, Math.min(videoMeta.width, videoMeta.height) / 70);
    const drawMarker = (pt: CalibrationPoint, label: string) => {
      const x = pt.xNorm * videoMeta.width;
      const y = pt.yNorm * videoMeta.height;

      // 외곽 원
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = Math.max(2, videoMeta.width / 420);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 정밀 십자선(+)으로 실제 클릭 좌표를 정확하게 표시
      const cross = r * 1.4;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1.5, videoMeta.width / 520);
      ctx.beginPath();
      ctx.moveTo(x - cross, y);
      ctx.lineTo(x + cross, y);
      ctx.moveTo(x, y - cross);
      ctx.lineTo(x, y + cross);
      ctx.stroke();

      // 점 라벨 (A / B)
      const fontSize = Math.max(14, Math.round(videoMeta.width / 45));
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = '#06B6D4';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 3;
      ctx.strokeText(label, x + r + 4, y - r);
      ctx.fillText(label, x + r + 4, y - r);
    };

    if (pointA && pointB) {
      const ax = pointA.xNorm * videoMeta.width;
      const ay = pointA.yNorm * videoMeta.height;
      const bx = pointB.xNorm * videoMeta.width;
      const by = pointB.yNorm * videoMeta.height;

      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = Math.max(2.5, videoMeta.width / 360);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    if (pointA) drawMarker(pointA, 'A');
    if (pointB) drawMarker(pointB, 'B');
  };

  // 이벤트 리스너가 항상 최신 그리기 함수를 참조하도록 ref 동기화
  const drawFrameRef = useRef(redrawCurrentFrameWithCalibration);
  drawFrameRef.current = redrawCurrentFrameWithCalibration;

  // 비디오 1프레임 디코딩 완료 및 프레임 탐색 시 즉시 캔버스에 그리기
  useEffect(() => {
    if (!open || !videoMeta) return;
    const video = hiddenVideoRef.current;
    if (!video) return;

    let microSeekTriggered = false;
    const drawNow = () => {
      drawFrameRef.current();
    };
    const handleLoadedMetadata = () => {
      // 일부 브라우저에서 0초가 즉시 디코딩되지 않을 때 1프레임(0.001s) 탐색으로 첫 프레임 디코딩 보장
      if (!microSeekTriggered && video.currentTime === 0) {
        microSeekTriggered = true;
        try {
          video.currentTime = Math.min(0.001, Math.max(0, videoMeta.durationSec - 0.01));
        } catch {
          // ignore
        }
      }
      drawNow();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', drawNow);
    video.addEventListener('canplay', drawNow);
    video.addEventListener('seeked', drawNow);

    if (video.readyState >= 2 && !isAnalyzing) {
      drawNow();
    } else {
      video.load();
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', drawNow);
      video.removeEventListener('canplay', drawNow);
      video.removeEventListener('seeked', drawNow);
    };
  }, [open, videoMeta]);

  // 스크러버 위치 변경 시 해당 시점으로 비디오 이동
  useEffect(() => {
    if (!open || !videoMeta || isAnalyzing) return;
    const video = hiddenVideoRef.current;
    if (!video || video.readyState < 1) return;
    if (Math.abs(video.currentTime - scrubTime) > 0.005) {
      video.currentTime = scrubTime;
    } else if (video.readyState >= 2) {
      drawFrameRef.current();
    }
  }, [scrubTime, open, videoMeta, isAnalyzing]);

  // 점 A/B가 찍히거나 초기화되면 비디오 재탐색 없이 즉시 현재 프레임 위에 다시 그리기
  useEffect(() => {
    if (!isAnalyzing) {
      drawFrameRef.current();
    }
  }, [pointA, pointB, open, isAnalyzing]);

  // 두 점이 모두 찍히고 기준 길이가 유효하면 자동으로 캘리브레이션 계산
  useEffect(() => {
    if (!videoMeta || !pointA || !pointB) {
      setCalibration(null);
      return;
    }
    try {
      const cal = computeCalibrationFromPoints({
        pointA,
        pointB,
        videoWidth: videoMeta.width,
        videoHeight: videoMeta.height,
        referenceLengthCm: Number(referenceLengthCm),
      });
      setCalibration(cal);
      setErrors([]);
    } catch (err) {
      setCalibration(null);
      setErrors([err instanceof Error ? err.message : '기준 길이 설정 오류']);
    }
  }, [pointA, pointB, referenceLengthCm, videoMeta]);

  if (!open || !videoMeta) return null;

  /**
   * [기능] 캔버스 클릭 좌표를 실제 렌더링된 영상 비트맵 영역 기준 정규화 좌표(0~1)로 정밀 변환
   * [수정 이유] object-contain이나 max-height 제한으로 레터박스 여백이 생기더라도
   *            여백을 제외한 실제 영상 렌더링 사각형을 계산해 마우스 커서 위치와 정확히 일치시킵니다.
   */
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isAnalyzing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const videoAspect = videoMeta.width / videoMeta.height;
    const boxAspect = rect.width / rect.height;

    let renderW = rect.width;
    let renderH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (boxAspect > videoAspect) {
      // 좌우 여백이 생긴 경우
      renderH = rect.height;
      renderW = renderH * videoAspect;
      offsetX = (rect.width - renderW) / 2;
    } else if (boxAspect < videoAspect) {
      // 상하 여백이 생긴 경우
      renderW = rect.width;
      renderH = renderW / videoAspect;
      offsetY = (rect.height - renderH) / 2;
    }

    const xNorm = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left - offsetX) / renderW)
    );
    const yNorm = Math.max(
      0,
      Math.min(1, (e.clientY - rect.top - offsetY) / renderH)
    );

    if (!pointA || (pointA && pointB)) {
      setPointA({ xNorm, yNorm });
      setPointB(null);
      setMpResult(null);
    } else {
      setPointB({ xNorm, yNorm });
    }
  };

  /** AI 자세 추정으로 움직임 분석 및 MCV 계산 실행 */
  const handleRunMediaPipe = async () => {
    if (!calibration) {
      setErrors(['먼저 영상 위에서 기준 물체(예: 원판) 양 끝 두 점을 클릭해 기준 길이를 맞춰 주세요.']);
      return;
    }
    setErrors([]);
    setIsAnalyzing(true);
    setProgressPercent(0);
    setProgressMsg('분석 준비 중...');

    try {
      const res = await analyzeVideoWithMediaPipe({
        objectUrl: videoMeta.objectUrl,
        durationSec: videoMeta.durationSec,
        videoWidth: videoMeta.width,
        videoHeight: videoMeta.height,
        calibration,
        exercise,
        previewCanvas: canvasRef.current,
        onProgress: (pct, msg) => {
          setProgressPercent(pct);
          setProgressMsg(msg);
        },
      });
      setMpResult(res);
    } catch (err) {
      setErrors([
        err instanceof Error
          ? err.message
          : 'AI 자세 추정 분석 중 오류가 발생했습니다.',
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calibration-modal-title"
    >
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden my-auto">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2
              id="calibration-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900"
            >
              세트 {slotIndex + 1} · 영상 기준 길이 맞추기 및 AI 자세 추정 MCV 계산
            </h2>
            <p className="text-xs text-slate-500">
              {videoMeta.fileName} · {videoMeta.durationSec.toFixed(1)}초 ·{' '}
              {videoMeta.width}×{videoMeta.height}px
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isAnalyzing}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer disabled:opacity-40"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          <ErrorAlert title="기준 길이 설정 및 분석 안내" messages={errors} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 좌측: 캔버스 캘리브레이션 & MediaPipe 실시간 오버레이 */}
            <div className="lg:col-span-7 space-y-3">
              <div className="relative bg-slate-950 rounded-md overflow-hidden border border-slate-300 flex items-center justify-center min-h-[240px]">
                {/* display:none(hidden) 대신 화면 밖 sr-only로 유지해 브라우저가 첫 프레임을 즉시 디코딩하도록 보장 */}
                <video
                  ref={hiddenVideoRef}
                  src={videoMeta.objectUrl}
                  preload="auto"
                  muted
                  playsInline
                  className="sr-only pointer-events-none w-px h-px opacity-0 absolute"
                />
                {/* w-auto h-auto max-w-full max-h-[380px]로 캔버스 자체 박스 비율을 영상 원본 비율과 1:1 일치시킴 */}
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className={`w-auto h-auto max-w-full max-h-[380px] block ${
                    isAnalyzing ? 'cursor-wait' : 'cursor-crosshair'
                  }`}
                />
              </div>

              {/* 프레임 탐색 스크러버 */}
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span className="font-semibold shrink-0">기준 프레임 위치</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0.1, videoMeta.durationSec - 0.05)}
                  step={0.05}
                  value={scrubTime}
                  disabled={isAnalyzing}
                  onChange={(e) => {
                    const nextT = Number(e.target.value);
                    setScrubTime(nextT);
                    if (hiddenVideoRef.current) {
                      hiddenVideoRef.current.currentTime = nextT;
                    }
                  }}
                  className="flex-1 accent-blue-700"
                />
                <span className="font-mono tabular-nums w-14 text-right">
                  {scrubTime.toFixed(2)}s
                </span>
              </div>

              {/* 분석 화면 색상 범례 */}
              <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
                  파란 점: 양쪽 손목
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  초록 점: 어깨·고관절
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-4 h-0.5 bg-amber-500" />
                  노란 선/점: 양쪽 손목 가중 평균 이동 궤적
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-cyan-500" />
                  하늘색 점선: 기준 길이
                </span>
              </div>

              {isAnalyzing && (
                <div className="space-y-1.5 bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                    <span>{progressMsg}</span>
                    <span className="font-mono tabular-nums">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-700 transition-all duration-150"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 우측: 총 중량 입력 · 캘리브레이션 설정 · MediaPipe 결과 */}
            <div className="lg:col-span-5 space-y-4">
              {/* 0단계: 세트 총 중량(kg) 함께 입력 */}
              <div className="border border-slate-200 rounded-md p-4 space-y-2 bg-white">
                <label
                  htmlFor="cal-load-kg"
                  className="block text-sm font-bold text-slate-900"
                >
                  0. 이 세트의 바벨 포함 총 중량 (kg) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="cal-load-kg"
                    type="number"
                    min="1"
                    max="600"
                    step="0.5"
                    value={loadKgInput}
                    disabled={isAnalyzing}
                    onChange={(e) => setLoadKgInput(e.target.value)}
                    placeholder="예: 80"
                    className="w-32 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-mono font-semibold tabular-nums focus:outline-none focus:border-blue-600"
                  />
                  <span className="text-xs font-mono text-slate-600">kg</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  빈 바벨(예: 20kg)과 양쪽 원판 무게를 합산한 총 중량을 입력하세요.
                </p>
              </div>

              {/* 1단계: 기준 물체 길이 및 2점 클릭 안내 */}
              <div className="border border-slate-200 rounded-md p-4 space-y-3 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-cyan-700" />
                    1. 영상 기준 길이 맞추기
                  </h3>
                  {pointA && (
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => {
                        setPointA(null);
                        setPointB(null);
                        setCalibration(null);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> 점 다시 찍기
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  영상 속에서 실제 길이를 아는 기준 물체(예: <strong>올림픽 20kg 원판 지름 45cm</strong>)의 양 끝 두 점을 화면에서 클릭해 주세요.
                </p>

                <div className="space-y-1.5">
                  <label
                    htmlFor="cal-ref-cm"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    기준 물체 실제 길이 (cm)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="cal-ref-cm"
                      type="number"
                      min="1"
                      max="500"
                      step="0.5"
                      value={referenceLengthCm}
                      disabled={isAnalyzing}
                      onChange={(e) => setReferenceLengthCm(e.target.value)}
                      className="w-24 px-2.5 py-1.5 text-sm bg-white border border-slate-300 rounded font-mono tabular-nums"
                    />
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => setReferenceLengthCm('45')}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      원판 45cm
                    </button>
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => setReferenceLengthCm('100')}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      100cm 기준
                    </button>
                  </div>
                </div>

                <div className="text-xs font-mono tabular-nums pt-1 border-t border-slate-200 space-y-0.5">
                  <div>
                    점 A: {pointA ? `(${(pointA.xNorm * 100).toFixed(1)}%, ${(pointA.yNorm * 100).toFixed(1)}%)` : '영상 위 첫 번째 점 클릭'}
                  </div>
                  <div>
                    점 B: {pointB ? `(${(pointB.xNorm * 100).toFixed(1)}%, ${(pointB.yNorm * 100).toFixed(1)}%)` : pointA ? '영상 위 두 번째 점 클릭' : '-'}
                  </div>
                  {calibration && (
                    <div className="text-cyan-800 font-semibold pt-1">
                      기준 길이 설정 완료: {calibration.pixelDistance.toFixed(1)} px ={' '}
                      {calibration.referenceLengthCm} cm
                    </div>
                  )}
                </div>
              </div>

              {/* 2단계: AI 자세 추정 실행 */}
              <button
                type="button"
                disabled={!calibration || isAnalyzing}
                onClick={handleRunMediaPipe}
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                {isAnalyzing
                  ? 'AI 자세 추정으로 움직임 분석 중...'
                  : '2. AI 자세 추정 및 MCV 계산 실행'}
              </button>

              {/* 3단계: 계산 결과 카드 & 적용 버튼 */}
              {mpResult && (
                <div className="border border-emerald-200 bg-emerald-50/60 rounded-md p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-900">
                      측정된 MCV (최초 {mpResult.usedRepsCount}회 평균)
                    </span>
                    <span className="font-mono text-[11px] text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded">
                      총 {mpResult.totalRepsDetected}회 중 최초{' '}
                      {mpResult.usedRepsCount}회 반영
                    </span>
                  </div>

                  <div className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
                    {mpResult.mcvMs.toFixed(2)}{' '}
                    <span className="text-sm font-medium text-slate-500">m/s</span>
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-relaxed">
                    AI 자세 추정으로 추적한 양쪽 손목의 구심성 상승 속도 평균입니다.
                  </p>

                  {mpResult.totalRepsDetected > 2 && (
                    <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 leading-relaxed">
                      <strong>피로 방지 규칙 적용:</strong> 총{' '}
                      {mpResult.totalRepsDetected}회 반복 중 3회차 이후(
                      {mpResult.totalRepsDetected - 2}회)는 근피로로 속도가 느려질 수 있어 제외하고 최초 2회까지만 반영했습니다.
                    </div>
                  )}

                  {/* 반복별 검출 내역 */}
                  {mpResult.reps.length > 0 && (
                    <div className="space-y-1">
                      {mpResult.reps.map((rep) => (
                        <div
                          key={rep.repNumber}
                          className={`flex items-center justify-between text-[11px] font-mono tabular-nums px-2 py-1 rounded border ${
                            rep.usedForRegression
                              ? 'bg-white border-emerald-200 text-slate-800'
                              : 'bg-slate-100 border-slate-200 text-slate-500 line-through'
                          }`}
                        >
                          <span>
                            {rep.repNumber}회차 ({rep.startSec.toFixed(2)}~
                            {rep.endSec.toFixed(2)}s)
                          </span>
                          <span className="font-semibold">
                            {rep.mcvMs.toFixed(2)} m/s ·{' '}
                            {rep.usedForRegression ? '반영' : '피로 제외'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 미니 손목 높이-시간 궤적 SVG */}
                  <TrajectoryMiniChart result={mpResult} />

                  <button
                    type="button"
                    onClick={() => {
                      const parsedLoad = Number(loadKgInput);
                      if (
                        !loadKgInput.trim() ||
                        !Number.isFinite(parsedLoad) ||
                        parsedLoad <= 0 ||
                        parsedLoad > 600
                      ) {
                        setErrors([
                          '상단 0번 항목에 이 세트의 총 무게(1~600 kg)를 올바르게 입력해 주세요.',
                        ]);
                        return;
                      }
                      onApplyMcv(slotIndex, mpResult, String(parsedLoad));
                      onClose();
                    }}
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {loadKgInput.trim() ? `${loadKgInput}kg · ` : ''}MCV{' '}
                    {mpResult.mcvMs.toFixed(2)} m/s 세트 {slotIndex + 1}에 적용
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * [보조 컴포넌트] AI 자세 추적이 기록한 손목 높이-시간 그래프 (반영된 1~2회차 주황색 표시)
 */
const TrajectoryMiniChart: React.FC<{ result: MediaPipeMcvResult }> = ({
  result,
}) => {
  const { samples, reps } = result;
  if (samples.length < 2) return null;

  const w = 320;
  const h = 92;
  const pad = 10;
  const minT = samples[0].timeSec;
  const maxT = samples[samples.length - 1].timeSec;
  const heights = samples.map((s) => s.heightMeters);
  const minH = Math.min(...heights);
  const maxH = Math.max(...heights);

  const toX = (t: number) =>
    pad + ((t - minT) / Math.max(0.01, maxT - minT)) * (w - pad * 2);
  const toY = (hm: number) =>
    h - pad - ((hm - minH) / Math.max(0.01, maxH - minH)) * (h - pad * 2);

  const allPts = samples
    .map((s) => `${toX(s.timeSec)},${toY(s.heightMeters)}`)
    .join(' ');

  const usedReps = reps.filter((r) => r.usedForRegression);

  return (
    <div className="bg-white border border-emerald-200 rounded p-2">
      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
        <span>손목 높이 변화 그래프 (주황색: 반영된 1~2회차)</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
        <polyline fill="none" stroke="#94A3B8" strokeWidth={1.5} points={allPts} />
        {usedReps.map((rep) => {
          const segPts = samples
            .filter((s) => s.timeSec >= rep.startSec && s.timeSec <= rep.endSec)
            .map((s) => `${toX(s.timeSec)},${toY(s.heightMeters)}`)
            .join(' ');
          if (!segPts) return null;
          return (
            <polyline
              key={rep.repNumber}
              fill="none"
              stroke="#D97706"
              strokeWidth={3}
              points={segPts}
            />
          );
        })}
      </svg>
    </div>
  );
};
