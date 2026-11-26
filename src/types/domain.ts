/**
 * [파일 목적] VELOMAX v1 애플리케이션 전역에서 사용하는 도메인 타입 및 인터페이스 정의
 * [책임] 사용자, 운동 종목, 부하-속도 데이터 포인트, 선형회귀 결과, MVT 설정,
 *        측정 기록 스키마를 Firebase(Auth/Firestore) 구조와 일치시켜 관리합니다.
 */

/** 지원하는 운동 종목 (스쿼트, 데드리프트) */
export type ExerciseType = 'squat' | 'deadlift';

/** 사용자 참여 형태에 따른 분류 ('general': 일반인, 'athlete': 운동인) */
export type UserGroup = 'general' | 'athlete';

/** 성별 선택 옵션 */
export type GenderOption = 'male' | 'female' | 'unspecified';

/**
 * 운동 경력 선택 옵션 (n개월 수부터 5단계 세분화)
 * - 기존 데이터 호환을 위해 'under1year'를 타입에 보조 유지
 */
export type TrainingExperience =
  | 'under3months'
  | '3to6months'
  | '6to12months'
  | '1to3years'
  | 'over3years'
  | 'under1year';

/** 운동 참여 형태 (자동 분류 기준 입력값) */
export type ParticipationType = 'recreational' | 'athlete_training';

/** MCV 속도 입력 방식 (사용자 직접 입력 / AI 자세 추정) */
export type VelocitySource = 'manual' | 'mediapipe';

/**
 * MCV 측정값의 출처
 * - velomax_raw: 영상 AI 자세 추정으로 계산된 MCV
 * - gymaware_powertool: GymAware PowerTool 장비 측정값
 * - moty_v: Moty V 장비 측정값
 * - ronfic_fitvisor: Ronfic Fitvisor 장비 측정값
 * - imu_sensor: IMU 센서 장비 측정값
 * - other: 기타 직접 입력값
 * - gymaware / unknown: 구형 기록 호환용
 */
export type VelocityOrigin =
  | 'velomax_raw'
  | 'gymaware_powertool'
  | 'moty_v'
  | 'ronfic_fitvisor'
  | 'imu_sensor'
  | 'other'
  | 'gymaware'
  | 'unknown';

/** 앱 내 화면 라우팅 식별자 (정책/안내/참고문헌 공개 페이지 포함) */
export type AppRoute =
  | 'auth'
  | 'dashboard'
  | 'measure'
  | 'result'
  | 'history'
  | 'report'
  | 'profile'
  | 'about'
  | 'references'
  | 'terms'
  | 'privacy'
  | 'contact';

/**
 * 사용자 계정 정보 (Firebase Auth + Firestore /users/{uid} 및 비회원 세션 기준)
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  /** 생년월일 (YYYY-MM-DD 형식) */
  birthDate: string;
  /** 생년월일 기준 자동 계산된 만나이 (정수) */
  age: number;
  gender: GenderOption;
  trainingExperience: TrainingExperience;
  participationType: ParticipationType;
  /** participationType 또는 비회원 선택에 의해 결정되는 분류 ('general' | 'athlete') */
  userGroup: UserGroup;
  /** 비회원(게스트) 로그인 여부 (true인 경우 히스토리·마이페이지·PDF·추세 기능 제한) */
  isGuest?: boolean;
  createdAt: string;
}

/**
 * 회원가입 폼 입력 DTO (Firebase Auth 비밀번호 포함)
 */
export interface UserRegistrationInput {
  name: string;
  email: string;
  password?: string;
  /** 생년월일 (YYYY-MM-DD) */
  birthDate: string;
  gender: GenderOption;
  trainingExperience: TrainingExperience;
  participationType: ParticipationType;
}

/**
 * 프로필 수정 폼 입력 DTO (이메일은 Firebase Auth 계정에 귀속되어 읽기 전용)
 */
export interface UserProfileUpdateInput {
  name: string;
  birthDate: string;
  gender: GenderOption;
  trainingExperience: TrainingExperience;
  participationType: ParticipationType;
}

/**
 * 비회원(게스트) 바로 시작 입력 DTO
 * - 이름, 생년월일, 일반인/운동인만 입력
 */
export interface GuestLoginInput {
  name: string;
  birthDate: string;
  userGroup: UserGroup;
}

/**
 * 중량(kg)과 대표 평균 구심성 속도 MCV(m/s) 쌍
 */
export interface LoadVelocityPoint {
  loadKg: number;
  mcvMs: number;
}

/**
 * 최소제곱 선형회귀 분석 결과 (v = slope * L + intercept)
 */
export interface RegressionResult {
  /** 기울기 a (부하 증가 시 속도 감소가 정상이므로 음수여야 함) */
  slope: number;
  /** Y절편 b (이론상 0kg에서의 속도) */
  intercept: number;
  /** 결정계수 R² (0 ~ 1, 데이터 적합도 표시용) */
  r2: number;
}

/**
 * 최소 역치 속도(MVT) 메타데이터
 */
export interface MvtSetting {
  valueMs: number;
  source: 'STANDARD_V1' | 'RESEARCH_VALIDATED';
  label: string;
  note: string;
}

/**
 * 목적별 권장 훈련 중량 구간
 */
export interface TrainingZoneRecommendation {
  id: 'strength' | 'hypertrophy' | 'power' | 'endurance';
  nameKo: string;
  description: string;
  minPercent: number;
  maxPercent: number;
  minLoadKg: number;
  maxLoadKg: number;
  repRangeLabel: string;
}

/**
 * 영상 내 2점 캘리브레이션 좌표 (0~1 정규화 좌표)
 */
export interface CalibrationPoint {
  xNorm: number;
  yNorm: number;
}

/**
 * 픽셀-미터 축척 캘리브레이션 결과
 */
export interface CalibrationData {
  pointA: CalibrationPoint;
  pointB: CalibrationPoint;
  /** 사용자가 입력한 기준 물체 실제 길이 (cm, 예: 표준 원판 45cm) */
  referenceLengthCm: number;
  /** 영상 픽셀 기준 두 점 사이 거리 (px) */
  pixelDistance: number;
  /** 1픽셀당 실제 미터 환산 계수 (m/px) */
  metersPerPixel: number;
}

/**
 * MediaPipe 손(손목) 위치 추적 프레임별 샘플
 */
export interface WristTrajectorySample {
  timeSec: number;
  wristXNorm: number;
  wristYNorm: number;
  /** 화면 하단 기준 손목 높이 (m) */
  heightMeters: number;
  /** 순간 수직 속도 (m/s) */
  velocityMs: number | null;
  confidence: number;
}

/**
 * MediaPipe 영상 내 개별 반복(Rep) 구심성 구간 검출 상세
 * - 3회차 이후는 근피로 영향 배제를 위해 선형회귀(MCV) 계산에서 제외됩니다.
 */
export interface MediaPipeRepDetail {
  repNumber: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  displacementMeters: number;
  mcvMs: number;
  /** 최초 2회 이내 반복 여부 (true: 회귀용 MCV 평균에 반영, false: 근피로 배제) */
  usedForRegression: boolean;
}

/**
 * MediaPipe 손 추적 기반 MCV 계산 결과
 */
export interface MediaPipeMcvResult {
  mcvMs: number;
  concentricStartSec: number;
  concentricEndSec: number;
  concentricDurationSec: number;
  verticalDisplacementMeters: number;
  totalFramesProcessed: number;
  detectedFrames: number;
  samples: WristTrajectorySample[];
  /** 영상 내 검출된 전체 반복 목록 (시간순) */
  reps: MediaPipeRepDetail[];
  /** 영상 내 검출된 총 반복 횟수 */
  totalRepsDetected: number;
  /** MCV 평균 및 선형회귀 모델에 실제 반영된 반복 횟수 (최대 2회) */
  usedRepsCount: number;
}

/**
 * 측정 시 첨부한 영상 파일 메타데이터 (브라우저 메모리 미리보기 및 MediaPipe 분석 전용, 저장소에 원본 저장 안 함)
 */
export interface VideoPreviewMeta {
  slotIndex: number;
  fileName: string;
  fileSizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
  objectUrl: string;
  /** 해당 슬롯에서 MediaPipe로 MCV를 산출한 경우 결과 요약 저장 */
  mediapipeResult?: MediaPipeMcvResult;
}

/**
 * 저장된 단일 측정 결과 레코드 (Firestore /users/{uid}/measurements/{id} 저장 단위)
 */
export interface MeasurementRecord {
  id: string;
  userId: string;
  exercise: ExerciseType;
  userGroupSnapshot: UserGroup;
  measuredAt: string;
  velocitySource: VelocitySource;
  /** 측정값의 출처 */
  velocityOrigin?: VelocityOrigin;
  /** MediaPipe 손 추적이 실제 수행되었는지 여부 */
  videoAnalysisPerformed: boolean;
  /** 측정 시 첨부했던 파일명 목록(참고용 메타데이터만 저장, 실제 영상 파일 미저장) */
  attachedVideoNames?: string[];
  /** 실제 계산(회귀/e1RM)에 사용된 3점 데이터 */
  points: LoadVelocityPoint[];
  /** 최소제곱 선형회귀 결과 */
  regression: RegressionResult;
  mvt: {
    valueMs: number;
    source: 'STANDARD_V1';
  };
  /** 최종 산출된 예측 최대근력 (e1RM) */
  e1rmKg: number;
  /** 최대 측정 중량 대비 외삽 비율이 커서 경고가 발생했는지 여부 */
  isHighExtrapolation: boolean;
  analysisEngineVersion: string;
}

/**
 * 계산 실행 전/후 분석 결과 컨텍스트 (결과 화면으로 전달)
 */
export interface AnalysisDraftResult {
  record: MeasurementRecord;
  zones: TrainingZoneRecommendation[];
  warnings: string[];
}
