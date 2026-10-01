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
  size?: 'xs' | 'compact' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  badgeText?: string;
  disabled?: boolean;
  hideInfo?: boolean;
  // 겹쳐 쌓는 패더미(손패/먹은 패 스택)에서 사용: 비활성 카드의 반투명 처리를 끄고(뒤 카드가 비쳐 보이지 않도록)
  // 테두리 링도 없애 겹칠 때 생기는 흰 줄무늬를 없앤다.
  fullOpacity?: boolean;
  noBorder?: boolean;
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
  fullOpacity = false,
  noBorder = false,
}) => {
  const [infoOpen, setInfoOpen] = useState(false);

  // Dimension maps (64:96 비율 = 실제 화투 카드에 가까운 세로비)
  const sizeClasses = {
    xs: 'w-8 h-12 rounded-sm',
    // 내 손패용 축소 사이즈: xs보다 크게 유지해 패 종류 라벨은 그대로 보이면서 sm보다 공간을 덜 차지한다.
    compact: 'w-10 h-16 rounded-md',
    sm: 'w-13 h-20 rounded-md',
    md: 'w-16 h-24 rounded-lg',
    lg: 'w-20 h-30 rounded-xl',
  };
  const plusBtnClasses = {
    xs: 'w-3 h-3 text-[7px] -top-1 -left-1',
    compact: 'w-3.5 h-3.5 text-[8px] -top-1 -left-1',
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

  // 카드가 disabled(클릭 불가)일 때는 <button> 대신 <div>로 렌더링한다. 바닥패/먹은 패 표시처럼
  // 원래 클릭할 일이 없는 카드이기도 하고, 퀴즈·게시판처럼 이 CardView 전체를 바깥쪽 <button> 안에
  // 또 넣어 쓰는 화면에서 button 안에 button이 중첩되는 HTML 스펙 위반(하이드레이션 경고 실측 확인)을
  // 막기 위함이다 — 어차피 disabled 카드는 onClick이 동작하지 않으므로 기능 손실이 없다.
  const CardFaceTag = disabled ? 'div' : 'button';
  const cardFaceExtraProps = disabled ? {} : { type: 'button' as const, onClick };

  return (
    <div className="relative shrink-0">
      {/* 훈수패(AI 추천 패): 빙글빙글 도는 황금 테두리 */}
      {isRecommended && <div className="hp-recommended-ring" />}

      <CardFaceTag
        {...cardFaceExtraProps}
        className={`
          ${sizeClasses[size]} relative z-[1] flex flex-col justify-between overflow-hidden
          rounded-[5px] bg-white text-left select-none transition-all duration-150
          ${isSelected ? 'ring-2 ring-[#A9791C] -translate-y-1.5 shadow-md' : noBorder ? 'shadow-sm' : 'ring-1 ring-[#1F1F1F]/15 hover:ring-[#A9791C]/60 hover:-translate-y-1 shadow-sm'}
          ${isRecommended ? 'shadow-md' : ''}
          ${disabled ? `cursor-not-allowed hover:translate-y-0 ${fullOpacity ? '' : 'opacity-60'}` : 'cursor-pointer active:scale-95'}
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
      </CardFaceTag>

      {/* 상세 정보 보기 버튼 — <button> 대신 role="button"인 <div>로 둔다. 이 CardView 자체가
          퀴즈·게시판 선택지처럼 바깥쪽 <button> 안에 놓이는 경우가 있어, 실제 <button>이면 그
          바깥 버튼 안에 또 중첩되는 HTML 스펙 위반이 생기기 때문이다(키보드 접근성은
          tabIndex+onKeyDown으로 동일하게 유지). */}
      {!hideInfo && (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setInfoOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setInfoOpen(true);
            }
          }}
          aria-label={`${card.name} 상세 정보 보기`}
          className={`
            ${plusBtnClasses[size]} absolute z-20 rounded-full flex items-center justify-center
            bg-[#1F1F1F] text-white font-bold shadow-sm border border-white/40
            hover:bg-[#A9791C] active:scale-90 transition-colors cursor-pointer
          `}
        >
          +
        </div>
      )}

      {infoOpen && <CardInfoModal card={card} onClose={() => setInfoOpen(false)} />}
    </div>
  );
};
