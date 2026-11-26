/**
 * [파일 목적] VELOMAX v1 최소 역치 속도(MVT, Minimum Velocity Threshold) 기준 설정 관리
 * [책임] 운동 종목(스쿼트/데드리프트)과 사용자 분류(일반인/운동인) 조합에 따라 MVT 기준값을 반환합니다.
 */

import type { ExerciseType, MvtSetting, UserGroup } from '../types/domain';

/**
 * 운동 종목 × 사용자 그룹별 v1 MVT 매트릭스 (단위: m/s)
 */
const V1_MVT_MATRIX: Record<ExerciseType, Record<UserGroup, number>> = {
  squat: {
    general: 0.35, // 스쿼트 · 일반인 기준
    athlete: 0.30, // 스쿼트 · 운동인 기준
  },
  deadlift: {
    general: 0.25, // 데드리프트 · 일반인 기준
    athlete: 0.20, // 데드리프트 · 운동인 기준
  },
};

/**
 * [기능] 종목과 사용자 분류에 맞는 MVT 설정 객체를 반환
 */
export function getMvtSetting(
  exercise: ExerciseType,
  userGroup: UserGroup
): MvtSetting {
  const valueMs = V1_MVT_MATRIX[exercise][userGroup];
  const exerciseKo = exercise === 'squat' ? '스쿼트' : '데드리프트';
  const groupKo = userGroup === 'athlete' ? '운동인' : '일반인';

  return {
    valueMs,
    source: 'STANDARD_V1',
    label: `${exerciseKo} · ${groupKo} 기준 MVT`,
    note: '참고용 기준 속도(MVT)입니다. 개인 컨디션 및 실제 최대 중량 수행 결과와 다를 수 있습니다.',
  };
}
