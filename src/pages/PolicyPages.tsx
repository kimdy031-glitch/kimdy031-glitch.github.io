/**
 * [파일 목적] 필수 정책 및 안내 페이지 (서비스 소개, 참고문헌, 이용약관, 개인정보처리방침, 문의하기)
 * [책임]
 *   - Google AdSense 심사 및 웹서비스 운영 기준에 맞춘 안내·참고문헌·정책 문서를 제공합니다.
 *   - '참고문헌' 탭은 서비스 소개 바로 옆에 배치되며, VELOMAX_참고문헌_연구근거.md의 13개 문헌과 인용 부분을 안내합니다.
 *   - 비회원/미로그인/회원 구분 없이 모든 사용자가 푸터 및 해시 URL(#/about, #/references 등)로 직접 접근할 수 있습니다.
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  FileCheck2,
  Info,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import type { AppRoute } from '../types/domain';

export type PolicyRoute =
  | 'about'
  | 'references'
  | 'terms'
  | 'privacy'
  | 'contact';

interface PolicyPagesProps {
  page: PolicyRoute;
  onNavigate: (route: AppRoute) => void;
  onBack: () => void;
}

const CONTACT_EMAIL = 'kimdy031@skuniv.ac.kr';

const POLICY_TABS: Array<{ key: PolicyRoute; label: string; href: string }> = [
  { key: 'about', label: '서비스 소개', href: '#/about' },
  { key: 'references', label: '참고문헌', href: '#/references' },
  { key: 'terms', label: '이용약관', href: '#/terms' },
  { key: 'privacy', label: '개인정보처리방침', href: '#/privacy' },
  { key: 'contact', label: '문의하기', href: '#/contact' },
];

interface ReferenceEntry {
  id: number;
  category: string;
  citation: string;
  koreanTitle: string;
  url: string;
  keyEvidence: string;
  citedUsage: string;
}

/**
 * [상수] VELOMAX_참고문헌_연구근거.md 기반 13개 참고문헌 및 인용·적용 부분
 */
const REFERENCE_ENTRIES: ReferenceEntry[] = [
  {
    id: 1,
    category: 'VBT 이론 · MCV',
    citation:
      'Weakley, J., Mann, B., Banyard, H., McLaren, S., Scott, T., & García-Ramos, A. (2021). Velocity-based training: From theory to application. Strength & Conditioning Journal, 43(2), 31–49.',
    koreanTitle: '속도 기반 트레이닝: 이론에서 실제 적용까지',
    url: 'https://doi.org/10.1519/SSC.0000000000000560',
    keyEvidence:
      '무게와 속도의 관계를 통해 훈련 강도를 파악할 수 있으며, 여러 반복 중 올바르게 수행한 가장 빠른 반복 속도를 대표값으로 활용할 수 있음을 정리한 문헌입니다. 또한 스쿼트 약 0.30 m/s, 데드리프트 약 0.15 m/s 등 종목별 1RM 속도 참조값과 하체 프리웨이트 예측 시 주의점을 함께 제시합니다.',
    citedUsage:
      'MCV 선택 원리(최초 2회 반복 중심 대표값 활용), 서로 다른 3개 무게 입력 구조, 종목별 MVT 구분 및 e1RM 추정치 한계 안내 문구 설계에 참고했습니다.',
  },
  {
    id: 2,
    category: '운동인 속도 기준',
    citation:
      'Helms, E. R., Storey, A., Cross, M. R., Brown, S. R., Lenetsky, S., Ramsay, H., Dillen, C., & Zourdos, M. C. (2017). RPE and velocity relationships for the back squat, bench press, and deadlift in powerlifters. Journal of Strength and Conditioning Research, 31(2), 292–297.',
    koreanTitle:
      '파워리프터의 스쿼트·벤치프레스·데드리프트에서 RPE와 수행속도의 관계',
    url: 'https://doi.org/10.1519/JSC.0000000000001517',
    keyEvidence:
      '파워리프터 15명(남성 12명, 여성 3명)의 실제 1RM 평균 속도는 스쿼트 0.23 ± 0.05 m/s, 데드리프트 0.14 ± 0.05 m/s로 나타났으며 무게 비율이 높아질수록 속도가 일정하게 느려졌습니다.',
    citedUsage:
      '스쿼트와 데드리프트의 MVT 기준이 서로 다르다는 점과 운동인/숙련자 그룹의 MVT를 일반인보다 낮게 설정하는 설계 근거로 참고했습니다.',
  },
  {
    id: 3,
    category: '숙련도 · 종목 차이',
    citation:
      'Fahs, C. A., Blumkaitis, J. C., & Rossow, L. M. (2019). Factors related to average concentric velocity of four barbell exercises at various loads. Journal of Strength and Conditioning Research, 33(3), 597–605.',
    koreanTitle: '다양한 중량에서 네 가지 바벨 운동의 평균 속도와 관련된 요인',
    url: 'https://doi.org/10.1519/JSC.0000000000003043',
    keyEvidence:
      '스쿼트·데드리프트 등 바벨 운동마다 무게에 따른 속도 변화 흐름이 다르며, 상대 근력 수준과 훈련 배경도 수행 속도와 관련이 있음을 보였습니다.',
    citedUsage:
      '회원가입 시 운동 경력뿐만 아니라 선수 훈련 여부·참여 형태를 함께 받아 일반인/운동인을 구분하는 설계 논리에 참고했습니다.',
  },
  {
    id: 4,
    category: '다중 무게 예측',
    citation:
      'Çetin, O., Akyildiz, Z., Demirtaş, B., Sungur, Y., Clemente, F. M., Cazan, F., & Ardigò, L. P. (2022). Reliability and validity of the multi-point method and the 2-point method’s variations of estimating the one-repetition maximum for deadlift and back squat exercises. PeerJ, 10, e13013.',
    koreanTitle:
      '데드리프트와 백스쿼트에서 다중점·2점법을 이용한 1RM 추정의 신뢰도와 타당도',
    url: 'https://doi.org/10.7717/peerj.13013',
    keyEvidence:
      '스쿼트와 데드리프트에서 여러 무게의 속도를 활용하는 방식과 무게 조합에 따른 1RM 예측 정확도를 비교해, 측정 개수만큼 무게 범위와 간격 구성이 중요함을 확인했습니다.',
    citedUsage:
      '가벼운 무게·중간 무게·무거운 무게 등 서로 다른 3개 무게를 입력받는 UI, 무게 분산 안내 가이드, 동일 무게 중복 차단 검증에 참고했습니다.',
  },
  {
    id: 5,
    category: '예측 한계 · 추세',
    citation:
      'Greig, L., Aspe, R. R., Hall, A., Comfort, P., Cooper, K., & Swinton, P. A. (2023). The predictive validity of individualised load–velocity relationships for predicting 1RM: A systematic review and individual participant data meta-analysis. Sports Medicine, 53, 1693–1708.',
    koreanTitle:
      '개인별 무게–속도 관계를 이용한 1RM 예측 타당도: 체계적 문헌고찰과 메타분석',
    url: 'https://doi.org/10.1007/s40279-023-01854-9',
    keyEvidence:
      '26편의 연구를 종합한 결과 표준오차(SEE%)가 약 9.8% 수준이며 실제 1RM보다 평균 약 4.5 kg 높게 예측되는 경향이 있어, 1회성 절대 판정보다 시간 흐름에 따른 추세 확인에 유용하다고 결론지었습니다.',
    citedUsage:
      "단순 1RM이 아닌 '예측 최대근력(e1RM)' 표기 원칙, 직선 일치도(R²) 안내, 히스토리 및 근력 변화 추세 그래프 설계에 참고했습니다.",
  },
  {
    id: 6,
    category: '스쿼트 최적 MVT',
    citation:
      'Fitas, A., Gomes, M., Santos, P., Pezarat-Correia, P., García-Ramos, A., & Mendonca, G. V. (2024). Average optimal minimum velocity threshold: A practical variable to increase the accuracy of one-repetition maximum estimation during the free-weight back squat. Journal of Sports Sciences, 42(18), 1767–1775.',
    koreanTitle:
      '프리웨이트 백스쿼트의 1RM 추정 정확도를 높이기 위한 집단 최적 MVT',
    url: 'https://doi.org/10.1080/02640414.2024.2410589',
    keyEvidence:
      '실제 1RM 속도 기반 MVT와 예측 오차를 줄이도록 보정한 최적 MVT(OMVT)의 차이를 비교하고, 작은 변화 판별 시 주의가 필요함을 제시했습니다.',
    citedUsage:
      '데이터 구조에서 실제 기준 MVT와 최적 MVT 개념을 구분해 기록하고, v1 서비스에서는 일반 MVT 기준을 일관되게 적용하도록 분리하는 데 참고했습니다.',
  },
  {
    id: 7,
    category: '데드리프트 최적 MVT',
    citation:
      'Yang, L., Chang, Q., Li, Z., Chen, Z., Xiao, S., & Deng, R. (2026). A sex-invariant optimal minimal velocity threshold accurately estimates deadlift one-repetition maximum. BMC Sports Science, Medicine and Rehabilitation.',
    koreanTitle: '성별과 무관한 집단 최적 MVT를 이용한 데드리프트 1RM 추정',
    url: 'https://doi.org/10.1186/s13102-026-02029-5',
    keyEvidence:
      '저항운동 경험자 70명을 대상으로 데드리프트 속도를 측정해 남녀 모두에 적용 가능한 집단 최적 MVT(0.36 m/s)를 제시하며, 실제 1RM 속도(약 0.14 m/s)와 구분해 사용해야 함을 밝혔습니다.',
    citedUsage:
      '추후 데드리프트 최적 MVT 모델 고도화 참고 문헌으로 활용하며, 실제 MVT 수치와 최적 MVT 수치를 섞어 쓰지 않도록 구분 기준을 세웠습니다.',
  },
  {
    id: 8,
    category: '성별 · 속도 지표',
    citation:
      'Nieto-Acevedo, R., Romero-Moraleda, B., Montalvo-Pérez, A., Valdés-Álvarez, A., García-Sánchez, C., & Mon-López, D. (2023). Should we use the men load–velocity profile for women in deadlift and hip thrust? International Journal of Environmental Research and Public Health, 20(6), 4888.',
    koreanTitle:
      '데드리프트와 힙쓰러스트에서 남성의 무게–속도 관계를 여성에게 적용해도 되는가?',
    url: 'https://doi.org/10.3390/ijerph20064888',
    keyEvidence:
      '데드리프트의 가벼운 무게 구간에서 남녀 간 속도 차이가 관찰되었으며, 본 연구는 MCV가 아닌 평균 추진 속도(MPV) 지표를 사용했습니다.',
    citedUsage:
      '회원 정보에 성별을 저장해 향후 분석 변수로 활용할 수 있게 하고, MPV 수치를 MCV 기준값으로 그대로 섞지 않도록 지표 구분 원칙에 참고했습니다.',
  },
  {
    id: 9,
    category: '스마트폰 영상 측정',
    citation:
      'Renner, A., Mitter, B., & Baca, A. (2024). Concurrent validity of novel smartphone-based apps monitoring barbell velocity in powerlifting exercises. PLOS ONE, 19(11), e0313919.',
    koreanTitle:
      '파워리프팅 운동에서 스마트폰 기반 바벨 속도 측정 앱의 동시 타당도',
    url: 'https://doi.org/10.1371/journal.pone.0313919',
    keyEvidence:
      '스마트폰 영상 기반 속도 측정 앱과 전문 장비를 비교한 결과 앱마다 오차와 반복 검출 성능 차이가 있어, 영상 기반 측정값의 오차 점검이 필요함을 보여주었습니다.',
    citedUsage:
      '직접 입력 모드에서 측정 장비 출처(GymAware PowerTool, Moty V, Ronfic Fitvisor 등)를 구분하고 영상 AI 추정 결과와 혼용하지 않도록 분리 설계하는 근거로 참고했습니다.',
  },
  {
    id: 10,
    category: '목적별 추천 무게',
    citation:
      'Currier, B. S., D’Souza, A. C., Fiatarone Singh, M. A., Lowisz, C. V., Rawson, E. S., Schoenfeld, B. J., Smith-Ryan, A. E., Steen, J. P., Thomas, G. A., Triplett, N. T., Washington, T. A., Werner, T. J., & Phillips, S. M. (2026). ACSM position stand: Resistance training prescription for muscle function, hypertrophy, and physical performance in healthy adults. Medicine & Science in Sports & Exercise, 58(4), 851–872.',
    koreanTitle:
      '건강한 성인의 근기능·근비대·수행능력을 위한 저항운동 처방 (ACSM 종합 검토)',
    url: 'https://doi.org/10.1249/MSS.0000000000003897',
    keyEvidence:
      '최대근력·근비대·근파워·근지구력 등 운동 목표에 맞는 무게 강도(%1RM)와 훈련량 원리를 정리하면서, 근비대는 하나의 고정 비율이 아니라 전체 훈련량과 함께 봐야 함을 설명했습니다.',
    citedUsage:
      '예측된 e1RM을 바탕으로 4가지 운동 목적별 추천 무게 범위(kg)를 계산하고, 결과지에 시작 참고 무게로 안내하는 기능에 참고했습니다.',
  },
  {
    id: 11,
    category: '실무 MVT 참고표',
    citation:
      'VBTcoach. (n.d.). MVT by lift reference table: 1RM minimum velocity thresholds across eight strength exercises.',
    koreanTitle: '종목별·숙련도별 실무 MVT 참고표',
    url: 'https://vbtcoach.com/charts/mvt-by-lift',
    keyEvidence:
      '초보자(novice)와 숙련자(elite) 구분에 따른 주요 종목별 실무 참고 MVT를 정리한 자료입니다(동료심사 학술논문은 아니며 참고 출발 자료로 활용).',
    citedUsage:
      '일반인/운동인 MVT 차등 구조를 검토할 때 출발 참고 자료로 활용했으며, 학술 검증 문헌과 구분해 관리하도록 설계했습니다.',
  },
  {
    id: 12,
    category: '영상 분석 기술',
    citation:
      'Google Cloud. (n.d.). Video understanding documentation.',
    koreanTitle: 'Google Cloud 영상 이해 기술 문서',
    url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/video-understanding',
    keyEvidence:
      '클라우드 AI 모델의 동영상 프레임 샘플링, 시간·움직임 분석 구조를 설명하는 공식 기술 문서입니다.',
    citedUsage:
      '추후 정식 버전에서 서버 기반 AI 영상 분석과 정밀 변위 추적 기능으로 확장할 때 참고할 기술 설계 문서로 반영했습니다.',
  },
  {
    id: 13,
    category: '데이터 보안 · 저장',
    citation:
      'Google Firebase. (n.d.). Get started with Cloud Firestore Security Rules.',
    koreanTitle: 'Firebase Cloud Firestore 보안 규칙 문서',
    url: 'https://firebase.google.com/docs/firestore/security/get-started',
    keyEvidence:
      '로그인 사용자별 인증 연동 및 읽기·쓰기 권한 제어 규칙 설계를 안내하는 공식 문서입니다.',
    citedUsage:
      'VELOMAX v1에서 회원 인증(Firebase Authentication)과 회원별 측정 기록 분리 저장(Cloud Firestore) 보안 규칙을 설계·구축하는 데 적용했습니다.',
  },
];

/**
 * [컴포넌트] VELOMAX 정책, 서비스 소개 및 참고문헌 페이지
 */
export const PolicyPages: React.FC<PolicyPagesProps> = ({
  page,
  onNavigate,
  onBack,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 상단 돌아가기 및 페이지 전환 탭 (서비스 소개 바로 옆에 참고문헌 배치) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          서비스 화면으로 돌아가기
        </button>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
          {POLICY_TABS.map((tab) => {
            const active = page === tab.key;
            return (
              <a
                key={tab.key}
                href={tab.href}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(tab.key);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </a>
            );
          })}
        </div>
      </div>

      {/* 본문 카드 */}
      <article className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-6 text-slate-700">
        {page === 'about' && (
          <>
            <header className="border-b border-slate-200 pb-4 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-700">
                <Info className="w-4 h-4" />
                ABOUT VELOMAX
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                서비스 소개
              </h1>
              <p className="text-sm text-slate-600">
                VELOMAX(벨로맥스) — Measure Velocity, Predict Strength. (속도를 분석하고, 근력을 예측하다)
              </p>
            </header>

            <section className="space-y-3 text-sm leading-relaxed">
              <h2 className="text-base font-bold text-slate-900">
                1. VELOMAX란 무엇인가요?
              </h2>
              <p>
                <strong>VELOMAX(벨로맥스)</strong>는 운동하는 속도로 근력을 예측하는 VBT(속도 기반 트레이닝) 원리를 바탕으로,
                스쿼트와 데드리프트의 무게(kg)와 들어 올리는 평균 속도(MCV, m/s) 관계를 분석해
                개인의 예측 최대근력(e1RM)과 목적별 추천 무게를 알려주는 웹 서비스입니다.
              </p>
            </section>

            <section className="space-y-3 text-sm leading-relaxed">
              <h2 className="text-base font-bold text-slate-900">
                2. 핵심 기능 및 분석 방법
              </h2>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong>AI 자세 추정 영상 분석:</strong> 15초 이하 영상에서 기준 물체 길이를 맞춘 뒤, AI 자세 추적으로 손목 움직임과 MCV를 계산합니다. 여러 번 반복한 영상은 근피로 영향을 줄이기 위해 최초 2회까지만 반영합니다.
                </li>
                <li>
                  <strong>내 MCV 직접 입력:</strong> 이미 알고 있는 MCV 수치가 있다면 측정 장비(GymAware PowerTool, Moty V, Ronfic Fitvisor, IMU 센서 장비, 기타)를 선택해 그대로 e1RM을 계산할 수 있습니다.
                </li>
                <li>
                  <strong>무게–속도 직선 분석 &amp; MVT 기준 예측:</strong> 서로 다른 3개 무게의 속도 데이터로 무게–속도 직선을 구한 뒤, 일반인/운동인 기준 MVT와 만나는 지점에서 예측 최대근력(e1RM)을 계산합니다.
                </li>
                <li>
                  <strong>목적별 추천 무게 및 결과 보고서:</strong> 예측된 e1RM을 기준으로 최대근력·근비대·근파워·근지구력 목표에 맞는 추천 무게를 제시하고, 회원은 기록 추세 비교와 PDF 저장을 이용할 수 있습니다.
                </li>
              </ul>
            </section>

            <section className="space-y-2 rounded-md border border-blue-200 bg-blue-50/70 p-4 text-xs sm:text-sm text-blue-950">
              <p className="font-semibold">VELOMAX v1 안내</p>
              <p className="leading-relaxed">
                VELOMAX v1은 회원가입 및 이메일 로그인을 통해 회원별 측정 기록과 근력 변화 추세를 클라우드에 안전하게 보관하며, 비회원으로도 즉시 측정을 시작할 수 있습니다. 산출된 e1RM과 추천 무게는 훈련 참고용 지표로 활용하시고 실제 1RM 판정이나 의학적 처방의 유일한 기준으로 사용하지 마시기 바랍니다.
              </p>
            </section>
          </>
        )}

        {page === 'references' && (
          <>
            <header className="border-b border-slate-200 pb-4 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-700">
                <BookOpen className="w-4 h-4" />
                REFERENCES &amp; RESEARCH BASIS
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                참고문헌 및 연구 근거
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                VELOMAX의 MCV·MVT 개념, 무게–속도 직선 분석, 목적별 추천 무게, 영상·데이터 설계에 참고한 총 13편의 학술 논문·실무 자료·기술 문서와 실제 서비스에 인용 및 적용한 부분입니다.
              </p>
            </header>

            <section className="rounded-md border border-blue-200 bg-blue-50/60 p-4 text-xs sm:text-sm text-blue-950 space-y-1.5">
              <p className="font-semibold">참고문헌 활용 원칙</p>
              <p className="leading-relaxed text-xs">
                아래 논문들의 오차율이나 연구 대상 수치는 각 원문의 실험 결과이며 VELOMAX 자체의 검증 성능을 뜻하지 않습니다. 또한 실제 1RM 속도(Actual MVT)와 예측 오차를 줄이기 위한 최적 MVT(OMVT), 그리고 MCV와 MPV 지표는 서로 다르므로 혼용하지 않도록 구분 설계했습니다.
              </p>
            </section>

            {/* 13개 참고문헌 카드 목록 */}
            <section className="space-y-4">
              {REFERENCE_ENTRIES.map((ref) => (
                <div
                  key={ref.id}
                  className="border border-slate-200 rounded-lg p-4 sm:p-5 space-y-2.5 bg-slate-50/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
                      <span>[{ref.id}]</span>
                      <span>{ref.category}</span>
                    </span>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      원문 링크 <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <p className="text-sm font-bold text-slate-900">
                    {ref.koreanTitle}
                  </p>

                  <p className="text-xs text-slate-600 leading-relaxed break-words">
                    {ref.citation}{' '}
                    <span className="font-mono text-slate-500">{ref.url}</span>
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="bg-white border border-slate-200 rounded-md p-3 space-y-1">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        주요 연구·문서 내용
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {ref.keyEvidence}
                      </p>
                    </div>
                    <div className="bg-white border border-blue-200 rounded-md p-3 space-y-1">
                      <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                        인용 및 VELOMAX 적용 부분
                      </p>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium">
                        {ref.citedUsage}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* 문헌별 MVT 비교 요약표 */}
            <section className="space-y-3 pt-2">
              <h2 className="text-base font-bold text-slate-900">
                참고 문헌별 MVT 기준 비교 요약
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm border border-slate-200 border-collapse">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="py-2 px-3 text-left border-b border-slate-200">
                        출처
                      </th>
                      <th className="py-2 px-3 text-left border-b border-slate-200">
                        속도 지표 및 기준
                      </th>
                      <th className="py-2 px-3 text-right border-b border-slate-200">
                        스쿼트
                      </th>
                      <th className="py-2 px-3 text-right border-b border-slate-200">
                        데드리프트
                      </th>
                      <th className="py-2 px-3 text-left border-b border-slate-200">
                        VELOMAX 적용 기준
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        Weakley et al. (2021)
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        종목별 실제 1RM 평균 속도 참조값
                      </td>
                      <td className="py-2 px-3 text-right font-mono">0.30 m/s</td>
                      <td className="py-2 px-3 text-right font-mono">0.15 m/s</td>
                      <td className="py-2 px-3 text-slate-600">
                        종목 간 속도 차이 참고
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        Helms et al. (2017)
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        파워리프터 실제 1RM 속도
                      </td>
                      <td className="py-2 px-3 text-right font-mono">0.23 ± 0.05 m/s</td>
                      <td className="py-2 px-3 text-right font-mono">0.14 ± 0.05 m/s</td>
                      <td className="py-2 px-3 text-slate-600">
                        운동인 조건 참고 근거
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        Yang et al. (2026)
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        데드리프트 집단 최적 MVT (G-OMVT)
                      </td>
                      <td className="py-2 px-3 text-right font-mono">—</td>
                      <td className="py-2 px-3 text-right font-mono">0.36 m/s</td>
                      <td className="py-2 px-3 text-amber-800 font-medium">
                        실제 MVT와 혼용 금지
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        VBTcoach (n.d.)
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        초보/숙련자 실무 참고표
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500">
                        대조 필요
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500">
                        대조 필요
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        v1 기준과 분리 관리
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {page === 'terms' && (
          <>
            <header className="border-b border-slate-200 pb-4 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-700">
                <FileCheck2 className="w-4 h-4" />
                TERMS OF SERVICE
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                이용약관
              </h1>
              <p className="text-xs text-slate-500">시행일: 2026년 10월 1일</p>
            </header>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-bold text-slate-900">제1조 (목적)</h2>
              <p>
                본 약관은 VELOMAX(이하 &quot;서비스&quot;)가 제공하는 무게–속도 기반 예측 최대근력(e1RM) 분석 웹서비스의 이용 조건 및 절차, 이용자와 운영자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-bold text-slate-900">제2조 (서비스의 성격 및 면책)</h2>
              <ul className="list-disc list-inside space-y-1.5">
                <li>
                  본 서비스는 VBT(속도 기반 트레이닝) 원리를 활용한 근력 예측 및 훈련 관리 서비스이며, 의학적 진단·치료·재활 또는 공인 1RM 판정 도구가 아닙니다.
                </li>
                <li>
                  서비스 내에서 계산되는 e1RM, 직선 일치도(R²), 추천 무게 및 AI 분석 문구는 참고용 수치이며, 실제 중량 운동 중 발생하는 부상이나 손실에 대해 운영자는 법적 책임을 지지 않습니다.
                </li>
                <li>
                  분석 시 적용되는 기준 속도(MVT)는 사용자 구분(일반인/운동인)별 표준 설정값입니다.
                </li>
              </ul>
            </section>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-bold text-slate-900">제3조 (회원 및 비회원 이용 구분)</h2>
              <ul className="list-disc list-inside space-y-1.5">
                <li>
                  <strong>비회원 이용:</strong> 별도의 회원가입 없이 이름, 생년월일, 사용자 구분만으로 즉시 e1RM 측정을 이용할 수 있으나, 기록 저장, 마이페이지, PDF 저장 및 근력 변화 추세 그래프 기능은 제한됩니다.
                </li>
                <li>
                  <strong>회원 이용:</strong> 이메일 회원가입 및 로그인을 통해 클라우드 데이터베이스에 측정 기록을 보관하고 변화 추세 조회, 결과 보고서 PDF 저장 기능을 이용할 수 있습니다.
                </li>
              </ul>
            </section>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-bold text-slate-900">제4조 (지식재산권 및 서비스 변경)</h2>
              <p>
                서비스의 화면 구성, 분석 코드, 브랜드명(VELOMAX) 및 로고에 관한 권리는 운영자에게 귀속됩니다. 운영자는 서비스 품질 개선을 위해 사전 안내 후 기능 및 약관을 변경할 수 있습니다.
              </p>
            </section>
          </>
        )}

        {page === 'privacy' && (
          <>
            <header className="border-b border-slate-200 pb-4 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-700">
                <ShieldCheck className="w-4 h-4" />
                PRIVACY POLICY
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                개인정보처리방침
              </h1>
              <p className="text-xs text-slate-500">최종 업데이트: 2026년 10월 1일</p>
            </header>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-bold text-slate-900">
                1. 개인정보 수집·저장 및 보안 원칙
              </h2>
              <p>
                VELOMAX v1은 회원 인증을 위해 Firebase Authentication을, 회원 프로필 및 측정 기록 보관을 위해 Google Cloud Firestore를 사용합니다. 회원의 개인정보(이름, 이메일, 생년월일, 성별, 운동 경력, 참여 형태)와 측정 기록은 보안 규칙(Security Rules)을 통해 로그인한 본인 계정으로만 접근할 수 있도록 격리 관리됩니다.
              </p>
            </section>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-bold text-slate-900">
                2. 운동 영상 처리 및 비보관 원칙
              </h2>
              <p>
                사용자가 MCV 측정을 위해 올린 운동 영상(최대 15초)은 브라우저 내부 메모리에서 AI 자세 추정 분석에만 잠깐 사용되며, 외부 서버로 전송되거나 데이터베이스에 영구 보관되지 않습니다.
              </p>
            </section>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-bold text-slate-900">
                3. 비회원 세션 데이터 처리
              </h2>
              <p>
                비회원으로 입력한 이름, 생년월일, 구분 정보는 현재 브라우저 탭이 열려 있는 동안{' '}
                <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">sessionStorage</code>에만 세션 동안 유지되며, 로그아웃하거나 탭을 닫으면 즉시 사라집니다. 비회원의 측정 기록 또한 데이터베이스에 저장되지 않습니다.
              </p>
            </section>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-bold text-slate-900">
                4. 쿠키 및 제3자 광고 서비스(Google AdSense) 안내
              </h2>
              <p>
                서비스는 운영 비용 충당을 위해 Google AdSense 등 제3자 광고 플랫폼을 연동할 수 있습니다. 광고 연동 시 Google 및 파트너사는 이용자의 이전 방문 기록을 바탕으로 맞춤형 광고를 제공하기 위해 쿠키를 사용할 수 있으며, 이용자는 Google 광고 설정 또는 브라우저 쿠키 설정을 통해 맞춤형 광고를 거부할 수 있습니다.
              </p>
            </section>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-bold text-slate-900">
                5. 이용자 권리 및 데이터 삭제 방법
              </h2>
              <p>
                회원은 언제든지 서비스 내 <strong>마이페이지 &gt; 내 측정 기록 전체 삭제</strong> 또는 <strong>히스토리 개별 삭제</strong> 기능을 통해 저장된 측정 데이터를 즉시 삭제할 수 있습니다. 계정 삭제 및 개인정보 관련 문의는{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-blue-700 font-semibold underline"
                >
                  {CONTACT_EMAIL}
                </a>
                으로 연락해 주시기 바랍니다.
              </p>
            </section>
          </>
        )}

        {page === 'contact' && (
          <>
            <header className="border-b border-slate-200 pb-4 space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-700">
                <Mail className="w-4 h-4" />
                CONTACT US
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                문의하기
              </h1>
              <p className="text-sm text-slate-600">
                VELOMAX 서비스 이용 문의, 기능 제안, 오류 제보 및 협업 관련 연락은 아래 공식 이메일을 이용해 주세요.
              </p>
            </header>

            <section className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  운영자 공식 이메일
                </p>
                <p className="font-mono text-lg sm:text-xl font-bold text-slate-900 break-all">
                  {CONTACT_EMAIL}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                    '[VELOMAX] 서비스 문의'
                  )}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  이메일로 직접 문의하기 (mailto)
                </a>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      이메일 주소 복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      이메일 주소 복사
                    </>
                  )}
                </button>
              </div>
            </section>

            <section className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <h2 className="text-sm font-bold text-slate-900">문의 시 함께 알려주시면 좋은 정보</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>오류 발생 화면명 (예: 측정 분석, 영상 길이 맞추기, 결과 보고서 등)</li>
                <li>사용 중인 브라우저 및 기기 환경 (예: Chrome 데스크톱, Safari 모바일)</li>
                <li>오류 발생 순서 또는 개선을 원하시는 구체적인 기능 설명</li>
              </ul>
            </section>
          </>
        )}
      </article>
    </div>
  );
};
