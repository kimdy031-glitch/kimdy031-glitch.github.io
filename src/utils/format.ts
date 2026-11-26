/**
 * [파일 목적] 화면 표시용 숫자, 날짜, 단위, 한글 라벨 포맷팅 유틸리티
 * [책임] 내부 계산은 원본 부동소수점 정밀도를 유지하되, UI 출력 시 일관된 소수점과 단위를 제공합니다.
 */

import type {
  ExerciseType,
  GenderOption,
  ParticipationType,
  TrainingExperience,
  UserGroup,
  VelocityOrigin,
  VelocitySource,
} from '../types/domain';

/** [상수] '내 MCV를 알고 있어요' 모드에서 선택 가능한 MCV 출처 5종 */
export const DIRECT_MCV_ORIGIN_OPTIONS: Array<{
  value: Extract<
    VelocityOrigin,
    'gymaware_powertool' | 'moty_v' | 'ronfic_fitvisor' | 'imu_sensor' | 'other'
  >;
  label: string;
}> = [
  { value: 'gymaware_powertool', label: 'GymAware PowerTool' },
  { value: 'moty_v', label: 'Moty V' },
  { value: 'ronfic_fitvisor', label: 'Ronfic Fitvisor' },
  { value: 'imu_sensor', label: 'IMU 센서 장비' },
  { value: 'other', label: '기타' },
];

/** [기능] 중량(kg) 포맷 (기본 소수점 1자리) */
export function formatKg(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(decimals)} kg`;
}

/** [기능] 속도 MCV(m/s) 포맷 (기본 소수점 2자리) */
export function formatVelocity(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(decimals)} m/s`;
}

/** [기능] 직선 일치도 R² 포맷 (소수점 3자리 또는 2자리) */
export function formatR2(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return '-';
  return value.toFixed(decimals);
}

/** [기능] 변화량(kg) 부호 포함 포맷 (예: +4.5 kg, -2.0 kg) */
export function formatSignedKg(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)} kg`;
}

/** [기능] 변화율(%) 부호 포함 포맷 (예: +3.8%, -1.5%) */
export function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/** [기능] ISO 날짜 문자열을 한국어 일시 문자열로 변환 */
export function formatDateTimeKo(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** [기능] ISO 날짜 문자열을 간략한 날짜(YYYY.MM.DD)로 변환 */
export function formatDateShortKo(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

/** [기능] 파일 크기(Bytes)를 읽기 쉬운 MB/KB 문자열로 변환 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** [기능] 운동 종목 영문 코드를 한글 명칭으로 변환 */
export function getExerciseLabelKo(exercise: ExerciseType): string {
  return exercise === 'squat' ? '스쿼트 (Squat)' : '데드리프트 (Deadlift)';
}

/** [기능] 운동 종목 짧은 한글 명칭 반환 */
export function getExerciseShortKo(exercise: ExerciseType): string {
  return exercise === 'squat' ? '스쿼트' : '데드리프트';
}

/** [기능] 사용자 그룹 코드를 한글 명칭으로 변환 */
export function getUserGroupLabelKo(group: UserGroup): string {
  return group === 'athlete' ? '운동인' : '일반인';
}

/** [기능] MCV 입력 방식 코드를 쉬운 한글 라벨로 변환 */
export function getVelocitySourceLabelKo(source: VelocitySource): string {
  return source === 'mediapipe' ? 'AI 자세 추정 MCV' : '직접 입력한 MCV';
}

/** [기능] MCV 출처를 한글 라벨로 변환 */
export function getVelocityOriginLabelKo(origin?: VelocityOrigin): string {
  switch (origin) {
    case 'velomax_raw':
      return '영상 AI 자세 추정';
    case 'gymaware_powertool':
    case 'gymaware':
      return 'GymAware PowerTool';
    case 'moty_v':
      return 'Moty V';
    case 'ronfic_fitvisor':
      return 'Ronfic Fitvisor';
    case 'imu_sensor':
      return 'IMU 센서 장비';
    case 'other':
      return '기타';
    default:
      return '기타 / 직접 입력';
  }
}

/** [기능] 성별 코드를 한글로 변환 */
export function getGenderLabelKo(gender: GenderOption): string {
  switch (gender) {
    case 'male':
      return '남성';
    case 'female':
      return '여성';
    default:
      return '응답하지 않음';
  }
}

/** [기능] YYYY-MM-DD 생년월일 문자열을 안전한 연/월/일 숫자로 파싱 */
export function parseIsoBirthDate(
  birthDate?: string
): { year: number; month: number; day: number } | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
    return null;
  }
  const [yStr, mStr, dStr] = birthDate.trim().split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  const check = new Date(year, month - 1, day);
  if (
    check.getFullYear() !== year ||
    check.getMonth() !== month - 1 ||
    check.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/**
 * [기능] 생년월일(YYYY-MM-DD) 기준 만나이를 자동 계산합니다.
 */
export function calculateInternationalAge(
  birthDate?: string,
  referenceDate: Date = new Date(),
  fallbackAge = 0
): number {
  const parsed = parseIsoBirthDate(birthDate);
  if (!parsed) return fallbackAge;

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;
  const currentDay = referenceDate.getDate();

  let age = currentYear - parsed.year;
  if (
    currentMonth < parsed.month ||
    (currentMonth === parsed.month && currentDay < parsed.day)
  ) {
    age -= 1;
  }
  return Math.max(0, age);
}

/**
 * [기능] 기준일(기본: 오늘)이 사용자의 생일(월·일 일치)인지 확인합니다.
 */
export function isBirthdayToday(
  birthDate?: string,
  referenceDate: Date = new Date()
): boolean {
  const parsed = parseIsoBirthDate(birthDate);
  if (!parsed) return false;
  return (
    parsed.month === referenceDate.getMonth() + 1 &&
    parsed.day === referenceDate.getDate()
  );
}

/**
 * [기능] 생년월일(YYYY-MM-DD)을 'YYYY.MM.DD' 형식으로 표시
 */
export function formatBirthDateKo(birthDate?: string): string {
  const parsed = parseIsoBirthDate(birthDate);
  if (!parsed) return '-';
  return `${parsed.year}.${String(parsed.month).padStart(2, '0')}.${String(
    parsed.day
  ).padStart(2, '0')}`;
}

/** [상수] n개월 수부터 5단계로 세분화된 운동 경력 선택 옵션 */
export const TRAINING_EXPERIENCE_OPTIONS: Array<{
  value: Exclude<TrainingExperience, 'under1year'>;
  label: string;
}> = [
  { value: 'under3months', label: '3개월 미만' },
  { value: '3to6months', label: '3~6개월' },
  { value: '6to12months', label: '6개월~1년' },
  { value: '1to3years', label: '1~3년' },
  { value: 'over3years', label: '3년 이상' },
];

/** [기능] 운동 경력 코드를 한글로 변환 (5단계 + 기존 호환) */
export function getExperienceLabelKo(exp: TrainingExperience): string {
  switch (exp) {
    case 'under3months':
      return '3개월 미만';
    case '3to6months':
      return '3~6개월';
    case '6to12months':
      return '6개월~1년';
    case 'under1year':
      return '1년 미만';
    case '1to3years':
      return '1~3년';
    case 'over3years':
      return '3년 이상';
  }
}

/** [기능] 운동 참여 형태 코드를 한글로 변환 */
export function getParticipationLabelKo(type: ParticipationType): string {
  return type === 'athlete_training'
    ? '선수 또는 체계적인 선수 훈련 참여'
    : '일반 건강·피트니스 운동';
}
