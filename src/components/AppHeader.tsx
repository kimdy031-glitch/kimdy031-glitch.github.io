/**
 * [파일 목적] 로그인 이후 메인 작업 공간의 최상단 내비게이션 헤더 컴포넌트
 * [책임]
 *   - 3구역 상단 바 계약([브랜드 워드마크] — [단일 행 내비게이션 링크] — [1개 주요 CTA]) 준수
 *   - 현재 로그인 사용자 요약 바(사용자명, 일반인/운동인 분류 배지, 로그아웃)는 헤더 하단 컨텍스트 바에 배치
 *   - 인쇄 시(no-print) 자동으로 숨김 처리
 */

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { AppRoute, UserProfile } from '../types/domain';
import { getUserGroupLabelKo } from '../utils/format';

interface AppHeaderProps {
  currentUser: UserProfile;
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
}

const MEMBER_NAV_ITEMS: Array<{ route: AppRoute; label: string }> = [
  { route: 'dashboard', label: '대시보드' },
  { route: 'measure', label: '측정 분석' },
  { route: 'history', label: '히스토리' },
  { route: 'report', label: '결과 보고서' },
  { route: 'profile', label: '마이페이지' },
];

/**
 * 비회원은 히스토리·마이페이지 기능 없이 측정 분석 및 결과 보고서만 제공
 */
const GUEST_NAV_ITEMS: Array<{ route: AppRoute; label: string }> = [
  { route: 'measure', label: '측정 분석' },
  { route: 'report', label: '결과 보고서' },
];

/**
 * [컴포넌트] VELOMAX 상단 내비게이션 헤더 + 사용자 컨텍스트 리본
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  currentRoute,
  onNavigate,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isGuest = currentUser.isGuest === true;
  const navItems = isGuest ? GUEST_NAV_ITEMS : MEMBER_NAV_ITEMS;

  const handleNavClick = (route: AppRoute) => {
    setMobileMenuOpen(false);
    onNavigate(route);
  };

  return (
    <div className="no-print bg-white border-b border-slate-200 sticky top-0 z-30">
      {/* 1행: 엄격한 3구역 상단 내비게이션 바 */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* 구역 1: 브랜드 워드마크 (단일 텍스트 요소) */}
        <button
          type="button"
          onClick={() => handleNavClick(isGuest ? 'measure' : 'dashboard')}
          className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
        >
          VELOMAX
        </button>

        {/* 구역 2: 데스크톱 단일 행 텍스트 내비게이션 */}
        <nav
          className="hidden md:flex items-center gap-6 text-sm font-medium"
          aria-label="주요 메뉴"
        >
          {navItems.map((item) => {
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNavClick(item.route)}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                  isActive
                    ? 'text-blue-700 border-blue-700 font-semibold'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* 구역 3: 단일 주요 CTA + 모바일 메뉴 토글 */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('measure')}
            className="px-4 py-1.5 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            새 e1RM 분석
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-md border border-slate-200 cursor-pointer"
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 모바일 드롭다운 메뉴 */}
      {mobileMenuOpen && (
        <nav
          className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1"
          aria-label="모바일 메뉴"
        >
          {navItems.map((item) => {
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNavClick(item.route)}
                className={`block w-full text-left px-3 py-2.5 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}

      {/* 2행: 로그인 사용자 컨텍스트 리본 */}
      <div className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{currentUser.name}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span
              className={`px-2 py-0.5 rounded border font-semibold ${
                currentUser.userGroup === 'athlete'
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-slate-300 bg-white text-slate-800'
              }`}
            >
              {getUserGroupLabelKo(currentUser.userGroup)}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              (만 {currentUser.age}세)
            </span>
            {isGuest && (
              <span className="px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-900 font-semibold">
                비회원 모드 · 저장/PDF 제한
              </span>
            )}
            <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
            <span className="hidden sm:inline font-mono text-slate-500">
              VELOMAX v1
            </span>
          </div>
          <div className="flex items-center gap-4">
            {!isGuest && (
              <span className="hidden sm:inline text-slate-500">{currentUser.email}</span>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="text-slate-700 hover:text-blue-700 font-semibold underline underline-offset-2 cursor-pointer"
            >
              {isGuest ? '로그인 / 회원가입하기' : '로그아웃'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
