/**
 * [파일 목적] VELOMAX v1 핵심 계산 엔진, 도메인 규칙 및 인증 입력 검증 단위 테스트 스위트
 * [실행 방법] npx tsx tests/analysis.test.ts  또는  npm test
 */

import assert from 'node:assert/strict';
import { getMvtSetting } from '../src/config/mvt';
import {
  calculateE1RM,
  calculateHistoryDelta,
  calculateLoadVelocityRegression,
  calculateRecommendedLoads,
  runFullE1RMAnalysis,
} from '../src/services/analysis';
import {
  computeCalibrationFromPoints,
  computeMcvFromWristTrajectory,
} from '../src/services/mediapipeMcv';
import type { ParticipationType, UserGroup } from '../src/types/domain';
import {
  calculateInternationalAge,
  DIRECT_MCV_ORIGIN_OPTIONS,
  getExperienceLabelKo,
  isBirthdayToday,
  TRAINING_EXPERIENCE_OPTIONS,
} from '../src/utils/format';
import {
  validateBirthDate,
  validateGuestLoginInput,
  validateLoginInput,
  validateMeasurementPoints,
  validateRegistrationInput,
} from '../src/utils/validation';

function classifyUserGroupPure(participationType: ParticipationType): UserGroup {
  return participationType === 'athlete_training' ? 'athlete' : 'general';
}

function runTests() {
  let passed = 0;

  function test(name: string, fn: () => void) {
    fn();
    passed += 1;
    console.log(`✓ PASS: ${name}`);
  }

  // 1) 최소제곱 선형회귀 정확도 검증
  test('40/60/80kg, MCV 0.90/0.70/0.50m/s 회귀식, R², e1RM 검증', () => {
    const reg = calculateLoadVelocityRegression([
      { loadKg: 40, mcvMs: 0.9 },
      { loadKg: 60, mcvMs: 0.7 },
      { loadKg: 80, mcvMs: 0.5 },
    ]);
    assert.ok(Math.abs(reg.slope - -0.01) < 1e-9, `기울기 오차: ${reg.slope}`);
    assert.ok(Math.abs(reg.intercept - 1.3) < 1e-9, `절편 오차: ${reg.intercept}`);
    assert.ok(Math.abs(reg.r2 - 1.0) < 1e-9, `R² 오차: ${reg.r2}`);

    const mvt = getMvtSetting('squat', 'general').valueMs; // 0.35 m/s
    const { e1rmKg } = calculateE1RM(reg, mvt, 80);
    assert.ok(Math.abs(e1rmKg - 95.0) < 1e-6, `e1RM 오차: ${e1rmKg}`);
  });

  // 2) 중복 중량 입력 차단
  test('서로 같은 중량(60/60/80kg) 입력 시 검증 실패 및 예외 발생', () => {
    const validation = validateMeasurementPoints([
      { loadKg: 60, mcvMs: 0.8 },
      { loadKg: 60, mcvMs: 0.7 },
      { loadKg: 80, mcvMs: 0.5 },
    ]);
    assert.equal(validation.valid, false);
    assert.throws(() =>
      calculateLoadVelocityRegression([
        { loadKg: 60, mcvMs: 0.8 },
        { loadKg: 60, mcvMs: 0.7 },
        { loadKg: 80, mcvMs: 0.5 },
      ])
    );
  });

  // 3) 중량 증가 시 속도 증가(양의 기울기) 차단
  test('중량 증가에 따라 MCV가 증가하면 e1RM 계산 중단', () => {
    const reg = calculateLoadVelocityRegression([
      { loadKg: 40, mcvMs: 0.5 },
      { loadKg: 60, mcvMs: 0.7 },
      { loadKg: 80, mcvMs: 0.9 },
    ]);
    assert.ok(reg.slope > 0);
    assert.throws(() => calculateE1RM(reg, 0.35, 80));
  });

  // 4) 누락/음수/NaN MCV 차단
  test('음수 또는 NaN MCV 입력 시 검증 오류 반환', () => {
    const negCheck = validateMeasurementPoints([
      { loadKg: 40, mcvMs: -0.5 },
      { loadKg: 60, mcvMs: 0.7 },
      { loadKg: 80, mcvMs: 0.5 },
    ]);
    assert.equal(negCheck.valid, false);

    const nanCheck = validateMeasurementPoints([
      { loadKg: 40, mcvMs: Number.NaN },
      { loadKg: 60, mcvMs: 0.7 },
      { loadKg: 80, mcvMs: 0.5 },
    ]);
    assert.equal(nanCheck.valid, false);
  });

  // 5) e1RM <= 최대 측정 중량 차단 규칙
  test('측정 최대 중량(100kg)보다 e1RM이 작거나 같으면 계산 중단', () => {
    const reg = calculateLoadVelocityRegression([
      { loadKg: 60, mcvMs: 0.7 },
      { loadKg: 80, mcvMs: 0.5 },
      { loadKg: 100, mcvMs: 0.3 },
    ]);
    assert.throws(() => calculateE1RM(reg, 0.35, 100));
  });

  // 6) 결정론적 결과 재현성 및 영상 MCV 원본 반영 검증
  test('동일한 입력과 설정으로 반복 분석 시 항상 동일한 e1RM 반환 및 보정식 미적용', () => {
    const first = runFullE1RMAnalysis({
      userId: 'test-user',
      exercise: 'deadlift',
      userGroup: 'athlete',
      velocitySource: 'manual',
      points: [
        { loadKg: 100, mcvMs: 0.75 },
        { loadKg: 130, mcvMs: 0.55 },
        { loadKg: 160, mcvMs: 0.36 },
      ],
    });
    const second = runFullE1RMAnalysis({
      userId: 'test-user',
      exercise: 'deadlift',
      userGroup: 'athlete',
      velocitySource: 'manual',
      points: [
        { loadKg: 160, mcvMs: 0.36 },
        { loadKg: 100, mcvMs: 0.75 },
        { loadKg: 130, mcvMs: 0.55 },
      ],
    });
    assert.equal(first.record.e1rmKg, second.record.e1rmKg);
    assert.equal(first.record.videoAnalysisPerformed, false);
    assert.equal(first.record.mvt.source, 'STANDARD_V1');

    const videoAnalysis = runFullE1RMAnalysis({
      userId: 'test-user',
      exercise: 'squat',
      userGroup: 'general',
      velocitySource: 'mediapipe',
      points: [
        { loadKg: 40, mcvMs: 0.9 },
        { loadKg: 60, mcvMs: 0.7 },
        { loadKg: 80, mcvMs: 0.5 },
      ],
    });
    assert.ok(Math.abs(videoAnalysis.record.e1rmKg - 95.0) < 1e-6);
    assert.equal(videoAnalysis.record.points[0].mcvMs, 0.9);
  });

  // 7) 목적별 권장 중량 2.5kg 단위 반올림 검증
  test('4가지 목적별 권장 중량이 2.5kg 단위로 정확히 반올림됨', () => {
    const zones = calculateRecommendedLoads(100);
    assert.equal(zones.length, 4);
    zones.forEach((z) => {
      assert.equal(z.minLoadKg % 2.5, 0);
      assert.equal(z.maxLoadKg % 2.5, 0);
    });
  });

  // 8) 히스토리 변화량 0 방어 및 조건 차이 감지
  test('히스토리 변화량 계산 시 직전 값이 0이면 변화율 null 반환 및 조건 차이 감지', () => {
    const base = runFullE1RMAnalysis({
      userId: 'u1',
      exercise: 'squat',
      userGroup: 'general',
      velocitySource: 'mediapipe',
      points: [
        { loadKg: 40, mcvMs: 0.9 },
        { loadKg: 60, mcvMs: 0.7 },
        { loadKg: 80, mcvMs: 0.5 },
      ],
    }).record;

    const zeroPrev = { ...base, e1rmKg: 0 };
    const zeroDelta = calculateHistoryDelta(base, zeroPrev);
    assert.equal(zeroDelta.diffPercent, null);

    const diffCondPrev = {
      ...base,
      velocitySource: 'manual' as const,
      mvt: { valueMs: 0.3, source: 'STANDARD_V1' as const },
    };
    const condDelta = calculateHistoryDelta(base, diffCondPrev);
    assert.equal(condDelta.conditionChanged, true);
    assert.ok(condDelta.conditionNotes.length >= 2);
  });

  // 9) 사용자 자동 분류 규칙
  test('참여 형태에 따라 일반인 / 운동인 자동 분류', () => {
    assert.equal(classifyUserGroupPure('recreational'), 'general');
    assert.equal(classifyUserGroupPure('athlete_training'), 'athlete');
  });

  // 10) 2점 캘리브레이션 축척 계산 검증
  test('2점 캘리브레이션: 45cm 원판이 225px일 때 metersPerPixel = 0.002 m/px', () => {
    const cal = computeCalibrationFromPoints({
      pointA: { xNorm: 0.5, yNorm: 0.25 },
      pointB: { xNorm: 0.5, yNorm: 0.5 },
      videoWidth: 1000,
      videoHeight: 900,
      referenceLengthCm: 45,
    });
    assert.ok(Math.abs(cal.pixelDistance - 225) < 1e-6);
    assert.ok(Math.abs(cal.metersPerPixel - 0.002) < 1e-9);
  });

  // 11) MediaPipe 손목 궤적 기반 스쿼트 구심성 MCV 알고리즘 검증
  test('스쿼트 손목 궤적(0.75s 동안 0.60m 상승)에서 MCV ≈ 0.80 m/s 정확히 산출', () => {
    const rawSamples: Array<{
      timeSec: number;
      wristXNorm: number;
      wristYNorm: number;
      confidence: number;
    }> = [];
    for (let t = 0; t <= 2.601; t += 0.05) {
      let heightM = 1.2;
      if (t > 0.5 && t <= 1.5) {
        heightM = 1.2 - 0.6 * ((t - 0.5) / 1.0);
      } else if (t > 1.5 && t <= 2.25) {
        heightM = 0.6 + 0.6 * ((t - 1.5) / 0.75);
      }
      const wristYNorm = 1 - heightM / 2.0;
      rawSamples.push({
        timeSec: Number(t.toFixed(2)),
        wristXNorm: 0.5,
        wristYNorm,
        confidence: 0.95,
      });
    }

    const res = computeMcvFromWristTrajectory({
      rawSamples,
      totalFramesProcessed: rawSamples.length,
      videoHeight: 1000,
      metersPerPixel: 0.002,
      exercise: 'squat',
    });

    assert.ok(
      Math.abs(res.mcvMs - 0.8) < 0.08,
      `스쿼트 계산 MCV가 기대치(0.80 m/s)와 다름: ${res.mcvMs}`
    );
    assert.ok(res.verticalDisplacementMeters > 0.5);
  });

  // 12) 다회 반복(3회) 스쿼트 궤적에서 최초 2회만 MCV 계산 반영
  test('다회 반복(3회) 스쿼트 궤적에서 3회차(근피로)를 제외하고 최초 2회까지만 MCV 계산에 반영', () => {
    const rawSamples: Array<{
      timeSec: number;
      wristXNorm: number;
      wristYNorm: number;
      confidence: number;
    }> = [];
    for (let t = 0; t <= 5.501; t += 0.05) {
      let heightM = 1.2;
      if (t <= 0.8) {
        heightM = 1.2 - 0.6 * (t / 0.8);
      } else if (t <= 1.47) {
        heightM = 0.6 + 0.6 * ((t - 0.8) / 0.67);
      } else if (t <= 2.27) {
        heightM = 1.2 - 0.6 * ((t - 1.47) / 0.8);
      } else if (t <= 3.02) {
        heightM = 0.6 + 0.6 * ((t - 2.27) / 0.75);
      } else if (t <= 3.82) {
        heightM = 1.2 - 0.6 * ((t - 3.02) / 0.8);
      } else if (t <= 5.32) {
        heightM = 0.6 + 0.6 * ((t - 3.82) / 1.5);
      }
      rawSamples.push({
        timeSec: Number(t.toFixed(2)),
        wristXNorm: 0.5,
        wristYNorm: 1 - heightM / 2.0,
        confidence: 0.95,
      });
    }

    const res = computeMcvFromWristTrajectory({
      rawSamples,
      totalFramesProcessed: rawSamples.length,
      videoHeight: 1000,
      metersPerPixel: 0.002,
      exercise: 'squat',
    });

    assert.equal(res.totalRepsDetected, 3);
    assert.equal(res.usedRepsCount, 2);
    assert.equal(res.reps[0].usedForRegression, true);
    assert.equal(res.reps[1].usedForRegression, true);
    assert.equal(res.reps[2].usedForRegression, false);
    assert.ok(
      res.mcvMs > 0.78 && res.mcvMs < 0.92,
      `최초 2회 평균 MCV 기대범위(0.78~0.92) 이탈: ${res.mcvMs}`
    );
  });

  // 13) 2회 반복 데드리프트 궤적 -> 2회 모두 반영
  test('2회 반복 데드리프트 궤적에서 2회 모두 검출되어 평균 MCV 산출', () => {
    const rawSamples: Array<{
      timeSec: number;
      wristXNorm: number;
      wristYNorm: number;
      confidence: number;
    }> = [];
    for (let t = 0; t <= 3.201; t += 0.05) {
      let heightM = 0.4;
      if (t <= 0.6) {
        heightM = 0.4;
      } else if (t <= 1.2) {
        heightM = 0.4 + 0.6 * ((t - 0.6) / 0.6);
      } else if (t <= 2.0) {
        heightM = 1.0 - 0.6 * ((t - 1.2) / 0.8);
      } else if (t <= 2.75) {
        heightM = 0.4 + 0.6 * ((t - 2.0) / 0.75);
      } else {
        heightM = 1.0;
      }
      rawSamples.push({
        timeSec: Number(t.toFixed(2)),
        wristXNorm: 0.5,
        wristYNorm: 1 - heightM / 2.0,
        confidence: 0.95,
      });
    }

    const res = computeMcvFromWristTrajectory({
      rawSamples,
      totalFramesProcessed: rawSamples.length,
      videoHeight: 1000,
      metersPerPixel: 0.002,
      exercise: 'deadlift',
    });

    assert.equal(res.totalRepsDetected, 2);
    assert.equal(res.usedRepsCount, 2);
    assert.ok(
      res.mcvMs > 0.78 && res.mcvMs < 0.98,
      `데드리프트 2회 평균 MCV 기대범위(0.78~0.98) 이탈: ${res.mcvMs}`
    );
  });

  // 14) 만나이 계산 및 생일 당일 판별 검증
  test('생년월일 기준 만나이 자동 계산 (생일 전/당일/후) 및 생일 일치 판별', () => {
    const refDate = new Date(2026, 4, 15);
    assert.equal(calculateInternationalAge('2000-05-16', refDate), 25);
    assert.equal(calculateInternationalAge('2000-05-15', refDate), 26);
    assert.equal(calculateInternationalAge('2000-05-14', refDate), 26);

    assert.equal(isBirthdayToday('1998-05-15', refDate), true);
    assert.equal(isBirthdayToday('1998-05-14', refDate), false);
    assert.equal(isBirthdayToday('invalid', refDate), false);
  });

  // 15) 운동 경력 5단계 세분화 검증
  test('운동 경력 옵션이 개월 수부터 5단계로 세분화되어 있음', () => {
    assert.equal(TRAINING_EXPERIENCE_OPTIONS.length, 5);
    assert.deepEqual(
      TRAINING_EXPERIENCE_OPTIONS.map((o) => o.label),
      ['3개월 미만', '3~6개월', '6개월~1년', '1~3년', '3년 이상']
    );
    assert.equal(getExperienceLabelKo('under3months'), '3개월 미만');
    assert.equal(getExperienceLabelKo('3to6months'), '3~6개월');
    assert.equal(getExperienceLabelKo('6to12months'), '6개월~1년');
  });

  // 16) 비회원 및 회원가입/로그인 비밀번호 유효성 검증
  test('이메일 로그인, 회원가입(비밀번호 6자 이상) 및 비회원 입력 검증', () => {
    assert.equal(validateLoginInput('user@example.com', '123456').valid, true);
    assert.equal(validateLoginInput('user@example.com', '123').valid, false);

    assert.equal(
      validateRegistrationInput({
        name: '홍길동',
        email: 'user@example.com',
        password: 'password123',
        birthDate: '1999-03-10',
        gender: 'male',
        trainingExperience: '1to3years',
        participationType: 'recreational',
      }).valid,
      true
    );

    assert.equal(
      validateRegistrationInput({
        name: '홍길동',
        email: 'user@example.com',
        password: '123',
        birthDate: '1999-03-10',
        gender: 'male',
        trainingExperience: '1to3years',
        participationType: 'recreational',
      }).valid,
      false
    );

    const okGuest = validateGuestLoginInput({
      name: '홍길동',
      birthDate: '1999-03-10',
      userGroup: 'athlete',
    });
    assert.equal(okGuest.valid, true);

    const tooYoung = validateBirthDate('2020-01-01', new Date(2026, 4, 15));
    assert.equal(tooYoung.valid, false);
  });

  // 17) 직접 입력 MCV 출처 5종 검증
  test('직접 입력 MCV 출처가 5종(GymAware PowerTool, Moty V, Ronfic Fitvisor, IMU 센서 장비, 기타)으로 구성됨', () => {
    assert.deepEqual(
      DIRECT_MCV_ORIGIN_OPTIONS.map((o) => o.label),
      ['GymAware PowerTool', 'Moty V', 'Ronfic Fitvisor', 'IMU 센서 장비', '기타']
    );
  });

  // 18) 기본 3개 ~ 최대 5개 세트 입력 검증 및 회귀/영상 5개 보존 검증
  test('3~5개 세트 입력 검증(2개·6개 차단) 및 5개 데이터·영상 선형회귀 정확도 검증', () => {
    // 2개 미만 차단
    assert.equal(
      validateMeasurementPoints([
        { loadKg: 40, mcvMs: 0.9 },
        { loadKg: 60, mcvMs: 0.7 },
      ]).valid,
      false
    );

    // 6개 초과 차단
    assert.equal(
      validateMeasurementPoints([
        { loadKg: 40, mcvMs: 0.9 },
        { loadKg: 50, mcvMs: 0.8 },
        { loadKg: 60, mcvMs: 0.7 },
        { loadKg: 70, mcvMs: 0.6 },
        { loadKg: 80, mcvMs: 0.5 },
        { loadKg: 90, mcvMs: 0.4 },
      ]).valid,
      false
    );

    // 5개 세트 및 5개 영상 정상 분석
    const fivePointResult = runFullE1RMAnalysis({
      userId: 'test-user',
      exercise: 'squat',
      userGroup: 'general',
      velocitySource: 'mediapipe',
      points: [
        { loadKg: 40, mcvMs: 0.9 },
        { loadKg: 50, mcvMs: 0.8 },
        { loadKg: 60, mcvMs: 0.7 },
        { loadKg: 70, mcvMs: 0.6 },
        { loadKg: 80, mcvMs: 0.5 },
      ],
      attachedVideoNames: ['v1.mp4', 'v2.mp4', 'v3.mp4', 'v4.mp4', 'v5.mp4'],
    });
    assert.equal(fivePointResult.record.points.length, 5);
    assert.equal(fivePointResult.record.attachedVideoNames?.length, 5);
    assert.ok(Math.abs(fivePointResult.record.regression.r2 - 1.0) < 1e-9);
    assert.ok(Math.abs(fivePointResult.record.e1rmKg - 95.0) < 1e-6);
  });

  console.log(`\n모든 단위 테스트 통과 (${passed}/${passed})`);
}

runTests();
