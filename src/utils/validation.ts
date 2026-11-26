/**
 * [파일 목적] 회원가입, 로그인, 프로필 수정, 부하-속도(3점) 측정 입력에 대한 유효성 검증 로직
 * [책임] firebase-blueprint.json과 동일한 길이/형식 규격을 적용해 잘못된 입력을 사전 차단하고
 *        사용자가 수정할 수 있는 명확한 한국어 안내 메시지를 반환합니다.
 */

import type {
  GuestLoginInput,
  LoadVelocityPoint,
  UserProfileUpdateInput,
  UserRegistrationInput,
} from '../types/domain';
import { calculateInternationalAge, parseIsoBirthDate } from './format';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  fieldErrors: Record<string, string>;
}

/**
 * [헬퍼] 생년월일 형식 및 만나이 현실적 범위(만 14~90세) 검증
 */
export function validateBirthDate(
  birthDate: string,
  referenceDate: Date = new Date()
): { valid: boolean; error?: string; internationalAge: number } {
  const parsed = parseIsoBirthDate(birthDate);
  if (!parsed) {
    return {
      valid: false,
      error: '올바른 생년월일(YYYY-MM-DD)을 선택해 주세요.',
      internationalAge: 0,
    };
  }

  const birthObj = new Date(parsed.year, parsed.month - 1, parsed.day);
  if (birthObj.getTime() > referenceDate.getTime()) {
    return {
      valid: false,
      error: '생년월일은 오늘 이후 날짜로 입력할 수 없습니다.',
      internationalAge: 0,
    };
  }

  const internationalAge = calculateInternationalAge(birthDate, referenceDate);
  if (internationalAge < 14 || internationalAge > 90) {
    return {
      valid: false,
      error: '만나이는 만 14세 이상 만 90세 이하 범위여야 합니다.',
      internationalAge,
    };
  }

  return { valid: true, internationalAge };
}

/**
 * [기능] 이메일 로그인 입력값 검증
 */
export function validateLoginInput(
  email: string,
  password: string
): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};

  const trimmedEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedEmail) {
    const msg = '이메일을 입력해 주세요.';
    errors.push(msg);
    fieldErrors.email = msg;
  } else if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 120) {
    const msg = '올바른 이메일 형식(예: name@example.com)으로 입력해 주세요.';
    errors.push(msg);
    fieldErrors.email = msg;
  }

  if (!password || password.length < 6) {
    const msg = '비밀번호는 6자 이상 입력해 주세요.';
    errors.push(msg);
    fieldErrors.password = msg;
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

/**
 * [기능] Firebase 회원가입 폼 입력값 검증 (이름, 이메일, 비밀번호, 생년월일)
 */
export function validateRegistrationInput(
  input: UserRegistrationInput,
  requirePassword = true
): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};

  const trimmedName = input.name.trim();
  if (!trimmedName) {
    const msg = '이름 또는 닉네임을 입력해 주세요.';
    errors.push(msg);
    fieldErrors.name = msg;
  } else if (trimmedName.length < 2 || trimmedName.length > 30) {
    const msg = '이름은 2자 이상 30자 이하로 입력해 주세요.';
    errors.push(msg);
    fieldErrors.name = msg;
  }

  const trimmedEmail = input.email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedEmail) {
    const msg = '이메일을 입력해 주세요.';
    errors.push(msg);
    fieldErrors.email = msg;
  } else if (
    trimmedEmail.length < 5 ||
    trimmedEmail.length > 120 ||
    !emailRegex.test(trimmedEmail)
  ) {
    const msg = '올바른 이메일 형식(예: name@example.com)으로 입력해 주세요.';
    errors.push(msg);
    fieldErrors.email = msg;
  }

  if (requirePassword) {
    const pw = input.password ?? '';
    if (pw.length < 6) {
      const msg = '비밀번호는 최소 6자 이상으로 설정해 주세요.';
      errors.push(msg);
      fieldErrors.password = msg;
    } else if (pw.length > 128) {
      const msg = '비밀번호는 128자 이하로 입력해 주세요.';
      errors.push(msg);
      fieldErrors.password = msg;
    }
  }

  const birthCheck = validateBirthDate(input.birthDate);
  if (!birthCheck.valid && birthCheck.error) {
    errors.push(birthCheck.error);
    fieldErrors.birthDate = birthCheck.error;
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

/**
 * [기능] 프로필 수정 폼 입력값 검증
 */
export function validateProfileUpdateInput(
  input: UserProfileUpdateInput
): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};

  const trimmedName = input.name.trim();
  if (!trimmedName) {
    const msg = '이름 또는 닉네임을 입력해 주세요.';
    errors.push(msg);
    fieldErrors.name = msg;
  } else if (trimmedName.length < 2 || trimmedName.length > 30) {
    const msg = '이름은 2자 이상 30자 이하로 입력해 주세요.';
    errors.push(msg);
    fieldErrors.name = msg;
  }

  const birthCheck = validateBirthDate(input.birthDate);
  if (!birthCheck.valid && birthCheck.error) {
    errors.push(birthCheck.error);
    fieldErrors.birthDate = birthCheck.error;
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

/**
 * [기능] 비회원(게스트) 로그인 입력값 검증 (이름, 생년월일, 일반인/운동인)
 */
export function validateGuestLoginInput(input: GuestLoginInput): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};

  const trimmedName = input.name.trim();
  if (!trimmedName) {
    const msg = '비회원 이름을 입력해 주세요.';
    errors.push(msg);
    fieldErrors.name = msg;
  } else if (trimmedName.length < 2 || trimmedName.length > 30) {
    const msg = '이름은 2자 이상 30자 이하로 입력해 주세요.';
    errors.push(msg);
    fieldErrors.name = msg;
  }

  const birthCheck = validateBirthDate(input.birthDate);
  if (!birthCheck.valid && birthCheck.error) {
    errors.push(birthCheck.error);
    fieldErrors.birthDate = birthCheck.error;
  }

  if (input.userGroup !== 'general' && input.userGroup !== 'athlete') {
    const msg = '일반인 또는 운동인 구분을 선택해 주세요.';
    errors.push(msg);
    fieldErrors.userGroup = msg;
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

export const MIN_MEASUREMENT_SETS = 3;
export const MAX_MEASUREMENT_SETS = 5;

/**
 * [기능] 부하-속도 분석을 위한 3~5개 중량 및 MCV 입력값 검증
 */
export function validateMeasurementPoints(
  points: LoadVelocityPoint[]
): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};

  if (
    !Array.isArray(points) ||
    points.length < MIN_MEASUREMENT_SETS ||
    points.length > MAX_MEASUREMENT_SETS
  ) {
    errors.push(
      `서로 다른 ${MIN_MEASUREMENT_SETS}개 이상 최대 ${MAX_MEASUREMENT_SETS}개의 중량과 MCV 세트를 입력해야 합니다.`
    );
    return { valid: false, errors, fieldErrors };
  }

  const seenLoads = new Set<number>();

  points.forEach((pt, idx) => {
    const setLabel = `세트 ${idx + 1}`;

    if (typeof pt.loadKg !== 'number' || !Number.isFinite(pt.loadKg) || pt.loadKg <= 0) {
      const msg = `${setLabel} 중량(kg)은 0보다 큰 숫자로 입력해 주세요.`;
      errors.push(msg);
      fieldErrors[`load_${idx}`] = '0 초과 숫자 필요';
    } else if (pt.loadKg > 600) {
      const msg = `${setLabel} 중량(${pt.loadKg}kg)이 비현실적으로 큽니다. 600kg 이하로 확인해 주세요.`;
      errors.push(msg);
      fieldErrors[`load_${idx}`] = '600kg 이하 입력';
    } else {
      const normalizedLoad = Math.round(pt.loadKg * 100) / 100;
      if (seenLoads.has(normalizedLoad)) {
        const msg = `모든 세트의 중량은 서로 달라야 합니다. (${normalizedLoad}kg 중복)`;
        if (!errors.includes(msg)) errors.push(msg);
        fieldErrors[`load_${idx}`] = '중량 중복';
      }
      seenLoads.add(normalizedLoad);
    }

    if (typeof pt.mcvMs !== 'number' || !Number.isFinite(pt.mcvMs) || pt.mcvMs <= 0) {
      const msg = `${setLabel} MCV(m/s)는 0보다 큰 숫자로 입력해 주세요.`;
      errors.push(msg);
      fieldErrors[`mcv_${idx}`] = '0 초과 속도 필요';
    } else if (pt.mcvMs > 3.0) {
      const msg = `${setLabel} MCV(${pt.mcvMs}m/s)가 일반 바벨 수행 범위(3.0 m/s 이하)를 벗어났습니다.`;
      errors.push(msg);
      fieldErrors[`mcv_${idx}`] = '3.0 m/s 이하 입력';
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors,
  };
}
