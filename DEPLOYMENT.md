# VELOMAX GitHub Pages 배포 가이드 (`kimdy031-glitch/velomax-app`)

이 문서는 **Google AI Studio → GitHub(`kimdy031-glitch/velomax-app`) → GitHub Actions(`.github/workflows/deploy-pages.yml`) → GitHub Pages(`https://kimdy031-glitch.github.io/velomax-app/`)** 배포 과정을 명령어 없이도 따라 할 수 있도록 정리한 안내서입니다.

---

## 0. 왜 이전에는 Actions 탭에 `Get started with GitHub Actions`가 떴나요?

GitHub는 저장소의 **기본 브랜치(`main`) 루트에 `.github/workflows/*.yml` 파일이 실제로 커밋되어 존재할 때만** `Actions` 탭에 워크플로를 인식해 실행합니다.
- 저장소에 파일이 아직 업로드되지 않았거나, 숨김 폴더(`.github`)가 누락되었거나, 다른 브랜치에만 올라가 있으면 `Get started with GitHub Actions` 화면이 나타납니다.
- 이번 수정으로 기존 `deploy.yml`을 정리하고 **`.github/workflows/deploy-pages.yml`** 하나로 통일했습니다.

---

## 1. Google AI Studio에서 수정된 코드를 GitHub에 반영하는 방법

1. 브라우저에서 [GitHub(`kimdy031-glitch/velomax-app`)](https://github.com/kimdy031-glitch/velomax-app)에 로그인되어 있는지 확인합니다.
2. Google AI Studio 상단(또는 오른쪽 위 툴바)의 **GitHub 아이콘(또는 `GitHub` / `Push to GitHub` 메뉴)**을 클릭합니다.
3. 연결된 저장소가 **`kimdy031-glitch/velomax-app`**, 브랜치가 **`main`**인지 확인한 뒤 **Commit 메시지**(예: `fix: configure GitHub Pages deploy-pages.yml and base path`)를 적고 **`Commit & Push`**(또는 **`Push`**) 버튼을 클릭합니다.
4. 업로드가 끝난 뒤 [https://github.com/kimdy031-glitch/velomax-app](https://github.com/kimdy031-glitch/velomax-app) 페이지를 새로고침하여 **반드시 아래 파일들이 기본 브랜치(`main`)에 보이는지 확인**하세요.
   - `.github/workflows/deploy-pages.yml` (중복 방지를 위해 기존 `deploy.yml`은 없어야 함)
   - `package.json`, `package-lock.json`
   - `vite.config.ts` (`base: '/velomax-app/'` 포함)
   - `public/404.html`, `public/.nojekyll`

> **만약 AI Studio에서 `.github` 숨김 폴더가 안 올라간 경우 (웹 화면 해결 방법)**
> 1. GitHub 저장소 화면에서 **`Add file` → `Create new file`** 클릭
> 2. 파일 이름 입력 칸에 **`.github/workflows/deploy-pages.yml`**을 입력 (`/`를 입력하면 폴더가 자동 생성됨)
> 3. 본 프로젝트의 `.github/workflows/deploy-pages.yml` 내용을 그대로 붙여 넣고 오른쪽 위 **`Commit changes...`** 클릭 → `main` 브랜치에 커밋

---

## 2. GitHub → `Settings` → `Pages` 설정 방법

1. [https://github.com/kimdy031-glitch/velomax-app](https://github.com/kimdy031-glitch/velomax-app) 저장소 상단 메뉴 맨 오른쪽의 **⚙️ `Settings`**를 클릭합니다.
2. 왼쪽 사이드바에서 아래로 내려 **📄 `Pages`**를 클릭합니다.
3. **`Build and deployment`** 섹션의 **`Source`** 드롭다운에서 **`GitHub Actions`**를 선택합니다.
   - (`Deploy from a branch`가 아니라 반드시 **`GitHub Actions`**여야 합니다.)

---

## 3. GitHub → `Actions`에서 워크플로 실행 확인 및 수동 실행 방법

1. 저장소 상단 메뉴의 **▶️ `Actions`** 탭을 클릭합니다.
2. 이제 `Get started with GitHub Actions` 대신 왼쪽 목록에 **`Deploy VELOMAX to GitHub Pages`** 워크플로가 표시됩니다.
3. 오른쪽 목록에 실행 기록이 보입니다:
   - 🟡 **노란색 원**: 빌드/배포 진행 중 (약 1~2분 소요)
   - ✅ **초록색 체크**: 배포 성공!
   - ❌ **빨간색 X**: 빌드 또는 검증 실패
4. 코드 수정 없이 직접 다시 배포하고 싶다면:
   - 왼쪽에서 **`Deploy VELOMAX to GitHub Pages`** 클릭 → 오른쪽 **`Run workflow`** 드롭다운 클릭 → **`Branch: main`** 확인 후 초록색 **`Run workflow`** 버튼을 클릭합니다.

---

## 4. 빌드가 실패했을 때 오류 로그 확인 방법

1. **`Actions`** 탭에서 빨간색 ❌ 아이콘이 표시된 실행 제목을 클릭합니다.
2. 화면에 나타난 **`Build VELOMAX`** 또는 **`Deploy to GitHub Pages`** 박스를 클릭합니다.
3. 빨간색 ❌가 표시된 단계(예: `의존성 설치 (npm ci)`, `TypeScript 타입 검사`, `Vite 프로덕션 빌드`)를 클릭해 펼치면 정확한 오류 메시지와 줄 번호를 확인할 수 있습니다.

---

## 5. 배포 완료 후 실제 웹사이트 접속 및 필수 도메인 허용

### 실제 접속 주소
배포가 초록색 체크(✅)로 완료되면 `deploy` 단계 아래 링크 또는 아래 주소로 접속합니다.
- **https://kimdy031-glitch.github.io/velomax-app/**

### 배포 후 Firebase & Google Cloud 콘솔 허용 도메인 등록 (최초 1회)
실제 사이트에서 로그인·DB 저장·Gemini AI 보고서가 차단되지 않도록 아래 3곳에 **`kimdy031-glitch.github.io`**를 등록하세요.
1. **Firebase Console** (`sports-ai-makers-83339`) → **Authentication → Settings → Authorized domains** → **`Add domain`** → `kimdy031-glitch.github.io` 추가
2. **Google reCAPTCHA 관리 콘솔** (`6Lf-HjMu...` 키 설정) → **도메인**에 `kimdy031-glitch.github.io` 추가 후 **저장**
3. **Google Cloud Console → API 및 서비스 → 사용자 인증 정보** → 웹 API 키 → 애플리케이션 제한을 웹사이트로 설정 시 `https://kimdy031-glitch.github.io/*` 허용, 그리고 [Google AI Studio Billing](https://aistudio.google.com/billing) 결제 연결 확인
