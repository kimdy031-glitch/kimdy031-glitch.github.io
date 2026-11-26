/**
 * [파일 목적] 운동 목적별 상대강도 구간(% of e1RM) 및 중량 반올림 단위 설정
 * [책임] 최대근력(e1RM)을 바탕으로 4가지 훈련 목적별 권장 중량 구간을 계산하기 위한 기준을 제공합니다.
 *        (ACSM 2026 Resistance Training Position Stand 참고)
 */

export interface TrainingZoneConfig {
  id: 'strength' | 'hypertrophy' | 'power' | 'endurance';
  nameKo: string;
  description: string;
  minPercent: number;
  maxPercent: number;
  repRangeLabel: string;
}

/**
 * 표시용 중량 반올림 단위 (kg)
 * 실제 바벨 원판(1.25kg x 2 = 2.5kg) 장착 단위를 고려해 2.5kg 단위로 반올림합니다.
 */
export const WEIGHT_ROUNDING_STEP_KG = 2.5;

/**
 * 4가지 운동 목적별 상대강도(% e1RM) 설정
 */
export const V1_TRAINING_ZONES: TrainingZoneConfig[] = [
  {
    id: 'strength',
    nameKo: '최대근력 (Strength)',
    description: '무거운 무게로 가장 강한 힘을 기르는 훈련 구간',
    minPercent: 85,
    maxPercent: 95,
    repRangeLabel: '1~5회',
  },
  {
    id: 'hypertrophy',
    nameKo: '근비대 (Hypertrophy)',
    description: '근육 크기를 키우기 좋은 중간~무거운 무게 구간',
    minPercent: 67.5,
    maxPercent: 82.5,
    repRangeLabel: '6~12회',
  },
  {
    id: 'power',
    nameKo: '근파워 (Power)',
    description: '빠르고 힘차게 들어 올려 순발력을 기르는 구간',
    minPercent: 50,
    maxPercent: 70,
    repRangeLabel: '3~6회 · 빠르게 들기',
  },
  {
    id: 'endurance',
    nameKo: '근지구력 (Endurance)',
    description: '여러 번 반복해 지치지 않는 힘을 기르는 가벼운 무게 구간',
    minPercent: 40,
    maxPercent: 60,
    repRangeLabel: '12~20회 이상',
  },
];
