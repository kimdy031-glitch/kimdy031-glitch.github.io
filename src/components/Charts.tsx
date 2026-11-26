/**
 * [파일 목적] 외부 차트 라이브러리/CDN 없이 순수 SVG로 구현한 과학·스포츠 데이터 시각화 컴포넌트
 * [책임]
 *   1) LoadVelocityChart: 부하(kg)-속도(m/s) 3개 관측점, 최소제곱 회귀직선, MVT 기준선, e1RM 교차점 시각화
 *   2) HistoryTrendChart: 측정일 순서에 따른 종목별 e1RM 변화 추세 선그래프 시각화
 * [주의] 인쇄(PDF 저장) 시에도 깨지지 않도록 고정 viewBox 기반의 반응형 SVG로 설계했습니다.
 */

import React, { useState } from 'react';
import type {
  LoadVelocityPoint,
  MeasurementRecord,
  RegressionResult,
} from '../types/domain';
import { formatDateShortKo, formatKg, formatVelocity } from '../utils/format';

interface LoadVelocityChartProps {
  points: LoadVelocityPoint[];
  regression: RegressionResult;
  mvtMs: number;
  e1rmKg: number;
  height?: number;
}

/**
 * [컴포넌트] 부하-속도 선형회귀 및 e1RM 교차점 시각화 SVG 차트
 */
export const LoadVelocityChart: React.FC<LoadVelocityChartProps> = ({
  points,
  regression,
  mvtMs,
  e1rmKg,
  height = 340,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | 'e1rm' | null>(null);

  // SVG 내부 좌표계 여백 설정
  const width = 680;
  const padLeft = 64;
  const padRight = 36;
  const padTop = 32;
  const padBottom = 52;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // X축(중량 kg) 최소·최대 범위 계산
  const allLoads = [...points.map((p) => p.loadKg), e1rmKg];
  const minLoad = Math.min(...allLoads);
  const maxLoad = Math.max(...allLoads);
  const loadSpan = Math.max(20, maxLoad - minLoad);
  const xMin = Math.max(0, Math.floor((minLoad - loadSpan * 0.18) / 10) * 10);
  const xMax = Math.ceil((maxLoad + loadSpan * 0.14) / 10) * 10;

  // Y축(속도 m/s) 최소·최대 범위 계산
  const allObsV = points.map((p) => p.mcvMs);
  const maxObsV = Math.max(...allObsV);
  const yStartAtXMin = regression.slope * xMin + regression.intercept;
  const yMax = Math.max(
    1.1,
    Math.ceil((Math.max(maxObsV, yStartAtXMin) + 0.12) * 10) / 10
  );
  const yMin = 0;

  // 데이터 좌표 -> SVG 픽셀 좌표 변환 함수
  const toSvgX = (loadKg: number) =>
    padLeft + ((loadKg - xMin) / (xMax - xMin)) * plotW;
  const toSvgY = (vMs: number) =>
    padTop + ((yMax - vMs) / (yMax - yMin)) * plotH;

  // 주 회귀직선 시작점·끝점
  const lineStartX = xMin;
  const lineStartY = regression.slope * lineStartX + regression.intercept;
  const lineEndX = Math.min(xMax, e1rmKg + loadSpan * 0.06);
  const lineEndY = Math.max(0, regression.slope * lineEndX + regression.intercept);

  // 눈금 생성 (X축 5등분, Y축 5등분)
  const xTicks = Array.from({ length: 6 }, (_, i) => xMin + ((xMax - xMin) * i) / 5);
  const yTicks = Array.from({ length: 6 }, (_, i) => yMin + ((yMax - yMin) * i) / 5);

  const e1rmSvgX = toSvgX(e1rmKg);
  const mvtSvgY = toSvgY(mvtMs);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none overflow-visible"
        role="img"
        aria-label="무게-속도 분석 및 예측 최대근력 e1RM 그래프"
      >
        {/* 배경 플롯 영역 */}
        <rect
          x={padLeft}
          y={padTop}
          width={plotW}
          height={plotH}
          fill="#F8FAFC"
          stroke="#E2E8F0"
          strokeWidth={1}
        />

        {/* 수평 눈금선 및 Y축 라벨 (MCV m/s) */}
        {yTicks.map((tick, idx) => {
          const y = toSvgY(tick);
          return (
            <g key={`y-${idx}`}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={padLeft - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 font-mono text-[11px] tabular-nums"
              >
                {tick.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* 수직 눈금선 및 X축 라벨 (중량 kg) */}
        {xTicks.map((tick, idx) => {
          const x = toSvgX(tick);
          return (
            <g key={`x-${idx}`}>
              <line
                x1={x}
                y1={padTop}
                x2={x}
                y2={height - padBottom}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={x}
                y={height - padBottom + 18}
                textAnchor="middle"
                className="fill-slate-500 font-mono text-[11px] tabular-nums"
              >
                {Math.round(tick)}
              </text>
            </g>
          );
        })}

        {/* 축 제목 */}
        <text
          x={padLeft + plotW / 2}
          y={height - 10}
          textAnchor="middle"
          className="fill-slate-600 text-[12px] font-medium"
        >
          운동 무게 (kg)
        </text>
        <text
          x={16}
          y={padTop + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${padTop + plotH / 2})`}
          className="fill-slate-600 text-[12px] font-medium"
        >
          들어 올리는 평균 속도 MCV (m/s)
        </text>

        {/* MVT 수평 기준선 */}
        <line
          x1={padLeft}
          y1={mvtSvgY}
          x2={width - padRight}
          y2={mvtSvgY}
          stroke="#0891B2"
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
        <text
          x={padLeft + 8}
          y={mvtSvgY - 6}
          className="fill-cyan-700 font-mono text-[11px] font-semibold tabular-nums"
        >
          MVT 기준선: {mvtMs.toFixed(2)} m/s
        </text>

        {/* 주 e1RM 수직 투영선 (MVT 교차점에서 X축으로) */}
        <line
          x1={e1rmSvgX}
          y1={mvtSvgY}
          x2={e1rmSvgX}
          y2={height - padBottom}
          stroke="#D97706"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />

        {/* 주 최소제곱 회귀직선 */}
        <line
          x1={toSvgX(lineStartX)}
          y1={toSvgY(lineStartY)}
          x2={toSvgX(lineEndX)}
          y2={toSvgY(lineEndY)}
          stroke="#2563EB"
          strokeWidth={2.5}
        />

        {/* 입력된 3~5개의 측정 포인트 */}
        {points.map((pt, idx) => {
          const cx = toSvgX(pt.loadKg);
          const cy = toSvgY(pt.mcvMs);
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={`pt-${idx}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 8 : 6}
                fill="#1D4ED8"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
              <text
                x={cx}
                y={cy - 11}
                textAnchor="middle"
                className="fill-slate-800 font-mono text-[11px] font-semibold tabular-nums"
              >
                {pt.loadKg}kg · {pt.mcvMs.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* MVT와 회귀직선의 교차점 (e1RM 포인트) */}
        <g
          className="cursor-pointer"
          onMouseEnter={() => setHoveredIdx('e1rm')}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <circle
            cx={e1rmSvgX}
            cy={mvtSvgY}
            r={hoveredIdx === 'e1rm' ? 9 : 7}
            fill="#D97706"
            stroke="#FFFFFF"
            strokeWidth={2}
          />
          <text
            x={Math.min(e1rmSvgX, width - padRight - 46)}
            y={Math.max(padTop + 14, mvtSvgY - 14)}
            textAnchor="middle"
            stroke="#FFFFFF"
            strokeWidth={3}
            paintOrder="stroke"
            className="fill-orange-600 font-mono text-[12px] font-bold tabular-nums"
          >
            e1RM {e1rmKg.toFixed(1)}kg
          </text>
        </g>

        {/* 호버 상세 툴팁 박스 (마우스 오버 시 우측 상단 HUD로 표시) */}
        {hoveredIdx !== null && (
          <g>
            <rect
              x={width - padRight - 208}
              y={padTop + 8}
              width={200}
              height={46}
              rx={4}
              fill="#FFFFFF"
              stroke="#CBD5E1"
              strokeWidth={1}
            />
            {hoveredIdx === 'e1rm' ? (
              <>
                <text
                  x={width - padRight - 198}
                  y={padTop + 26}
                  className="fill-amber-700 text-[11px] font-semibold"
                >
                  예측 최대근력 (e1RM)
                </text>
                <text
                  x={width - padRight - 198}
                  y={padTop + 44}
                  className="fill-slate-800 font-mono text-[12px] tabular-nums"
                >
                  {formatKg(e1rmKg)} @ {formatVelocity(mvtMs)}
                </text>
              </>
            ) : (
              typeof hoveredIdx === 'number' && (
                <>
                  <text
                    x={width - padRight - 198}
                    y={padTop + 26}
                    className="fill-blue-700 text-[11px] font-semibold"
                  >
                    세트 #{hoveredIdx + 1} 측정 결과
                  </text>
                  <text
                    x={width - padRight - 198}
                    y={padTop + 44}
                    className="fill-slate-800 font-mono text-[12px] tabular-nums"
                  >
                    {formatKg(points[hoveredIdx].loadKg)} /{' '}
                    {formatVelocity(points[hoveredIdx].mcvMs)}
                  </text>
                </>
              )
            )}
          </g>
        )}
      </svg>

      {/* 범례 (인쇄 및 화면 공용) */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-700" />
          <span>측정된 {points.length}개 무게–MCV</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-0.5 bg-blue-600" />
          <span>무게–속도 예측 직선</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-0.5 border-t-2 border-dashed border-cyan-600" />
          <span>MVT 기준선</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-600" />
          <span>예측 최대근력(e1RM)</span>
        </div>
      </div>
    </div>
  );
};

interface HistoryTrendChartProps {
  records: MeasurementRecord[];
  height?: number;
  accentColor?: string;
}

/**
 * [컴포넌트] 측정일 순 e1RM 변화 추세 SVG 선그래프
 */
export const HistoryTrendChart: React.FC<HistoryTrendChartProps> = ({
  records,
  height = 240,
  accentColor = '#2563EB',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 시간순(오래된 순 -> 최신 순)으로 정렬
  const ordered = [...records].sort(
    (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
  );

  if (ordered.length === 0) {
    return (
      <div className="flex items-center justify-center h-44 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-500">
        추세를 표시할 측정 기록이 아직 없습니다.
      </div>
    );
  }

  const width = 680;
  const padLeft = 58;
  const padRight = 32;
  const padTop = 28;
  const padBottom = 42;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const values = ordered.map((r) => r.e1rmKg);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const span = Math.max(10, maxVal - minVal);
  const yMin = Math.max(0, Math.floor((minVal - span * 0.25) / 5) * 5);
  const yMax = Math.ceil((maxVal + span * 0.25) / 5) * 5;

  const getX = (idx: number) => {
    if (ordered.length === 1) return padLeft + plotW / 2;
    return padLeft + (idx / (ordered.length - 1)) * plotW;
  };
  const getY = (val: number) =>
    padTop + ((yMax - val) / Math.max(1, yMax - yMin)) * plotH;

  const polylinePoints = ordered
    .map((r, i) => `${getX(i)},${getY(r.e1rmKg)}`)
    .join(' ');

  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none overflow-visible"
        role="img"
        aria-label="측정일 순 e1RM 변화 추세 그래프"
      >
        <rect
          x={padLeft}
          y={padTop}
          width={plotW}
          height={plotH}
          fill="#F8FAFC"
          stroke="#E2E8F0"
          strokeWidth={1}
        />

        {yTicks.map((tick, idx) => {
          const y = getY(tick);
          return (
            <g key={`htick-${idx}`}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={padLeft - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 font-mono text-[11px] tabular-nums"
              >
                {tick.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* 추세 연결선 */}
        {ordered.length > 1 && (
          <polyline
            fill="none"
            stroke={accentColor}
            strokeWidth={2.5}
            points={polylinePoints}
          />
        )}

        {/* 각 측정 포인트 및 날짜 라벨 */}
        {ordered.map((rec, i) => {
          const cx = getX(i);
          const cy = getY(rec.e1rmKg);
          const isHovered = hoveredIndex === i;

          return (
            <g
              key={rec.id}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 7 : 5}
                fill={accentColor}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
              <text
                x={cx}
                y={cy - 10}
                textAnchor="middle"
                className="fill-slate-800 font-mono text-[11px] font-semibold tabular-nums"
              >
                {rec.e1rmKg.toFixed(1)}kg
              </text>
              <text
                x={cx}
                y={height - 14}
                textAnchor="middle"
                className="fill-slate-500 font-mono text-[10px] tabular-nums"
              >
                {formatDateShortKo(rec.measuredAt)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
