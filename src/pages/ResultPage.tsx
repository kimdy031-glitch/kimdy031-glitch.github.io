/**
 * [파일 목적] 화면 F — 무게–속도 분석 및 예측 최대근력(e1RM) 결과 화면
 * [책임]
 *   1) AI 자세 추정(영상) 또는 직접 입력 MCV 기반 최종 예측 최대근력(e1RM) 표시
 *   2) 무게–속도 그래프, 세트별 MCV 표, 4가지 목적별 권장 무게 표 및 보고서 이동 버튼 제공
 */

import React from 'react';
import {
  Check,
  FileText,
  Lock,
  RotateCcw,
  Save,
} from 'lucide-react';
import { LoadVelocityChart } from '../components/Charts';
import {
  VelocitySourceTag,
  WarningAlert,
} from '../components/Notices';
import type { AnalysisDraftResult } from '../types/domain';
import {
  formatKg,
  formatR2,
  getExerciseLabelKo,
  getUserGroupLabelKo,
  getVelocityOriginLabelKo,
} from '../utils/format';

interface ResultPageProps {
  result: AnalysisDraftResult;
  isGuest?: boolean;
  isSaved: boolean;
  onSaveResult: () => void;
  onReanalyze: () => void;
  onViewReport: () => void;
  onRequireLogin: () => void;
}

/**
 * [컴포넌트] VELOMAX 분석 결과 페이지
 */
export const ResultPage: React.FC<ResultPageProps> = ({
  result,
  isGuest = false,
  isSaved,
  onSaveResult,
  onReanalyze,
  onViewReport,
  onRequireLogin,
}) => {
  const { record, zones, warnings } = result;
  const { regression, mvt, points } = record;

  const interceptSign = regression.intercept >= 0 ? '+' : '-';

  return (
    <div className="space-y-6">
      {/* 상단 요약 배지 & 액션 바 */}
      <div className="bg-white border border-slate-200 rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-2.5 py-1 rounded bg-slate-900 text-white font-mono text-xs font-semibold">
            {record.velocitySource === 'mediapipe'
              ? 'AI 자세 추정 결과'
              : '직접 입력 결과'}
          </span>
          <span className="text-sm font-semibold text-slate-800">
            {getExerciseLabelKo(record.exercise)}
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="text-xs text-slate-600">
            {getUserGroupLabelKo(record.userGroupSnapshot)} 기준
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onReanalyze}
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            다시 측정하기
          </button>
          {isGuest ? (
            <button
              type="button"
              onClick={onRequireLogin}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-md flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-950 hover:bg-amber-100 cursor-pointer"
              title="해당 기능을 사용하려면 로그인하세요"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              저장(로그인 필요)
            </button>
          ) : (
            <button
              type="button"
              onClick={onSaveResult}
              disabled={isSaved}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                isSaved
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 cursor-default'
                  : 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  히스토리에 저장됨
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  결과 저장하기
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onViewReport}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            결과 보고서 보기
          </button>
        </div>
      </div>

      {isGuest && (
        <div className="border border-blue-200 bg-blue-50/80 rounded-md p-4 text-xs sm:text-sm text-blue-950 flex flex-wrap items-center justify-between gap-3">
          <span>
            비회원 측정 결과는 히스토리에 저장되지 않으며, 결과 보고서 내 PDF 인쇄 및 근력 변화 추세 기능은 제한됩니다.
          </span>
          <button
            type="button"
            onClick={onRequireLogin}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded cursor-pointer shrink-0"
          >
            해당 기능을 사용하려면 로그인하세요
          </button>
        </div>
      )}

      <WarningAlert messages={warnings} />

      {/* 핵심 예측 최대근력(e1RM) 요약 + 무게–속도 그래프 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 좌측: 최종 예측 최대근력(e1RM) 단일 카드 */}
        <section className="lg:col-span-4 bg-slate-900 text-white rounded-lg p-6 sm:p-7 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <p className="font-mono text-xs text-cyan-400">
              예측 최대근력 (e1RM)
            </p>
            <h1 className="text-base font-semibold text-slate-200">
              예측 최대근력 (e1RM)
            </h1>
            <div className="font-mono text-5xl font-bold tracking-tight text-white tabular-nums">
              {record.e1rmKg.toFixed(1)}
              <span className="text-xl font-medium text-slate-400 ml-2">kg</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pt-1">
              측정된 무게와 속도의 직선이 기준 속도 MVT(
              <span className="font-mono text-cyan-300">
                {mvt.valueMs.toFixed(2)} m/s
              </span>
              )와 만나는 지점에서 예측한 최대근력입니다.
            </p>
          </div>

          <div className="border-t border-slate-800 pt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">무게–속도 예측식</span>
              <span className="font-mono text-slate-100 tabular-nums">
                속도 = {regression.slope.toFixed(4)}×무게 {interceptSign}{' '}
                {Math.abs(regression.intercept).toFixed(3)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">기울기 (무게당 속도 변화)</span>
              <span className="font-mono text-slate-100 tabular-nums">
                {regression.slope.toFixed(4)} (m/s)/kg
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">시작 속도 (0kg 기준)</span>
              <span className="font-mono text-slate-100 tabular-nums">
                {regression.intercept.toFixed(3)} m/s
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">직선 일치도 (R²)</span>
              <span className="font-mono text-cyan-300 font-semibold tabular-nums">
                {formatR2(regression.r2, 4)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">MCV 출처</span>
              <span className="text-slate-200">
                {getVelocityOriginLabelKo(record.velocityOrigin)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
            일치도(R²)는 입력한 {points.length}개 세트가 얼마나 한 직선에 가깝게 놓여 있는지를 보여주며, 실제 1RM과 다를 수 있습니다.
          </p>
        </section>

        {/* 우측: 최종 무게–속도 그래프 */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                무게–속도 분석 그래프 및 e1RM 예측 지점
              </h2>
              <p className="text-xs text-slate-500">
                그래프 위의 점에 마우스를 올리면 정확한 (무게, 속도) 수치를 확인할 수 있습니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <VelocitySourceTag source={record.velocitySource} />
            </div>
          </div>

          <LoadVelocityChart
            points={points}
            regression={regression}
            mvtMs={mvt.valueMs}
            e1rmKg={record.e1rmKg}
          />
        </section>
      </div>

      {/* 세트별 최종 MCV 표 & 목적별 권장 무게 표 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">
              세트별 최종 무게 · MCV 결과표
            </h2>
            <span className="text-xs text-slate-500">
              {record.velocitySource === 'mediapipe'
                ? '영상 AI 자세 추정 MCV'
                : '직접 입력 MCV'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 text-left font-semibold">세트</th>
                  <th className="py-2 text-right font-semibold">무게 (kg)</th>
                  <th className="py-2 text-right font-semibold">MCV (m/s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {points.map((pt, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 font-sans text-xs text-slate-600">
                      세트 {idx + 1}
                    </td>
                    <td className="py-2.5 text-right text-slate-900 font-semibold">
                      {formatKg(pt.loadKg, 1)}
                    </td>
                    <td className="py-2.5 text-right text-blue-700 font-semibold">
                      {pt.mcvMs.toFixed(2)} m/s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">예측 최대근력(e1RM) 계산 방식</p>
            <p className="font-mono text-[11px] text-slate-700">
              e1RM = (MVT - {regression.intercept.toFixed(3)}) / (
              {regression.slope.toFixed(4)}) = {record.e1rmKg.toFixed(1)} kg
            </p>
            <p className="text-slate-500">
              {record.velocitySource === 'mediapipe'
                ? '영상 AI 자세 추적으로 산출한 MCV를 사용해 계산했습니다.'
                : '입력하신 MCV 수치를 그대로 사용해 계산했습니다.'}{' '}
              · 기준 MVT({mvt.valueMs.toFixed(2)} m/s)는{' '}
              {getUserGroupLabelKo(record.userGroupSnapshot)} 기준값입니다.
            </p>
          </div>
        </section>

        {/* 4가지 목적별 권장 무게 표 */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              운동 목적별 추천 무게 (2.5kg 단위)
            </h2>
            <p className="text-xs text-amber-800 mt-0.5">
              훈련 시작점을 잡기 위한 참고용 무게이며, 실제 컨디션에 맞게 조절해 주세요.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2.5 text-left font-semibold">운동 목적</th>
                  <th className="py-2.5 text-right font-semibold">최대근력 대비 (%)</th>
                  <th className="py-2.5 text-right font-semibold">추천 무게 범위</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {zones.map((z) => (
                  <tr key={z.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-slate-900">{z.nameKo}</div>
                      <div className="text-xs text-slate-500">{z.repRangeLabel}</div>
                    </td>
                    <td className="py-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {z.minPercent}% ~ {z.maxPercent}%
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-blue-700 tabular-nums whitespace-nowrap">
                      {z.minLoadKg.toFixed(1)} ~ {z.maxLoadKg.toFixed(1)} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
