# VELOMAX (벨로맥스) — 부하–속도 기반 e1RM 예측 스포츠테크 웹서비스

> **Measure Velocity, Predict Strength.**  
> **속도를 분석하고, 근력을 예측하다.**

VELOMAX는 스쿼트와 데드리프트 운동 영상을 브라우저 내에서 직접 분석해 평균 구심성 속도(MCV)를 산출하고, **부하–속도 선형회귀(OLS)**와 **최소 역치 속도(MVT)**를 활용해 **추정 최대근력(e1RM)**과 목적별 권장 훈련 중량을 계산하는 웹서비스입니다.  
배포 대상 URL: **https://kimdy031-glitch.github.io/**

---

## 1. 주요 기능 (전체 유지)

- **Firebase Authentication 회원가입 및 로그인** (이메일/비밀번호 및 비회원 체험 모드, 일반인/운동인 자동 분류)
- **Cloud Firestore 사용자 정보 및 측정 기록 저장** (`firestore.rules` 기반 본인 UID 격리 및 CRUD)
- **카메라 촬영 및 영상 업로드 (15초 이하)** + **MediaPipe PoseLandmarker 기반 MCV 측정** (2점 캘리브레이션, 3~5세트 지원)
- **부하–속도 선형회귀, $R^2$, e1RM 및 목적별 권장 중량 계산** (`src/services/analysis.ts`)
- **Gemini AI 기반 결과 보고서 피드백** (`firebase/ai` `gemini-3.5-flash-lite` + Firebase App Check)
- **분석 결과 표·SVG 그래프·히스토리·A4 2페이지 PDF 출력**
- **Google AdSense 연동 대비 구조** (`index.html` 스크립트 슬롯, `AdBannerSlot.tsx` CLS 방지 여백, `public/ads.txt` → `/ads.txt` 서빙)

---

## 2. GitHub Pages 배포 구조 및 비밀정보 보안 기준

### ① 별도 백엔드 서버가 필요한가요?
**아니요. VELOMAX는 별도의 백엔드 서버 배포 없이 GitHub Pages만으로 전체 기능이 동작합니다.**

| 구분 | 포함 기능 | 실행 위치 | 설명 |
|---|---|---|---|
| **정적 프론트엔드** | React UI, 차트, 선형회귀/e1RM 계산, MediaPipe 영상 분석, PDF 출력 | **GitHub Pages (`dist/`)** | `npm run build` (`base: '/'`) 산출물 배포 |
| **관리형 클라우드 (Firebase)** | 로그인(`Auth`), 기록 저장(`Firestore`), Gemini 호출(`Firebase AI Logic` + `App Check`) | **Google / Firebase 클라우드** | 브라우저에서 공식 SDK로 직접 통신하며 보안 규칙·App Check로 보호 |
| **로컬/AI Studio 전용 (`server.ts`)** | 로컬 개발 미들웨어 및 컨테이너 정적 서빙 | **로컬 PC / AI Studio 전용** | 비밀 프록시 API가 없으므로 GitHub Pages 외부 서버로 배포할 필요 없음 |

### ② Firebase 클라이언트 설정값 vs 서버용 비밀키 구분
- **프론트엔드에 포함 가능한 값 (`src/firebase.ts`)**: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, `measurementId`, reCAPTCHA v3 사이트 키는 **Firebase 웹 SDK 공개 식별값**입니다.
- **절대 노출 금지 값 (GitHub / 프론트엔드 미포함)**:
  - 서버 전용 `GEMINI_API_KEY`, `firebase-admin` 서비스 계정 키 — **미사용 및 미포함**
  - 고정 App Check 디버그 토큰 문자열 — **코드에 하드코딩하지 않음**
  - `.env`, `.env.local` — `.gitignore`에 의해 GitHub 업로드 자동 차단

---

## 3. GitHub Pages 루트 배포 & Google AdSense 설정 요약

- **`vite.config.ts`**: `base: '/'` 적용 (`https://kimdy031-glitch.github.io/` 루트 경로 및 `/assets/`, `/mediapipe/`, `/ads.txt` 정상 서빙)
- **`index.html` & `public/ads.txt`**: `<head>` 내부 `<!-- Google AdSense Code: ... -->` 위치에 광고 스크립트를 추가할 수 있는 구조 유지, `public/ads.txt`는 빌드 시 `dist/ads.txt`로 복사되어 `https://kimdy031-glitch.github.io/ads.txt`에서 제공
- **`package.json` & `package-lock.json`**: `vite@^8.3.0` 호환을 위해 `esbuild@^0.28.0` 적용 및 `npm ci`용 잠금 파일 포함
- **`.github/workflows/deploy-pages.yml`**: `main` 브랜치 push 또는 수동 실행(`workflow_dispatch`) 시 검증·빌드(`dist/ads.txt`, MediaPipe 파일 포함 확인) 후 GitHub Pages 자동 배포
- **`public/404.html` & `public/.nojekyll`**: 루트 도메인 새로고침 복구 및 정적 에셋 누락 방지

---

## 4. 배포 및 AdSense 연동 방법

저장소 이름 변경(`velomax-app` → `kimdy031-glitch.github.io`), GitHub Actions 배포, `https://kimdy031-glitch.github.io/ads.txt` 확인 방법은 **[DEPLOYMENT.md](./DEPLOYMENT.md)**를 참고하세요.
