# VELOMAX GitHub Pages 배포 & Google AdSense 연결 가이드 (`kimdy031-glitch.github.io`)

이 문서는 기존 저장소(`velomax-app`)를 **`kimdy031-glitch.github.io`** 루트 도메인 저장소로 변경해 **https://kimdy031-glitch.github.io/** 주소로 배포하고, Google AdSense(`index.html`, `/ads.txt`)를 연결하기 위한 단계별 안내서입니다.

---

## 1. GitHub 저장소 이름 변경 및 수정된 코드 반영하기

1. 기존 GitHub 저장소(`https://github.com/kimdy031-glitch/velomax-app`)로 이동합니다.
2. 상단 **⚙️ `Settings`** → **`General`** 맨 위 **`Repository name`** 입력 칸에서 `velomax-app`을 **`kimdy031-glitch.github.io`**로 변경한 뒤 **`Rename`** 버튼을 클릭합니다.
3. Google AI Studio에서 수정된 코드를 **`kimdy031-glitch/kimdy031-glitch.github.io`** 저장소의 **`main`** 브랜치로 **`Commit & Push`** 합니다.
   - 만약 AI Studio가 아직 예전 이름(`velomax-app`)에 연결되어 있다면 GitHub 연동 설정에서 저장소를 **`kimdy031-glitch.github.io`**로 다시 선택하거나 새 저장소 연결 후 Push 하세요.
4. [https://github.com/kimdy031-glitch/kimdy031-glitch.github.io](https://github.com/kimdy031-glitch/kimdy031-glitch.github.io)의 `main` 브랜치에 아래 파일들이 있는지 확인합니다.
   - `.github/workflows/deploy-pages.yml`
   - `vite.config.ts` (`base: '/'`)
   - `public/ads.txt`, `public/404.html`, `public/.nojekyll`
   - `package.json`, `package-lock.json`

---

## 2. GitHub → `Settings` → `Pages` 설정하기

1. `https://github.com/kimdy031-glitch/kimdy031-glitch.github.io` 상단 **⚙️ `Settings`** 클릭
2. 왼쪽 메뉴 **`Pages`** 클릭
3. **`Build and deployment`** 아래 **`Source`**를 **`GitHub Actions`**로 선택

---

## 3. GitHub → `Actions` 실행 확인 및 실제 주소 접속

1. 상단 **▶️ `Actions`** 탭에서 **`Deploy VELOMAX to GitHub Pages`** 실행이 ✅ 초록색으로 완료될 때까지 기다립니다.
   - 수동 실행이 필요하면 워크플로 선택 → **`Run workflow`** → `Branch: main` 선택 후 **`Run workflow`** 클릭
2. 배포 완료 후 아래 루트 주소로 접속합니다.
   - 서비스 메인 주소: **https://kimdy031-glitch.github.io/**
   - AdSense 확인 파일: **https://kimdy031-glitch.github.io/ads.txt**

> **Firebase & reCAPTCHA 도메인 확인**: 기존과 동일하게 루트 호스트가 **`kimdy031-glitch.github.io`**이므로 Firebase Authentication 승인된 도메인과 reCAPTCHA v3 도메인에 `kimdy031-glitch.github.io`가 등록되어 있으면 로그인·Firestore·Gemini AI가 정상 동작합니다.

---

## 4. Google AdSense 연결 방법

1. Google AdSense에 사이트 주소를 **`https://kimdy031-glitch.github.io`**로 등록합니다.
2. **AdSense 스크립트 추가 (`index.html`)**:
   - AdSense에서 발급한 `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-..." crossorigin="anonymous"></script>` 코드를 `index.html`의 `<!-- Google AdSense Code: ... -->` 주석 아래에 붙여 넣습니다.
3. **`ads.txt` 내용 입력 (`public/ads.txt`)**:
   - AdSense에서 안내하는 본인 게시자 줄(예: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`)을 `public/ads.txt` 파일에 입력하고 `main` 브랜치에 반영합니다.
   - 재배포 완료 후 브라우저에서 **`https://kimdy031-glitch.github.io/ads.txt`**를 열어 방금 입력한 내용이 그대로 보이는지 확인합니다.
