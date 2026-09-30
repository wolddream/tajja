import React, { useState } from 'react';
import { HwatuCard } from '../types/hwatu';
import { getCardImageSrc } from '../utils/cardImages';
import { CardInfoModal } from './CardInfoModal';

interface CardViewProps {
  card: HwatuCard;
  isRecommended?: boolean;
  recommendationRank?: number;
  isSelected?: boolean;
  isHidden?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  badgeText?: string;
  disabled?: boolean;
  hideInfo?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isRecommended = false,
  recommendationRank,
  isSelected = false,
  isHidden = false,
  size = 'md',
  onClick,
  badgeText,
  disabled = false,
  hideInfo = false,
}) => {
  const [infoOpen, setInfoOpen] = useState(false);

  // Dimension maps (64:96 비율 = 실제 화투 카드에 가까운 세로비)
  const sizeClasses = {
    xs: 'w-8 h-12 rounded-sm',
    sm: 'w-13 h-20 rounded-md',
    md: 'w-16 h-24 rounded-lg',
    lg: 'w-20 h-30 rounded-xl',
  };
  const plusBtnClasses = {
    xs: 'w-3 h-3 text-[7px] -top-1 -left-1',
    sm: 'w-4 h-4 text-[9px] -top-1.5 -left-1.5',
    md: 'w-5 h-5 text-[10px] -top-2 -left-1.5',
    lg: 'w-6 h-6 text-xs -top-2 -left-2',
  };

  // Back of card when hidden
  if (isHidden) {
    return (
      <div
        className={`${sizeClasses[size]} shrink-0 bg-[#9C3131] border border-[#7D2626] shadow-sm flex flex-col items-center justify-center relative select-none overflow-hidden transition-transform duration-150`}
      >
        <div className="w-full h-full border border-[#FAF6EC]/30 rounded flex items-center justify-center bg-gradient-to-br from-[#A83535] to-[#802525]">
          <div className="w-5 h-5 rounded-full border border-[#FAF6EC]/40 flex items-center justify-center text-[10px] text-[#FAF6EC]/70 font-serif">
            花
          </div>
        </div>
      </div>
    );
  }

  // Type styling
  let badgeBg = 'bg-[#E5DFCE] text-[#555]';
  let label = card.label;

  if (card.type === 'gwang') {
    badgeBg = 'bg-[#2B3F5C] text-[#FAF6EC] border border-[#A9791C]/50';
    label = card.subType === 'bi_gwang' ? '비광' : '광';
  } else if (card.subType === 'godori') {
    badgeBg = 'bg-[#A9791C] text-[#FAF6EC]';
    label = '고도리';
  } else if (card.subType === 'hongdan') {
    badgeBg = 'bg-[#9C3131] text-white';
    label = '홍단';
  } else if (card.subType === 'cheongdan') {
    badgeBg = 'bg-[#3B6255] text-white';
    label = '청단';
  } else if (card.subType === 'chodan') {
    badgeBg = 'bg-[#5A6E72] text-white';
    label = '초단';
  } else if (card.type === 'ssangpi') {
    badgeBg = 'bg-[#8A6240] text-white';
    label = '쌍피(2)';
  } else if (card.type === 'yeol') {
    badgeBg = 'bg-[#A9791C]/80 text-white';
    label = '열끗';
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`
          ${sizeClasses[size]} relative flex flex-col justify-between overflow-hidden
          rounded-[5px] bg-white text-left select-none transition-all duration-150
          ${isSelected ? 'ring-2 ring-[#A9791C] -translate-y-1.5 shadow-md' : 'ring-1 ring-[#1F1F1F]/15 hover:ring-[#A9791C]/60 hover:-translate-y-1 shadow-sm'}
          ${isRecommended ? 'ring-2 ring-[#A9791C] shadow-md' : ''}
          ${disabled ? 'opacity-60 cursor-not-allowed hover:translate-y-0' : 'cursor-pointer active:scale-95'}
        `}
        title={`${card.name} (${card.plant})`}
      >
        {/* 실제 화투 카드 일러스트 (CC BY-SA 4.0, Wikimedia Commons) */}
        <img
          src={getCardImageSrc(card)}
          alt={card.name}
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        />

        {/* Bottom Type Badge (xs 사이즈는 너무 작아 생략) */}
        {size !== 'xs' && (
          <div className="relative mt-auto w-full px-1 pb-1">
            <div
              className={`w-full py-0.5 px-1 rounded text-center text-[10px] font-semibold tracking-tight truncate shadow-sm ${badgeBg}`}
            >
              {label}
            </div>
          </div>
        )}

        {/* Recommended Tag */}
        {isRecommended && (
          <div className="absolute -top-2 -right-1 bg-[#A9791C] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse flex items-center gap-0.5 z-10">
            <span>★</span>
            <span>{recommendationRank ? `${recommendationRank}위` : '추천'}</span>
          </div>
        )}

        {/* Custom badge override */}
        {badgeText && !isRecommended && (
          <div className="absolute -top-2 -right-1 bg-[#2B3F5C] text-white text-[9px] font-medium px-1.5 py-0.5 rounded shadow-sm z-10">
            {badgeText}
          </div>
        )}
      </button>

      {/* 상세 정보 보기 버튼 */}
      {!hideInfo && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setInfoOpen(true);
          }}
          aria-label={`${card.name} 상세 정보 보기`}
          className={`
            ${plusBtnClasses[size]} absolute z-20 rounded-full flex items-center justify-center
            bg-[#1F1F1F] text-white font-bold shadow-sm border border-white/40
            hover:bg-[#A9791C] active:scale-90 transition-colors
          `}
        >
          +
        </button>
      )}

      {infoOpen && <CardInfoModal card={card} onClose={() => setInfoOpen(false)} />}
    </div>
  );
};
