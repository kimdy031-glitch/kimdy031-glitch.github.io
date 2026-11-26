/**
 * [파일 목적] Firebase AI Logic(gemini-3.5-flash-lite)을 사용해 결과 보고서의
 *            1) '동 나이대 비교 정보'와 2) '5. 분석 요약 및 변화 해설'을 생성하는 서비스
 * [책임]
 *   - 별도 백엔드 서버 없이 브라우저에서 직접 Firebase AI Logic을 호출하므로 GitHub Pages 정적 호스팅에서도 동작합니다.
 *   - App Check 토큰 발급 -> AI Logic API 호출 -> 응답 추출 -> JSON 검증의 4단계로 분리해
 *     실패 시 발생한 정확한 단계, 모델명, 오류 코드 및 원본 오류 메시지를 그대로 노출합니다.
 *   - 동일 기록에 대한 중복 호출을 줄이기 위해 세션 내 메모리 캐시를 유지합니다.
 */

import { getToken } from 'firebase/app-check';
import {
  appCheck,
  appCheckInitError,
  isAppCheckDebugMode,
  REPORT_AI_MODEL,
  reportAnalysisModel,
} from '../firebase';
import type { MeasurementRecord, UserProfile } from '../types/domain';
import {
  getExerciseLabelKo,
  getExperienceLabelKo,
  getGenderLabelKo,
  getUserGroupLabelKo,
  getVelocityOriginLabelKo,
} from '../utils/format';

export interface ReportAiInterpretation {
  model: string;
  peerTopPercent: number;
  peerCategoryLabel: string;
  peerSummary: string;
  headline: string;
  paragraphs: string[];
}

export interface ReportAiErrorInfo {
  stage: string;
  model: string;
  code?: string;
  httpStatus?: number;
  rawMessage: string;
  hint?: string;
}

export class ReportAiStageError extends Error {
  readonly info: ReportAiErrorInfo;

  constructor(info: ReportAiErrorInfo) {
    const codePart = [
      info.code ? `코드: ${info.code}` : '',
      info.httpStatus ? `HTTP ${info.httpStatus}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    const header = `[${info.stage} | 모델: ${info.model}${codePart ? ` | ${codePart}` : ''}]`;
    const body = info.hint
      ? `${header} ${info.rawMessage} — 해결 방법: ${info.hint}`
      : `${header} ${info.rawMessage}`;

    super(body);
    this.name = 'ReportAiStageError';
    this.info = info;
  }
}

const interpretationCache = new Map<string, ReportAiInterpretation>();

function buildCacheKey(
  user: UserProfile,
  current: MeasurementRecord,
  previous?: MeasurementRecord
): string {
  return [
    REPORT_AI_MODEL,
    current.id,
    previous?.id ?? 'none',
    user.age,
    user.gender,
    user.userGroup,
    current.e1rmKg.toFixed(2),
  ].join('|');
}

function extractErrorMeta(error: unknown): {
  code?: string;
  httpStatus?: number;
  rawMessage: string;
} {
  const rawMessage = error instanceof Error ? error.message : String(error);
  let code: string | undefined;
  let httpStatus: number | undefined;

  if (typeof error === 'object' && error !== null) {
    if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
      code = (error as { code: string }).code;
    }
    if ('customErrorData' in error) {
      const custom = (error as { customErrorData?: { status?: unknown } })
        .customErrorData;
      if (custom && typeof custom.status === 'number') {
        httpStatus = custom.status;
      }
    }
  }

  if (!httpStatus) {
    const statusMatch = rawMessage.match(/\[(\d{3})\s+[^\]]+\]/);
    if (statusMatch) {
      httpStatus = Number(statusMatch[1]);
    }
  }

  return { code, httpStatus, rawMessage };
}

function buildApiCallHint(rawMessage: string, httpStatus?: number): string | undefined {
  const lower = rawMessage.toLowerCase();

  if (lower.includes('api_key_service_blocked')) {
    return 'Google Cloud Console > API 및 서비스 > 사용자 인증 정보에서 현재 API 키의 API 제한 목록에 "Firebase AI Logic API (firebasevertexai.googleapis.com)"를 추가하거나 제한을 해제해 주세요.';
  }
  if (
    lower.includes('api-not-enabled') ||
    lower.includes('service_disabled') ||
    lower.includes('api has not been used')
  ) {
    return 'Firebase Console > AI Logic에서 Gemini Developer API 사용 설정("시작하기")을 활성화해 주세요.';
  }
  if (
    httpStatus === 404 ||
    lower.includes('not_found') ||
    lower.includes('not found') ||
    lower.includes('is not supported')
  ) {
    return `지정한 모델(${REPORT_AI_MODEL})이 현재 프로젝트/백엔드에서 지원되지 않습니다. 지원 모델 ID와 AI Logic 설정을 확인해 주세요.`;
  }
  if (
    lower.includes('app check') ||
    lower.includes('appcheck') ||
    lower.includes('app attestation') ||
    lower.includes('recaptcha')
  ) {
    return isAppCheckDebugMode
      ? 'Firebase Console > App Check에서 웹 앱 ID(1:362594495712:web:691a0c33371f9cc8327485)에 디버그 토큰이 정확히 등록되어 있는지 확인해 주세요.'
      : 'reCAPTCHA v3 콘솔과 Firebase App Check에서 현재 운영 도메인(예: github.io)이 허용 도메인에 등록되어 있는지 확인해 주세요.';
  }
  if (httpStatus === 429 || lower.includes('quota') || lower.includes('resource_exhausted')) {
    return 'AI 요청 할당량(Quota)을 초과했습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (
    lower.includes('free tier is not available') ||
    lower.includes('set up billing') ||
    lower.includes('upgrade to the paid tier')
  ) {
    return '현재 프로젝트(sports-ai-makers-83339)에서는 Gemini API 무료 등급을 사용할 수 없습니다. https://aistudio.google.com/billing 또는 Google Cloud Console > 결제에서 프로젝트에 결제(Billing) 계정을 연결해 주세요.';
  }
  if (httpStatus === 403 || lower.includes('permission_denied')) {
    return 'Firebase Console의 Firebase AI Logic 활성화 여부 및 API 키 권한/App Check 강제 설정을 확인해 주세요.';
  }
  return undefined;
}

function parseReportJson(text: string): ReportAiInterpretation {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  const rawPercent = Number(parsed.peerTopPercent);
  if (!Number.isFinite(rawPercent)) {
    throw new Error('AI 응답에서 동 나이대 백분위(peerTopPercent) 수치를 읽을 수 없습니다.');
  }
  const peerTopPercent = Math.max(
    1,
    Math.min(99, Math.round(rawPercent * 10) / 10)
  );

  const peerCategoryLabel =
    typeof parsed.peerCategoryLabel === 'string' && parsed.peerCategoryLabel.trim()
      ? parsed.peerCategoryLabel.trim()
      : `만 나이 동일 연령대 기준 상위 ${peerTopPercent}%`;

  const peerSummary =
    typeof parsed.peerSummary === 'string' && parsed.peerSummary.trim()
      ? parsed.peerSummary.trim()
      : '';

  const headline =
    typeof parsed.headline === 'string' && parsed.headline.trim()
      ? parsed.headline.trim()
      : '';

  const paragraphs = Array.isArray(parsed.paragraphs)
    ? parsed.paragraphs
        .filter(
          (item): item is string =>
            typeof item === 'string' && item.trim().length > 0
        )
        .map((item) => item.trim())
    : [];

  if (!peerSummary || !headline || paragraphs.length === 0) {
    throw new Error(
      'AI 보고서 해설의 필수 필드(peerSummary / headline / paragraphs) 중 일부가 비어 있습니다.'
    );
  }

  return {
    model: REPORT_AI_MODEL,
    peerTopPercent,
    peerCategoryLabel,
    peerSummary,
    headline,
    paragraphs,
  };
}

export const reportAiService = {
  /**
   * [기능] Firebase AI Logic(gemini-3.5-flash-lite)으로 동 나이대 비교 및 5번 분석 해설 생성
   */
  async generateInterpretation(
    user: UserProfile,
    current: MeasurementRecord,
    previous?: MeasurementRecord,
    options?: { forceRefresh?: boolean; signal?: AbortSignal }
  ): Promise<ReportAiInterpretation> {
    const cacheKey = buildCacheKey(user, current, previous);
    if (!options?.forceRefresh) {
      const cached = interpretationCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // -------------------------------------------------------------------------
    // [1단계] Firebase App Check 초기화 및 토큰 발급 사전 검증
    // -------------------------------------------------------------------------
    if (appCheckInitError) {
      const meta = extractErrorMeta(appCheckInitError);
      throw new ReportAiStageError({
        stage: '1단계: Firebase App Check 초기화',
        model: REPORT_AI_MODEL,
        code: meta.code,
        rawMessage: meta.rawMessage,
        hint: 'App Check 설정(ReCaptchaV3Provider 사이트 키 또는 디버그 토큰 설정)을 확인해 주세요.',
      });
    }

    if (appCheck) {
      try {
        const tokenRes = await getToken(appCheck, false);
        if (!tokenRes?.token) {
          throw new Error('App Check 토큰 응답이 비어 있습니다.');
        }
      } catch (err) {
        if (options?.signal?.aborted) throw err;
        const meta = extractErrorMeta(err);
        throw new ReportAiStageError({
          stage: `1단계: Firebase App Check 토큰 발급 (${isAppCheckDebugMode ? '디버그 모드' : 'reCAPTCHA v3 모드'})`,
          model: REPORT_AI_MODEL,
          code: meta.code,
          httpStatus: meta.httpStatus,
          rawMessage: meta.rawMessage,
          hint: isAppCheckDebugMode
            ? '미리보기/로컬 디버그 토큰이 Firebase Console > App Check에 등록되어 있는지 확인해 주세요.'
            : 'GitHub Pages 등 운영 도메인이 Google reCAPTCHA v3 허용 도메인에 등록되어 있는지 확인해 주세요.',
        });
      }
    }

    const diffKg =
      previous && previous.e1rmKg > 0 ? current.e1rmKg - previous.e1rmKg : null;
    const diffPct =
      previous && previous.e1rmKg > 0 && diffKg !== null
        ? (diffKg / previous.e1rmKg) * 100
        : null;

    const payload = {
      subject: {
        name: user.name,
        internationalAge: user.age,
        gender: getGenderLabelKo(user.gender),
        userGroup: getUserGroupLabelKo(user.userGroup),
        trainingExperience: getExperienceLabelKo(user.trainingExperience),
      },
      currentMeasurement: {
        exercise: getExerciseLabelKo(current.exercise),
        measuredAt: current.measuredAt,
        velocitySource: current.velocitySource,
        velocityOrigin: getVelocityOriginLabelKo(current.velocityOrigin ?? 'unknown'),
        e1rmKg: Number(current.e1rmKg.toFixed(1)),
        mvtMs: Number(current.mvt.valueMs.toFixed(2)),
        regressionSlope: Number(current.regression.slope.toFixed(4)),
        regressionIntercept: Number(current.regression.intercept.toFixed(3)),
        r2: Number(current.regression.r2.toFixed(4)),
        sets: current.points.map((pt, idx) => ({
          set: idx + 1,
          loadKg: pt.loadKg,
          mcvMs: Number(pt.mcvMs.toFixed(2)),
        })),
      },
      previousMeasurement: previous
        ? {
            e1rmKg: Number(previous.e1rmKg.toFixed(1)),
            measuredAt: previous.measuredAt,
            diffKg: diffKg !== null ? Number(diffKg.toFixed(1)) : null,
            diffPercent: diffPct !== null ? Number(diffPct.toFixed(1)) : null,
          }
        : null,
    };

    const prompt = `다음 측정 데이터를 분석하여 동 나이대 상위 백분위 비교 정보와 5번 분석 요약 및 변화 해설을 생성하세요.\n\n${JSON.stringify(payload, null, 2)}`;

    // -------------------------------------------------------------------------
    // [2단계] Firebase AI Logic API 호출
    // -------------------------------------------------------------------------
    let result;
    try {
      result = await reportAnalysisModel.generateContent(
        prompt,
        options?.signal ? { signal: options.signal } : undefined
      );
    } catch (err) {
      if (options?.signal?.aborted) throw err;
      const meta = extractErrorMeta(err);
      throw new ReportAiStageError({
        stage: '2단계: Firebase AI Logic API 호출',
        model: REPORT_AI_MODEL,
        code: meta.code,
        httpStatus: meta.httpStatus,
        rawMessage: meta.rawMessage,
        hint: buildApiCallHint(meta.rawMessage, meta.httpStatus),
      });
    }

    // -------------------------------------------------------------------------
    // [3단계] AI 응답 본문 추출
    // -------------------------------------------------------------------------
    let text: string;
    try {
      text = result.response.text();
      if (!text) {
        throw new Error('Firebase AI Logic이 빈 문자열 응답을 반환했습니다.');
      }
    } catch (err) {
      if (options?.signal?.aborted) throw err;
      const meta = extractErrorMeta(err);
      throw new ReportAiStageError({
        stage: '3단계: AI 응답 본문 추출',
        model: REPORT_AI_MODEL,
        code: meta.code,
        httpStatus: meta.httpStatus,
        rawMessage: meta.rawMessage,
      });
    }

    // -------------------------------------------------------------------------
    // [4단계] 응답 JSON 스키마 파싱 및 검증
    // -------------------------------------------------------------------------
    try {
      const interpretation = parseReportJson(text);
      interpretationCache.set(cacheKey, interpretation);
      return interpretation;
    } catch (err) {
      const meta = extractErrorMeta(err);
      throw new ReportAiStageError({
        stage: '4단계: AI 응답 JSON 검증',
        model: REPORT_AI_MODEL,
        code: meta.code,
        rawMessage: meta.rawMessage,
      });
    }
  },
};
