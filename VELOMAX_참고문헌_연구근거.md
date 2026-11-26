# VELOMAX 웹서비스 개발 참고문헌 및 연구 근거

> **프로젝트:** VELOMAX — *Velocity + Maximum*  
> **슬로건:** Measure Velocity, Predict Strength. / 속도를 분석하고, 근력을 예측하다.  
> **대상 기능:** 스쿼트·데드리프트 / 부하–속도 선형회귀 / MCV / MVT / e1RM / 결과지 / 히스토리  
> **문서 기준일:** 2026-11-20  
> **문서 용도:** `PRD.md`와 함께 읽는 학술·기술 레퍼런스. **기능 사양은 PRD.md가 우선**한다.

## 0. 읽기 전에

- **총 13개 자료:** 학술 연구 10편, 실무 참고자료 1개(VBTcoach), 기술 문서 2개(Google Cloud·Firebase).
- 이하의 **‘핵심 근거’는 원문의 결과와 취지를 한국어로 요약·의역한 내용**이다. 영어 직접 인용처럼 표시하지 않는다. 수치는 원문의 정의·대상·운동 방식이 일치하는 경우에만 참고한다.
- **데모 버전은** Gemini·Firebase·외부 API를 연동하지 않는다. 영상의 MCV 자동 추출을 구현한 것처럼 표시하지 않고, **샘플 또는 직접 입력한 MCV**로 실제 회귀·e1RM 계산을 한다.
- **실제 MVT(actual MVT)**와 **최적 MVT(optimal MVT, OMVT)**는 다른 개념이다. 해당 속도 지표가 **MCV/MV/ACV**인지 **MPV**인지도 구분한다.
- 본 문헌의 기존 오차율은 **VELOMAX 자체 검증 성능**을 의미하지 않는다. 별도 타당도 검증은 현 단계에서 보류한다.

## 1. 주제별 목차

| 구분 | 참고문헌 | VELOMAX 연결 기능 |
|---|---|---|
| VBT 이론 | Weakley et al. (2021) | MCV 선택, 부하–속도 관계, 종목별 속도 기준 |
| 운동인 속도 | Helms et al. (2017) | 파워리프터의 스쿼트·데드리프트 실제 1RM 속도 |
| 상대근력·숙련도 | Fahs et al. (2019) | 사용자 분류의 해석과 제한 |
| 회귀분석 | Çetin et al. (2022) | 다중 중량으로 1RM 추정, 중량 조합 중요성 |
| 모델 타당도 | Greig et al. (2023) | e1RM 추정의 오차 및 추세 확인 |
| 스쿼트 최적 MVT | Fitas et al. (2024) | 실제 MVT vs 최적 MVT 구분 |
| 데드리프트 최적 MVT | Yang et al. (2026) | 집단 최적 MVT 적용 조건 |
| 성별·속도지표 | Nieto-Acevedo et al. (2023) | 성별 차이 및 MPV≠MCV 구분 |
| 스마트폰 속도 측정 | Renner et al. (2024) | 영상 분석 향후 개발·측정 검증 |
| 저항운동 처방 | Currier et al. (2026) | 목표별 %1RM 권장 중량 설명 |
| 실무 MVT 참고 | VBTcoach (n.d.) | novice/elite 범주와 MVT 표 검토 |
| 동영상 기술 | Google Cloud (n.d.) | 추후 Gemini 영상 분석 |
| 데이터 보안 | Google (n.d.) | 추후 Firebase 인증·저장 |

---

# Part I. VBT 및 MCV 측정 원리

## 1. Weakley et al. (2021) — Velocity-Based Training: From Theory to Application

### APA 7판
Weakley, J., Mann, B., Banyard, H., McLaren, S., Scott, T., & García-Ramos, A. (2021). Velocity-based training: From theory to application. *Strength & Conditioning Journal, 43*(2), 31–49. https://doi.org/10.1519/SSC.0000000000000560

**한글 제목:** 속도 기반 트레이닝: 이론에서 실제 적용까지  
**연구 유형:** 실무 지향 문헌고찰

**핵심 근거(요약·의역):**
- VBT에서는 중량과 수행속도의 관계를 활용해 훈련 강도를 평가·조절한다.
- 평균속도(MV, 구심성 전체 평균), 평균 추진속도(MPV), 최고속도(PV)는 서로 다른 지표다.
- 논문 Table 2에는 여러 연구를 바탕으로 스쿼트 **약 0.30 m/s**, 데드리프트 **약 0.15 m/s** 등의 종목별 1RM 속도 참조값이 제시된다. **이 수치는 novice/elite별 확정값이 아니다.**
- 하체 프리웨이트 운동의 부하–속도 기반 e1RM 추정은 상체 운동보다 정확도가 제한될 수 있음을 강조한다.
- 여러 중량별 속도 중 해당 중량의 **가장 빠른 올바른 반복**을 사용해 부하–속도 관계를 만들 수 있다.

**VELOMAX 적용:** MCV 선택 원리, 최소 세 중량 입력 및 최속 대표값 선택, 종목별 MVT 출처와 제한사항 표시, e1RM 결과에 ‘추정치’ 주의 문구.

**구현 시 주의:** 논문 Table 2의 값은 편의상 종합한 대표값이다. 실제 프로그램에 입력할 땐 종목, 수행 방식, 측정 속도 정의를 함께 저장한다.

## 2. Helms et al. (2017) — RPE and Velocity Relationships for the Back Squat, Bench Press, and Deadlift in Powerlifters

### APA 7판
Helms, E. R., Storey, A., Cross, M. R., Brown, S. R., Lenetsky, S., Ramsay, H., Dillen, C., & Zourdos, M. C. (2017). RPE and velocity relationships for the back squat, bench press, and deadlift in powerlifters. *Journal of Strength and Conditioning Research, 31*(2), 292–297. https://doi.org/10.1519/JSC.0000000000001517

**한글 제목:** 파워리프터의 스쿼트·벤치프레스·데드리프트에서 RPE와 수행속도의 관계  
**연구 유형:** 파워리프터 대상 실험연구

**핵심 근거(요약·의역):**
- 대상: 파워리프터 **15명**(남성 12명, 여성 3명).
- 실제 1RM에서 보고된 **ACV(average concentric velocity)**:

| 종목 | 실제 1RM 수행 시 ACV |
|---|---:|
| 스쿼트 | **0.23 ± 0.05 m/s** |
| 벤치프레스 | 0.10 ± 0.04 m/s |
| 데드리프트 | **0.14 ± 0.05 m/s** |

- 상대강도가 높아질수록 수행속도가 낮아지는 강한 관계가 관찰되었다(발표자료 정리 기준 r 약 −0.90~−0.92).

**VELOMAX 적용:** 운동인·숙련자 집단의 **실제 1RM 속도에 관한 참고 근거**로 유용. 스쿼트와 데드리프트의 MVT가 다르다는 설명에도 사용.

**구현 시 주의:** 이 연구의 대상은 **파워리프터**다. 단순히 ‘운동 경험이 있음’이라는 가입 정보만으로 같은 MVT를 적용해서는 안 된다.

## 3. Fahs et al. (2019) — Factors Related to Average Concentric Velocity of Four Barbell Exercises at Various Loads

### APA 7판
Fahs, C. A., Blumkaitis, J. C., & Rossow, L. M. (2019). Factors related to average concentric velocity of four barbell exercises at various loads. *Journal of Strength and Conditioning Research, 33*(3), 597–605. https://doi.org/10.1519/JSC.0000000000003043

**한글 제목:** 다양한 중량에서 네 가지 바벨 운동의 평균 구심성 속도와 관련된 요인  
**연구 유형:** 실험연구

**핵심 근거(요약·의역):**
- 스쿼트, 벤치프레스, 데드리프트, 오버헤드 프레스 등에서 부하와 평균 구심성 속도의 관계를 조사했다.
- 중량은 속도에 영향을 주는 핵심 요인이며, **운동 종목별 부하–속도 프로파일이 다르다.**
- 상대근력 수준도 수행속도 및 속도 영역 설정과 관련될 수 있다.

**VELOMAX 적용:** 회원가입 단계에서 운동경력 외에도 선수 훈련 여부·운동 참여 형태를 받는 설계 논리 보조.

**구현 시 주의:** 이 연구만으로 ‘운동경력 n개월 이상 = elite’ 같은 단일 분류 규칙을 확정할 수는 없다.

---

# Part II. 부하–속도 선형회귀 및 e1RM

## 4. Çetin et al. (2022) — Reliability and Validity of the Multi-Point Method and the 2-Point Method’s Variations of Estimating the One-Repetition Maximum for Deadlift and Back Squat Exercises

### APA 7판
Çetin, O., Akyildiz, Z., Demirtaş, B., Sungur, Y., Clemente, F. M., Cazan, F., & Ardigò, L. P. (2022). Reliability and validity of the multi-point method and the 2-point method’s variations of estimating the one-repetition maximum for deadlift and back squat exercises. *PeerJ, 10*, e13013. https://doi.org/10.7717/peerj.13013

**한글 제목:** 데드리프트와 백스쿼트에서 다중점·2점법을 이용한 1RM 추정의 신뢰도와 타당도  
**연구 유형:** 실험연구

**핵심 근거(요약·의역):**
- 스쿼트·데드리프트에서 여러 중량의 속도를 사용한 **다중점법**과 서로 다른 중량 조합을 사용한 **2점법**을 비교했다.
- 중량 조합에 따라 추정 성능이 달라질 수 있으므로 단순한 측정점 개수뿐 아니라 **중량 범위와 분산**이 중요하다.

**VELOMAX 적용:** 서로 다른 3개 중량을 입력받는 UI와 저·중·고중량 구성 가이드, 데이터 입력 오류 검사.

**구현 시 주의:** 이 연구가 VELOMAX의 **정확히 3점 방식**을 직접 검증한 것은 아니다. ‘3점법의 정확도가 보장된다’고 쓰지 않는다.

## 5. Greig et al. (2023) — The Predictive Validity of Individualised Load–Velocity Relationships for Predicting 1RM

### APA 7판
Greig, L., Aspe, R. R., Hall, A., Comfort, P., Cooper, K., & Swinton, P. A. (2023). The predictive validity of individualised load–velocity relationships for predicting 1RM: A systematic review and individual participant data meta-analysis. *Sports Medicine, 53*, 1693–1708. https://doi.org/10.1007/s40279-023-01854-9

**한글 제목:** 개인별 부하–속도 관계를 이용한 1RM 예측 타당도: 체계적 문헌고찰과 개별 참가자 데이터 메타분석  
**연구 유형:** 체계적 문헌고찰·개별 참가자 데이터 메타분석

**핵심 근거(요약·의역):**
- 26편의 연구·137개 모델을 검토했고, 20편의 연구에서 434명의 데이터로 메타분석을 수행했다.
- 추정의 **표준오차(SEE%)는 9.8%**(95% CI 7.4–12.2%)로 나타났다.
- 추정값은 실제 1RM보다 평균 **4.5kg**, 상대적으로 **3.7%** 높게 나타나는 경향이 있었다.
- **SEE% 9.8%는 평균 과대추정률 9.8%라는 뜻이 아니다.**
- 부하–속도 모델은 직접 측정 1RM의 완전한 대체라기보다 훈련 주기별 **추세 모니터링**에 유용할 수 있다.

**VELOMAX 적용:** ‘추정 최대근력’이라는 표현, 회귀모델 정보 표시, 히스토리와 변화 추세 그래프, 과신 방지 안내.

**구현 시 주의:** 연구 전체의 평균 오차값을 VELOMAX 데모의 성능 지표처럼 표시하면 안 된다.

---

# Part III. MVT와 개인차

## 6. Fitas et al. (2024) — Average Optimal Minimum Velocity Threshold

### APA 7판
Fitas, A., Gomes, M., Santos, P., Pezarat-Correia, P., García-Ramos, A., & Mendonca, G. V. (2024). Average optimal minimum velocity threshold: A practical variable to increase the accuracy of one-repetition maximum estimation during the free-weight back squat. *Journal of Sports Sciences, 42*(18), 1767–1775. https://doi.org/10.1080/02640414.2024.2410589

**한글 제목:** 프리웨이트 백스쿼트의 1RM 추정 정확도를 높이기 위한 집단 최적 MVT  
**연구 유형:** 실험연구

**핵심 근거(요약·의역):**
- 실제 1RM 속도를 기준으로 한 MVT와, 1RM 예측오차를 최소화하도록 계산한 **최적 MVT(OMVT)**의 활용을 비교했다.
- 집단 최적 MVT를 사용하는 방법이 실제 MVT 기반 방식보다 작은 추정오차를 보일 가능성을 보여줬다.
- 다만 추정오차가 완전히 제거되지는 않으며 작은 1RM 변화의 정밀한 판별에는 주의가 필요하다.

**VELOMAX 적용:** 데이터 구조에 `mvtMethod: actual | optimal`처럼 **정의 구분**을 남기도록 설계. 데모에서는 PRD 지정 일반 MVT만 적용.

## 7. Yang et al. (2026) — A Sex-Invariant Optimal Minimal Velocity Threshold Accurately Estimates Deadlift One-Repetition Maximum

### APA 7판
Yang, L., Chang, Q., Li, Z., Chen, Z., Xiao, S., & Deng, R. (2026). A sex-invariant optimal minimal velocity threshold accurately estimates deadlift one-repetition maximum. *BMC Sports Science, Medicine and Rehabilitation*. Advance online publication. https://doi.org/10.1186/s13102-026-02029-5

**한글 제목:** 성별과 무관한 집단 최적 MVT를 이용한 데드리프트 1RM 추정  
**연구 유형:** 실험연구; 사용자 제공 PDF 원문 확인

**핵심 근거(요약·의역):**
- 저항운동 훈련 경험이 있는 **70명**(남성 35명·여성 35명)을 대상으로 40·60·80·90% 1RM에서 수행속도를 측정했다.
- 네 가지 기준을 비교했다: I-AMVT(개인 실제), G-AMVT(집단 실제), I-OMVT(개인 최적), G-OMVT(집단 최적).
- 전체 대상의 중앙 절대백분율오차는 각각 **5.4% / 4.0% / 1.8% / 3.3%**였다.
- 남성과 여성 모두에서 검사 간 평균 **G-OMVT = 0.36 m/s**가 제시됐다.

**VELOMAX 적용:** 향후 데드리프트 최적 MVT 모델의 참고 문헌.

**구현 시 주의:** **0.36m/s는 실제 1RM에서 측정한 단순 집단 MVT가 아니라 최적화된 G-OMVT**다. Helms et al.의 데드리프트 실제 속도 **0.14m/s**와 혼용하지 않는다.

## 8. Nieto-Acevedo et al. (2023) — Should We Use the Men Load–Velocity Profile for Women in Deadlift and Hip Thrust?

### APA 7판
Nieto-Acevedo, R., Romero-Moraleda, B., Montalvo-Pérez, A., Valdés-Álvarez, A., García-Sánchez, C., & Mon-López, D. (2023). Should we use the men load–velocity profile for women in deadlift and hip thrust? *International Journal of Environmental Research and Public Health, 20*(6), 4888. https://doi.org/10.3390/ijerph20064888

**한글 제목:** 데드리프트와 힙쓰러스트에서 남성의 부하–속도 관계를 여성에게 적용해도 되는가?  
**연구 유형:** 실험연구; 사용자 제공 PDF 원문 확인

**핵심 근거(요약·의역):**
- 남성 16명과 여성 16명의 데드리프트·힙쓰러스트 부하–속도 관계를 분석했다.
- 데드리프트의 상대적으로 가벼운 부하에서 성별에 따른 속도 차이가 관찰됐다.
- **이 연구의 속도 지표는 MPV**다.

**VELOMAX 적용:** 성별 정보를 결과지와 향후 통계 분석용 변수로 보존하는 근거.

**구현 시 주의:** **MPV를 MCV용 MVT 값으로 그대로 입력하지 않는다.** 성별 별도 기준도 현 단계에서 자동 결정하지 않는다.

---

# Part IV. 스마트폰 영상과 트레이닝 처방

## 9. Renner et al. (2024) — Concurrent Validity of Novel Smartphone-Based Apps Monitoring Barbell Velocity in Powerlifting Exercises

### APA 7판
Renner, A., Mitter, B., & Baca, A. (2024). Concurrent validity of novel smartphone-based apps monitoring barbell velocity in powerlifting exercises. *PLOS ONE, 19*(11), e0313919. https://doi.org/10.1371/journal.pone.0313919

**한글 제목:** 파워리프팅 운동에서 새로운 스마트폰 기반 바벨 속도 측정 앱의 동시타당도  
**연구 유형:** 측정 타당도 연구

**핵심 근거(요약·의역):**
- 스마트폰 앱으로 측정한 바벨 속도를 다른 측정 장비와 비교했다.
- 일부 앱은 타당도가 양호했으나 앱별 오차·반복 검출 성능 차이가 나타났다.
- **스마트폰 영상을 사용한다는 사실만으로 정확한 MCV를 보장할 수 없다.**

**VELOMAX 적용:** 추후 Gemini 기반 자동 분석을 개발할 때 반복 판별·변위 추정·시간 기록의 정확성 검토 항목을 정의.

**데모 범위:** 자동 측정은 **미구현**. 영상 파일 미리보기 및 MCV 수동·샘플 입력만 제공.

## 10. Currier et al. (2026) — ACSM Resistance Training Prescription

### APA 7판
Currier, B. S., D’Souza, A. C., Fiatarone Singh, M. A., Lowisz, C. V., Rawson, E. S., Schoenfeld, B. J., Smith-Ryan, A. E., Steen, J. P., Thomas, G. A., Triplett, N. T., Washington, T. A., Werner, T. J., & Phillips, S. M. (2026). American College of Sports Medicine position stand: Resistance training prescription for muscle function, hypertrophy, and physical performance in healthy adults: An overview of reviews. *Medicine & Science in Sports & Exercise, 58*(4), 851–872. https://doi.org/10.1249/MSS.0000000000003897

**한글 제목:** 건강한 성인의 근기능·근비대·신체 수행능력을 위한 저항운동 처방: 문헌고찰 종합  
**연구 유형:** ACSM 포지션 스탠드 / 종합 검토

**핵심 근거(요약·의역):**
- 근력 향상, 근비대, 파워 발달에 필요한 운동강도·훈련량 등의 처방 변수를 종합적으로 설명한다.
- 최대근력은 상대적으로 높은 부하, 근파워는 빠른 수행 의도와 적절한 부하가 중요하다.
- 근비대는 특정한 %1RM 하나로 결정되지 않으며 총훈련량·수행 조건도 고려해야 한다.

**VELOMAX 적용:** e1RM으로 목적별 중량(kg)을 환산하는 기능과 결과지의 활용 안내.

**구현 시 주의:** ‘근비대 = 반드시 단일 %1RM’처럼 고정된 임상적 진리로 제시하지 않는다. 데모의 처방 범위는 **권장 시작점**으로 표시한다.

---

# Part V. 실무 MVT 자료와 공식 개발 문서

## 11. VBTcoach — MVT by Lift Reference Table

### APA 7판
VBTcoach. (n.d.). *MVT by lift reference table: 1RM minimum velocity thresholds across eight strength exercises*. https://vbtcoach.com/charts/mvt-by-lift

**자료 유형:** 실무용 온라인 참고표(동료심사 학술논문 아님)

**핵심 내용(요약):**
- 종목별 MVT를 **novice/elite** 훈련 수준 및 노력 수준에 따라 구분해 안내한다.
- 스쿼트 깊이, 종목, 측정 방식에 따라 MVT가 달라질 수 있다.

**VELOMAX 적용:** 일반인/운동인 MVT 설정 시 참고할 **출발 자료**로 사용하되, 표의 정의가 PRD의 사용자 분류 정의와 일치하는지 확인한다.

**반드시 확인할 사항:**
1. VBTcoach의 `novice`·`elite` 정의가 VELOMAX의 `일반인`·`운동인`과 같은지.
2. 표 속도가 실제 MVT인지, optimal MVT인지.
3. 스쿼트 깊이·프리웨이트 여부·데드리프트 종류·속도 지표가 일치하는지.
4. 참고표가 인용한 개별 논문의 원문이 그 값을 실제로 뒷받침하는지.

**중요:** 현재 이 문서에는 VBTcoach의 novice/elite별 스쿼트·데드리프트 **4개 수치를 확정값으로 입력하지 않는다**. 원문과 분류 기준을 추가로 대조한 뒤 등록한다.

## 12. Google Cloud — Video Understanding

### APA 7판
Google Cloud. (n.d.). *Video understanding*. Google Cloud Documentation. https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/video-understanding

**주요 내용:** Gemini의 영상 이해, 프레임 샘플링, 영상 입력 등. 짧은 구심성 움직임의 정밀한 속도 산출에는 프레임별 시간과 실제 변위 추정의 정확성에 대한 별도 설계가 필요하다.

**VELOMAX 적용:** **정식 버전 예정**. 데모에서는 외부 영상 분석 API를 사용하지 않음.

## 13. Google — Cloud Firestore Security Rules

### APA 7판
Google. (n.d.). *Get started with Cloud Firestore Security Rules*. Firebase Documentation. https://firebase.google.com/docs/firestore/security/get-started

**주요 내용:** 인증 사용자와 Firestore 보안 규칙의 연동, 사용자별 읽기·쓰기 권한 제어.

**VELOMAX 적용:** **정식 버전 예정**. 데모에서는 Firebase 연결 없이 로컬 저장 또는 PRD가 정한 모의 저장 방식 사용.

---

# Part VI. MVT 비교와 코드 반영 가이드

## 14. 논문별 MVT 수치 정리

| 출처 | 속도 종류 및 기준 | 스쿼트 | 데드리프트 | 직접 적용 가능 여부 |
|---|---|---:|---:|---|
| Weakley et al. (2021) | 복수 연구의 종목별 실제 1RM MV 참조값 | 0.30 m/s | 0.15 m/s | 사용자 유형 별 기준은 아님 |
| Helms et al. (2017) | 파워리프터 실제 1RM ACV | 0.23 ± 0.05 m/s | 0.14 ± 0.05 m/s | 파워리프터 조건과 유사할 때 참고 |
| Yang et al. (2026) | 데드리프트 집단 **최적** MVT | — | 0.36 m/s | **실제 MVT로 대체 금지** |
| VBTcoach (n.d.) | novice/elite·운동종목별 표 | 원문 추가 대조 필요 | 원문 추가 대조 필요 | **미확정** |

> 스쿼트 **0.23 m/s**, 데드리프트 **0.14 m/s**는 파워리프터 실험의 실제 1RM 속도에 관한 참고값이다. 다른 사용자 집단에 일률 적용하면 안 된다. **일반인/운동인 4개 MVT 최종값은 아직 확정하지 않는다.**

## 15. e1RM 계산 엔진의 문헌 기반 정의

- 입력: 서로 다른 **3개 중량** `L1, L2, L3`(kg)과 각 중량의 대표 **MCV** `v1, v2, v3`(m/s).
- 회귀식: `v_hat = a * L + b`.
- 추정 최대근력: `e1RM = (MVT - b) / a`.
- `a < 0` 등 기본적인 단조 감소 관계를 확인하고, 부적절한 입력에는 결과를 강제로 만들지 않는다.
- 결정계수 `R²`는 **입력점에 대한 적합도**이지, e1RM의 외부 타당도를 뜻하지 않는다.
- 출력에는 `사용한 MVT`, `그 기준의 출처`, `대표 MCV 선택 방식`, `측정 종목`, `분류된 사용자 유형`을 함께 남긴다.
- 스쿼트와 데드리프트 모두 e1RM이 실제 1RM보다 높거나 낮을 가능성이 있다. **정확도는 데모에서 검증하지 않는다.**

## 16. 코드·데이터 구조에 반영할 추천 필드

```json
{
  "exercise": "squat",
  "userCategory": "general",
  "velocityMetric": "MCV",
  "mvtMethod": "actual",
  "mvtValue": null,
  "mvtUnit": "m/s",
  "mvtSource": null,
  "mvtStatus": "DEMO_UNVERIFIED",
  "repetitionSelector": "fastest_valid",
  "loadUnit": "kg"
}
```

- 위 JSON은 **설계 예시**이다. `null`은 학술 근거에 따라 값이 확정되기 전의 미설정 상태를 의미한다.
- 구현용 임시 수치가 필요하면 별도 `demoConfig`에 넣고 화면에 **‘데모용 기준값·미검증’**이라고 표시한다.
- 나중에 실제 연구 기준값을 확정하면 출처를 포함해 설정만 교체할 수 있도록 구성한다.

## 17. PRD와의 연결

| PRD 기능 | 참고 근거 | 데모 구현 지시 |
|---|---|---|
| 가상 계정·사용자 분류 | Fahs; VBTcoach | general/athlete 모의 계정, 분류 기준 주석 |
| 스쿼트·데드리프트 | Helms; Çetin | 종목별 경로 분리 |
| MCV 입력 | Weakley; Renner | 수동/샘플값 입력, 실제 영상 분석인 척하지 않기 |
| 3중량 선형회귀 | Çetin; Greig | JavaScript로 기울기·절편·R²·e1RM 실제 계산 |
| MVT 적용 | Weakley; Helms; Fitas; Yang | 실제/최적 MVT 혼용 금지, 미확정값 표시 |
| 운동 중량 권장 | Currier | %1RM × e1RM; 권장 시작점으로 안내 |
| 히스토리 | Greig | 동일 종목·유사 측정 조건의 추세 비교 |
| PDF 결과지 | Greig; Currier | 숫자·그래프·해석·한계 함께 표기 |
| Gemini/Firebase 확장 | Google Cloud; Google | 현 데모 미구현, 코드에 한국어 `TODO` 주석 |

## 18. 개발자에게 전달할 핵심 문구

> VELOMAX 데모 버전은 입력한 3개 중량과 MCV로 선형회귀를 **실제 계산**하되, MCV·MVT가 검증된 실측치인지 데모 입력인지 분명히 표시한다. **MVT의 actual/optimal 구분, MCV/MPV 구분, 일반인/운동인 분류 근거**를 지킨다. 학술문헌은 원리와 제한을 뒷받침하는 근거이며, 각 논문의 오차율을 서비스 자체 정확도처럼 표현하지 않는다. 모든 계산 함수와 주요 데이터 흐름에 **한국어 주석을 필수 작성**한다.

---

## 19. 참고자료 원문 링크 모음

1. Weakley et al. (2021) — https://doi.org/10.1519/SSC.0000000000000560
2. Helms et al. (2017) — https://doi.org/10.1519/JSC.0000000000001517
3. Fahs et al. (2019) — https://doi.org/10.1519/JSC.0000000000003043
4. Çetin et al. (2022) — https://doi.org/10.7717/peerj.13013
5. Greig et al. (2023) — https://doi.org/10.1007/s40279-023-01854-9
6. Fitas et al. (2024) — https://doi.org/10.1080/02640414.2024.2410589
7. Yang et al. (2026) — https://doi.org/10.1186/s13102-026-02029-5
8. Nieto-Acevedo et al. (2023) — https://doi.org/10.3390/ijerph20064888
9. Renner et al. (2024) — https://doi.org/10.1371/journal.pone.0313919
10. Currier et al. (2026) — https://doi.org/10.1249/MSS.0000000000003897
11. VBTcoach — https://vbtcoach.com/charts/mvt-by-lift
12. Google Cloud — https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/video-understanding
13. Firebase — https://firebase.google.com/docs/firestore/security/get-started

**메모:** 인용 문구나 수치를 외부 보고서·논문에 직접 인용할 때는 반드시 각 원문에서 페이지·표·그림 번호를 재확인한다.
