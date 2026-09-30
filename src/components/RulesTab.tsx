import React from 'react';
import { HWATU_DECK } from '../utils/hwatuData';
import { CardView } from './CardView';

const findCard = (id: string) => HWATU_DECK.find(c => c.id === id)!;

export const RulesTab: React.FC = () => {
  const gwangCards = ['m1_gwang', 'm3_gwang', 'm8_gwang', 'm11_gwang', 'm12_gwang'].map(findCard);
  const godoriCards = ['m2_godori', 'm4_godori', 'm8_godori'].map(findCard);
  const danCards = [findCard('m1_hongdan'), findCard('m6_cheongdan'), findCard('m4_chodan')];
  const piCards = [findCard('m1_pi1'), findCard('m9_ssangpi')];

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-[#FAF6EC] border-2 border-[#A9791C]/40 rounded-2xl p-5 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-[#A9791C] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-tight">
          훈수패 화투 족보 &amp; 점수 공식 가이드
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📜</span>
          <h2 className="text-base font-bold text-[#1F1F1F]">화투 기본 룰 &amp; 점수 채점 기준 안내 (국룰 가이드)</h2>
        </div>
        <p className="text-xs text-[#7A7466]">
          아래 각 족보 카드를 실제 이미지로 확인하며, 승리 조건까지 한눈에 정리했습니다.
        </p>
      </div>

      {/* 광 */}
      <div className="bg-white border border-[#DDD4C0] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#2B3F5C] flex items-center gap-1.5">☀️ 광 (3장 3점 / 5장 15점)</h3>
          <span className="text-[10px] text-[#7A7466]">비광 포함 삼광은 2점</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {gwangCards.map(card => (
            <div key={card.id} className="flex flex-col items-center gap-1">
              <CardView card={card} size="sm" disabled hideInfo />
              <span className="text-[10px] text-[#7A7466]">{card.month}월{card.subType === 'bi_gwang' ? ' (비광)' : ''}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#444] leading-relaxed">
          광 3장 = 3점 (비광이 포함된 삼광은 2점), 4광 = 4점, <strong>오광(5장) = 15점</strong>입니다. 상대가 광으로 점수를 냈는데 내가 광을 한 장도 못 모았다면 <strong>광박(점수 2배)</strong>을 뒤집어씁니다.
        </p>
      </div>

      {/* 열끗 & 고도리 */}
      <div className="bg-white border border-[#DDD4C0] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#A9791C] flex items-center gap-1.5">🐦 열끗 &amp; 고도리 (5점)</h3>
          <span className="text-[10px] text-[#7A7466]">2·4·8월 새 3장</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {godoriCards.map(card => (
            <div key={card.id} className="flex flex-col items-center gap-1">
              <CardView card={card} size="sm" disabled hideInfo />
              <span className="text-[10px] text-[#7A7466]">{card.month}월 {card.plant}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#444] leading-relaxed">
          열끗은 5장부터 1점, 이후 1장마다 +1점입니다. 위 세 장(2월 매화새·4월 흑싸리새·8월 기러기)을 모두 모으면 <strong>고도리</strong>로 별도 5점을 즉시 획득합니다.
        </p>
      </div>

      {/* 띠 */}
      <div className="bg-white border border-[#DDD4C0] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#9C3131] flex items-center gap-1.5">🔴 띠 (5장부터 1점)</h3>
          <span className="text-[10px] text-[#7A7466]">단 완성 각 3점</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {danCards.map(card => (
            <div key={card.id} className="flex flex-col items-center gap-1">
              <CardView card={card} size="sm" disabled hideInfo />
              <span className="text-[10px] text-[#7A7466]">{card.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#444] leading-relaxed">
          띠 5장 = 1점, 이후 1장마다 +1점입니다. <strong>홍단(1·2·3월)</strong>, <strong>청단(6·9·10월)</strong>, <strong>초단(4·5·7월)</strong>을 각각 완성하면 별도로 3점씩 획득합니다.
        </p>
      </div>

      {/* 피 */}
      <div className="bg-white border border-[#DDD4C0] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#8A6240] flex items-center gap-1.5">🍃 피 (10장부터 1점)</h3>
          <span className="text-[10px] text-[#7A7466]">쌍피는 2장 취급</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {piCards.map(card => (
            <div key={card.id} className="flex flex-col items-center gap-1">
              <CardView card={card} size="sm" disabled hideInfo />
              <span className="text-[10px] text-[#7A7466]">{card.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#444] leading-relaxed">
          피 10장 = 1점, 이후 1장마다 +1점 추가됩니다. 맞고에서 피 7장 이하, 3인 고스톱에서 5장 이하로 패배하면 <strong>피박(점수 2배)</strong>이 적용됩니다.
        </p>
      </div>

      {/* 특수 룰 & 승리 기준 */}
      <div className="bg-[#FAF6EC] border border-[#E5DFCE] rounded-2xl p-5 space-y-2">
        <h3 className="font-bold text-sm text-[#1F1F1F]">⚡ 특수 룰</h3>
        <p className="text-xs text-[#444] leading-relaxed">
          바닥패와 뒤집은 덱패의 월이 일치하는 <strong>뻑</strong>(다음 턴 선취 시 피 뺏기 포함), 같은 월 패를 3장 들고 있을 때 알리는 <strong>흔들기</strong>, 바닥을 전부 비우는 <strong>싹쓸이</strong>(상대 피 1장 강탈) 등이 있습니다.
        </p>
        <div className="pt-2 mt-1 border-t border-[#E5DFCE] text-xs font-semibold text-[#A9791C]">
          승리 점수 기준: 맞고 7점 이상 / 3인 고스톱 3점 이상
        </div>
      </div>

      {/* 화투의 역사와 유래 */}
      <div className="bg-white border border-[#DDD4C0] rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-[#2B3F5C] flex items-center gap-1.5">📖 화투의 역사와 유래</h3>
        <div className="flex items-center gap-2.5">
          <CardView card={findCard('m12_gwang')} size="sm" disabled hideInfo />
          <p className="text-xs text-[#444] leading-relaxed">
            화투(花鬪, "꽃으로 싸우다")는 일본의 전통 카드놀이 <strong>하나후다(花札)</strong>에서 비롯된 것으로 알려져 있습니다. 하나후다 자체는 16세기 포르투갈 상인들이 일본에 전한 서양식 카드 놀이가 일본식으로 변형되며 만들어졌고, 1월부터 12월까지 각 달을 상징하는 꽃·나무·동물 그림으로 구성된 48장의 패로 정착했습니다.
          </p>
        </div>
        <p className="text-xs text-[#444] leading-relaxed">
          이 패는 20세기 초 일제강점기를 전후해 한반도에 전해진 것으로 전해지며, 이후 한국에서는 민화투·육백 등 다양한 독자적 놀이 방식으로 발전했습니다. 그중에서도 <strong>고스톱(고/스톱)</strong>은 1970~80년대를 거치며 한국에서 독자적으로 정립·대중화된 규칙으로, 오늘날 한국인에게 가장 친숙한 화투 놀이로 자리잡았습니다.
        </p>
        <p className="text-xs text-[#444] leading-relaxed">
          12월 비광에 그려진 인물은 일본 헤이안 시대의 명필 <strong>오노노 도후(小野道風)</strong>가 개구리의 끈질긴 도전을 보고 노력의 의지를 다잡았다는 일화를 담고 있다고 전해지며, 각 달의 그림에는 소나무·매화·벚꽃 등 계절의 상징이 담겨 있어 화투를 "그림으로 읽는 열두 달"이라 부르기도 합니다.
        </p>
      </div>
    </div>
  );
};
