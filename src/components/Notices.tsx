/**
 * [파일 목적] 입력 출처 표시, 오류 및 경고 안내 UI 컴포넌트
 * [책임] MCV 산출 출처(직접 입력 / AI 자세 추정) 및 입력·분석 경고 안내를 명확하게 전달합니다.
 */

import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type { VelocitySource } from '../types/domain';

interface SourceTagProps {
  source: VelocitySource;
}

/**
 * [컴포넌트] MCV 데이터 출처(직접 입력 / AI 자세 추정) 명시 라벨
 */
export const VelocitySourceTag: React.FC<SourceTagProps> = ({ source }) => {
  if (source === 'mediapipe') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-medium whitespace-nowrap">
        AI 자세 추정 MCV
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-900 text-xs font-medium whitespace-nowrap">
      직접 입력한 MCV
    </span>
  );
};

interface ErrorAlertProps {
  title?: string;
  messages: string[];
}

/**
 * [컴포넌트] 계산 불가 조건 또는 입력 유효성 오류 안내 박스
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = '입력값 확인이 필요합니다',
  messages,
}) => {
  if (messages.length === 0) return null;
  return (
    <div
      className="border border-rose-200 bg-rose-50 text-rose-900 rounded-md p-4"
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-rose-950">{title}</p>
          <ul className="list-disc list-inside space-y-0.5 text-rose-800 text-xs sm:text-sm">
            {messages.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

interface WarningAlertProps {
  messages: string[];
}

/**
 * [컴포넌트] 외삽 범위 초과, R² 저하, 분석 조건 차이 등 주의 안내 박스
 */
export const WarningAlert: React.FC<WarningAlertProps> = ({ messages }) => {
  if (messages.length === 0) return null;
  return (
    <div className="border border-amber-200 bg-amber-50 text-amber-950 rounded-md p-3.5 text-xs sm:text-sm">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
        <ul className="space-y-1">
          {messages.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
