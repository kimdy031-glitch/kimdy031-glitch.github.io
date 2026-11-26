/**
 * [파일 목적] 화면 B — 메인 대시보드
 * [책임]
 *   - 현재 로그인 사용자 요약 및 '새로운 e1RM 분석' 주요 CTA 제공
 *   - 최근 스쿼트 e1RM, 최근 데드리프트 e1RM, 최근 측정일 KPI 표시
 *   - 두 종목의 최근 근력 변화 추세 그래프 및 최근 측정 기록 테이블 표시
 */

import React, { useState } from 'react';
import { ArrowUpRight, FileText, History, Play, UserCog } from 'lucide-react';
import { HistoryTrendChart } from '../components/Charts';
import { VelocitySourceTag } from '../components/Notices';
import { calculateHistoryDelta } from '../services/analysis';
import type {
  AppRoute,
  ExerciseType,
  MeasurementRecord,
  UserProfile,
} from '../types/domain';
import {
  formatDateShortKo,
  formatDateTimeKo,
  formatKg,
  formatR2,
  formatSignedKg,
  formatSignedPercent,
  getExerciseShortKo,
  getUserGroupLabelKo,
} from '../utils/format';

interface DashboardPageProps {
  user: UserProfile;
  measurements: MeasurementRecord[];
  statusBanner?: string | null;
  onDismissBanner: () => void;
  onNavigate: (route: AppRoute) => void;
  onStartMeasureForExercise: (exercise: ExerciseType) => void;
  onOpenReport: (recordId: string) => void;
}

/**
 * [컴포넌트] VELOMAX 대시보드 페이지
 */
export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  measurements,
  statusBanner,
  onDismissBanner,
  onNavigate,
  onStartMeasureForExercise,
  onOpenReport,
}) => {
  const [trendExercise, setTrendExercise] = useState<ExerciseType>('squat');

  const squatRecords = measurements.filter((m) => m.exercise === 'squat');
  const deadliftRecords = measurements.filter((m) => m.exercise === 'deadlift');

  const latestSquat = squatRecords[0];
  const prevSquat = squatRecords[1];
  const squatDelta = latestSquat
    ? calculateHistoryDelta(latestSquat, prevSquat)
    : null;

  const latestDeadlift = deadliftRecords[0];
  const prevDeadlift = deadliftRecords[1];
  const deadliftDelta = latestDeadlift
    ? calculateHistoryDelta(latestDeadlift, prevDeadlift)
    : null;

  const latestAny = measurements[0];
  const trendRecords = trendExercise === 'squat' ? squatRecords : deadliftRecords;

  return (
    <div className="space-y-6">
      {/* 가입·로그인 직후 분류 확인 또는 작업 피드백 알림 */}
      {statusBanner && (
        <div className="border border-blue-200 bg-blue-50 text-blue-950 rounded-md px-4 py-3 flex items-center justify-between gap-4 text-sm">
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={onDismissBanner}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer shrink-0"
          >
            닫기
          </button>
        </div>
      )}

      {/* 상단 요약 및 주요 CTA 영역 */}
      <section className="bg-slate-900 text-white rounded-lg p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span>VELOMAX 근력 분석</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-cyan-300">
              {getUserGroupLabelKo(user.userGroup)} 기준
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-balance">
            {user.name}님의 무게–속도 e1RM 대시보드
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            스쿼트 또는 데드리프트의 세 가지 무게와 들어 올리는 평균 속도(MCV)를 바탕으로
            내 예측 최대근력(e1RM)과 목적별 추천 무게를 바로 확인하세요.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('measure')}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-md transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            새로운 e1RM 분석 시작
          </button>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium rounded-md border border-slate-700 transition-colors cursor-pointer"
          >
            전체 히스토리
          </button>
        </div>
      </section>

      {/* 3개 핵심 KPI 카드 (스쿼트 e1RM, 데드리프트 e1RM, 최근 측정일) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 스쿼트 카드 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              최근 스쿼트 추정 e1RM
            </span>
            <button
              type="button"
              onClick={() => onStartMeasureForExercise('squat')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
            >
              측정하기 <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {latestSquat ? (
            <div className="space-y-1">
              <div className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
                {formatKg(latestSquat.e1rmKg)}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                <span>측정일 {formatDateShortKo(latestSquat.measuredAt)}</span>
                <span aria-hidden="true">·</span>
                {squatDelta && squatDelta.diffKg !== null ? (
                  <span
                    className={`font-semibold ${
                      squatDelta.diffKg > 0
                        ? 'text-emerald-700'
                        : squatDelta.diffKg < 0
                        ? 'text-rose-700'
                        : 'text-slate-600'
                    }`}
                  >
                    직전 대비 {formatSignedKg(squatDelta.diffKg)} (
                    {formatSignedPercent(squatDelta.diffPercent)})
                  </span>
                ) : (
                  <span>최초 기록</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">아직 스쿼트 측정 기록이 없습니다.</p>
              <button
                type="button"
                onClick={() => onStartMeasureForExercise('squat')}
                className="text-xs font-semibold text-blue-700 underline cursor-pointer"
              >
                첫 스쿼트 측정 시작
              </button>
            </div>
          )}
        </div>

        {/* 데드리프트 카드 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              최근 데드리프트 추정 e1RM
            </span>
            <button
              type="button"
              onClick={() => onStartMeasureForExercise('deadlift')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
            >
              측정하기 <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {latestDeadlift ? (
            <div className="space-y-1">
              <div className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
                {formatKg(latestDeadlift.e1rmKg)}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                <span>측정일 {formatDateShortKo(latestDeadlift.measuredAt)}</span>
                <span aria-hidden="true">·</span>
                {deadliftDelta && deadliftDelta.diffKg !== null ? (
                  <span
                    className={`font-semibold ${
                      deadliftDelta.diffKg > 0
                        ? 'text-emerald-700'
                        : deadliftDelta.diffKg < 0
                        ? 'text-rose-700'
                        : 'text-slate-600'
                    }`}
                  >
                    직전 대비 {formatSignedKg(deadliftDelta.diffKg)} (
                    {formatSignedPercent(deadliftDelta.diffPercent)})
                  </span>
                ) : (
                  <span>최초 기록</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">
                아직 데드리프트 측정 기록이 없습니다.
              </p>
              <button
                type="button"
                onClick={() => onStartMeasureForExercise('deadlift')}
                className="text-xs font-semibold text-blue-700 underline cursor-pointer"
              >
                첫 데드리프트 측정 시작
              </button>
            </div>
          )}
        </div>

        {/* 최근 측정일 및 계정 상태 카드 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              최근 측정 및 누적 기록
            </span>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              <UserCog className="w-3.5 h-3.5" /> 프로필
            </button>
          </div>
          {latestAny ? (
            <div className="space-y-1">
              <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                {formatDateTimeKo(latestAny.measuredAt)}
              </div>
              <p className="text-xs text-slate-600">
                최근 종목: <strong>{getExerciseShortKo(latestAny.exercise)}</strong> ·
                누적 <span className="font-mono tabular-nums">{measurements.length}</span>건 저장됨
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-lg font-bold text-slate-900">기록 없음</div>
              <p className="text-xs text-slate-500">
                새 측정을 실행하고 결과를 저장해 보세요.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 최근 근력 변화 추세 그래프 + 최근 기록 목록 */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                종목별 추정 근력(e1RM) 변화 추세
              </h2>
              <p className="text-xs text-slate-500">
                저장된 측정 기록의 날짜별 변화 그래프
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => setTrendExercise('squat')}
                className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
                  trendExercise === 'squat'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                스쿼트 ({squatRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setTrendExercise('deadlift')}
                className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
                  trendExercise === 'deadlift'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                데드리프트 ({deadliftRecords.length})
              </button>
            </div>
          </div>

          <HistoryTrendChart
            records={trendRecords}
            accentColor={trendExercise === 'squat' ? '#2563EB' : '#0891B2'}
          />
        </div>

        {/* 최근 측정 기록 요약 목록 */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">최근 측정 기록</h2>
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" /> 전체 보기
              </button>
            </div>

            {measurements.length === 0 ? (
              <div className="py-10 text-center space-y-3 bg-slate-50 border border-slate-200 rounded-md">
                <p className="text-sm text-slate-600">저장된 측정 기록이 없습니다.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('measure')}
                  className="px-4 py-2 bg-blue-700 text-white text-xs font-semibold rounded-md cursor-pointer"
                >
                  첫 e1RM 분석하기
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {measurements.slice(0, 4).map((rec) => (
                  <div
                    key={rec.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <span>{getExerciseShortKo(rec.exercise)}</span>
                        <span className="font-mono text-blue-700 tabular-nums">
                          {formatKg(rec.e1rmKg)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="tabular-nums">
                          {formatDateShortKo(rec.measuredAt)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          R² {formatR2(rec.regression.r2, 2)}
                        </span>
                        <VelocitySourceTag source={rec.velocitySource} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenReport(rec.id)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" /> 보고서
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            회원 계정의 모든 측정 기록은 본인 계정에만 안전하게 분리 저장됩니다.
          </p>
        </div>
      </section>
    </div>
  );
};
