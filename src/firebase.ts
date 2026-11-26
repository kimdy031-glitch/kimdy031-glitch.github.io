/**
 * [파일 목적] Firebase SDK 초기화, App Check, Firebase AI Logic(결과 보고서 전용), Firestore 연결 검증 및 오류 핸들러 제공
 * [책임]
 *   - Firebase App, App Check(미리보기/로컬 디버그 토큰 + GitHub Pages 운영용 reCAPTCHA v3), Auth, Firestore를 초기화합니다.
 *   - firebase-applet-config.json의 firestoreDatabaseId를 명시하여 지정된 Cloud Firestore 데이터베이스에 연결합니다.
 *   - 결과 보고서('동 나이대 비교 정보' 및 '5. 분석 요약 및 변화 해설') 전용 Firebase AI Logic(gemini-3.5-flash-lite) 모델을 초기화합니다.
 *   - 앱 부팅 시 testConnection()으로 Firestore 연결 상태를 확인하고, 모든 Firestore 오류를 구조화 보고합니다.
 */

import { initializeApp } from 'firebase/app';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  Schema,
} from 'firebase/ai';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseAppletConfig from '../firebase-applet-config.json';

/**
 * [설정 로드] Vite 환경 변수(VITE_*)가 설정되어 있으면 우선 사용하고,
 *             미설정 시 기존 프로젝트 기본값 및 firebase-applet-config.json으로 폴백합니다.
 * [클라이언트 설정값 vs 서버 비밀키 구분]
 *   - 아래 apiKey/appId 등은 Firebase 웹 클라이언트 SDK가 Firebase 프로젝트를 식별하기 위해
 *     브라우저 번들에 포함하는 공개 설정값입니다(비밀키가 아님).
 *   - 반면 Gemini 직접 호출용 서버 비밀키(GEMINI_API_KEY)나 Firebase Admin 서비스 계정 키는
 *     프론트엔드 및 GitHub 저장소에 절대 포함하지 않습니다.
 *   - 실제 데이터와 AI 호출은 Firebase Auth + firestore.rules + App Check(reCAPTCHA v3) +
 *     Google Cloud API 키의 HTTP 리퍼러(웹사이트) 제한으로 보호됩니다.
 */
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY?.trim() ||
    'AIzaSyAFsZcJ99RgPsD7qSZvVeBMLWSwB-kjnUU',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ||
    'sports-ai-makers-83339.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    'sports-ai-makers-83339',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ||
    'sports-ai-makers-83339.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ||
    '362594495712',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID?.trim() ||
    '1:362594495712:web:691a0c33371f9cc8327485',
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim() ||
    'G-SFY97XVM2Z',
};

const FIRESTORE_DATABASE_ID =
  import.meta.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
  firebaseAppletConfig.firestoreDatabaseId;

const RECAPTCHA_V3_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY?.trim() ||
  '6Lf-HjMuAAAAAL71cEBW79OpySLDExoOtEgIfDpw';

/**
 * Firebase AI Logic (GoogleAIBackend) 활성 지원 모델명
 * - 기존 gemini-2.5-flash는 공식 지원 종료 예정(2026-12-01부터 gemini-3.5-flash-lite 자동 리라우팅 / Vertex 2026-10-20 종료)이므로
 *   현재 정식 지원(GA) 모델인 gemini-3.5-flash-lite를 사용합니다.
 */
export const REPORT_AI_MODEL = 'gemini-3.5-flash-lite';

export const app = initializeApp(firebaseConfig);

function isPreviewOrLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    import.meta.env.DEV ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.run.app') ||
    host.endsWith('.scf.usercontent.com') ||
    host.endsWith('.googleusercontent.com')
  );
}

export const isAppCheckDebugMode = isPreviewOrLocalHost();

// 로컬/미리보기 환경에서만 디버그 모드를 활성화하고, GitHub Pages(*.github.io) 운영 도메인에서는 reCAPTCHA v3만 사용합니다.
// 보안상 고정 디버그 토큰 문자열을 저장소에 하드코딩하지 않고, .env.local(VITE_APPCHECK_DEBUG_TOKEN) 또는 SDK 자동 생성(true)을 사용합니다.
if (typeof self !== 'undefined' && isAppCheckDebugMode) {
  const configuredDebugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN?.trim();
  (
    self as unknown as {
      FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
    }
  ).FIREBASE_APPCHECK_DEBUG_TOKEN = configuredDebugToken || true;
}

let resolvedAppCheck: AppCheck | null = null;
let resolvedAppCheckInitError: Error | null = null;

if (typeof window !== 'undefined') {
  try {
    resolvedAppCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    resolvedAppCheckInitError =
      err instanceof Error ? err : new Error(String(err));
  }
}

export const appCheck = resolvedAppCheck;
export const appCheckInitError = resolvedAppCheckInitError;

/** 지정된 Firestore 데이터베이스 ID를 반드시 전달하여 초기화 */
export const db = getFirestore(app, FIRESTORE_DATABASE_ID);
export const auth = getAuth(app);

/** Firebase AI Logic (GoogleAIBackend + gemini-3.5-flash-lite) — 결과 보고서 분석 전용 모델 */
export const ai = getAI(app, { backend: new GoogleAIBackend() });

export const reportAnalysisModel = getGenerativeModel(ai, {
  model: REPORT_AI_MODEL,
  systemInstruction: [
    '당신은 VELOMAX 스포츠테크 플랫폼의 VBT(속도 기반 트레이닝) 근력 데이터 분석가입니다.',
    '사용자가 제출한 실제 측정 수치만을 근거로 한국어 결과 보고서 데이터를 생성하세요. 제시되지 않은 숫자를 지어내지 마세요.',
    '1) 동 나이대 비교(peerTopPercent, peerCategoryLabel, peerSummary): 사용자의 만나이, 성별, 종목, 사용자 구분(일반인/운동인), 예측 e1RM(kg)을 종합해 동일 연령대 대비 상위 몇 %(1~99, 숫자가 작을수록 상위권)인지 추정하고 1~2문장으로 설명하세요.',
    '2) 분석 요약 및 변화 해설(headline, paragraphs 3~4문단):',
    '   - 첫째: 이전 동일 종목 기록 대비 근력 변화 추세(또는 첫 측정 기준점으로서의 의미)를 해석하세요.',
    '   - 둘째: 측정된 e1RM의 활용 방법 및 가치(일일 컨디션에 맞춘 훈련 중량 조절, 1RM 직접 시도 없이 안전한 점진적 과부하 관리 등)를 설명하세요.',
    '   - 셋째: 직선 일치도(R²) 및 부하–속도 기울기 수치가 의미하는 바와 측정 신뢰도를 알기 쉽게 설명하세요.',
    '서식 규칙: headline과 paragraphs에서 강조해야 할 핵심 수치·개념·결론은 반드시 **굵은 글씨**로 감싸세요.',
    '금지 규칙: 면책 문구나 유의사항은 보고서 하단에 별도 표기되므로 출력 어디에도 포함하지 마세요.',
  ].join('\n'),
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: Schema.object({
      properties: {
        peerTopPercent: Schema.number({
          description:
            '동 나이대 대비 예측 최대근력의 상위 백분위 숫자 (1~99, 숫자가 작을수록 상위권)',
        }),
        peerCategoryLabel: Schema.string({
          description:
            '동 나이대 비교 한 줄 요약 라벨 (예: 만 27세 남성 스쿼트 기준 상위 18%)',
        }),
        peerSummary: Schema.string({
          description:
            '동 나이대 대비 현재 예측 최대근력 수준에 대한 1~2문장 설명',
        }),
        headline: Schema.string({
          description:
            '5. 분석 요약 및 변화 해설의 핵심 한 줄 요약 (**굵은 글씨** 강조 사용)',
        }),
        paragraphs: Schema.array({
          items: Schema.string(),
          description:
            '근력 변화 추세, e1RM 활용 방법 및 가치, 직선 일치도(R²) 해석을 담은 3~4개 문단 (**굵은 글씨** 강조 사용)',
        }),
      },
    }),
  },
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  errorCode?: string | null;
  stageLabel?: string | null;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * [기능] Firestore 권한/요청 오류 발생 시 인증 컨텍스트·단계·경로·오류 코드를 JSON 문자열로 구조화해 예외를 던집니다.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  stageLabel?: string
): never {
  const errorCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : null;

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    errorCode,
    stageLabel: stageLabel ?? null,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  const serialized = JSON.stringify(errInfo);
  console.error('Firestore Error: ', serialized);
  throw new Error(serialized);
}

/**
 * [기능] handleFirestoreError가 던진 구조화 JSON 오류 또는 일반 Firebase 오류를
 *        [발생 단계] + [대상 경로] + [오류 코드] + [구체적 오류 메시지] 형태로 변환합니다.
 */
export function formatFirestoreErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(rawMessage) as Partial<FirestoreErrorInfo>;
    if (parsed && parsed.error && parsed.operationType) {
      const stage = parsed.stageLabel
        ? `${parsed.stageLabel} (${parsed.operationType})`
        : `Firestore ${parsed.operationType}`;
      const pathText = parsed.path ? ` · 경로: ${parsed.path}` : '';
      const codeText = parsed.errorCode ? ` · 코드: ${parsed.errorCode}` : '';
      let hint = '';
      if (
        parsed.error.includes('Missing or insufficient permissions') ||
        parsed.error.includes('PERMISSION_DENIED') ||
        parsed.errorCode === 'permission-denied'
      ) {
        hint =
          ' (원인 안내: 로그인 상태, 본인 UID 일치 여부, 또는 firestore.rules의 스키마·필수 필드 검증 조건을 확인해 주세요.)';
      } else if (
        parsed.error.includes('the client is offline') ||
        parsed.errorCode === 'unavailable'
      ) {
        hint =
          ' (원인 안내: Firestore 서버 연결 또는 네트워크 상태를 확인해 주세요.)';
      }
      return `[Firestore ${stage}${pathText}${codeText}] ${parsed.error}${hint}`;
    }
  } catch {
    // JSON 포맷이 아닌 일반 오류는 그대로 반환
  }
  return rawMessage || 'Firestore 처리 중 알 수 없는 오류가 발생했습니다.';
}

/**
 * [기능] 앱 초기화 시 서버 기준 Firestore 연결 상태 확인
 */
async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
