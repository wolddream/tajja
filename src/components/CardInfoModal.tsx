import React from 'react';
import { HwatuCard } from '../types/hwatu';
import { getCardImageSrc, CARD_IMAGE_CREDIT } from '../utils/cardImages';

interface CardInfoModalProps {
  card: HwatuCard;
  onClose: () => void;
}

interface TypeInfo {
  title: string;
  desc: string;
  accent: string;
}

const TYPE_INFO: Record<string, TypeInfo> = {
  gwang: {
    title: '광(光)',
    desc: '광은 전체 5장입니다. 광 3장을 모으면 3점, 4장이면 4점, 5장을 다 모으면 15점을 얻습니다.',
    accent: '#2B3F5C',
  },
  bi_gwang: {
    title: '비광(雨光)',
    desc: '12월 비광은 다른 광과 같이 계산되지만, "3광"을 만들 때 비광이 끼어 있으면 점수를 인정하지 않는 지역 룰도 있으니 시작 전 규칙을 맞춰보세요.',
    accent: '#2B3F5C',
  },
  godori: {
    title: '고도리(五鳥)',
    desc: '2월·4월·8월 열끗에 그려진 새 3장을 모두 모으면 "고도리" 족보로 5점을 얻습니다.',
    accent: '#A9791C',
  },
  gukjin: {
    title: '국진(9월 열끗)',
    desc: '9월 열끗은 "국진"이라 불리며, 일반 열끗과 동일하게 열끗 장수 계산에 포함됩니다.',
    accent: '#A9791C',
  },
  yeol: {
    title: '열끗',
    desc: '열끗은 5장부터 1점이 되고, 이후 한 장씩 늘어날 때마다 1점씩 추가됩니다.',
    accent: '#A9791C',
  },
  hongdan: {
    title: '홍단(紅短)',
    desc: '1월·2월·3월의 붉은 띠 3장을 모두 모으면 "홍단" 족보로 3점을 얻습니다.',
    accent: '#9C3131',
  },
  cheongdan: {
    title: '청단(靑短)',
    desc: '6월·9월·10월의 파란 띠 3장을 모두 모으면 "청단" 족보로 3점을 얻습니다.',
    accent: '#3B6255',
  },
  chodan: {
    title: '초단(草短)',
    desc: '4월·5월·7월의 민무늬 띠 3장을 모두 모으면 "초단" 족보로 3점을 얻습니다.',
    accent: '#5A6E72',
  },
  tti: {
    title: '띠',
    desc: '띠는 5장부터 1점이 되고, 이후 한 장씩 늘어날 때마다 1점씩 추가됩니다. 색이 맞는 3장을 모으면 별도로 단(短) 족보 점수도 노릴 수 있어요.',
    accent: '#5A6E72',
  },
  pi: {
    title: '피(皮)',
    desc: '피는 10장부터 1점이 되고, 이후 한 장씩 늘어날 때마다 1점씩 추가됩니다.',
    accent: '#8A8071',
  },
  ssangpi: {
    title: '쌍피(雙皮)',
    desc: '쌍피 한 장은 피 2장의 값을 가집니다. 피 장수를 셀 때 쌍피 1장을 2장으로 계산합니다.',
    accent: '#8A6240',
  },
};

const resolveInfo = (card: HwatuCard): TypeInfo => {
  if (card.subType && TYPE_INFO[card.subType]) return TYPE_INFO[card.subType];
  return TYPE_INFO[card.type] ?? TYPE_INFO.pi;
};

export const CardInfoModal: React.FC<CardInfoModalProps> = ({ card, onClose }) => {
  const info = resolveInfo(card);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF6EC] border border-[#DDD4C0] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden text-[#222222]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5DFCE] bg-[#F4EEDC]">
          <h2 className="font-bold text-base text-[#1F1F1F]">화투패 정보</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7A7466] hover:bg-[#E5DFCE] hover:text-[#1F1F1F] transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex gap-4">
          <div className="w-20 h-30 shrink-0 rounded-lg overflow-hidden shadow-md bg-white ring-1 ring-[#1F1F1F]/15 flex items-center justify-center">
            <img src={getCardImageSrc(card)} alt={card.name} className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="text-xs text-[#7A7466]">
              {card.month}월 · {card.plant}
            </div>
            <h3 className="font-bold text-lg text-[#1F1F1F] leading-tight">{card.name}</h3>
            <span
              className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: info.accent }}
            >
              {info.title}
            </span>
            <div className="text-xs text-[#7A7466] pt-1">
              기본 점수 가치 <span className="font-semibold text-[#1F1F1F] tabular-nums">{card.scoreVal}</span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="p-3.5 rounded-xl bg-white border border-[#E5DFCE] text-sm leading-relaxed text-[#2F2F2F]">
            {info.desc}
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-[#2B3F5C] text-white text-sm font-medium hover:bg-[#1E2E44] transition-colors"
          >
            닫기
          </button>
          <p className="mt-3 text-center text-[10px] text-[#B0A88E]">{CARD_IMAGE_CREDIT}</p>
        </div>
      </div>
    </div>
  );
};
