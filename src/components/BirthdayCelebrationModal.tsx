/**
 * [파일 목적] 로그인한 사용자의 생일 당일 축하 오버레이 모달 (풍선 + 폭죽 효과)
 * [책임]
 *   - 로그인 시점이 사용자의 생일(월·일 일치)인 경우 화려한 풍선 부유 및 폭죽·컨페티 효과를 표시합니다.
 *   - 'Happy Birthday!' 문구와 하단 '생일에도 측정하러 와주셔서 감사해요!' 문구를 강조 표시합니다.
 */

import React from 'react';
import { Cake, Sparkles, X } from 'lucide-react';

interface BirthdayCelebrationModalProps {
  open: boolean;
  userName: string;
  onClose: () => void;
}

const BALLOONS = [
  { left: '6%', color: '#2563EB', delay: '0s', dur: '6.5s', size: 54 },
  { left: '16%', color: '#06B6D4', delay: '1.1s', dur: '7.4s', size: 48 },
  { left: '28%', color: '#F59E0B', delay: '0.4s', dur: '6.8s', size: 58 },
  { left: '42%', color: '#EC4899', delay: '1.8s', dur: '7.2s', size: 50 },
  { left: '58%', color: '#10B981', delay: '0.7s', dur: '6.4s', size: 56 },
  { left: '72%', color: '#8B5CF6', delay: '1.4s', dur: '7.6s', size: 52 },
  { left: '84%', color: '#EF4444', delay: '0.2s', dur: '6.9s', size: 54 },
  { left: '92%', color: '#3B82F6', delay: '2.1s', dur: '7.1s', size: 46 },
];

const FIREWORKS = [
  { top: '14%', left: '16%', color: '#FACC15', delay: '0s', dur: '2.1s' },
  { top: '20%', left: '80%', color: '#38BDF8', delay: '0.5s', dur: '2.3s' },
  { top: '68%', left: '18%', color: '#F472B6', delay: '0.9s', dur: '2.0s' },
  { top: '72%', left: '82%', color: '#34D399', delay: '1.3s', dur: '2.4s' },
  { top: '12%', left: '52%', color: '#FB923C', delay: '0.3s', dur: '2.2s' },
];

const CONFETTI = Array.from({ length: 28 }, (_, idx) => {
  const palette = ['#2563EB', '#06B6D4', '#F59E0B', '#EC4899', '#10B981', '#A855F7'];
  return {
    left: `${(idx * 3.6 + 2) % 98}%`,
    color: palette[idx % palette.length],
    delay: `${((idx * 0.23) % 2.8).toFixed(2)}s`,
    dur: `${(3.6 + (idx % 5) * 0.45).toFixed(2)}s`,
    width: idx % 2 === 0 ? 10 : 7,
    height: idx % 3 === 0 ? 16 : 10,
  };
});

/**
 * [컴포넌트] 생일 축하 풍선·폭죽 모달
 */
export const BirthdayCelebrationModal: React.FC<BirthdayCelebrationModalProps> = ({
  open,
  userName,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="birthday-greeting-title"
    >
      {/* 배경 컨페티 효과 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {CONFETTI.map((piece, idx) => (
          <span
            key={idx}
            className="animate-confetti-fall absolute top-0 rounded-xs"
            style={
              {
                left: piece.left,
                width: `${piece.width}px`,
                height: `${piece.height}px`,
                backgroundColor: piece.color,
                '--delay': piece.delay,
                '--dur': piece.dur,
              } as React.CSSProperties
            }
          />
        ))}

        {/* 배경 폭죽(방사형 불꽃) 효과 */}
        {FIREWORKS.map((fw, idx) => (
          <div
            key={idx}
            className="animate-firework-burst absolute w-36 h-36 -translate-x-1/2 -translate-y-1/2"
            style={
              {
                top: fw.top,
                left: fw.left,
                '--delay': fw.delay,
                '--dur': fw.dur,
              } as React.CSSProperties
            }
          >
            <svg viewBox="0 0 120 120" className="w-full h-full">
              {Array.from({ length: 12 }, (_, rayIdx) => {
                const angle = (rayIdx * Math.PI * 2) / 12;
                const x1 = 60 + Math.cos(angle) * 14;
                const y1 = 60 + Math.sin(angle) * 14;
                const x2 = 60 + Math.cos(angle) * 54;
                const y2 = 60 + Math.sin(angle) * 54;
                return (
                  <g key={rayIdx}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={fw.color}
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx={x2} cy={y2} r="3.5" fill="#FFFFFF" />
                  </g>
                );
              })}
            </svg>
          </div>
        ))}

        {/* 배경 부유 풍선 효과 */}
        {BALLOONS.map((b, idx) => (
          <div
            key={idx}
            className="animate-balloon-rise absolute bottom-0"
            style={
              {
                left: b.left,
                width: `${b.size}px`,
                '--delay': b.delay,
                '--dur': b.dur,
              } as React.CSSProperties
            }
          >
            <svg viewBox="0 0 64 96" className="w-full h-auto drop-shadow-md">
              <ellipse cx="32" cy="34" rx="25" ry="30" fill={b.color} />
              <ellipse cx="23" cy="24" rx="6" ry="10" fill="#FFFFFF" opacity="0.35" />
              <polygon points="32,63 27,69 37,69" fill={b.color} />
              <path
                d="M32 69 Q26 80 34 94"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        ))}
      </div>

      {/* 중앙 생일 축하 카드 */}
      <div className="animate-birthday-pop relative z-10 max-w-md w-full rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border-2 border-amber-300/60 shadow-2xl p-7 sm:p-9 text-center text-white space-y-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="생일 축하 창 닫기"
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-cyan-400 p-0.5 shadow-lg">
          <div className="w-full h-full rounded-[14px] bg-slate-950/80 flex items-center justify-center">
            <Cake className="w-8 h-8 text-amber-300" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            {userName}님의 특별한 날을 축하합니다
          </p>

          <h2
            id="birthday-greeting-title"
            className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-pink-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-xs"
          >
            Happy Birthday!
          </h2>

          <p className="text-base sm:text-lg font-semibold text-white pt-1">
            생일에도 측정하러 와주셔서 감사해요!
          </p>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          오늘도 안전하고 힘찬 퍼포먼스를 응원합니다. VELOMAX와 함께 새로운 컨디션과 e1RM을 확인해 보세요.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-5 rounded-lg bg-gradient-to-r from-amber-400 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950 font-bold text-sm shadow-lg transition-all cursor-pointer"
        >
          축하 받고 측정 시작하기
        </button>
      </div>
    </div>
  );
};
