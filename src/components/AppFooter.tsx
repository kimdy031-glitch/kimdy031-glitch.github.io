/**
 * [파일 목적] VELOMAX 전 페이지 공통 하단 푸터(Footer)
 * [책임]
 *   - 모든 페이지(로그인 전, 비회원, 회원, 정책 페이지) 하단에 필수 정책 링크를 노출합니다.
 *   - GitHub Pages 정적 호스팅 환경에서도 404가 발생하지 않도록 해시 라우트(#/about 등)를 사용합니다.
 */

import React from 'react';
import type { AppRoute } from '../types/domain';

interface AppFooterProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

const POLICY_LINKS: Array<{
  route: 'about' | 'references' | 'terms' | 'privacy' | 'contact';
  href: string;
  label: string;
}> = [
  { route: 'about', href: '#/about', label: '서비스 소개' },
  { route: 'references', href: '#/references', label: '참고문헌' },
  { route: 'terms', href: '#/terms', label: '이용약관' },
  { route: 'privacy', href: '#/privacy', label: '개인정보처리방침' },
  { route: 'contact', href: '#/contact', label: '문의하기' },
];

/**
 * [컴포넌트] VELOMAX 전역 푸터
 */
export const AppFooter: React.FC<AppFooterProps> = ({
  currentRoute,
  onNavigate,
}) => {
  return (
    <footer className="no-print border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-slate-500">
        <div className="space-y-1">
          <p className="font-semibold text-slate-700">
            VELOMAX (벨로맥스) · Measure Velocity, Predict Strength.
          </p>
          <p>
            속도를 분석하고, 근력을 예측하다 · VELOMAX v1
          </p>
        </div>

        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
          aria-label="정책 및 안내 링크"
        >
          {POLICY_LINKS.map((link) => {
            const isActive = currentRoute === link.route;
            return (
              <a
                key={link.route}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(link.route);
                }}
                className={`transition-colors underline-offset-4 hover:underline ${
                  isActive
                    ? 'text-blue-700 font-semibold underline'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
      </div>
    </footer>
  );
};
