/**
 * [파일 목적] 화면 H — A4 용지 비율 결과 보고서, Gemini AI 분석(동 나이대 상위 % 및 5번 해설) 및 무절단 PDF 저장 화면
 * [책임]
 *   - 실제 A4 용지 비율(794×1123px, 2페이지 구성)로 화면에서 바로 확인하고 PDF 저장 시 잘림 없이 페이지별로 출력
 *   - 1페이지: 보고서 헤더 + 1. 대상자·측정 조건·예측 e1RM·동 나이대 비교 + 2. 무게별 MCV 표·무게–속도 그래프
 *   - 2페이지: 3. 추정 근력 변화 추세 + 4. 운동 목적별 추천 무게(+학술 근거) + 5. Gemini 분석 요약 및 변화 해설 + 하단 유의사항
 *   - API 오류 시 가짜 수치로 대체하지 않고, 정확한 원인과 다시 요청 버튼을 표시
 *   - 비회원은 PDF 저장 및 추정 근력 변화 추세 기능 제한 ('해당 기능을 사용하려면 로그인하세요')
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Loader2,
  Lock,
  LogIn,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { HistoryTrendChart, LoadVelocityChart } from '../components/Charts';
import { VelocitySourceTag } from '../components/Notices';
import { REPORT_AI_MODEL } from '../firebase';
import { calculateRecommendedLoads } from '../services/analysis';
import {
  ReportAiStageError,
  reportAiService,
  type ReportAiErrorInfo,
  type ReportAiInterpretation,
} from '../services/reportAi';
import type { MeasurementRecord, UserProfile } from '../types/domain';
import {
  formatBirthDateKo,
  formatDateTimeKo,
  formatKg,
  formatR2,
  formatVelocity,
  getExerciseLabelKo,
  getExperienceLabelKo,
  getGenderLabelKo,
  getParticipationLabelKo,
  getUserGroupLabelKo,
  getVelocityOriginLabelKo,
} from '../utils/format';

interface ReportPageProps {
  user: UserProfile;
  measurements: MeasurementRecord[];
  selectedRecord: MeasurementRecord | null;
  onSelectRecord: (recordId: string) => void;
  onBackToHistory: () => void;
  onStartMeasure: () => void;
  onRequireLogin: () => void;
}

/**
 * [헬퍼] 마크다운 굵은 글씨(**강조**) 문자열을 안전한 React <strong> 노드로 변환
 */
function renderBoldMarkdownText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-bold text-slate-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/** [헬퍼] Data URL PNG 이미지를 로드해 원본 픽셀 크기 반환 */
function loadImageDimensions(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('보고서 이미지 변환에 실패했습니다.'));
    img.src = dataUrl;
  });
}

/**
 * [컴포넌트] VELOMAX A4 맞춤 결과 보고서 및 무절단 PDF 저장 페이지
 */
export const ReportPage: React.FC<ReportPageProps> = ({
  user,
  measurements,
  selectedRecord,
  onSelectRecord,
  onBackToHistory,
  onStartMeasure,
  onRequireLogin,
}) => {
  const isGuest = user.isGuest === true;
  const activeRecord = selectedRecord ?? measurements[0] ?? null;
  const reportRef = useRef<HTMLDivElement | null>(null);

  const [interpretation, setInterpretation] =
    useState<ReportAiInterpretation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<ReportAiErrorInfo | null>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // 동일 종목 히스토리 (최신순 -> 이전 기록 비교 및 추세 차트용)
  const sameExerciseRecords = activeRecord
    ? measurements.filter((m) => m.exercise === activeRecord.exercise)
    : [];
  const currentIdx = activeRecord
    ? sameExerciseRecords.findIndex((m) => m.id === activeRecord.id)
    : -1;
  const previousRecord =
    currentIdx >= 0 && currentIdx + 1 < sameExerciseRecords.length
      ? sameExerciseRecords[currentIdx + 1]
      : undefined;

  const activeRecordRef = useRef<MeasurementRecord | null>(activeRecord);
  activeRecordRef.current = activeRecord;
  const previousRecordRef = useRef<MeasurementRecord | undefined>(previousRecord);
  previousRecordRef.current = previousRecord;
  const userRef = useRef<UserProfile>(user);
  userRef.current = user;

  const activeRecordId = activeRecord?.id ?? null;
  const previousRecordId = previousRecord?.id ?? null;

  const fetchAiInterpretation = useCallback(
    async (forceRefresh = false, signal?: AbortSignal) => {
      const targetRecord = activeRecordRef.current;
      if (!targetRecord) return;

      setAiLoading(true);
      setAiError(null);
      try {
        const res = await reportAiService.generateInterpretation(
          userRef.current,
          targetRecord,
          previousRecordRef.current,
          { forceRefresh, signal }
        );
        if (!signal?.aborted) {
          setInterpretation(res);
        }
      } catch (err) {
        if (signal?.aborted) return;
        setInterpretation(null);
        if (err instanceof ReportAiStageError) {
          setAiError(err.info);
        } else {
          setAiError({
            stage: 'Firebase AI Logic 실행',
            model: REPORT_AI_MODEL,
            rawMessage:
              err instanceof Error
                ? err.message
                : 'Firebase AI Logic 분석 결과를 불러오지 못했습니다.',
          });
        }
      } finally {
        if (!signal?.aborted) {
          setAiLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!activeRecordId) return;
    const controller = new AbortController();
    void fetchAiInterpretation(false, controller.signal);
    return () => controller.abort();
  }, [
    activeRecordId,
    previousRecordId,
    user.age,
    user.gender,
    user.userGroup,
    fetchAiInterpretation,
  ]);

  if (!activeRecord) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-4">
        <h1 className="text-lg font-bold text-slate-900">
          결과 보고서를 만들 측정 기록이 없습니다
        </h1>
        <p className="text-sm text-slate-600">
          먼저 새로운 e1RM 측정을 실행하고 결과를 저장해 주세요.
        </p>
        <button
          type="button"
          onClick={onStartMeasure}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
        >
          새 측정 시작하기
        </button>
      </div>
    );
  }

  const zones = calculateRecommendedLoads(activeRecord.e1rmKg);
  const interceptSign = activeRecord.regression.intercept >= 0 ? '+' : '-';

  /**
   * [기능] 화면에 구성된 A4 페이지([data-a4-page])별로 개별 캡처해 잘림 없이 PDF로 저장
   */
  const handleSavePdf = async () => {
    if (isGuest || !reportRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfError(null);

    try {
      const pageNodes = Array.from(
        reportRef.current.querySelectorAll<HTMLElement>('[data-a4-page]')
      );
      if (pageNodes.length === 0) {
        throw new Error('출력할 A4 보고서 페이지를 찾지 못했습니다.');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidthMm = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeightMm = pdf.internal.pageSize.getHeight(); // 297mm

      for (let i = 0; i < pageNodes.length; i += 1) {
        const pageEl = pageNodes[i];
        let dataUrl: string;
        try {
          dataUrl = await toPng(pageEl, {
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            cacheBust: true,
            width: pageEl.offsetWidth,
            height: pageEl.scrollHeight,
          });
        } catch {
          // 외부 폰트 스타일시트 CORS 접근 제한 시 폰트 임베딩만 건너뛰고 재시도
          dataUrl = await toPng(pageEl, {
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            skipFonts: true,
            width: pageEl.offsetWidth,
            height: pageEl.scrollHeight,
          });
        }

        const img = await loadImageDimensions(dataUrl);
        if (i > 0) {
          pdf.addPage();
        }

        const imgHeightMm = (img.height * pageWidthMm) / img.width;
        if (imgHeightMm <= pageHeightMm) {
          pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidthMm, imgHeightMm);
        } else {
          // 해설이 길어 세로가 A4를 살짝 넘더라도 다음 장에서 잘리지 않도록 비율 축소해 한 장에 맞춤
          const fitScale = pageHeightMm / imgHeightMm;
          const fittedWidthMm = pageWidthMm * fitScale;
          const offsetX = (pageWidthMm - fittedWidthMm) / 2;
          pdf.addImage(dataUrl, 'PNG', offsetX, 0, fittedWidthMm, pageHeightMm);
        }
      }

      const safeUserName = user.name.replace(/[^\w가-힣-]/g, '_');
      const dateTag = activeRecord.measuredAt.slice(0, 10);
      pdf.save(`VELOMAX_결과보고서_${safeUserName}_${dateTag}.pdf`);
    } catch (err) {
      setPdfError(
        err instanceof Error
          ? err.message
          : 'PDF 파일을 생성하는 중 오류가 발생했습니다.'
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 화면 전용 상단 컨트롤 바 (인쇄/캡처 대상 외부) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {isGuest ? (
            <button
              type="button"
              onClick={onStartMeasure}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> 측정 분석으로
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onBackToHistory}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> 히스토리로
              </button>
              <span aria-hidden="true" className="text-slate-300">
                |
              </span>
              <label
                htmlFor="report-record-select"
                className="text-xs font-semibold text-slate-700"
              >
                보고서 대상 기록:
              </label>
              <select
                id="report-record-select"
                value={activeRecord.id}
                onChange={(e) => onSelectRecord(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-600"
              >
                {measurements.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatDateTimeKo(m.measuredAt)} ·{' '}
                    {getExerciseLabelKo(m.exercise)} · {formatKg(m.e1rmKg)}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 border border-slate-200 rounded px-2.5 py-1">
            A4 2페이지 기준 레이아웃
          </span>
          {isGuest ? (
            <div className="flex flex-wrap items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-950">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                PDF 저장 제한 · 해당 기능을 사용하려면 로그인하세요
              </span>
              <button
                type="button"
                onClick={onRequireLogin}
                className="px-3 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded inline-flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3 h-3" />
                로그인하기
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              {pdfError && (
                <span className="text-xs text-rose-700 font-medium">
                  {pdfError}
                </span>
              )}
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={() => void handleSavePdf()}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-md flex items-center gap-2 cursor-pointer disabled:cursor-wait"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    PDF 생성 중...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    PDF로 저장 (A4 2장)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* A4 용지 미리보기 및 PDF 캡처 래퍼 (가로 794px 기준 유지, 좁은 화면에서는 가로 스크롤) */}
      <div className="bg-slate-200/70 border border-slate-300 rounded-lg p-3 sm:p-6 overflow-x-auto">
        <div
          ref={reportRef}
          className="print-container flex flex-col items-center gap-6 min-w-fit"
        >
          {/* =====================================================================
           * [A4 1페이지] 보고서 헤더 + 1. 대상자·e1RM·동 나이대 + 2. MCV 표·회귀 그래프
           * ===================================================================== */}
          <article
            data-a4-page="1"
            className="a4-sheet w-[794px] min-h-[1123px] bg-white border border-slate-300 shadow-sm px-9 py-7 flex flex-col justify-between box-border text-slate-900"
          >
            <div className="space-y-5">
              {/* 보고서 1페이지 헤더 */}
              <header className="border-b-2 border-slate-900 pb-4 flex items-end justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="font-mono text-[11px] font-semibold text-blue-700 tracking-wider">
                    VELOMAX · 근력 예측 결과 보고서
                  </p>
                  <h1 className="font-display text-2xl font-extrabold text-slate-900">
                    무게–속도 기반 e1RM 분석 보고서
                  </h1>
                  <p className="text-[11px] text-slate-500">
                    Measure Velocity, Predict Strength. · 속도를 분석하고, 근력을 예측하다.
                  </p>
                </div>
                <div className="text-right space-y-0.5 text-[11px] text-slate-600 shrink-0">
                  <div className="font-mono font-semibold text-slate-900">
                    {activeRecord.velocitySource === 'mediapipe'
                      ? 'AI 자세 추정 분석'
                      : '직접 입력 분석'}
                  </div>
                  <div>측정 일시: {formatDateTimeKo(activeRecord.measuredAt)}</div>
                  <div className="font-mono">
                    계산 버전: {activeRecord.analysisEngineVersion}
                  </div>
                </div>
              </header>

              {/* 1. 대상자 정보 및 핵심 결과 요약 + 동 나이대 상위 % */}
              <section className="grid grid-cols-12 gap-4 print-break-inside-avoid">
                <div className="col-span-7 border border-slate-200 rounded-md p-4 space-y-2.5">
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    1. 대상자 및 측정 조건
                  </h2>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <dt className="text-slate-500 text-[11px]">이름</dt>
                      <dd className="font-semibold text-slate-900">{user.name}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-[11px]">사용자 구분</dt>
                      <dd className="font-semibold text-blue-800">
                        {getUserGroupLabelKo(activeRecord.userGroupSnapshot)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-[11px]">만나이 / 생년월일</dt>
                      <dd className="text-slate-800">
                        만 {user.age}세 ({formatBirthDateKo(user.birthDate)})
                        {!isGuest && ` · ${getGenderLabelKo(user.gender)}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-[11px]">
                        {isGuest ? '이용 형태' : '운동 경력 / 참여 형태'}
                      </dt>
                      <dd className="text-slate-800">
                        {isGuest
                          ? '비회원 이용 (기록 미저장)'
                          : `${getExperienceLabelKo(user.trainingExperience)} · ${getParticipationLabelKo(user.participationType)}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-[11px]">측정 종목</dt>
                      <dd className="font-semibold text-slate-900">
                        {getExerciseLabelKo(activeRecord.exercise)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-[11px]">MCV 입력 방식 / 출처</dt>
                      <dd className="mt-0.5 space-y-0.5">
                        <VelocitySourceTag source={activeRecord.velocitySource} />
                        <div className="text-[11px] text-slate-600">
                          {getVelocityOriginLabelKo(activeRecord.velocityOrigin ?? 'unknown')}
                        </div>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="col-span-5 bg-slate-900 text-white rounded-md p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <p className="font-mono text-[11px] text-cyan-400">
                      예측 최대근력 (e1RM)
                    </p>
                    <div className="font-mono text-3xl font-bold tabular-nums mt-1">
                      {activeRecord.e1rmKg.toFixed(1)}{' '}
                      <span className="text-base text-slate-400">kg</span>
                    </div>

                    {/* Firebase AI Logic 동 나이대 비교 정보 */}
                    <div className="mt-2.5 rounded bg-slate-800/90 border border-slate-700 px-3 py-2 space-y-1">
                      {aiLoading ? (
                        <div className="flex items-center gap-2 text-[11px] text-cyan-300">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          동 나이대 대비 백분위 분석 중...
                        </div>
                      ) : interpretation ? (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              만 {user.age}세 동 나이대 비교
                            </span>
                            <span className="font-mono text-xs font-bold text-amber-300 tabular-nums">
                              상위 {interpretation.peerTopPercent}%
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-white">
                            {interpretation.peerCategoryLabel}
                          </p>
                          <p className="text-[10.5px] text-slate-300 leading-snug">
                            {interpretation.peerSummary}
                          </p>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>동 나이대 비교 정보를 불러오지 못했습니다.</span>
                          </div>
                          {aiError && (
                            <div className="text-[10px] text-slate-300 leading-snug space-y-0.5 break-words">
                              <p className="font-mono text-amber-200">
                                {aiError.stage} · 모델: {aiError.model}
                                {aiError.httpStatus ? ` · HTTP ${aiError.httpStatus}` : ''}
                                {aiError.code ? ` · ${aiError.code}` : ''}
                              </p>
                              <p className="text-slate-300">{aiError.rawMessage}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-2.5 space-y-0.5 text-[11px] font-mono tabular-nums text-slate-300">
                    <div>
                      예측식: 속도 = {activeRecord.regression.slope.toFixed(4)}×무게{' '}
                      {interceptSign}{' '}
                      {Math.abs(activeRecord.regression.intercept).toFixed(3)}
                    </div>
                    <div>
                      직선 일치도 R²: {formatR2(activeRecord.regression.r2, 3)} · 기준 MVT:{' '}
                      {activeRecord.mvt.valueMs.toFixed(2)} m/s
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. 입력 세트(3~5개) 최종 결과 표 및 무게–속도 그래프 (A4 1장 안에 맞춰 크기 조정) */}
              <section className="space-y-3 print-break-inside-avoid">
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                  2. 무게별 MCV 및 무게–속도 그래프
                </h2>

                <table className="w-full text-xs border border-slate-200 border-collapse">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="py-1.5 px-3 text-left border-b border-slate-200">
                        세트 구분
                      </th>
                      <th className="py-1.5 px-3 text-right border-b border-slate-200">
                        운동 무게 (kg)
                      </th>
                      <th className="py-1.5 px-3 text-right border-b border-slate-200 text-blue-800">
                        MCV (m/s)
                      </th>
                      <th className="py-1.5 px-3 text-right border-b border-slate-200">
                        예측 직선 속도 (m/s)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                    {activeRecord.points.map((pt, idx) => {
                      const predicted =
                        activeRecord.regression.slope * pt.loadKg +
                        activeRecord.regression.intercept;
                      return (
                        <tr key={idx}>
                          <td className="py-1.5 px-3 font-sans text-slate-700">
                            세트 {idx + 1}
                          </td>
                          <td className="py-1.5 px-3 text-right font-semibold text-slate-900">
                            {formatKg(pt.loadKg, 1)}
                          </td>
                          <td className="py-1.5 px-3 text-right text-blue-700 font-semibold">
                            {formatVelocity(pt.mcvMs, 2)}
                          </td>
                          <td className="py-1.5 px-3 text-right text-slate-600">
                            {formatVelocity(predicted, 2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="border border-slate-200 rounded-md p-3">
                  <LoadVelocityChart
                    points={activeRecord.points}
                    regression={activeRecord.regression}
                    mvtMs={activeRecord.mvt.valueMs}
                    e1rmKg={activeRecord.e1rmKg}
                    height={activeRecord.points.length > 3 ? 205 : 235}
                  />
                </div>
              </section>
            </div>

            {/* 1페이지 하단 바닥글 */}
            <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between text-[10.5px] font-mono text-slate-400">
              <span>VELOMAX · Measure Velocity, Predict Strength.</span>
              <span>Page 1 / 2</span>
            </div>
          </article>

          {/* =====================================================================
           * [A4 2페이지] 3. 근력 변화 추세 + 4. 목적별 추천 무게 + 5. Gemini 해설 + 유의사항
           * ===================================================================== */}
          <article
            data-a4-page="2"
            className="a4-sheet w-[794px] min-h-[1123px] bg-white border border-slate-300 shadow-sm px-9 py-7 flex flex-col justify-between box-border text-slate-900"
          >
            <div className="space-y-4">
              {/* 2페이지 상단 연속 헤더 */}
              <div className="border-b border-slate-300 pb-2.5 flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-mono font-bold text-slate-900">
                  VELOMAX · 무게–속도 기반 e1RM 분석 보고서 (계속)
                </span>
                <span className="font-mono tabular-nums">
                  {user.name} · {getExerciseLabelKo(activeRecord.exercise)} · e1RM{' '}
                  {activeRecord.e1rmKg.toFixed(1)} kg
                </span>
              </div>

              {/* 3. 동일 종목 e1RM 변화 히스토리 그래프 */}
              <section className="space-y-2 print-break-inside-avoid">
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                  3. {getExerciseLabelKo(activeRecord.exercise)} 추정 근력 변화 추세
                </h2>
                {isGuest ? (
                  <div className="border border-slate-200 bg-slate-50 rounded-md p-5 text-center space-y-2">
                    <div className="mx-auto w-8 h-8 rounded-full bg-slate-200/80 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-slate-700" />
                    </div>
                    <p className="text-xs font-semibold text-slate-900">
                      해당 기능을 사용하려면 로그인하세요
                    </p>
                    <p className="text-[11px] text-slate-600">
                      추정 근력 변화 추세 그래프와 이전 기록 비교는 회원 로그인 후 이용할 수 있습니다.
                    </p>
                    <button
                      type="button"
                      onClick={onRequireLogin}
                      className="no-print px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      로그인 / 회원가입하기
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-md p-2.5">
                    <HistoryTrendChart records={sameExerciseRecords} height={175} />
                  </div>
                )}
              </section>

              {/* 4. 목적별 추천 무게 표 + 하단 학술 근거 */}
              <section className="space-y-2 print-break-inside-avoid">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                  <h2 className="text-sm font-bold text-slate-900">
                    4. 운동 목적별 추천 무게 (2.5kg 단위)
                  </h2>
                  <span className="text-[11px] text-amber-800">
                    운동 시작점을 잡기 위한 참고 무게이며 컨디션에 따라 조절하세요
                  </span>
                </div>
                <table className="w-full text-xs border border-slate-200 border-collapse">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="py-1.5 px-3 text-left border-b border-slate-200">
                        운동 목적
                      </th>
                      <th className="py-1.5 px-3 text-right border-b border-slate-200">
                        최대근력 대비 (%)
                      </th>
                      <th className="py-1.5 px-3 text-right border-b border-slate-200">
                        추천 무게 범위 (kg)
                      </th>
                      <th className="py-1.5 px-3 text-right border-b border-slate-200">
                        권장 반복수
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {zones.map((z) => (
                      <tr key={z.id}>
                        <td className="py-1.5 px-3 font-semibold text-slate-900">
                          {z.nameKo}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {z.minPercent}% ~ {z.maxPercent}%
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold tabular-nums text-blue-700">
                          {z.minLoadKg.toFixed(1)} ~ {z.maxLoadKg.toFixed(1)} kg
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-600">
                          {z.repRangeLabel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10.5px] text-slate-500 leading-snug">
                  <strong>근거:</strong> Currier, B. S., et al. (2026). ACSM position stand: Resistance training prescription for muscle function, hypertrophy, and physical performance in healthy adults.{' '}
                  <em>Medicine &amp; Science in Sports &amp; Exercise</em>, 58(4), 851–872. (doi:10.1249/MSS.0000000000003897) · 바벨 최소 원판 단위(양쪽 1.25kg)를 반영해 2.5kg 단위로 반올림하여 시작 참고 무게를 제시합니다.
                </p>
              </section>

              {/* 5. Firebase AI Logic 분석 요약 및 변화 해설 */}
              <section className="space-y-2.5 border border-slate-200 bg-slate-50 rounded-md p-4 print-break-inside-avoid">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-700" />
                    5. 분석 요약 및 변화 해설
                  </h2>
                  <span className="px-2 py-0.5 rounded border border-blue-200 bg-white text-[11px] font-semibold text-blue-800">
                    Firebase AI 분석 해설
                  </span>
                </div>

                {aiLoading && (
                  <div className="py-4 flex items-center gap-2.5 text-xs text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                    <span>
                      Firebase AI가 근력 변화 추세, e1RM 활용 방법 및 직선 일치도(R²)를 분석하고 있습니다...
                    </span>
                  </div>
                )}

                {!aiLoading && aiError && (
                  <div className="bg-white border border-rose-200 rounded-md p-3.5 space-y-2.5">
                    <div className="flex items-start gap-2 text-xs text-rose-900 leading-relaxed">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <div className="space-y-1 min-w-0">
                        <p className="font-semibold text-rose-800">
                          오류 발생 단계: {aiError.stage}
                        </p>
                        <p className="font-mono text-[11px] text-slate-700">
                          호출 모델: {aiError.model}
                          {aiError.httpStatus ? ` · HTTP ${aiError.httpStatus}` : ''}
                          {aiError.code ? ` · 오류 코드: ${aiError.code}` : ''}
                        </p>
                        <p className="text-[11px] text-rose-800 break-words bg-rose-50/70 border border-rose-100 rounded px-2.5 py-1.5 font-mono">
                          {aiError.rawMessage}
                        </p>
                        {aiError.hint && (
                          <p className="text-[11px] text-slate-700">
                            <strong>해결 안내:</strong> {aiError.hint}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void fetchAiInterpretation(true)}
                      className="no-print px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      다시 분석 요청
                    </button>
                  </div>
                )}

                {!aiLoading && !aiError && interpretation && (
                  <>
                    <p className="text-xs sm:text-[13px] font-semibold text-blue-900 leading-snug">
                      {renderBoldMarkdownText(interpretation.headline)}
                    </p>
                    <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                      {interpretation.paragraphs.map((p, idx) => (
                        <p key={idx}>{renderBoldMarkdownText(p)}</p>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </div>

            {/* 보고서 최하단 작은 글씨 유의사항 (모든 주의/면책 문구는 여기에만 표기) */}
            <footer className="border-t border-slate-200 pt-3 text-[10.5px] text-slate-500 space-y-1 leading-snug">
              <p>
                <strong>유의사항:</strong> 본 보고서는 VELOMAX v1에서 생성된 분석 결과지입니다.{' '}
                {activeRecord.velocitySource === 'mediapipe'
                  ? 'MCV는 브라우저 내 AI 자세 추정과 기준 길이 맞추기를 통해 산출되었습니다. '
                  : '입력하신 MCV 수치를 그대로 사용하여 계산했습니다. '}
                적용된 MVT({activeRecord.mvt.valueMs.toFixed(2)} m/s)는 사용자 구분별 기준값이며, 동 나이대 상위 %는 연령·성별·종목 기준에 따른 AI 참고 추정치입니다.
              </p>
              {activeRecord.isHighExtrapolation && (
                <p>
                  측정하신 최대 무게에 비해 예측 최대근력이 높게 외삽되었으므로 실제 중량 적용 시 보수적으로 접근하시기 바랍니다.
                </p>
              )}
              <div className="flex items-end justify-between gap-4">
                <p>
                  직선 일치도(R²) 및 예측 최대근력(e1RM)은 참고용 수치이므로 실제 최대 중량 판정이나 의학적·전문 처방의 유일한 기준으로 사용하지 마세요.
                </p>
                <span className="font-mono text-slate-400 shrink-0">Page 2 / 2</span>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
};
