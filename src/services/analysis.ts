/**
 * [파일 목적] VELOMAX 핵심 수학 계산 엔진 — 최소제곱 선형회귀, R², e1RM 산출, 목적별 권장 중량 및 히스토리 변화량 계산
 * [책임]
 *   - 입력된 3개 이상의 (중량, MCV) 쌍으로부터 결정론적(Deterministic) 계산을 수행합니다.
 * [주의] 동일한 입력과 설정에 대해서는 항상 100% 동일한 결과를 반환합니다. (Math.random 사용 금지)
 */

import { getMvtSetting } from '../config/mvt';
import {
  V1_TRAINING_ZONES,
  WEIGHT_ROUNDING_STEP_KG,
} from '../config/trainingZones';
import type {
  AnalysisDraftResult,
  ExerciseType,
  LoadVelocityPoint,
  MeasurementRecord,
  RegressionResult,
  TrainingZoneRecommendation,
  UserGroup,
  VelocityOrigin,
  VelocitySource,
} from '../types/domain';
import {
  MAX_MEASUREMENT_SETS,
  validateMeasurementPoints,
} from '../utils/validation';

/** 현재 v1 분석 엔진 버전 식별자 */
export const ANALYSIS_ENGINE_VERSION = 'v1.0.0';

/**
 * [기능] 최소제곱법(OLS)을 이용해 부하(L)-속도(v) 선형회귀식을 계산합니다.
 *        수식: v_hat = slope * L + intercept
 * [입력] points: [{ loadKg, mcvMs }, ...] (서로 다른 중량 3개 이상)
 * [반환] { slope, intercept, r2 }
 */
export function calculateLoadVelocityRegression(
  points: LoadVelocityPoint[]
): RegressionResult {
  const validation = validateMeasurementPoints(points);
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }

  const n = points.length;
  const meanL = points.reduce((acc, p) => acc + p.loadKg, 0) / n;
  const meanV = points.reduce((acc, p) => acc + p.mcvMs, 0) / n;

  let sxx = 0;
  let sxy = 0;
  for (const pt of points) {
    const dL = pt.loadKg - meanL;
    const dV = pt.mcvMs - meanV;
    sxx += dL * dL;
    sxy += dL * dV;
  }

  if (Math.abs(sxx) < 1e-12) {
    throw new Error('중량 값의 분포가 동일하여 선형회귀 기울기를 계산할 수 없습니다.');
  }

  const slope = sxy / sxx;
  const intercept = meanV - slope * meanL;

  let ssTot = 0;
  let ssRes = 0;
  for (const pt of points) {
    const predictedV = slope * pt.loadKg + intercept;
    ssTot += (pt.mcvMs - meanV) ** 2;
    ssRes += (pt.mcvMs - predictedV) ** 2;
  }

  const r2 = ssTot < 1e-12 ? 0 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));

  return {
    slope,
    intercept,
    r2,
  };
}

/**
 * [기능] 선형회귀식과 MVT(최소 역치 속도)를 이용해 추정 최대근력(e1RM)을 계산합니다.
 *        수식: e1RM = (MVT - b) / a
 */
export function calculateE1RM(
  regression: RegressionResult,
  mvtMs: number,
  maxMeasuredLoadKg: number
): { e1rmKg: number; isHighExtrapolation: boolean; warnings: string[] } {
  const { slope, intercept, r2 } = regression;
  const warnings: string[] = [];

  if (!Number.isFinite(slope) || Math.abs(slope) < 1e-9) {
    throw new Error(
      '중량 변화에 따른 속도 변화(기울기)가 0에 가까워 e1RM을 계산할 수 없습니다. 입력 속도를 확인해 주세요.'
    );
  }

  if (slope > 0) {
    throw new Error(
      '중량이 증가할수록 수행 속도(MCV)가 오히려 증가하는 양의 기울기(a > 0)가 도출되었습니다. 정상적인 부하–속도 반비례 관계가 아니므로 각 중량별 MCV를 다시 확인해 주세요.'
    );
  }

  const rawE1rm = (mvtMs - intercept) / slope;

  if (!Number.isFinite(rawE1rm) || rawE1rm <= 0) {
    throw new Error(
      '산출된 e1RM이 유효한 양수가 아닙니다. 중량과 MCV 입력값을 다시 확인해 주세요.'
    );
  }

  if (rawE1rm <= maxMeasuredLoadKg) {
    throw new Error(
      `추정된 e1RM(${rawE1rm.toFixed(1)}kg)이 측정 중량 최댓값(${maxMeasuredLoadKg}kg)보다 작거나 같습니다. 이미 들어 올린 중량의 속도가 기준 MVT(${mvtMs.toFixed(2)}m/s)보다 느리게 입력되었는지 확인해 주세요.`
    );
  }

  if (rawE1rm > 800) {
    throw new Error(
      `추정 e1RM(${rawE1rm.toFixed(1)}kg)이 비현실적으로 높게 계산되었습니다. 중량 구간 대비 속도 차이가 너무 작지 않은지 확인해 주세요.`
    );
  }

  const isHighExtrapolation =
    rawE1rm > maxMeasuredLoadKg * 1.65 || rawE1rm - maxMeasuredLoadKg > 60;

  if (isHighExtrapolation) {
    warnings.push(
      '무거운 구간 예측 주의: 입력하신 최대 무게보다 훨씬 무거운 최대근력을 예측하고 있어 오차가 커질 수 있습니다.'
    );
  }

  if (r2 < 0.85) {
    warnings.push(
      `직선 일치도(R² = ${r2.toFixed(3)})가 다소 낮습니다. 세 번의 측정 속도가 고르게 나오지 않았을 수 있으니 입력값을 확인해 주세요.`
    );
  }

  return {
    e1rmKg: rawE1rm,
    isHighExtrapolation,
    warnings,
  };
}

/**
 * [기능] 지정한 단위(기본 2.5kg)로 중량을 반올림하는 헬퍼 함수
 */
export function roundToStep(
  value: number,
  stepKg = WEIGHT_ROUNDING_STEP_KG
): number {
  return Math.round(value / stepKg) * stepKg;
}

/**
 * [기능] 산출된 e1RM을 바탕으로 4가지 운동 목적별 권장 중량 구간을 계산합니다.
 */
export function calculateRecommendedLoads(
  e1rmKg: number,
  stepKg = WEIGHT_ROUNDING_STEP_KG
): TrainingZoneRecommendation[] {
  return V1_TRAINING_ZONES.map((zone) => ({
    id: zone.id,
    nameKo: zone.nameKo,
    description: zone.description,
    minPercent: zone.minPercent,
    maxPercent: zone.maxPercent,
    minLoadKg: roundToStep((e1rmKg * zone.minPercent) / 100, stepKg),
    maxLoadKg: roundToStep((e1rmKg * zone.maxPercent) / 100, stepKg),
    repRangeLabel: zone.repRangeLabel,
  }));
}

/**
 * [기능] 전체 분석 파이프라인을 실행하여 선형회귀, e1RM, 목적별 권장 중량을 산출합니다.
 */
export function runFullE1RMAnalysis(params: {
  userId: string;
  exercise: ExerciseType;
  userGroup: UserGroup;
  velocitySource: VelocitySource;
  velocityOrigin?: VelocityOrigin;
  points: LoadVelocityPoint[];
  attachedVideoNames?: string[];
  measuredAt?: string;
  id?: string;
}): AnalysisDraftResult {
  const sortedPoints = [...params.points]
    .map((p) => ({ loadKg: p.loadKg, mcvMs: p.mcvMs }))
    .sort((a, b) => a.loadKg - b.loadKg);

  const velocityOrigin: VelocityOrigin =
    params.velocityOrigin ??
    (params.velocitySource === 'mediapipe' ? 'velomax_raw' : 'unknown');

  const mvtSetting = getMvtSetting(params.exercise, params.userGroup);
  const maxMeasuredLoadKg = sortedPoints[sortedPoints.length - 1].loadKg;

  const regression = calculateLoadVelocityRegression(sortedPoints);
  const calc = calculateE1RM(
    regression,
    mvtSetting.valueMs,
    maxMeasuredLoadKg
  );

  const zones = calculateRecommendedLoads(calc.e1rmKg);

  // Firestore 보안 규칙의 isValidId 규격(^[a-zA-Z0-9_-]+$)에 맞춘 고유 ID 생성
  const generatedId =
    params.id ?? `m-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const record: MeasurementRecord = {
    id: generatedId,
    userId: params.userId,
    exercise: params.exercise,
    userGroupSnapshot: params.userGroup,
    measuredAt: params.measuredAt ?? new Date().toISOString(),
    velocitySource: params.velocitySource,
    velocityOrigin,
    videoAnalysisPerformed: params.velocitySource === 'mediapipe',
    attachedVideoNames: (params.attachedVideoNames ?? [])
      .filter(Boolean)
      .slice(0, MAX_MEASUREMENT_SETS),
    points: sortedPoints,
    regression,
    mvt: {
      valueMs: mvtSetting.valueMs,
      source: 'STANDARD_V1',
    },
    e1rmKg: calc.e1rmKg,
    isHighExtrapolation: calc.isHighExtrapolation,
    analysisEngineVersion: ANALYSIS_ENGINE_VERSION,
  };

  return {
    record,
    zones,
    warnings: calc.warnings,
  };
}

/**
 * [기능] 히스토리 비교용: 현재 측정과 직전 측정 간의 변화량(kg), 변화율(%), 분석 조건 차이 여부를 계산합니다.
 */
export function calculateHistoryDelta(
  current: MeasurementRecord,
  previous?: MeasurementRecord
): {
  diffKg: number | null;
  diffPercent: number | null;
  conditionChanged: boolean;
  conditionNotes: string[];
} {
  if (!previous) {
    return {
      diffKg: null,
      diffPercent: null,
      conditionChanged: false,
      conditionNotes: [],
    };
  }

  const diffKg = current.e1rmKg - previous.e1rmKg;
  const diffPercent =
    previous.e1rmKg > 0 ? (diffKg / previous.e1rmKg) * 100 : null;

  const conditionNotes: string[] = [];
  if (Math.abs(current.mvt.valueMs - previous.mvt.valueMs) > 1e-6) {
    conditionNotes.push(
      `MVT 기준 차이 (${previous.mvt.valueMs.toFixed(2)} → ${current.mvt.valueMs.toFixed(2)} m/s)`
    );
  }
  if (current.velocitySource !== previous.velocitySource) {
    conditionNotes.push('MCV 측정 방식 차이 (직접 입력 / AI 자세 추정)');
  }
  if (current.userGroupSnapshot !== previous.userGroupSnapshot) {
    conditionNotes.push('사용자 구분(일반인/운동인) 변경');
  }
  if (current.analysisEngineVersion !== previous.analysisEngineVersion) {
    conditionNotes.push('분석 방식 버전 차이');
  }

  return {
    diffKg,
    diffPercent,
    conditionChanged: conditionNotes.length > 0,
    conditionNotes,
  };
}
