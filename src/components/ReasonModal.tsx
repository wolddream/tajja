import React from 'react';
import { Recommendation } from '../types/hwatu';
import { CardView } from './CardView';

interface ReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: Recommendation | null;
  secondRecommendation?: Recommendation | null;
  opponentVisible?: boolean;
}

export const ReasonModal: React.FC<ReasonModalProps> = ({
  isOpen,
  onClose,
  recommendation,
  secondRecommendation,
  opponentVisible = false,
}) => {
  if (!isOpen || !recommendation) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-[#FAF6EC] border border-[#DDD4C0] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-[#222222]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E5DFCE] bg-[#F4EEDC]">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-[#A9791C] text-white flex items-center justify-center font-bold text-sm">
              훈
            </span>
            <div>
              <h2 className="font-bold text-lg text-[#1F1F1F]">
                수읽기 정밀 분석 (이유 자세히 보기)
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#7A7466]">
                <span>불완전 정보 몬테카를로 분석</span>
                <span>·</span>
                <span>승률 계산 엔진</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A7466] hover:bg-[#E5DFCE] hover:text-[#1F1F1F] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Top Recommendation Summary Card */}
          <div className="flex items-center gap-5 p-4 rounded-xl bg-white border border-[#DDD4C0] shadow-xs">
            <CardView card={recommendation.card} size="lg" isRecommended={true} />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#A9791C]/15 text-[#A9791C]">
                  {recommendation.tacticalKey}
                </span>
                <span className="text-xs text-[#7A7466]">
                  {recommendation.card.month}월 {recommendation.card.plant}
                </span>
              </div>
              <h3 className="font-bold text-base text-[#1F1F1F]">
                {recommendation.card.name}
              </h3>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-[#7A7466]">기대 승률 </span>
                  <span className="font-bold text-[#9C3131] text-base tabular-nums">
                    {recommendation.winRate}%
                  </span>
                </div>
                <div>
                  <span className="text-[#7A7466]">2위 대비 </span>
                  <span className="font-semibold text-[#3B6255] tabular-nums">
                    +{recommendation.gapToSecond}%p
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Core Tactic Reason */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A9791C] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A9791C]" />
              1. 왜 이 패를 지금 내야 하는가? (핵심 승부처)
            </h4>
            <div className="p-3.5 rounded-xl bg-white/80 border border-[#E5DFCE] text-sm leading-relaxed text-[#2F2F2F]">
              {recommendation.primaryReason}
            </div>
          </div>

          {/* Section 2: Opponent Defense & Threat Control */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#3B6255] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B6255]" />
              2. 상대 견제 및 실점 차단 효과
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-white/70 border border-[#E5DFCE]">
                <div className="text-[#7A7466] mb-1">상대 견제 판정</div>
                <div className="font-medium text-[#1F1F1F]">
                  {recommendation.detailedAnalysis.defenseImpact}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/70 border border-[#E5DFCE]">
                <div className="text-[#7A7466] mb-1">리스크 위험도</div>
                <div className="font-medium text-[#9C3131]">
                  {recommendation.riskFactor}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Monte Carlo Simulation Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2B3F5C] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2B3F5C]" />
              3. {opponentVisible ? '상대패 공개 분석 (실측 기반)' : '몬테카를로 불완전정보 시뮬레이션'}
            </h4>
            <div className="p-3.5 rounded-xl bg-[#2B3F5C]/5 border border-[#2B3F5C]/15 text-xs text-[#2B3F5C] space-y-2">
              <p className="leading-relaxed">
                {recommendation.detailedAnalysis.monteCarloNote}
              </p>
              <div className="text-[11px] text-[#7A7466] border-t border-[#2B3F5C]/10 pt-2">
                {opponentVisible
                  ? '* 지금은 "상대패 보이기"가 켜져 있어, 추정이 아니라 실제 공개된 상대 손패를 직접 대조해서 계산했습니다.'
                  : '* 고스톱은 상대 손패와 뒤집힐 덱을 알 수 없으므로, 미공개 패 20~28장을 1,000회 무작위 배분하여 평균 기대값(EV)과 승률을 도출합니다.'}
              </div>
            </div>
          </div>

          {/* Section 4: Comparison with #2 Choice */}
          {secondRecommendation && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A7466] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7A7466]" />
                4. 차선책(2순위)과의 비교
              </h4>
              <div className="flex items-center gap-4 p-3 rounded-xl bg-white border border-[#E5DFCE]">
                <CardView card={secondRecommendation.card} size="sm" />
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-[#1F1F1F]">
                    2위: {secondRecommendation.card.name} (승률 {secondRecommendation.winRate}%)
                  </div>
                  <div className="text-[#7A7466] mt-0.5 line-clamp-2">
                    {secondRecommendation.primaryReason}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E5DFCE] bg-[#F4EEDC] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-[#2B3F5C] text-white text-xs font-medium hover:bg-[#1E2E44] transition-colors"
          >
            이해했습니다 (닫기)
          </button>
        </div>
      </div>
    </div>
  );
};
