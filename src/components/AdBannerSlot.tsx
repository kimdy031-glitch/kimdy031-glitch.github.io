/**
 * [파일 목적] Google AdSense 연동을 대비한 반응형 광고 자리(Placeholder) 컨테이너
 * [책임]
 *   - 추후 광고 스크립트 로드 시 레이아웃 밀림(CLS, Cumulative Layout Shift)을 방지하기 위해
 *     고정 높이 영역을 사전에 확보합니다.
 *   - 데스크톱: 높이 90px / 모바일: 높이 50px ~ 100px 범위(64px) 유지
 *   - 인쇄/PDF 저장 시에는 숨김 처리(no-print)됩니다.
 */

import React from 'react';

interface AdBannerSlotProps {
  /** 광고 위치 식별자 ('top-header' | 'bottom-content') */
  position: 'top-header' | 'bottom-content';
}

/**
 * [컴포넌트] CLS 방지용 반응형 광고 여백 컨테이너
 */
export const AdBannerSlot: React.FC<AdBannerSlotProps> = ({ position }) => {
  return (
    <div
      className={`no-print w-full max-w-7xl mx-auto px-4 sm:px-6 ${
        position === 'top-header' ? 'pt-4' : 'pb-4'
      }`}
      data-ad-slot={position}
      aria-hidden="true"
    >
      {/* <!-- Google AdSense Slot: {position} --> */}
      <div className="w-full min-h-[50px] max-h-[100px] h-[64px] md:h-[90px] rounded-md bg-slate-100/70 border border-slate-200/70 flex items-center justify-center overflow-hidden">
        {/* 현재는 추후 애드센스 배너 삽입을 위한 깔끔한 빈 여백으로 유지 */}
      </div>
    </div>
  );
};
