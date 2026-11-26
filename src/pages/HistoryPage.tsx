/**
 * [파일 목적] 화면 G — 계정별·종목별 측정 히스토리 및 추세 비교 화면
 */

import React, { useState } from 'react';
import { AlertTriangle, FileText, Trash2 } from 'lucide-react';
import { HistoryTrendChart } from '../components/Charts';
import { VelocitySourceTag } from '../components/Notices';
import { calculateHistoryDelta } from '../services/analysis';
import type { ExerciseType, MeasurementRecord, UserProfile } from '../types/domain';
import {
  formatDateTimeKo,
  formatKg,
  formatR2,
  formatSignedKg,
  formatSignedPercent,
  getExerciseShortKo,
  getUserGroupLabelKo,
  getVelocityOriginLabelKo,
} from '../utils/format';

interface HistoryPageProps {
  user: UserProfile;
  measurements: MeasurementRecord[];
  onOpenReport: (recordId: string) => void;
  onDeleteRecord: (recordId: string) => void;
  onStartMeasure: () => void;
}

/**
 * [컴포넌트] VELOMAX 측정 히스토리 페이지
 */
export const HistoryPage: React.FC<HistoryPageProps> = ({
  user,
  measurements,
  onOpenReport,
  onDeleteRecord,
  onStartMeasure,
}) => {
  const [filterExercise, setFilterExercise] = useState<'all' | ExerciseType>('all');
  const [chartExercise, setChartExercise] = useState<ExerciseType>('squat');

  const filteredRecords =
    filterExercise === 'all'
      ? measurements
      : measurements.filter((m) => m.exercise === filterExercise);

  const squatList = measurements.filter((m) => m.exercise === 'squat');
  const deadliftList = measurements.filter((m) => m.exercise === 'deadlift');

  const activeChartExercise: ExerciseType =
    filterExercise === 'all' ? chartExercise : filterExercise;
  const chartRecords =
    activeChartExercise === 'squat' ? squatList : deadliftList;

  const findPreviousSameExercise = (
    record: MeasurementRecord
  ): MeasurementRecord | undefined => {
    const list = record.exercise === 'squat' ? squatList : deadliftList;
    const idx = list.findIndex((item) => item.id === record.id);
    if (idx < 0 || idx + 1 >= list.length) return undefined;
    return list[idx + 1];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-slate-900">
            측정 기록 및 근력 변화 추적
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {user.name} ({getUserGroupLabelKo(user.userGroup)}) 계정에 저장된 측정 기록{' '}
            <span className="font-mono font-semibold tabular-nums">
              {measurements.length}
            </span>
            건
          </p>
        </div>

        <button
          type="button"
          onClick={onStartMeasure}
          className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
        >
          새 측정 시작
        </button>
      </div>

      {/* 종목별 추세 선그래프 */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {getExerciseShortKo(activeChartExercise)} e1RM 변화 추세
            </h2>
            <p className="text-xs text-slate-500">
              같은 운동 종목의 측정 기록을 날짜순으로 연결해 근력 변화를 보여줍니다.
            </p>
          </div>

          {filterExercise === 'all' && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => setChartExercise('squat')}
                className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                  chartExercise === 'squat'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                스쿼트 ({squatList.length})
              </button>
              <button
                type="button"
                onClick={() => setChartExercise('deadlift')}
                className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer ${
                  chartExercise === 'deadlift'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                데드리프트 ({deadliftList.length})
              </button>
            </div>
          )}
        </div>

        <HistoryTrendChart
          records={chartRecords}
          accentColor={activeChartExercise === 'squat' ? '#2563EB' : '#0891B2'}
        />
      </section>

      {/* 기록 목록 및 필터 바 */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <h2 className="text-base font-bold text-slate-900">측정 기록 목록</h2>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(
              [
                { key: 'all', label: `전체 (${measurements.length})` },
                { key: 'squat', label: `스쿼트 (${squatList.length})` },
                { key: 'deadlift', label: `데드리프트 (${deadliftList.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterExercise(tab.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
                  filterExercise === tab.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center space-y-3 bg-slate-50 border border-slate-200 rounded-md">
            <p className="text-sm text-slate-600">
              선택한 조건에 해당하는 측정 기록이 없습니다.
            </p>
            <button
              type="button"
              onClick={onStartMeasure}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              첫 측정 시작하기
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredRecords.map((rec) => {
              const prevSame = findPreviousSameExercise(rec);
              const delta = calculateHistoryDelta(rec, prevSame);

              return (
                <article
                  key={rec.id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-base font-bold text-slate-900">
                        {getExerciseShortKo(rec.exercise)}
                      </span>
                      <span className="font-mono text-lg font-bold text-blue-700 tabular-nums">
                        {formatKg(rec.e1rmKg)}
                      </span>
                      {prevSame && delta.diffKg !== null ? (
                        <span
                          className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border tabular-nums ${
                            delta.diffKg > 0
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : delta.diffKg < 0
                              ? 'border-rose-200 bg-rose-50 text-rose-800'
                              : 'border-slate-200 bg-slate-50 text-slate-700'
                          }`}
                        >
                          이전 대비 {formatSignedKg(delta.diffKg)} (
                          {formatSignedPercent(delta.diffPercent)})
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">최초 측정</span>
                      )}
                      <VelocitySourceTag source={rec.velocitySource} />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 tabular-nums">
                      <span>{formatDateTimeKo(rec.measuredAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">
                        무게 {rec.points.map((p) => `${p.loadKg}kg`).join('/')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">
                        일치도 R² {formatR2(rec.regression.r2, 3)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">
                        MVT {rec.mvt.valueMs.toFixed(2)} m/s
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {getVelocityOriginLabelKo(rec.velocityOrigin ?? 'unknown')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{getUserGroupLabelKo(rec.userGroupSnapshot)}</span>
                    </div>

                    {delta.conditionChanged && (
                      <div className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          이전 측정과 방식이 달라 직접 비교 시 참고만 해주세요 ({delta.conditionNotes.join(', ')})
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenReport(rec.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      결과 보고서
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRecord(rec.id)}
                      className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-md flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
