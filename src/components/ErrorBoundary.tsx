/**
 * [파일 목적] 예기치 않은 런타임 또는 Firestore 권한 오류를 포착해 안전하게 안내하는 React ErrorBoundary
 */

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { formatFirestoreErrorMessage } from '../firebase';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: formatFirestoreErrorMessage(error),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-center shadow-xs">
            <div className="mx-auto w-11 h-11 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              일시적인 오류가 발생했습니다
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-md cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              새로고침하여 다시 시작
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
