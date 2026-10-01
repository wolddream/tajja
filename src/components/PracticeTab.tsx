import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { HwatuCard, GameMode, AuthUser, Recommendation, ImportanceLevel } from '../types/hwatu';
import { HWATU_DECK, shuffleDeck } from '../utils/hwatuData';
import { evaluateHand } from '../utils/engine';
import { calculateScore, getStopThreshold, getPiBakThreshold, ScoreBreakdown } from '../utils/scoring';
import { LEVEL_REQUIREMENTS } from '../utils/storage';
import { CardView } from './CardView';
import { ReasonModal } from './ReasonModal';
import { playCardSnap, playCapture, playClick } from '../utils/sound';

interface PracticeTabProps {
  onIncrementGameCount: () => void;
  onIncrementReasonCount: () => void;
  // 사이트 상단 메뉴(경험치/레벨/로그아웃)를 게임 화면 안으로 옮겨오기 위한 값들
  userLevel: number;
  totalGames: number;
  currentUser: AuthUser | null;
  onOpenProfile: () => void;
  onLogout: () => void;
  // 로그인 직후 첫 진입에서는 바로 전체화면으로 시작한다(최초 마운트 시 1회만 반영되는 초기값).
  startFullscreen?: boolean;
}

type PlayerKey = 'user' | 'opp1' | 'opp2';

// 자동 진행 지연 시간 (내 차례 자동 진행 + 상대 턴 + 고스톱 자동 결정에 공통 적용). 느림으로 고정.
const AUTO_DELAY_MS = 1500;

// 핵심 승부처 중요도 3단계별 표시 스타일 — 중요도가 높을수록 더 눈에 띄게 만든다.
const IMPORTANCE_STYLE: Record<ImportanceLevel, {
  label: string;
  boxClass: string;
  titleClass: string;
  textClass: string;
  winBadgeClass: string;
  tacticalBadgeClass: string;
  pulse: boolean;
}> = {
  high: {
    label: '🔥 결정적 승부처',
    boxClass: 'border-r-2 border-[#F3D999] bg-gradient-to-r from-[#9C3131]/20 to-transparent shadow-[0_0_14px_rgba(243,217,153,0.3)]',
    titleClass: 'text-[#FFE9A8]',
    textClass: 'text-white font-bold',
    winBadgeClass: 'bg-[#9C3131] ring-1 ring-[#FFE9A8]/70',
    tacticalBadgeClass: 'bg-[#A9791C] ring-1 ring-[#FFE9A8]/70',
    pulse: true,
  },
  medium: {
    label: '💡 핵심 승부처',
    boxClass: 'border-r border-[#F3D999]/25',
    titleClass: 'text-[#F3D999]',
    textClass: 'text-white font-medium',
    winBadgeClass: 'bg-[#9C3131]',
    tacticalBadgeClass: 'bg-[#A9791C]',
    pulse: false,
  },
  low: {
    label: '📎 참고',
    boxClass: 'border-r border-white/10',
    titleClass: 'text-white/55',
    textClass: 'text-white/65',
    winBadgeClass: 'bg-white/15',
    tacticalBadgeClass: 'bg-white/10',
    pulse: false,
  },
};

interface CapturedSummary {
  gwang: HwatuCard[];
  yeol: HwatuCard[];
  tti: HwatuCard[];
  pi: HwatuCard[];
}

const EMPTY_CAPTURED: CapturedSummary = { gwang: [], yeol: [], tti: [], pi: [] };

const PLAYER_LABEL: Record<PlayerKey, string> = { user: '나', opp1: '상대1', opp2: '상대2' };

// 한 손패(hand)를 월별로 묶는다. 흔들기(같은 월 3장) 판정에 사용.
const groupByMonth = (cards: HwatuCard[]): Map<number, HwatuCard[]> => {
  const map = new Map<number, HwatuCard[]>();
  cards.forEach(c => {
    const list = map.get(c.month) ?? [];
    list.push(c);
    map.set(c.month, list);
  });
  return map;
};

// 상대/내 정보 배지 (실제 게임 클라이언트의 아바타 카드 느낌). 상대1/상대2는 색상과 아바타 글자를 다르게 표시해 확실히 구분한다.
// 원래는 아바타 원+박스 배지였으나, 그 자리를 손패/먹은 패 표시 공간으로 더 쓰기 위해
// 순수 텍스트 한 줄로 축소했다(자리를 차지하는 배지 UI 대신 텍스트로만 이름/차례/부가정보 표시).
const PlayerLabel: React.FC<{
  label: string;
  sub: string;
  labelColorClass: string;
  align?: 'left' | 'right';
  active?: boolean;
}> = ({ label, sub, labelColorClass, align = 'left', active = false }) => (
  <div className={`flex items-baseline gap-1 shrink-0 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
    <span className={`text-[11px] font-black whitespace-nowrap ${active ? 'text-[#F3D999]' : labelColorClass}`}>
      {active && '● '}{label}
    </span>
    <span className="text-[9.5px] text-[#A5C7B5] whitespace-nowrap">{sub}</span>
  </div>
);

// 상대의 손패를 겹쳐서 보여주는 컴팩트 패더미. "보이기"/"안보기" 모드 모두 이 겹침 배치를 쓰고,
// 상대1은 화면 왼쪽, 상대2는 화면 오른쪽으로 정렬해 서로 헷갈리지 않게 한다.
// 안보기 모드일 때는 상대1/상대2 배지와 같은 색의 카드 뒷면으로, 보이기 모드일 때는 실제 카드 앞면으로 표시한다.
const HandStack: React.FC<{
  cards: HwatuCard[];
  isHidden: boolean;
  colorClass: string;
  borderClass: string;
  align?: 'left' | 'right';
}> = ({ cards, isHidden, colorClass, borderClass, align = 'left' }) => {
  if (cards.length === 0) {
    return <div className="text-[10.5px] text-white/60 py-0.5">패를 모두 소진했습니다.</div>;
  }
  const countLabel = <span className="text-[10px] font-bold text-white/70 tabular-nums shrink-0">{cards.length}장</span>;

  // 안보기(비공개) 상태에서는 어차피 전부 같은 뒷면이라, 카드를 여러 장 겹쳐 봐야 정보가 늘지 않는다.
  // 카드 뒷면 1장 + 장수 텍스트만 표시해 공간을 최소화한다.
  if (isHidden) {
    return (
      <div className={`flex items-center gap-1.5 w-full ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {align === 'right' && countLabel}
        <div className={`w-8 h-12 shrink-0 rounded-sm ${colorClass} border ${borderClass} shadow-sm flex items-center justify-center`}>
          <div className="w-3.5 h-3.5 rounded-full border border-white/40 flex items-center justify-center text-[7px] text-white/70 font-serif">
            花
          </div>
        </div>
        {align !== 'right' && countLabel}
      </div>
    );
  }

  // 보이기(공개) 상태에서는 실제 카드 각각이 서로 다른 정보를 담고 있으므로 계속 겹쳐서 보여준다.
  // 카드를 너무 많이 겹쳐 쌓으면 칸 밖으로 잘려 나온 카드가 반쪽만 보이는 지저분한 모습이 되므로,
  // 보여줄 카드 수를 제한하고 정확한 장수는 옆의 숫자 라벨로만 전달한다.
  const MAX_SHOWN = 5;
  const shownCards = cards.slice(0, MAX_SHOWN);
  const stack = (
    <div className="flex">
      {shownCards.map((card, i) => (
        <div key={card.id} className="shrink-0" style={{ marginLeft: i === 0 ? 0 : '-18px', zIndex: i }}>
          <CardView card={card} size="xs" disabled={true} hideInfo={true} fullOpacity noBorder />
        </div>
      ))}
    </div>
  );
  return (
    <div className={`flex items-center gap-2 w-full ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      {align === 'right' ? (
        <>
          {countLabel}
          {stack}
        </>
      ) : (
        <>
          {stack}
          {countLabel}
        </>
      )}
    </div>
  );
};

// 먹은 패 더미(xs 카드 폭)의 겹침 계산에 쓰는 상수.
const PILE_CARD_W = 32; // xs 카드 실제 폭(px)
const PILE_MIN_OVERLAP = 14; // 평소(공간이 넉넉할 때) 겹침 — 어떤 패인지 잘 구분되는 정도
const PILE_MAX_OVERLAP = 29; // 공간이 모자랄 때 최대로 압축하는 겹침 — 거의 다 겹쳐도 몇 px는 보이게

// cards.length장을 maxWidth(px) 안에 다 넣어야 할 때 필요한 겹침 간격(px)을 계산한다.
// 평소 간격만으로 이미 들어가면 그대로 두고, 넘치면 겹침을 늘려서라도 폭을 넘지 않게 압축한다.
const fitPileOverlap = (count: number, maxWidth?: number): number => {
  if (count <= 1) return 0;
  if (maxWidth == null) return PILE_MIN_OVERLAP;
  const naturalWidth = PILE_CARD_W + (count - 1) * (PILE_CARD_W - PILE_MIN_OVERLAP);
  if (naturalWidth <= maxWidth) return PILE_MIN_OVERLAP;
  const needed = (count * PILE_CARD_W - maxWidth) / (count - 1);
  return Math.min(PILE_MAX_OVERLAP, Math.max(PILE_MIN_OVERLAP, needed));
};

const pileNaturalWidth = (count: number): number =>
  count === 0 ? 0 : PILE_CARD_W + (count - 1) * (PILE_CARD_W - PILE_MIN_OVERLAP);

// 한 종류(광/열끗/띠/피)의 먹은 패를 살짝 겹쳐 쌓고, 2장 이상이면 우하단에 장수 배지를 붙인다.
// "나"/"상대" 아바타 배지를 없애고 텍스트로 바꿔 확보한 공간만큼, 먹은 패는 개수 제한 없이
// 전부 보여준다. maxWidth가 주어지면 장수가 아무리 늘어도 그 폭을 넘지 않도록 겹침을 자동으로
// 압축해, 피가 많이 쌓여도 화면 전체 크기가 바뀌지 않게 한다.
const CategoryPile: React.FC<{ cards: HwatuCard[]; maxWidth?: number }> = ({ cards, maxWidth }) => {
  if (cards.length === 0) return null;
  const overlap = fitPileOverlap(cards.length, maxWidth);
  return (
    <div className="relative flex shrink-0">
      {cards.map((card, idx) => (
        <div key={`${card.id}-${idx}`} className="shrink-0" style={{ marginLeft: idx === 0 ? 0 : `-${overlap}px`, zIndex: idx }}>
          <CardView card={card} size="xs" disabled={true} hideInfo={true} fullOpacity noBorder />
        </div>
      ))}
      {cards.length > 1 && (
        <span className="absolute -bottom-1 -right-1 z-20 min-w-[14px] h-[14px] px-0.5 rounded-full bg-black/80 border border-white/50 text-[8px] font-bold text-white flex items-center justify-center leading-none">
          {cards.length}
        </span>
      )}
    </div>
  );
};

// 상대가 먹은 패(공개 정보)를 종류별(광/열끗/띠/피)로 나눠, 각 종류 안에서만 겹쳐 쌓아 보여준다.
// 실제 상용 고스톱 클라이언트처럼 종류가 한눈에 구분되면서도 공간은 아낄 수 있다.
// 2행(광·열끗 / 띠·피)으로 나눠 종류 구분을 더 뚜렷하게 하고, 한 행의 가로 폭도 줄인다.
// 상대1은 왼쪽, 상대2는 오른쪽으로 정렬한다.
// 각 행의 실제 렌더링 폭을 측정해, 둘째 더미(열끗/피)가 남는 폭 전체를 쓰도록(빈 공간 최대 활용)
// 하면서도 그 폭을 넘지 않도록 겹침을 압축한다 — 피가 아무리 많이 쌓여도 화면 크기가 바뀌지 않는다.
const CapturedStack: React.FC<{ captured: CapturedSummary; align?: 'left' | 'right' }> = ({ captured, align = 'left' }) => {
  const rows: [HwatuCard[], HwatuCard[]][] = [
    [captured.gwang, captured.yeol],
    [captured.tti, captured.pi],
  ];
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowWidth, setRowWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setRowWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 아직 하나도 못 먹은 칸은 높이를 비워 공간을 내주고, 그 칸에 처음 패가 들어오는 순간에만
  // min-h-[3rem]으로 늘어난다 — 게임 초반 빈 획득패 칸이 쓸데없이 2행치 공간을 차지해
  // 바닥패·내 손패 등 아래 영역을 압박하던 문제를 줄인다(그 대신 첫 획득 때 약간의 높이 변화는 감수).
  // max-h로 "줄 2개 + 여백" 이상은 절대 못 늘어나게 못박아 둔다 — 전체화면 등 테이블이 아주 길어지는
  // 상황에서 상위 flex 레이아웃이 이 칸에 불필요하게 큰 세로 공간을 내주더라도 빈 여백만 늘어나는 일이
  // 없게 한다(상대 패 칸이 쓸데없이 커 보인다는 사용자 지적에 따른 방어적 상한선).
  const ROW_GAP = 6; // gap-1.5
  const CONTAINER_PADDING = 8; // p-1 (좌우 각 4px)
  return (
    <div ref={containerRef} className={`flex flex-col gap-1 p-1 bg-black/20 rounded-lg w-full min-w-0 max-h-[7.5rem] overflow-hidden ${align === 'right' ? 'items-end' : 'items-start'}`}>
      {rows.map(([first, second], rowIdx) => {
        const secondMaxWidth = rowWidth != null
          ? Math.max(PILE_CARD_W, rowWidth - CONTAINER_PADDING - pileNaturalWidth(first.length) - ROW_GAP)
          : undefined;
        const rowHasCards = first.length > 0 || second.length > 0;
        // 두 더미가 모두 있으면 양 끝에 벌려 칸을 꽉 채우고, 하나만 있을 때는 한쪽 끝에 붙여두지
        // 않고 가운데로 둬서(justify-center) 반대쪽에 남는 공간이 쓸모없이 비어 보이지 않게 한다.
        const bothHaveCards = first.length > 0 && second.length > 0;
        const rowJustify = bothHaveCards ? 'justify-between' : 'justify-center';
        return (
          <div
            key={rowIdx}
            className={`flex items-end gap-1.5 w-full transition-[min-height] duration-200 ${rowHasCards ? 'min-h-[3rem]' : 'min-h-0'} ${rowJustify}`}
          >
            <CategoryPile cards={first} />
            <CategoryPile cards={second} maxWidth={secondMaxWidth} />
          </div>
        );
      })}
    </div>
  );
};

// 고/스톱 선택 모달 (사용자 차례에서 기준 점수 이상 달성 시 표시)
const GoStopModal: React.FC<{
  score: ScoreBreakdown;
  goCount: number;
  threshold: number;
  onGo: () => void;
  onStop: () => void;
  // 고를 외쳤을 때 이어질 다음 수의 핵심 승부처(이유 보기 1번 항목과 동일한 내용)를 함께 보여준다.
  coreReason?: string;
}> = ({ score, goCount, threshold, onGo, onStop, coreReason }) => (
  <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4">
    <div className="bg-[#FAF6EC] border-2 border-[#A9791C] rounded-2xl shadow-2xl max-w-sm w-full p-5 text-center space-y-3">
      <div className="text-xs font-bold text-[#A9791C]">🎉 {threshold}점 달성!</div>
      <div className="text-2xl font-black text-[#222]">현재 {score.total}점{goCount > 0 ? ` (${goCount}고 진행 중)` : ''}</div>
      <p className="text-xs text-[#555] leading-relaxed">
        여기서 <b>스톱</b>하면 지금까지 점수를 그대로 획득합니다.
        <br />
        <b>고</b>를 외치면 계속 진행해 더 큰 점수를 노릴 수 있지만, 상대가 먼저 점수를 낼 위험도 커집니다.
      </p>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onStop}
          className="flex-1 py-2.5 rounded-lg bg-[#2B3F5C] hover:bg-[#1E2E44] text-white text-sm font-bold cursor-pointer"
        >
          🛑 스톱 (종료)
        </button>
        <button
          type="button"
          onClick={onGo}
          className="flex-1 py-2.5 rounded-lg bg-[#A9791C] hover:bg-[#8F6516] text-white text-sm font-bold cursor-pointer"
        >
          🔥 고! (계속)
        </button>
      </div>
      {coreReason && (
        <div className="pt-2 mt-1 border-t border-[#E5DFCE] text-left">
          <div className="text-[11px] font-bold text-[#A9791C] mb-1">💡 (고 선택 시) 다음 수 핵심 승부처</div>
          <p className="text-xs text-[#555] leading-relaxed">{coreReason}</p>
        </div>
      )}
    </div>
  </div>
);

interface GameResult {
  winner: PlayerKey | 'draw';
  scores: Record<PlayerKey, ScoreBreakdown>;
  multiplier: number;
  finalScore: number;
  badges: string[];
}

// 게임 종료 결과 모달. 배경을 옅게 하고 닫기 버튼을 둬서, 결과를 본 뒤 경기 판(최종 바닥패·먹은 패)을
// 계속 확인할 수 있게 한다 — 닫아도 게임 자체는 끝난 상태로 남고, "결과 다시 보기"로 언제든 재소환 가능.
const GameResultModal: React.FC<{
  result: GameResult;
  activePlayers: PlayerKey[];
  onRestart: () => void;
  onClose: () => void;
}> = ({ result, activePlayers, onRestart, onClose }) => (
  <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
    <div
      className="bg-[#FAF6EC] border-2 border-[#A9791C] rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-3 relative"
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="결과 닫고 경기 판 보기"
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 text-[#555] text-sm font-bold flex items-center justify-center cursor-pointer"
      >
        ✕
      </button>

      <div className="text-center">
        <div className="text-xs font-bold text-[#A9791C] mb-1">게임 종료</div>
        <div className="text-2xl font-black text-[#222]">
          {result.winner === 'draw' ? '무승부 (유찰)' : `${PLAYER_LABEL[result.winner]} 승리!`}
        </div>
        {result.winner !== 'draw' && (
          <div className="text-sm text-[#555] mt-1">
            {result.scores[result.winner].total}점 × {result.multiplier}배 ={' '}
            <b className="text-[#A9791C] text-lg">{result.finalScore}점</b>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {activePlayers.map(key => (
          <div
            key={key}
            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${
              key === result.winner ? 'bg-[#A9791C]/15 border border-[#A9791C] font-bold' : 'bg-white border border-[#E5DFCE]'
            }`}
          >
            <span>{PLAYER_LABEL[key]}</span>
            <span className="tabular-nums">
              광{result.scores[key].gwangScore} 열{result.scores[key].yeolScore} 띠{result.scores[key].ttiScore} 피{result.scores[key].piScore} = {result.scores[key].total}점
            </span>
          </div>
        ))}
      </div>

      {result.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {result.badges.map((b, i) => (
            <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#9C3131]/15 text-[#9C3131] border border-[#9C3131]/30">
              {b}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg bg-white border border-[#DDD4C0] hover:border-[#A9791C] text-[#555] text-sm font-bold cursor-pointer"
        >
          경기 판 보기
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="flex-1 py-2.5 rounded-lg bg-[#A9791C] hover:bg-[#8F6516] text-white text-sm font-bold cursor-pointer"
        >
          🔄 새 게임 시작
        </button>
      </div>
    </div>
  </div>
);

// 게임 화면의 ⚙️ 아이콘으로 여는 설정 패널. 인원/시야 옵션/자동모드/연습 시나리오/새 대국을 한곳에 모아,
// 게임 화면 바깥에는 별도의 설정 UI를 두지 않는다.
const SettingsModal: React.FC<{
  gameMode: GameMode;
  onModeChange: (mode: GameMode) => void;
  showOpponentCards: boolean;
  onToggleOpponentCards: () => void;
  showDeckTopCard: boolean;
  onToggleDeckTopCard: () => void;
  onNewGame: () => void;
  onLoadScenario: (type: 'godori' | 'hongdan' | 'puck') => void;
  onClose: () => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
}> = ({
  gameMode,
  onModeChange,
  showOpponentCards,
  onToggleOpponentCards,
  showDeckTopCard,
  onToggleDeckTopCard,
  onNewGame,
  onLoadScenario,
  onClose,
  currentUser,
  onLogout,
}) => (
  <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
    <div
      className="bg-[#FAF6EC] border-2 border-[#A9791C] rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto relative"
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="설정 닫기"
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 text-[#555] text-sm font-bold flex items-center justify-center cursor-pointer"
      >
        ✕
      </button>
      <div className="text-sm font-bold text-[#A9791C]">⚙️ 설정</div>

      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-[#7A7466]">인원 선택</div>
        <div className="flex items-center gap-1 p-1 bg-white border border-[#E5DFCE] rounded-lg">
          <button
            type="button"
            onClick={() => onModeChange('matgo')}
            className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              gameMode === 'matgo' ? 'bg-[#2B3F5C] text-white shadow-xs' : 'text-[#666] hover:text-[#111]'
            }`}
          >
            맞고 (2인)
          </button>
          <button
            type="button"
            onClick={() => onModeChange('gostop3')}
            className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              gameMode === 'gostop3' ? 'bg-[#2B3F5C] text-white shadow-xs' : 'text-[#666] hover:text-[#111]'
            }`}
          >
            3인 고스톱
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-[#7A7466]">시야 옵션 (보기 설정 시, 보이는 패를 반영하여 훈수패를 선정합니다)</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleOpponentCards}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              showOpponentCards ? 'bg-[#3B6255] text-white border-[#3B6255]' : 'bg-white text-[#555] border-[#DDD4C0] hover:border-[#3B6255]'
            }`}
          >
            상대패: {showOpponentCards ? '보이기' : '안보기(실전)'}
          </button>
          <button
            type="button"
            onClick={onToggleDeckTopCard}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              showDeckTopCard ? 'bg-[#3B6255] text-white border-[#3B6255]' : 'bg-white text-[#555] border-[#DDD4C0] hover:border-[#3B6255]'
            }`}
          >
            뒤집기 패: {showDeckTopCard ? '보이기' : '안보기(실전)'}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-[#7A7466]">실전 특수 상황 연습</div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onLoadScenario('godori')}
            className="px-2.5 py-1.5 rounded-md bg-white border border-[#DDD4C0] hover:border-[#A9791C] text-[#222] text-xs text-left cursor-pointer"
          >
            🐦 상대 고도리 위기 차단
          </button>
          <button
            type="button"
            onClick={() => onLoadScenario('hongdan')}
            className="px-2.5 py-1.5 rounded-md bg-white border border-[#DDD4C0] hover:border-[#A9791C] text-[#222] text-xs text-left cursor-pointer"
          >
            🔴 내 홍단 3점 완성
          </button>
          <button
            type="button"
            onClick={() => onLoadScenario('puck')}
            className="px-2.5 py-1.5 rounded-md bg-white border border-[#DDD4C0] hover:border-[#A9791C] text-[#222] text-xs text-left cursor-pointer"
          >
            💥 바닥 3장 한번에 쓸어담기 찬스
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onNewGame}
        className="w-full py-2.5 rounded-lg bg-[#A9791C] hover:bg-[#8F6516] text-white text-sm font-bold cursor-pointer"
      >
        🔄 새 대국 시작
      </button>

      {currentUser && (
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E5DFCE] text-xs text-[#7A7466]">
          <span className="truncate">{currentUser.name} · {currentUser.email}</span>
          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white border border-[#DDD4C0] hover:border-[#9C3131] hover:text-[#9C3131] text-[11px] text-[#7A7466] transition-colors cursor-pointer"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  </div>
);

// "핵심 승부처" 요약 칸은 좁아서 줄임 표시될 수 있어, 🔍 아이콘으로 눌러서 보는 상세 팝업.
// 이 앱의 핵심 가치이므로 문장 하나만 키워 보여주는 데 그치지 않고, 전술 태그·위험도·
// 상대 견제 효과·예상 획득량까지 한 화면에 구체적으로 정리해 "왜 이 패인지"를 뒷받침한다.
const CoreReasonModal: React.FC<{ recommendation: Recommendation; onClose: () => void }> = ({
  recommendation,
  onClose,
}) => {
  const { card, winRate, gapToSecond, primaryReason, tacticalKey, riskFactor, importance, detailedAnalysis } = recommendation;
  const hasDefenseNote = detailedAnalysis.defenseImpact && detailedAnalysis.defenseImpact !== '없음' && detailedAnalysis.defenseImpact !== '상황 유지';
  const badge = {
    high: { label: '🔥 결정적 승부처', className: 'bg-[#9C3131] text-white' },
    medium: { label: '💡 핵심 승부처', className: 'bg-[#A9791C] text-white' },
    low: { label: '📎 참고용 안내', className: 'bg-[#E5DFCE] text-[#7A7466]' },
  }[importance];
  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`bg-[#FAF6EC] rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-3 relative border-2 ${importance === 'high' ? 'border-[#9C3131]' : 'border-[#A9791C]'}`}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 text-[#555] text-sm font-bold flex items-center justify-center cursor-pointer"
        >
          ✕
        </button>
        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${badge.className}`}>
          {badge.label}
        </span>
        <div className="text-sm text-[#7A7466]">
          추천 패 <b className="text-[#1F1F1F]">{card.name}</b> · 승률 <b className="text-[#9C3131]">{winRate}%</b>
          {gapToSecond > 0 && <span className="text-[#3B6255]"> (2위보다 +{gapToSecond}%p)</span>}
        </div>
        <p className="text-base leading-relaxed text-[#1F1F1F]">{primaryReason}</p>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-white border border-[#E5DFCE]">
            <div className="text-[10px] text-[#7A7466] mb-0.5">전술</div>
            <div className="text-xs font-bold text-[#A9791C]">🎯 {tacticalKey}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-[#E5DFCE]">
            <div className="text-[10px] text-[#7A7466] mb-0.5">위험도</div>
            <div className="text-xs font-bold text-[#9C3131]">{riskFactor}</div>
          </div>
        </div>

        {hasDefenseNote && (
          <div className="p-2.5 rounded-lg bg-[#3B6255]/10 border border-[#3B6255]/25 text-xs text-[#2F5245] leading-relaxed">
            🛡️ {detailedAnalysis.defenseImpact}
          </div>
        )}

        {detailedAnalysis.matchFound && (
          <div className="text-[11px] text-[#7A7466]">
            이번 수로 확보하는 패: <b className="text-[#1F1F1F]">약 {detailedAnalysis.pointsExpected}점 상당</b>
          </div>
        )}
      </div>
    </div>
  );
};

export const PracticeTab: React.FC<PracticeTabProps> = ({
  onIncrementGameCount,
  onIncrementReasonCount,
  userLevel,
  totalGames,
  currentUser,
  onOpenProfile,
  onLogout,
  startFullscreen = false,
}) => {
  // 경험치 게이지 퍼센트 (Navigation.tsx와 동일한 계산식)
  const currentReq = LEVEL_REQUIREMENTS.find(r => r.level === userLevel) || LEVEL_REQUIREMENTS[0];
  const nextReq = LEVEL_REQUIREMENTS.find(r => r.level === userLevel + 1);
  const isMaxLevel = !nextReq;
  const targetGames = nextReq ? nextReq.gamesRequired : currentReq.gamesRequired;
  const xpPct = isMaxLevel
    ? 100
    : Math.min(100, Math.max(0, Math.round((totalGames / targetGames) * 100)));
  const XP_RING_RADIUS = 15;
  const XP_RING_CIRCUMFERENCE = 2 * Math.PI * XP_RING_RADIUS;
  const xpRingOffset = XP_RING_CIRCUMFERENCE - (xpPct / 100) * XP_RING_CIRCUMFERENCE;

  // Game settings
  const [gameMode, setGameMode] = useState<GameMode>('matgo');
  const [showOpponentCards, setShowOpponentCards] = useState<boolean>(false);
  // 바닥패는 실제 고스톱에서도 항상 공개 정보라 항상 보여준다.
  // 대신 실전에서 미리 알 수 없는 "뒤집기 패(덱 맨 위 패)"를 보이기/안보기로 전환한다.
  const [showDeckTopCard, setShowDeckTopCard] = useState<boolean>(false);
  // 수동(직접 카드 클릭) / 자동(AI 추천패로 알아서 진행) 모드
  const [autoMode, setAutoMode] = useState<boolean>(false);
  // 전체화면 모드 (실제 게임 클라이언트처럼 화면을 꽉 채워서 플레이). 로그인 직후 첫 진입이면
  // startFullscreen prop으로 처음부터 켜진 상태로 시작한다(최초 렌더 시 1회만 반영되는 초기값).
  const [isFullscreen, setIsFullscreen] = useState<boolean>(startFullscreen);
  // 전체화면 전환이 실제로 끝난 시점의 뷰포트 높이(px)를 JS로 직접 측정해둔 값.
  // 일부 브라우저(특히 삼성 인터넷)는 requestFullscreen() 호출 직후 CSS의 100dvh 값이
  // 주소창이 사라지는 애니메이션이 끝나기 전 값으로 한 번 굳어버려, 화면이 실제보다 길게
  // 계산되고 아래쪽 내용이 화면 밖으로 잘리는 경우가 있다(전체화면을 한 번 껐다 켜면 정상으로
  // 돌아오는 이유). fullscreenchange/resize 때마다 다시 측정해 이 값을 갱신한다.
  const [fullscreenHeightPx, setFullscreenHeightPx] = useState<number | null>(null);
  // 창(비전체화면) 모드에서도 고정값(min(82vh,720px))이 실제 보이는 영역보다 작아 테이블 아래에
  // 불필요한 빈 여백이 남는 문제가 있었다. 테이블 상단 위치와 하단 탭바 높이를 직접 측정해,
  // 실제로 쓸 수 있는 높이만큼 테이블이 하단 메뉴 바로 위까지 꽉 차도록 채운다.
  const [windowedHeightPx, setWindowedHeightPx] = useState<number | null>(null);
  // 게임 화면 안의 ⚙️ 아이콘으로 여는 설정 패널 (인원/시야 옵션/자동모드/시나리오 등을 모아둠)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  // "핵심 승부처" 문구가 좁은 칸에 줄임 표시될 때, 🔍 아이콘으로 전체 내용을 크게 볼 수 있는 팝업
  const [isCoreReasonOpen, setIsCoreReasonOpen] = useState<boolean>(false);
  // 게임판(felt table) 자체 — 실제 내용 높이(scrollHeight)가 화면에 고정된 표시 높이(clientHeight)를
  // 넘는지 측정해, 넘칠 때만 손패/핵심 승부처 글자를 자동으로 줄이기 위해 참조한다.
  const tableRef = useRef<HTMLDivElement>(null);
  // 먹은 패가 늘어나거나 손패가 두 줄로 넘어가는 등, 내용이 화면 높이를 넘길 것 같을 때 자동으로 켜지는
  // 축소 레이아웃. 한 번 켜지면 다음 새 대국 전까지 유지해(단방향) 줄었다 늘었다 깜빡이는 것을 막는다.
  const [isCompactLayout, setIsCompactLayout] = useState<boolean>(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreen]);

  // 브라우저 자체 전체화면(주소창 등 브라우저 UI 숨김)을 지원하는 기기에서는 함께 켜고 끈다.
  // 지원하지 않는 기기(예: iOS Safari)에서는 기존 CSS 전체화면만 동작한다.
  const enterFullscreen = useCallback(() => {
    playClick();
    setIsFullscreen(true);
    // 브라우저 네이티브 전체화면은 이 컴포넌트 자신의 div가 아니라 문서 전체(documentElement)를
    // 대상으로 건다. 특정 하위 요소를 대상으로 걸면, 그 요소 밖에 있는 하단 메뉴 손잡이 등은
    // 네이티브 전체화면 중에는 브라우저가 아예 그리지 않아(z-index로도 해결 불가) 영영 안 보이게
    // 된다. documentElement를 대상으로 하면 주소창 등 브라우저 UI는 그대로 가려지면서도, 이
    // 컴포넌트 밖의 다른 요소들(손잡이 포함)은 평소처럼 계속 화면에 그려진다.
    const el = document.documentElement as (HTMLElement & { webkitRequestFullscreen?: () => Promise<void> });
    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    request?.()?.catch(() => {});
  }, []);

  const exitFullscreen = useCallback(() => {
    playClick();
    setIsFullscreen(false);
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
    if (doc.fullscreenElement) {
      doc.exitFullscreen?.().catch(() => {});
    } else if (doc.webkitFullscreenElement) {
      doc.webkitExitFullscreen?.();
    }
  }, []);

  // 사용자가 기기 뒤로가기/제스처 등으로 브라우저 전체화면만 빠져나간 경우, 앱 상태도 함께 동기화한다.
  // 동시에 fullscreenchange(전환이 실제로 끝난 시점)와 resize마다 뷰포트 높이를 다시 측정해,
  // 위 fullscreenHeightPx의 100dvh 대체값을 항상 최신 상태로 유지한다.
  useEffect(() => {
    const measureViewport = () => {
      setFullscreenHeightPx(document.fullscreenElement ? (window.visualViewport?.height ?? window.innerHeight) : null);
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
      measureViewport();
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('resize', measureViewport);
    window.visualViewport?.addEventListener('resize', measureViewport);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('resize', measureViewport);
      window.visualViewport?.removeEventListener('resize', measureViewport);
    };
  }, []);

  // 창 모드 전용 높이 측정: 테이블 상단 위치 ~ 하단 고정 탭바(모바일) 사이의 실제 여백을 재서,
  // min(82vh,720px) 같은 추정값 대신 화면 하단까지 정확히 채운다. 전체화면을 껐을 때(isFullscreen이
  // true→false로 바뀔 때)도 다시 측정하도록 의존성에 넣는다 — 브라우저의 실제 전체화면 종료는
  // 비동기라(exitFullscreen() 프라미스), document.fullscreenElement만 보고 판단하면 전환 도중
  // 화면이 실제보다 작게 측정된 값이 그대로 굳어버릴 수 있다. React 상태(isFullscreen)를 기준으로
  // 판단하면 그런 경합 없이 항상 최신 상태로 다시 잰다.
  useEffect(() => {
    if (isFullscreen) return;
    const measureWindowed = () => {
      const table = tableRef.current;
      if (!table) return;
      const top = table.getBoundingClientRect().top;
      const bottomNav = document.querySelector('nav.fixed.bottom-0') as HTMLElement | null;
      const navRect = bottomNav?.getBoundingClientRect();
      // 연습 화면에서는 하단 탭바가 기본적으로 왼쪽 밖으로 슬라이드돼 숨어 있다(rect.right <= 0).
      // 그 상태는 공간을 차지하지 않는 것으로 보고, 테이블이 그만큼 더 아래까지 채우게 한다.
      const navVisible = !!navRect && navRect.right > 0;
      const navH = navVisible ? (navRect?.height ?? 0) : 0;
      const viewportH = window.visualViewport?.height ?? window.innerHeight;
      const BOTTOM_GAP = 12;
      const available = viewportH - top - navH - BOTTOM_GAP;
      setWindowedHeightPx(available > 200 ? available : null);
    };
    measureWindowed();
    // 전체화면 종료 직후에는 주소창이 다시 나타나는 애니메이션이 끝나기 전이라 한 번 더 재서 보정한다.
    const settleTimer = window.setTimeout(measureWindowed, 350);
    window.addEventListener('resize', measureWindowed);
    window.visualViewport?.addEventListener('resize', measureWindowed);
    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener('resize', measureWindowed);
      window.visualViewport?.removeEventListener('resize', measureWindowed);
    };
  }, [isFullscreen]);

  // Board State
  const [userHand, setUserHand] = useState<HwatuCard[]>([]);
  const [floorCards, setFloorCards] = useState<HwatuCard[]>([]);
  const [opponentHand, setOpponentHand] = useState<HwatuCard[]>([]);
  const [opponentHand2, setOpponentHand2] = useState<HwatuCard[]>([]);
  const [remainingDeck, setRemainingDeck] = useState<HwatuCard[]>([]);

  // Captured cards (플레이어별로 실제로 쌓인 패 — 턴제 진행에 사용)
  const [userCaptured, setUserCaptured] = useState<CapturedSummary>(EMPTY_CAPTURED);
  const [opponentCaptured, setOpponentCaptured] = useState<CapturedSummary>(EMPTY_CAPTURED);
  const [opponent2Captured, setOpponent2Captured] = useState<CapturedSummary>(EMPTY_CAPTURED);

  // Play animation / action feedback log
  const [actionLog, setActionLog] = useState<string>('원하는 패를 누르면 실제 한 수를 두고 전황을 확인할 수 있습니다.');
  const [lastDeckCard, setLastDeckCard] = useState<HwatuCard | null>(null);

  // Selected card for playing
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Reason Modal
  const [isReasonModalOpen, setIsReasonModalOpen] = useState<boolean>(false);

  // ── 턴제 진행 상태 ──────────────────────────────────────────────
  const turnOrder: PlayerKey[] = useMemo(
    () => (gameMode === 'matgo' ? ['user', 'opp1'] : ['user', 'opp1', 'opp2']),
    [gameMode]
  );
  const [currentTurn, setCurrentTurn] = useState<PlayerKey>('user');
  const [goCounts, setGoCounts] = useState<Record<PlayerKey, number>>({ user: 0, opp1: 0, opp2: 0 });
  // 흔들기(같은 월 3장을 손에 들고 있을 때 선언) 횟수와, 이미 선언한 월(중복 선언 방지).
  const [shakeCounts, setShakeCounts] = useState<Record<PlayerKey, number>>({ user: 0, opp1: 0, opp2: 0 });
  const [shakenMonths, setShakenMonths] = useState<Record<PlayerKey, Set<number>>>({
    user: new Set(), opp1: new Set(), opp2: new Set(),
  });
  // 뻑/따닥/쪽/싹쓸이 등 특수 상황이 발생했을 때 잠깐 띄우는 알림 배너.
  const [eventBanner, setEventBanner] = useState<string | null>(null);
  const [pendingGoStop, setPendingGoStop] = useState<PlayerKey | null>(null);
  const [pendingScore, setPendingScore] = useState<ScoreBreakdown | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  // 결과 모달을 닫아도 경기 판(최종 바닥패·먹은 패)은 계속 볼 수 있게, 모달 표시 여부만 따로 관리한다.
  const [resultModalOpen, setResultModalOpen] = useState<boolean>(false);

  const getHand = useCallback(
    (key: PlayerKey) => (key === 'user' ? userHand : key === 'opp1' ? opponentHand : opponentHand2),
    [userHand, opponentHand, opponentHand2]
  );
  const getCaptured = useCallback(
    (key: PlayerKey) => (key === 'user' ? userCaptured : key === 'opp1' ? opponentCaptured : opponent2Captured),
    [userCaptured, opponentCaptured, opponent2Captured]
  );
  const setHandFor = (key: PlayerKey) => (key === 'user' ? setUserHand : key === 'opp1' ? setOpponentHand : setOpponentHand2);
  const setCapturedFor = (key: PlayerKey) => (key === 'user' ? setUserCaptured : key === 'opp1' ? setOpponentCaptured : setOpponent2Captured);

  const resetTurnState = () => {
    setCurrentTurn('user');
    setGoCounts({ user: 0, opp1: 0, opp2: 0 });
    setShakeCounts({ user: 0, opp1: 0, opp2: 0 });
    setShakenMonths({ user: new Set(), opp1: new Set(), opp2: new Set() });
    setEventBanner(null);
    setPendingGoStop(null);
    setPendingScore(null);
    setGameResult(null);
    setResultModalOpen(false);
  };

  // 뻑/따닥/쪽/싹쓸이 알림 배너는 몇 초 뒤 자동으로 사라진다.
  useEffect(() => {
    if (!eventBanner) return;
    const t = window.setTimeout(() => setEventBanner(null), 2600);
    return () => window.clearTimeout(t);
  }, [eventBanner]);

  // Function to deal a fresh situation
  const generateNewSituation = useCallback((mode: GameMode = gameMode) => {
    const shuffled = shuffleDeck(HWATU_DECK);

    // Matgo (2-player): Hand 10, Opponent 10, Floor 8
    // 3-player Gostop: Hand 7, Opponent1 7, Opponent2 7, Floor 6
    if (mode === 'matgo') {
      const uHand = shuffled.slice(0, 10);
      const oHand = shuffled.slice(10, 20);
      const floor = shuffled.slice(20, 28);
      const deck = shuffled.slice(28);

      setUserHand(uHand);
      setOpponentHand(oHand);
      setOpponentHand2([]);
      setFloorCards(floor);
      setRemainingDeck(deck);

      setUserCaptured(EMPTY_CAPTURED);
      setOpponentCaptured(EMPTY_CAPTURED);
      setOpponent2Captured(EMPTY_CAPTURED);
    } else {
      const uHand = shuffled.slice(0, 7);
      const oHand1 = shuffled.slice(7, 14);
      const oHand2 = shuffled.slice(14, 21);
      const floor = shuffled.slice(21, 27);
      const deck = shuffled.slice(27);

      setUserHand(uHand);
      setOpponentHand(oHand1);
      setOpponentHand2(oHand2);
      setFloorCards(floor);
      setRemainingDeck(deck);

      setUserCaptured(EMPTY_CAPTURED);
      setOpponentCaptured(EMPTY_CAPTURED);
      setOpponent2Captured(EMPTY_CAPTURED);
    }

    setLastDeckCard(null);
    setSelectedCardId(null);
    setActionLog('새로운 대국이 시작되었습니다. 내 차례부터 순서대로 진행됩니다.');
    setIsCompactLayout(false);
    resetTurnState();
  }, [gameMode]);

  // Initial deal
  useEffect(() => {
    generateNewSituation(gameMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode]);

  // Run AI Recommendation Engine (내 차례 훈수용)
  // 상대패 "보이기"가 켜져 있을 때만 실제 상대 손패를 엔진에 넘긴다 (AI도 같은 정보를 보고 판단).
  const visibleOpponentHands = useMemo(
    () => (showOpponentCards ? [opponentHand, opponentHand2] : []),
    [showOpponentCards, opponentHand, opponentHand2]
  );

  // "뒤집기 패 보이기"가 켜져 있을 때만 덱 맨 위 패를 엔진에 넘긴다 (AI도 같은 정보를 보고 판단).
  const visibleDeckTopCard = showDeckTopCard ? (remainingDeck[0] ?? null) : null;

  const { recommendations, bestRecommendation } = useMemo(() => {
    return evaluateHand(
      userHand,
      floorCards,
      userCaptured,
      opponentCaptured,
      gameMode,
      'standard',
      visibleOpponentHands,
      visibleDeckTopCard
    );
  }, [userHand, floorCards, userCaptured, opponentCaptured, gameMode, visibleOpponentHands, visibleDeckTopCard]);

  // Second recommendation for comparison
  const secondRecommendation = recommendations.length > 1 ? recommendations[1] : null;

  // Handle Mode Change
  const handleModeChange = (newMode: GameMode) => {
    if (newMode === gameMode) return;
    playClick();
    setGameMode(newMode);
    generateNewSituation(newMode);
  };

  // Handle "이유 자세히 보기" click
  const handleOpenReason = () => {
    playClick();
    setIsReasonModalOpen(true);
    onIncrementReasonCount();
  };

  // 흔들기 선언: 같은 월 패를 3장 들고 있을 때, 그 사실을 공개하고 선언 횟수를 기록해둔다.
  // 실제로 이 판에서 이겼을 때만 endGame에서 선언 횟수만큼 최종 점수가 2배씩 불어난다.
  const declareShake = (playerKey: PlayerKey, month: number) => {
    setShakeCounts(prev => ({ ...prev, [playerKey]: prev[playerKey] + 1 }));
    setShakenMonths(prev => {
      const next = new Set(prev[playerKey]);
      next.add(month);
      return { ...prev, [playerKey]: next };
    });
    if (playerKey === 'user') {
      playClick();
      setEventBanner(`나: 🌀 ${month}월 흔들기 선언! (이 판을 이기면 점수 2배)`);
    }
  };

  // ── 게임 종료 판정 ──────────────────────────────────────────────
  const endGame = useCallback(
    (winnerKey: PlayerKey | null, finalHands: Record<PlayerKey, HwatuCard[]>, finalCaptured: Record<PlayerKey, CapturedSummary>) => {
      const scores: Record<PlayerKey, ScoreBreakdown> = {
        user: calculateScore(finalCaptured.user),
        opp1: calculateScore(finalCaptured.opp1),
        opp2: calculateScore(finalCaptured.opp2),
      };
      const stopThreshold = getStopThreshold(gameMode);
      const piBakThreshold = getPiBakThreshold(gameMode);

      let winner: PlayerKey | 'draw' = 'draw';
      let goMultiplier = 1;

      if (winnerKey) {
        winner = winnerKey;
        goMultiplier = 1 + goCounts[winnerKey];
      } else {
        const candidates = turnOrder.filter(k => scores[k].total >= stopThreshold);
        if (candidates.length > 0) {
          candidates.sort((a, b) => scores[b].total - scores[a].total);
          winner = candidates[0];
          goMultiplier = 1 + goCounts[candidates[0]];
        }
      }

      // 흔들기: 선언한 뒤 실제로 이긴 경우에만 선언 횟수만큼 점수가 2배씩 불어난다.
      const shakeMultiplier = winner !== 'draw' ? Math.pow(2, shakeCounts[winner]) : 1;
      const multiplier = goMultiplier * shakeMultiplier;
      const finalScore = winner !== 'draw' ? scores[winner].total * multiplier : 0;

      const badges: string[] = [];
      if (winner !== 'draw') {
        // 광박은 승자가 광으로 점수를 냈을 때만 성립한다(승자도 광이 0장이면 광박이라는 개념 자체가 성립하지 않음).
        const winnerScoredGwang = scores[winner].gwangScore > 0;
        turnOrder.forEach(k => {
          if (k === winner) return;
          const cap = finalCaptured[k];
          const piCount = cap.pi.reduce((acc, c) => acc + (c.type === 'ssangpi' ? 2 : 1), 0);
          const totalCaptured = cap.gwang.length + cap.yeol.length + cap.tti.length + cap.pi.length;
          if (totalCaptured === 0) {
            badges.push(`${PLAYER_LABEL[k]} 멍텅구리박`);
          } else {
            if (winnerScoredGwang && cap.gwang.length === 0) badges.push(`${PLAYER_LABEL[k]} 광박`);
            if (piCount < piBakThreshold) badges.push(`${PLAYER_LABEL[k]} 피박`);
          }
          // 고박(3인 고스톱 전용): "고"를 불렀지만 결국 이기지 못하면 다른 패자 몫까지 책임진다.
          if (gameMode === 'gostop3' && goCounts[k] > 0) badges.push(`${PLAYER_LABEL[k]} 고박`);
        });
      }

      setActionLog(
        winner === 'draw'
          ? `아무도 ${stopThreshold}점을 달성하지 못한 채 패가 모두 소진되어 무승부(유찰)로 종료되었습니다.`
          : `${PLAYER_LABEL[winner]}이(가) ${finalScore}점으로 게임을 승리했습니다!`
      );
      setGameResult({ winner, scores, multiplier, finalScore, badges });
      setResultModalOpen(true);
      setPendingGoStop(null);
      setPendingScore(null);
      // 승패가 실제로 결정된 한 판이 끝난 시점에만 "연습 진행 횟수"를 1회 카운트한다
      // (패를 낼 때마다 카운트되던 것을 게임 종료 시점 1회로 변경).
      onIncrementGameCount();
      void finalHands;
    },
    [goCounts, shakeCounts, turnOrder, gameMode, onIncrementGameCount]
  );

  // 다음 차례로 넘긴다. justPlayed 플레이어의 방금 낸 후 손패 장수를 overrideHandLen으로 넘기면
  // (state 갱신이 아직 반영되기 전이라도) 정확한 장수로 판정할 수 있다.
  const advanceTurn = useCallback(
    (justPlayed: PlayerKey, overrideHandLen?: number, snapshotHands?: Partial<Record<PlayerKey, HwatuCard[]>>, snapshotCaptured?: Partial<Record<PlayerKey, CapturedSummary>>) => {
      const handsLen: Record<PlayerKey, number> = {
        user: (snapshotHands?.user ?? userHand).length,
        opp1: (snapshotHands?.opp1 ?? opponentHand).length,
        opp2: (snapshotHands?.opp2 ?? opponentHand2).length,
      };
      if (overrideHandLen !== undefined) handsLen[justPlayed] = overrideHandLen;

      const activeOrder = turnOrder.filter(k => handsLen[k] > 0);
      if (activeOrder.length === 0) {
        const finalCaptured: Record<PlayerKey, CapturedSummary> = {
          user: snapshotCaptured?.user ?? userCaptured,
          opp1: snapshotCaptured?.opp1 ?? opponentCaptured,
          opp2: snapshotCaptured?.opp2 ?? opponent2Captured,
        };
        endGame(null, { user: [], opp1: [], opp2: [] }, finalCaptured);
        return;
      }

      const currentIdx = turnOrder.indexOf(justPlayed);
      let next: PlayerKey | null = null;
      for (let i = 1; i <= turnOrder.length; i++) {
        const candidate = turnOrder[(currentIdx + i) % turnOrder.length];
        if (handsLen[candidate] > 0) {
          next = candidate;
          break;
        }
      }
      setCurrentTurn(next ?? justPlayed);
    },
    [turnOrder, userHand, opponentHand, opponentHand2, userCaptured, opponentCaptured, opponent2Captured, endGame]
  );

  // ── 한 수 두기 (사용자 / AI 공통) ────────────────────────────────
  // 실제 고스톱 규칙 (국룰 기준):
  //  - 바닥에 같은 월 패가 몇 장(1/2/3장)이든 전부 가져온다 (낸 패 포함 2/3/4장 획득).
  //    "2장이면 하나만" 같은 규칙은 없다 — 2장이면 3장, 3장이면 4장을 전부 먹는다.
  //  - 뻑: 바닥의 짝 1장을 손패로 먹으려는 순간, 바로 다음에 뒤집는 덱패도 같은 월이면
  //    셋 다(낸 패+바닥패+덱패) 먹지 못하고 바닥에 그대로 쌓인다. 나중에 그 월의 마지막
  //    패가 나오면 그때 4장을 한꺼번에 쓸어간다.
  //  - 따닥(손패+덱패 둘 다 성공) / 쪽(짝 없이 냈는데 덱패가 맞음) / 한 번에 3장 이상
  //    쓸어담기 / 싹쓸이(바닥을 완전히 비움) — 이 네 가지 경우 상대 전원에게서 피를
  //    1장씩 받아온다.
  const applyPlay = useCallback(
    (playerKey: PlayerKey, card: HwatuCard) => {
      if (gameResult || pendingGoStop) return;

      playCardSnap();

      const currentHand = getHand(playerKey);
      const prevCaptured = getCaptured(playerKey);
      const nextCaptured: CapturedSummary = {
        gwang: [...prevCaptured.gwang],
        yeol: [...prevCaptured.yeol],
        tti: [...prevCaptured.tti],
        pi: [...prevCaptured.pi],
      };

      const rawHandMatches = floorCards.filter(f => f.month === card.month);
      const peekedDeckCard = remainingDeck[0] ?? null;
      const isPpeok = rawHandMatches.length === 1 && !!peekedDeckCard && peekedDeckCard.month === card.month;

      let newFloor: HwatuCard[];
      let newDeck = remainingDeck;
      let flippedDeckCard: HwatuCard | null = null;
      let capturedThisTurn: HwatuCard[] = [];
      let eventNote = '';

      if (isPpeok) {
        // 셋 다(낸 패 + 바닥 짝패 + 덱패) 먹지 못하고 바닥에 그대로 쌓인다.
        newFloor = [...floorCards.filter(f => f.month !== card.month), card, rawHandMatches[0], peekedDeckCard!];
        newDeck = remainingDeck.slice(1);
        flippedDeckCard = peekedDeckCard;
        eventNote = `🀄 뻑! ${card.month}월 패 3장이 바닥에 묶여 이번 턴엔 먹지 못했습니다.`;
      } else {
        const handMatches = rawHandMatches;
        const handCaptured = handMatches.length > 0 ? [card, ...handMatches] : [];
        let floorAfterPlay = handMatches.length > 0
          ? floorCards.filter(f => f.month !== card.month)
          : [...floorCards, card];
        if (handCaptured.length > 0) playCapture();

        let deckMatches: HwatuCard[] = [];
        let deckCaptured: HwatuCard[] = [];
        if (remainingDeck.length > 0) {
          flippedDeckCard = remainingDeck[0];
          newDeck = remainingDeck.slice(1);
          deckMatches = floorAfterPlay.filter(f => f.month === flippedDeckCard!.month);
          if (deckMatches.length > 0) {
            deckCaptured = [flippedDeckCard, ...deckMatches];
            floorAfterPlay = floorAfterPlay.filter(f => f.month !== flippedDeckCard!.month);
            setTimeout(() => playCapture(), 120);
          } else {
            floorAfterPlay = [...floorAfterPlay, flippedDeckCard];
          }
        }

        newFloor = floorAfterPlay;
        capturedThisTurn = [...handCaptured, ...deckCaptured];

        const isDdadak = handCaptured.length > 0 && deckCaptured.length > 0;
        const isJjok = handCaptured.length === 0 && deckCaptured.length > 0;
        const isBigSweep = handMatches.length >= 3 || deckMatches.length >= 3;
        const isSsakssuli = floorCards.length > 0 && newFloor.length === 0;
        const bonusTriggered = isDdadak || isJjok || isBigSweep || isSsakssuli;

        if (bonusTriggered) {
          const label = isDdadak ? '따닥' : isJjok ? '쪽' : isBigSweep ? '쓸어담기' : '싹쓸이';
          eventNote = `✨ ${label}! 상대에게서 피 1장씩 받아옵니다.`;
          turnOrder.filter(k => k !== playerKey).forEach(k => {
            const theirCaptured = getCaptured(k);
            if (theirCaptured.pi.length > 0) {
              const stolen = theirCaptured.pi[theirCaptured.pi.length - 1];
              setCapturedFor(k)({ ...theirCaptured, pi: theirCaptured.pi.filter(c => c.id !== stolen.id) });
              nextCaptured.pi.push(stolen);
            }
          });
        }
      }

      capturedThisTurn.forEach(c => {
        if (c.type === 'gwang') nextCaptured.gwang.push(c);
        else if (c.type === 'yeol') nextCaptured.yeol.push(c);
        else if (c.type === 'tti') nextCaptured.tti.push(c);
        else nextCaptured.pi.push(c);
      });

      const newHandAfter = currentHand.filter(c => c.id !== card.id);

      // commit state
      setCapturedFor(playerKey)(nextCaptured);
      setHandFor(playerKey)(newHandAfter);
      setFloorCards(newFloor);
      setRemainingDeck(newDeck);
      setLastDeckCard(flippedDeckCard);
      if (playerKey === 'user') setSelectedCardId(null);

      if (eventNote) setEventBanner(`${PLAYER_LABEL[playerKey]}: ${eventNote}`);
      setActionLog(
        capturedThisTurn.length > 0
          ? `${PLAYER_LABEL[playerKey]}: 바닥의 ${card.month}월 패를 먹었습니다!`
          : isPpeok
          ? `${PLAYER_LABEL[playerKey]}: ${card.month}월 뻑이 발생했습니다.`
          : `${PLAYER_LABEL[playerKey]}: 바닥에 일치하는 월이 없어 ${card.month}월을 깔았습니다.`
      );

      const scoreInfo = calculateScore(nextCaptured);
      const crossedStopLine = capturedThisTurn.length > 0 && scoreInfo.total >= getStopThreshold(gameMode);

      if (crossedStopLine) {
        setPendingGoStop(playerKey);
        setPendingScore(scoreInfo);
        return;
      }

      const capturedSnapshot: Partial<Record<PlayerKey, CapturedSummary>> = { [playerKey]: nextCaptured };
      advanceTurn(playerKey, newHandAfter.length, { [playerKey]: newHandAfter }, capturedSnapshot);
    },
    [gameResult, pendingGoStop, getHand, getCaptured, floorCards, remainingDeck, advanceTurn, gameMode, turnOrder]
  );

  // 고/스톱 결정 처리 (사용자 버튼 클릭 또는 AI 자동 결정)
  const resolveGoStop = useCallback(
    (playerKey: PlayerKey, choice: 'go' | 'stop') => {
      if (choice === 'stop') {
        const finalCaptured: Record<PlayerKey, CapturedSummary> = {
          user: userCaptured,
          opp1: opponentCaptured,
          opp2: opponent2Captured,
        };
        endGame(playerKey, { user: userHand, opp1: opponentHand, opp2: opponentHand2 }, finalCaptured);
        return;
      }
      setGoCounts(prev => ({ ...prev, [playerKey]: prev[playerKey] + 1 }));
      setPendingGoStop(null);
      setPendingScore(null);
      advanceTurn(playerKey);
    },
    [endGame, userCaptured, opponentCaptured, opponent2Captured, userHand, opponentHand, opponentHand2, advanceTurn]
  );

  // AI(상대1/상대2)의 고/스톱 자동 결정: 처음 한 번은 "고"를 외치고, 두 번째부터는 안전하게 "스톱"한다.
  useEffect(() => {
    if (!pendingGoStop || pendingGoStop === 'user' || gameResult) return;
    const count = goCounts[pendingGoStop];
    const choice: 'go' | 'stop' = count < 1 ? 'go' : 'stop';
    const t = setTimeout(() => resolveGoStop(pendingGoStop, choice), AUTO_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGoStop]);

  // AI(상대1/상대2) 턴 자동 진행: 훈수 엔진을 그대로 재사용해 상대 시점에서 최적수를 계산한다.
  useEffect(() => {
    if (gameResult || pendingGoStop) return;
    if (currentTurn === 'user') return;

    const hand = currentTurn === 'opp1' ? opponentHand : opponentHand2;
    if (hand.length === 0) return;

    const t = setTimeout(() => {
      // 흔들기: 같은 월 패 3장을 들고 있는데 아직 선언하지 않았다면 자동으로 선언한다.
      groupByMonth(hand).forEach((cards, month) => {
        if (cards.length >= 3 && !shakenMonths[currentTurn].has(month)) {
          declareShake(currentTurn, month);
        }
      });

      const captured = currentTurn === 'opp1' ? opponentCaptured : opponent2Captured;
      const { bestRecommendation } = evaluateHand(hand, floorCards, captured, userCaptured, gameMode, 'standard', [], null);
      applyPlay(currentTurn, bestRecommendation.card);
    }, AUTO_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurn, gameResult, pendingGoStop, opponentHand, opponentHand2, floorCards]);

  // 자동 모드에서는 내 차례에도 사용자가 버튼을 누르지 않아도 AI 추천대로 알아서 진행한다.
  useEffect(() => {
    if (!autoMode || gameResult || pendingGoStop) return;
    if (currentTurn !== 'user') return;
    if (userHand.length === 0) return;

    const t = setTimeout(() => {
      applyPlay('user', bestRecommendation.card);
    }, AUTO_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode, currentTurn, gameResult, pendingGoStop, userHand, floorCards]);

  // Preset situations for deliberate practice (교육용 스냅샷 — 턴제 상태도 함께 초기화)
  const loadScenario = (type: 'godori' | 'hongdan' | 'puck') => {
    playClick();
    resetTurnState();

    let userHandNext: HwatuCard[];
    let floorNext: HwatuCard[];
    let userCapturedNext: CapturedSummary;
    let opponentCapturedNext: CapturedSummary;
    let logNext: string;

    if (type === 'godori') {
      const m8bird = HWATU_DECK.find(c => c.id === 'm8_godori')!;
      const m3gwang = HWATU_DECK.find(c => c.id === 'm3_gwang')!;
      const m8floor = HWATU_DECK.find(c => c.id === 'm8_pi1')!;
      const m3floor = HWATU_DECK.find(c => c.id === 'm3_pi1')!;
      const m1pi = HWATU_DECK.find(c => c.id === 'm1_pi1')!;
      const m7pi = HWATU_DECK.find(c => c.id === 'm7_pi1')!;

      userHandNext = [m8bird, m3gwang, m1pi, m7pi];
      floorNext = [m8floor, m3floor, HWATU_DECK.find(c => c.id === 'm5_pi1')!, HWATU_DECK.find(c => c.id === 'm10_pi1')!];
      opponentCapturedNext = {
        gwang: [],
        yeol: [HWATU_DECK.find(c => c.id === 'm2_godori')!, HWATU_DECK.find(c => c.id === 'm4_godori')!],
        tti: [],
        pi: [HWATU_DECK.find(c => c.id === 'm6_pi1')!, HWATU_DECK.find(c => c.id === 'm9_pi1')!]
      };
      userCapturedNext = EMPTY_CAPTURED;
      logNext = '시나리오 로드: [상대 고도리 위기] 상대가 새 2장을 확보했습니다. 8월 기러기 차단이 시급합니다.';
    } else if (type === 'hongdan') {
      const m1hong = HWATU_DECK.find(c => c.id === 'm1_hongdan')!;
      const m11gwang = HWATU_DECK.find(c => c.id === 'm11_gwang')!;
      const m1floor = HWATU_DECK.find(c => c.id === 'm1_pi1')!;
      userHandNext = [m1hong, m11gwang, HWATU_DECK.find(c => c.id === 'm4_pi1')!];
      floorNext = [m1floor, HWATU_DECK.find(c => c.id === 'm9_pi1')!, HWATU_DECK.find(c => c.id === 'm6_pi1')!];
      userCapturedNext = {
        gwang: [],
        yeol: [],
        tti: [HWATU_DECK.find(c => c.id === 'm2_hongdan')!, HWATU_DECK.find(c => c.id === 'm3_hongdan')!],
        pi: []
      };
      opponentCapturedNext = { gwang: [], yeol: [], tti: [], pi: [HWATU_DECK.find(c => c.id === 'm7_pi1')!] };
      logNext = '시나리오 로드: [홍단 완성 찬스] 내 홍단 2장 확보 상태에서 1월 홍단을 먹어 3점을 완성할 기회입니다.';
    } else {
      const m6clean = HWATU_DECK.find(c => c.id === 'm6_cheongdan')!;
      userHandNext = [m6clean, HWATU_DECK.find(c => c.id === 'm1_gwang')!, HWATU_DECK.find(c => c.id === 'm8_pi1')!];
      floorNext = [
        HWATU_DECK.find(c => c.id === 'm6_yeol')!,
        HWATU_DECK.find(c => c.id === 'm6_pi1')!,
        HWATU_DECK.find(c => c.id === 'm6_pi2')!,
        HWATU_DECK.find(c => c.id === 'm1_pi1')!,
      ];
      userCapturedNext = EMPTY_CAPTURED;
      opponentCapturedNext = EMPTY_CAPTURED;
      logNext = '시나리오 로드: [바닥 3장 쓸어담기 찬스] 6월 3장이 바닥에 겹쳐있습니다. 쓸어담으면 피 뺏기 보너스까지 발동합니다.';
    }

    // 시나리오에서 이미 쓰인 카드를 제외한 나머지로 상대 손패·남은 덱을 채워, 카드가 중복되거나
    // 이전 대국의 상대 패가 그대로 남아 있는(턴 진행 시 오작동하는) 문제 없이 이어서 진행할 수 있게 한다.
    const usedIds = new Set([
      ...userHandNext,
      ...floorNext,
      ...userCapturedNext.gwang, ...userCapturedNext.yeol, ...userCapturedNext.tti, ...userCapturedNext.pi,
      ...opponentCapturedNext.gwang, ...opponentCapturedNext.yeol, ...opponentCapturedNext.tti, ...opponentCapturedNext.pi,
    ].map(c => c.id));
    const remainder = shuffleDeck(HWATU_DECK.filter(c => !usedIds.has(c.id)));
    const opponentHandNext = remainder.slice(0, userHandNext.length);
    const deckNext = remainder.slice(userHandNext.length);

    setUserHand(userHandNext);
    setFloorCards(floorNext);
    setUserCaptured(userCapturedNext);
    setOpponentCaptured(opponentCapturedNext);
    setOpponentHand(opponentHandNext);
    setOpponentHand2([]);
    setOpponent2Captured(EMPTY_CAPTURED);
    setRemainingDeck(deckNext);
    setLastDeckCard(null);
    setSelectedCardId(null);
    setActionLog(logNext);
  };

  const userCapturedTotal =
    userCaptured.gwang.length + userCaptured.yeol.length + userCaptured.tti.length + userCaptured.pi.length;

  const importanceStyle = IMPORTANCE_STYLE[bestRecommendation.importance];
  const isUserTurn = currentTurn === 'user' && !pendingGoStop && !gameResult;
  const cardsDisabled = autoMode || !isUserTurn;

  // 흔들기 가능 여부: 지금 내 차례이고, 아직 선언 안 한 "같은 월 3장"을 들고 있으면 알려준다.
  const userShakeableMonth = isUserTurn && !autoMode
    ? Array.from(groupByMonth(userHand).entries()).find(([month, cards]) => cards.length >= 3 && !shakenMonths.user.has(month))
    : undefined;

  // 먹은 패가 늘거나 손패가 줄바꿈되는 등 실제 내용 높이가 화면에 고정된 표시 높이를 넘어서는 경우를
  // 대비한 안전장치 — 넘칠 때만 손패/핵심 승부처 글자를 자동으로 한 단계 줄인다(스크롤 대신).
  useEffect(() => {
    const el = tableRef.current;
    if (!el || isCompactLayout) return;
    if (el.scrollHeight > el.clientHeight + 2) {
      setIsCompactLayout(true);
    }
  }, [
    isCompactLayout,
    isFullscreen,
    fullscreenHeightPx,
    userHand.length,
    floorCards.length,
    opponentHand.length,
    opponentHand2.length,
    gameMode,
    autoMode,
    isUserTurn,
    userCaptured,
    opponentCaptured,
    opponent2Captured,
    bestRecommendation.primaryReason,
  ]);

  return (
    <div
      className={isFullscreen ? 'fixed inset-0 z-[200] bg-[#0F1712] p-2 sm:p-3 overflow-y-auto space-y-3' : ''}
    >
      {/* Main Playing Table Arena — 실제 게임 클라이언트 구도(코너 아바타 + 대칭 바닥패) 참고, 한 화면에 다 들어오도록 컴팩트 레이아웃.
          모든 설정은 테이블 안의 ⚙️ 설정 아이콘을 눌러 여는 패널에서 관리한다. */}
      <div
        ref={tableRef}
        className="bg-[#2D4536] border-4 border-[#3D2817] rounded-2xl shadow-xl text-white relative overflow-hidden flex flex-col"
        style={{
          // 가로·세로 폭이 내용(먹은 패 수, 핵심 승부처 글자 길이 등)에 따라 커졌다 작아졌다 하지
          // 않도록, 창 모드에서도 전체화면과 마찬가지로 height를 고정값으로 둔다(maxHeight만으로는
          // 내용이 작을 때 테이블이 줄어들어 화면이 들쭉날쭉해 보일 수 있었다).
          maxHeight: isFullscreen
            ? (fullscreenHeightPx ? `${fullscreenHeightPx - 24}px` : 'calc(100dvh - 24px)')
            : (windowedHeightPx ? `${windowedHeightPx}px` : 'min(82vh, 720px)'),
          height: isFullscreen
            ? (fullscreenHeightPx ? `${fullscreenHeightPx - 24}px` : 'calc(100dvh - 24px)')
            : (windowedHeightPx ? `${windowedHeightPx}px` : 'min(82vh, 720px)'),
        }}
      >
        {/* Subtle Felt Texture Vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/10 to-black/35 pointer-events-none" />

        {/* "훈수패" 이름을 상단 메뉴 대신 배경에 크고 연하게 워터마크로 표시 (펠트 바탕 위에 은은하게) */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
          <span className="text-[20vw] sm:text-[9rem] leading-none font-black text-white/[0.05] font-serif whitespace-nowrap">
            훈수패
          </span>
        </div>

        {/* 뻑/따닥/쪽/싹쓸이/흔들기 알림 배너 — 몇 초 뒤 자동으로 사라진다 */}
        {eventBanner && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-[#A9791C] text-white text-[11px] font-bold shadow-lg whitespace-nowrap pointer-events-none">
            {eventBanner}
          </div>
        )}

        {/* Top status strip: 사이트 상단 메뉴(경험치)를 게임 화면 안으로 옮겨와 왼쪽에 두고,
            이유 보기 / 설정 / 전체화면 버튼은 오른쪽에 둔다. (훈수패 요약·차례 텍스트는 좁은 화면에서
            버튼과 겹쳐 보이는 문제가 있어 제거 — 추천 근거는 '이유 보기'에서, 차례는 아래 배지 강조로 이미 알 수 있다) */}
        <div className="relative z-10 shrink-0 flex items-center justify-between gap-2 px-3.5 py-1.5 bg-black/30 border-b border-white/10 text-[11px]">
          <button
            type="button"
            onClick={onOpenProfile}
            title={`경험치 진행률 ${xpPct}% · 눌러서 퀘스트 현황 보기`}
            aria-label={`경험치 진행률 ${xpPct}%, 퀘스트 현황으로 이동`}
            className="relative w-8 h-8 shrink-0 flex items-center justify-center cursor-pointer"
          >
            <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
              <circle cx="18" cy="18" r={XP_RING_RADIUS} fill="none" stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="3.5" />
              <circle
                cx="18"
                cy="18"
                r={XP_RING_RADIUS}
                fill="none"
                stroke="#F3D999"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={XP_RING_CIRCUMFERENCE}
                strokeDashoffset={xpRingOffset}
                className="transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[7.5px] font-bold text-[#F4EEDC] tabular-nums">
              {xpPct}%
            </span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {/* 진행 방식(수동/자동) — 설정 패널에 있던 것을 게임 상단으로 옮겨, 플레이 중에도
                언제든 한 번 탭으로 바로 전환할 수 있게 한다. */}
            <button
              type="button"
              onClick={() => { playClick(); setAutoMode(prev => !prev); }}
              aria-label={autoMode ? '자동 모드 (눌러서 수동으로 전환)' : '수동 모드 (눌러서 자동으로 전환)'}
              className={`shrink-0 px-2.5 py-1 rounded-md text-[10.5px] font-bold cursor-pointer whitespace-nowrap border ${
                autoMode
                  ? 'bg-[#A9791C] hover:bg-[#8F6516] border-[#A9791C] text-white'
                  : 'bg-black/40 hover:bg-black/60 border-white/20 text-white'
              }`}
            >
              {autoMode ? '🤖 자동' : '🖐️ 수동'}
            </button>
            <button
              type="button"
              onClick={handleOpenReason}
              className="shrink-0 px-2.5 py-1 rounded-md bg-[#2B3F5C] hover:bg-[#1E2E44] text-white text-[10.5px] font-bold cursor-pointer whitespace-nowrap"
            >
              🔍 이유 보기
            </button>
            <button
              type="button"
              onClick={() => { playClick(); setIsSettingsOpen(true); }}
              aria-label="설정 열기"
              className="shrink-0 w-7 h-7 rounded-md bg-black/40 hover:bg-black/60 border border-white/20 text-white text-[12px] font-bold cursor-pointer flex items-center justify-center"
            >
              ⚙️
            </button>
            {isFullscreen ? (
              <button
                type="button"
                onClick={exitFullscreen}
                className="shrink-0 px-2.5 py-1 rounded-md bg-black/40 hover:bg-black/60 border border-white/20 text-white text-[10.5px] font-bold cursor-pointer whitespace-nowrap"
              >
                ⤢ 전체화면 종료
              </button>
            ) : (
              <button
                type="button"
                onClick={enterFullscreen}
                className="shrink-0 px-2.5 py-1 rounded-md bg-black/40 hover:bg-black/60 border border-white/20 text-white text-[10.5px] font-bold cursor-pointer whitespace-nowrap"
              >
                ⛶ 전체화면
              </button>
            )}
          </div>
        </div>

        {/* Opponent Area — 코너 아바타 배지 구도 (상대1/상대2 색상·글자로 확실히 구분).
            상대1/상대2 칸을 flex-1 + min-w-0 + overflow-hidden으로 폭을 균등 분배해,
            한쪽 먹은 패가 많아져도 다른 쪽을 밀어내거나 화면 밖으로 잘리지 않게 한다.
            안 낸 패(손패)는 배지 옆에 나란히 붙여 별도의 줄을 쓰지 않도록 해 세로 공간을 아낀다. */}
        <div className="relative z-10 shrink-0 px-3.5 pt-2 space-y-1">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col items-start gap-1">
              <div className="flex items-center gap-1.5 w-full">
                <PlayerLabel
                  label="상대1"
                  sub={showOpponentCards ? '패 공개' : '비공개'}
                  labelColorClass="text-[#E08585]"
                  active={currentTurn === 'opp1' && !gameResult}
                />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <HandStack
                    cards={opponentHand}
                    isHidden={!showOpponentCards}
                    colorClass="bg-[#9C3131]"
                    borderClass="border-[#7D2626]"
                    align="left"
                  />
                </div>
              </div>
              <CapturedStack captured={opponentCaptured} align="left" />
            </div>

            {gameMode === 'gostop3' && (
              <div className="flex-1 min-w-0 overflow-hidden flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 w-full justify-end">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <HandStack
                      cards={opponentHand2}
                      isHidden={!showOpponentCards}
                      colorClass="bg-[#2B5F8A]"
                      borderClass="border-[#1E4A6B]"
                      align="right"
                    />
                  </div>
                  <PlayerLabel
                    label="상대2"
                    sub={showOpponentCards ? '패 공개' : '비공개'}
                    labelColorClass="text-[#7FB4E0]"
                    align="right"
                    active={currentTurn === 'opp2' && !gameResult}
                  />
                </div>
                <CapturedStack captured={opponent2Captured} align="right" />
              </div>
            )}
          </div>
        </div>

        {/* Center: 핵심 승부처(좌) + Deck/Floor(우) — 별도 줄 대신 바닥패 영역 왼쪽에 이유를 붙이고
            바닥패는 오른쪽으로 시프트해, 손패가 두 줄로 늘어나도 세로 공간이 추가로 늘지 않게 한다. */}
        <div className="relative z-10 my-1.5 mx-3.5 px-2.5 py-1.5 bg-black/25 rounded-xl border border-white/10 flex-1 min-h-0 flex items-stretch gap-2">
          {/* 핵심 승부처 — 이 앱의 핵심 가치이므로 승률·전술 태그를 함께 배지로 노출하고,
              중요도(high/medium/low)에 따라 스타일을 달리해 결정적인 수일수록 눈에 띄게 한다. */}
          <div className={`w-[38%] shrink-0 flex flex-col justify-center gap-1 pr-2.5 transition-colors ${importanceStyle.boxClass}`}>
            <button
              type="button"
              onClick={() => { playClick(); setIsCoreReasonOpen(true); }}
              className={`flex items-center flex-wrap gap-x-1.5 gap-y-0 cursor-pointer w-fit ${importanceStyle.titleClass}`}
            >
              <span className="flex items-center gap-1 text-[11.5px] font-black whitespace-nowrap">
                <span>{importanceStyle.label}</span>
                {importanceStyle.pulse && <span className="w-1.5 h-1.5 rounded-full bg-[#FFE9A8] animate-ping shrink-0" />}
              </span>
              <span
                aria-label="전체 내용 크게 보기"
                className="text-[9px] font-bold opacity-80 underline underline-offset-2 decoration-dotted whitespace-nowrap"
              >
                🔍 눌러서 상세 전략
              </span>
            </button>
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`px-1.5 py-[1px] rounded-full text-white text-[9.5px] font-black tabular-nums whitespace-nowrap ${importanceStyle.winBadgeClass}`}>
                승률 {bestRecommendation.winRate}%
              </span>
              <span className={`px-1.5 py-[1px] rounded-full text-white text-[9px] font-bold truncate max-w-[52%] whitespace-nowrap ${importanceStyle.tacticalBadgeClass}`}>
                🎯 {bestRecommendation.tacticalKey}
              </span>
            </div>
            <div className={`leading-snug ${importanceStyle.textClass} ${isCompactLayout ? 'text-[10px] line-clamp-2' : 'text-[11.5px] line-clamp-4'}`}>
              {bestRecommendation.primaryReason}
            </div>
          </div>

          {/* 바닥패 + 덱 (오른쪽으로 시프트). 바닥패가 많아 두 줄 이상으로 늘어나도 아래 내 손패 영역이
              화면 밖으로 밀려 잘리지 않도록, 이 칸만 min-h-0 + overflow-y-auto로 내부 스크롤되게 한다. */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col items-center justify-center gap-1 overflow-y-auto">
            <div className="w-full flex items-center justify-between text-[10px] text-[#A5C7B5]">
              <span className="font-bold text-[#FAF6EC]">바닥패 ({floorCards.length}장)</span>
              {lastDeckCard && (
                <span className="text-[#F3D999] truncate max-w-[55%]">뒤집힘: <b className="underline">{lastDeckCard.name}</b></span>
              )}
            </div>

            {/* 바닥패는 폭에 따라 줄마다 장수가 들쭉날쭉 바뀌는 flex-wrap 대신 그리드로 가지런히
                정렬한다. 고정 2열 대신 auto-fill로 가로 폭이 허용하는 만큼 카드를 최대한 많이
                한 줄에 채워, 줄 수(= 세로 공간)를 꼭 필요한 만큼만 쓰도록 한다(화면이 넓으면
                한 줄에 더 많이, 좁으면 자동으로 줄어든다 — 어느 폭에서도 줄은 항상 가지런함). */}
            <div className="w-full flex flex-col items-center gap-1">
              <div className="grid grid-cols-[repeat(auto-fill,32px)] gap-1 justify-center w-full">
                {floorCards.length === 0 ? (
                  <div className="col-span-full text-[10.5px] text-white/60 py-1">바닥이 비었습니다 (싹쓸이 상황!)</div>
                ) : (
                  floorCards.map(card => (
                    <CardView key={card.id} card={card} size="xs" disabled={true} />
                  ))
                )}
              </div>
              <div className="shrink-0">
                {showDeckTopCard && remainingDeck.length > 0 ? (
                  <CardView card={remainingDeck[0]} size="xs" disabled={true} />
                ) : (
                  <div className="w-8 h-12 shrink-0 bg-[#9C3131] border border-[#FAF6EC]/30 rounded-sm shadow flex items-center justify-center text-white text-[8px] font-bold text-center leading-tight px-0.5">
                    덱{remainingDeck.length}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* My Area — 코너 아바타 배지 구도 (상대와 대칭) */}
        <div className="relative z-10 shrink-0 px-3.5 pb-1 space-y-1">
          <div className="flex items-end justify-between gap-2">
            <PlayerLabel
              label="나"
              sub={`획득 ${userCapturedTotal}장 · 점수 ${calculateScore(userCaptured).total}`}
              labelColorClass="text-[#9FB6D9]"
              active={currentTurn === 'user' && !gameResult}
            />
            <div className="flex-1 min-w-0">
              <CapturedStack captured={userCaptured} align="right" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#A5C7B5]">
            <span className="font-bold text-[#E5DFCE]">내 손패 ({userHand.length}장)</span>
            {userShakeableMonth ? (
              <button
                type="button"
                onClick={() => declareShake('user', userShakeableMonth[0])}
                className="shrink-0 px-2 py-0.5 rounded-full bg-[#A9791C] hover:bg-[#8F6516] text-white text-[10px] font-bold cursor-pointer animate-pulse"
              >
                🌀 {userShakeableMonth[0]}월 흔들기 선언 (같은 월 3장!)
              </button>
            ) : (
              <span>획득 광{userCaptured.gwang.length}·열{userCaptured.yeol.length}·띠{userCaptured.tti.length}·피{userCaptured.pi.length}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {userHand.map(card => {
              const isRecommended = card.id === bestRecommendation.card.id;
              const isSecond = secondRecommendation && card.id === secondRecommendation.card.id;
              const isSelected = selectedCardId === card.id;

              return (
                <CardView
                  key={card.id}
                  card={card}
                  size={isCompactLayout ? 'xs' : 'compact'}
                  isRecommended={isRecommended}
                  recommendationRank={isRecommended ? 1 : (isSecond ? 2 : undefined)}
                  isSelected={isSelected}
                  disabled={cardsDisabled}
                  onClick={() => {
                    setSelectedCardId(card.id);
                    applyPlay('user', card);
                  }}
                />
              );
            })}
          </div>
        </div>

      </div>

      {/* Reason Detail Modal */}
      <ReasonModal
        isOpen={isReasonModalOpen}
        onClose={() => setIsReasonModalOpen(false)}
        recommendation={bestRecommendation}
        secondRecommendation={secondRecommendation}
        opponentVisible={showOpponentCards}
      />

      {/* 고/스톱 선택 모달 (내 차례에서 기준 점수 이상 달성 시) */}
      {pendingGoStop === 'user' && pendingScore && (
        <GoStopModal
          score={pendingScore}
          goCount={goCounts.user}
          threshold={getStopThreshold(gameMode)}
          onGo={() => resolveGoStop('user', 'go')}
          onStop={() => resolveGoStop('user', 'stop')}
          coreReason={bestRecommendation.primaryReason}
        />
      )}

      {/* 게임 종료 결과 모달 — 닫아도 경기 판은 계속 보이며, 아래 배지로 언제든 다시 열 수 있다 */}
      {gameResult && resultModalOpen && (
        <GameResultModal
          result={gameResult}
          activePlayers={turnOrder}
          onRestart={() => generateNewSituation(gameMode)}
          onClose={() => setResultModalOpen(false)}
        />
      )}

      {/* 결과 모달을 닫은 뒤 경기 판을 보는 중일 때, 다시 결과를 열 수 있는 배지 */}
      {gameResult && !resultModalOpen && (
        <button
          type="button"
          onClick={() => setResultModalOpen(true)}
          className="fixed bottom-4 right-4 z-[250] px-4 py-2.5 rounded-full bg-[#A9791C] hover:bg-[#8F6516] text-white text-xs font-bold shadow-xl cursor-pointer whitespace-nowrap"
        >
          🏆 {gameResult.winner === 'draw' ? '무승부' : `${PLAYER_LABEL[gameResult.winner]} 승리`} · 결과 다시 보기
        </button>
      )}

      {/* 설정 패널 — 게임 화면 안의 ⚙️ 아이콘으로만 열림 */}
      {isSettingsOpen && (
        <SettingsModal
          gameMode={gameMode}
          onModeChange={mode => { handleModeChange(mode); setIsSettingsOpen(false); }}
          showOpponentCards={showOpponentCards}
          onToggleOpponentCards={() => { playClick(); setShowOpponentCards(prev => !prev); }}
          showDeckTopCard={showDeckTopCard}
          onToggleDeckTopCard={() => { playClick(); setShowDeckTopCard(prev => !prev); }}
          onNewGame={() => { playClick(); generateNewSituation(gameMode); setIsSettingsOpen(false); }}
          onLoadScenario={type => { loadScenario(type); setIsSettingsOpen(false); }}
          onClose={() => setIsSettingsOpen(false)}
          currentUser={currentUser}
          onLogout={onLogout}
        />
      )}

      {/* 핵심 승부처 전체 내용 팝업 */}
      {isCoreReasonOpen && (
        <CoreReasonModal
          recommendation={bestRecommendation}
          onClose={() => setIsCoreReasonOpen(false)}
        />
      )}
    </div>
  );
};
