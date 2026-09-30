import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HwatuCard, GameMode } from '../types/hwatu';
import { HWATU_DECK, shuffleDeck } from '../utils/hwatuData';
import { evaluateHand } from '../utils/engine';
import { calculateScore, STOP_THRESHOLD, ScoreBreakdown } from '../utils/scoring';
import { CardView } from './CardView';
import { ReasonModal } from './ReasonModal';
import { playCardSnap, playCapture, playClick } from '../utils/sound';

interface PracticeTabProps {
  onIncrementGameCount: () => void;
  onIncrementReasonCount: () => void;
}

type PlayerKey = 'user' | 'opp1' | 'opp2';

interface CapturedSummary {
  gwang: HwatuCard[];
  yeol: HwatuCard[];
  tti: HwatuCard[];
  pi: HwatuCard[];
}

const EMPTY_CAPTURED: CapturedSummary = { gwang: [], yeol: [], tti: [], pi: [] };

const PLAYER_LABEL: Record<PlayerKey, string> = { user: '나', opp1: '상대1', opp2: '상대2' };

// 상대/내 정보 배지 (실제 게임 클라이언트의 아바타 카드 느낌). 상대1/상대2는 색상과 아바타 글자를 다르게 표시해 확실히 구분한다.
const PlayerBadge: React.FC<{
  label: string;
  sub: string;
  avatarText: string;
  colorClass: string;
  align?: 'left' | 'right';
  active?: boolean;
}> = ({ label, sub, avatarText, colorClass, align = 'left', active = false }) => (
  <div
    className={`flex items-center gap-2 bg-black/35 border rounded-xl px-2.5 py-1.5 shrink-0 transition-colors ${
      align === 'right' ? 'flex-row-reverse text-right' : ''
    } ${active ? 'border-[#F3D999] ring-2 ring-[#F3D999]/70 shadow-[0_0_10px_rgba(243,217,153,0.5)]' : 'border-white/15'}`}
  >
    <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm relative`}>
      {avatarText}
      {active && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#F3D999] animate-ping" />
      )}
    </div>
    <div className="leading-tight">
      <div className="text-[11px] font-bold text-[#F4EEDC] whitespace-nowrap flex items-center gap-1">
        {label}
        {active && <span className="text-[9px] font-bold text-[#F3D999]">● 차례</span>}
      </div>
      <div className="text-[9.5px] text-[#A5C7B5] whitespace-nowrap">{sub}</div>
    </div>
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
  // 카드를 너무 많이 겹쳐 쌓으면 칸 밖으로 잘려 나온 카드가 반쪽만 보이는 지저분한 모습이 되므로,
  // 보여줄 카드 수를 제한하고 정확한 장수는 옆의 숫자 라벨로만 전달한다.
  // 겹침 폭도 기존(-23px)보다 약 20% 줄여, 어떤 패인지 더 잘 구분되게 한다.
  const MAX_SHOWN = 5;
  const shownCards = cards.slice(0, MAX_SHOWN);
  const countLabel = <span className="text-[10px] font-bold text-white/70 tabular-nums shrink-0">{cards.length}장</span>;
  const stack = (
    <div className="flex">
      {shownCards.map((card, i) => (
        <div key={card.id} className="shrink-0" style={{ marginLeft: i === 0 ? 0 : '-18px', zIndex: i }}>
          {isHidden ? (
            <div className={`w-8 h-12 rounded-sm ${colorClass} border ${borderClass} shadow-sm flex items-center justify-center`}>
              <div className="w-3.5 h-3.5 rounded-full border border-white/40 flex items-center justify-center text-[7px] text-white/70 font-serif">
                花
              </div>
            </div>
          ) : (
            <CardView card={card} size="xs" disabled={true} hideInfo={true} fullOpacity noBorder />
          )}
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

// 한 종류(광/열끗/띠/피)의 먹은 패를 살짝 겹쳐 쌓고, 2장 이상이면 우하단에 장수 배지를 붙인다.
const CategoryPile: React.FC<{ cards: HwatuCard[] }> = ({ cards }) => {
  if (cards.length === 0) return null;
  // 겹쳐 쌓을 카드 수를 제한해, 칸 밖으로 반쪽만 잘려 보이는 카드가 생기지 않게 한다.
  // 겹침 폭도 기존(-23px)보다 약 20% 줄여, 어떤 패를 먹었는지 더 잘 구분되게 한다.
  const MAX_SHOWN = 4;
  const shownCards = cards.slice(0, MAX_SHOWN);
  return (
    <div className="relative flex shrink-0">
      {shownCards.map((card, idx) => (
        <div key={`${card.id}-${idx}`} className="shrink-0" style={{ marginLeft: idx === 0 ? 0 : '-18px', zIndex: idx }}>
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
const CapturedStack: React.FC<{ captured: CapturedSummary; align?: 'left' | 'right' }> = ({ captured, align = 'left' }) => {
  const rows = [
    [captured.gwang, captured.yeol],
    [captured.tti, captured.pi],
  ];
  if (rows.every(row => row.every(g => g.length === 0))) return null;
  const rowJustify = align === 'right' ? 'justify-end' : 'justify-start';
  return (
    <div className={`flex flex-col gap-1 p-1 bg-black/20 rounded-lg shrink-0 self-stretch ${align === 'right' ? 'items-end' : 'items-start'}`}>
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className={`flex items-end gap-1.5 ${rowJustify}`}>
          {row.map((g, i) => <CategoryPile key={i} cards={g} />)}
        </div>
      ))}
    </div>
  );
};

// 고/스톱 선택 모달 (사용자 차례에서 7점 이상 달성 시 표시)
const GoStopModal: React.FC<{
  score: ScoreBreakdown;
  goCount: number;
  onGo: () => void;
  onStop: () => void;
}> = ({ score, goCount, onGo, onStop }) => (
  <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4">
    <div className="bg-[#FAF6EC] border-2 border-[#A9791C] rounded-2xl shadow-2xl max-w-sm w-full p-5 text-center space-y-3">
      <div className="text-xs font-bold text-[#A9791C]">🎉 {STOP_THRESHOLD}점 달성!</div>
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
  autoMode: boolean;
  onSetAutoMode: (v: boolean) => void;
  onNewGame: () => void;
  onLoadScenario: (type: 'godori' | 'hongdan' | 'puck') => void;
  onClose: () => void;
}> = ({
  gameMode,
  onModeChange,
  showOpponentCards,
  onToggleOpponentCards,
  showDeckTopCard,
  onToggleDeckTopCard,
  autoMode,
  onSetAutoMode,
  onNewGame,
  onLoadScenario,
  onClose,
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
        <div className="text-[11px] font-bold text-[#7A7466]">진행 방식 (자동 모드는 카드를 직접 못 누르고, 'AI 추천대로 진행' 버튼으로만 다음 수를 둡니다)</div>
        <div className="flex items-center gap-1 p-1 bg-white border border-[#E5DFCE] rounded-lg">
          <button
            type="button"
            onClick={() => onSetAutoMode(false)}
            className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              !autoMode ? 'bg-[#2B3F5C] text-white shadow-xs' : 'text-[#666] hover:text-[#111]'
            }`}
          >
            🖐️ 수동
          </button>
          <button
            type="button"
            onClick={() => onSetAutoMode(true)}
            className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              autoMode ? 'bg-[#A9791C] text-white shadow-xs' : 'text-[#666] hover:text-[#111]'
            }`}
          >
            🤖 자동
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
            💥 3장 겹친 뻑 먹기 찬스
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
    </div>
  </div>
);

export const PracticeTab: React.FC<PracticeTabProps> = ({
  onIncrementGameCount,
  onIncrementReasonCount,
}) => {
  // Game settings
  const [gameMode, setGameMode] = useState<GameMode>('matgo');
  const [showOpponentCards, setShowOpponentCards] = useState<boolean>(false);
  // 바닥패는 실제 고스톱에서도 항상 공개 정보라 항상 보여준다.
  // 대신 실전에서 미리 알 수 없는 "뒤집기 패(덱 맨 위 패)"를 보이기/안보기로 전환한다.
  const [showDeckTopCard, setShowDeckTopCard] = useState<boolean>(false);
  // 수동(직접 카드 클릭) / 자동(AI 추천패를 버튼으로 대신 진행) 모드
  const [autoMode, setAutoMode] = useState<boolean>(false);
  // 전체화면 모드 (실제 게임 클라이언트처럼 화면을 꽉 채워서 플레이)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  // 게임 화면 안의 ⚙️ 아이콘으로 여는 설정 패널 (인원/시야 옵션/자동모드/시나리오 등을 모아둠)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

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
    setPendingGoStop(null);
    setPendingScore(null);
    setGameResult(null);
    setResultModalOpen(false);
  };

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

  // ── 게임 종료 판정 ──────────────────────────────────────────────
  const endGame = useCallback(
    (winnerKey: PlayerKey | null, finalHands: Record<PlayerKey, HwatuCard[]>, finalCaptured: Record<PlayerKey, CapturedSummary>) => {
      const scores: Record<PlayerKey, ScoreBreakdown> = {
        user: calculateScore(finalCaptured.user),
        opp1: calculateScore(finalCaptured.opp1),
        opp2: calculateScore(finalCaptured.opp2),
      };

      let winner: PlayerKey | 'draw' = 'draw';
      let multiplier = 1;

      if (winnerKey) {
        winner = winnerKey;
        multiplier = 1 + goCounts[winnerKey];
      } else {
        const candidates = turnOrder.filter(k => scores[k].total >= STOP_THRESHOLD);
        if (candidates.length > 0) {
          candidates.sort((a, b) => scores[b].total - scores[a].total);
          winner = candidates[0];
          multiplier = 1 + goCounts[candidates[0]];
        }
      }

      const finalScore = winner !== 'draw' ? scores[winner].total * multiplier : 0;

      const badges: string[] = [];
      if (winner !== 'draw') {
        turnOrder.forEach(k => {
          if (k === winner) return;
          const cap = finalCaptured[k];
          const piCount = cap.pi.reduce((acc, c) => acc + (c.type === 'ssangpi' ? 2 : 1), 0);
          const totalCaptured = cap.gwang.length + cap.yeol.length + cap.tti.length + cap.pi.length;
          if (totalCaptured === 0) {
            badges.push(`${PLAYER_LABEL[k]} 멍텅구리박`);
          } else {
            if (cap.gwang.length === 0) badges.push(`${PLAYER_LABEL[k]} 광박`);
            if (piCount < 5) badges.push(`${PLAYER_LABEL[k]} 피박`);
          }
        });
      }

      setActionLog(
        winner === 'draw'
          ? '아무도 7점을 달성하지 못한 채 패가 모두 소진되어 무승부(유찰)로 종료되었습니다.'
          : `${PLAYER_LABEL[winner]}이(가) ${finalScore}점으로 게임을 승리했습니다!`
      );
      setGameResult({ winner, scores, multiplier, finalScore, badges });
      setResultModalOpen(true);
      setPendingGoStop(null);
      setPendingScore(null);
      void finalHands;
    },
    [goCounts, turnOrder]
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
  const applyPlay = useCallback(
    (playerKey: PlayerKey, card: HwatuCard) => {
      if (gameResult || pendingGoStop) return;

      playCardSnap();
      if (playerKey === 'user') onIncrementGameCount();

      const currentHand = getHand(playerKey);
      const matches = floorCards.filter(f => f.month === card.month);
      let newFloor = floorCards.filter(f => f.month !== card.month);
      let capturedThisTurn: HwatuCard[] = [];

      if (matches.length > 0) {
        capturedThisTurn = [card, ...matches];
        playCapture();
      } else {
        newFloor = [...newFloor, card];
      }

      let flippedDeckCard: HwatuCard | null = null;
      let newDeck = remainingDeck;
      if (remainingDeck.length > 0) {
        flippedDeckCard = remainingDeck[0];
        newDeck = remainingDeck.slice(1);

        const deckMatches = newFloor.filter(f => f.month === flippedDeckCard!.month);
        if (deckMatches.length > 0) {
          capturedThisTurn = [...capturedThisTurn, flippedDeckCard, ...deckMatches];
          newFloor = newFloor.filter(f => f.month !== flippedDeckCard!.month);
          setTimeout(() => playCapture(), 120);
        } else {
          newFloor = [...newFloor, flippedDeckCard];
        }
      }

      const prevCaptured = getCaptured(playerKey);
      const nextCaptured: CapturedSummary = {
        gwang: [...prevCaptured.gwang],
        yeol: [...prevCaptured.yeol],
        tti: [...prevCaptured.tti],
        pi: [...prevCaptured.pi],
      };
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

      const matchNote = matches.length > 0
        ? `${PLAYER_LABEL[playerKey]}: 바닥의 ${card.month}월(${matches.map(m => m.name).join(', ')})을 먹었습니다!`
        : `${PLAYER_LABEL[playerKey]}: 바닥에 일치하는 월이 없어 ${card.month}월을 깔았습니다.`;
      const deckNote = flippedDeckCard ? ` 뒤집은 패: [${flippedDeckCard.name}]` : '';
      setActionLog(`${matchNote}${deckNote}`);

      const scoreInfo = calculateScore(nextCaptured);
      const crossedStopLine = capturedThisTurn.length > 0 && scoreInfo.total >= STOP_THRESHOLD;

      if (crossedStopLine) {
        setPendingGoStop(playerKey);
        setPendingScore(scoreInfo);
        return;
      }

      const capturedSnapshot: Partial<Record<PlayerKey, CapturedSummary>> = { [playerKey]: nextCaptured };
      advanceTurn(playerKey, newHandAfter.length, { [playerKey]: newHandAfter }, capturedSnapshot);
    },
    [gameResult, pendingGoStop, getHand, getCaptured, floorCards, remainingDeck, advanceTurn, onIncrementGameCount]
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
    const t = setTimeout(() => resolveGoStop(pendingGoStop, choice), 1000);
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
      const captured = currentTurn === 'opp1' ? opponentCaptured : opponent2Captured;
      const { bestRecommendation } = evaluateHand(hand, floorCards, captured, userCaptured, gameMode, 'standard', [], null);
      applyPlay(currentTurn, bestRecommendation.card);
    }, 750);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurn, gameResult, pendingGoStop, opponentHand, opponentHand2, floorCards]);

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
      logNext = '시나리오 로드: [바닥 3장 뻑 먹기 찬스] 6월 3장이 바닥에 겹쳐있습니다. 쓸어담으면 피 뺏기까지 발동합니다.';
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

  // 바닥패를 위/아래 두 줄로 나눠 덱을 가운데 두고 감싸는 구도 (실제 게임 클라이언트의 대칭 배치 참고)
  const floorTop = floorCards.slice(0, Math.ceil(floorCards.length / 2));
  const floorBottom = floorCards.slice(Math.ceil(floorCards.length / 2));

  const userCapturedTotal =
    userCaptured.gwang.length + userCaptured.yeol.length + userCaptured.tti.length + userCaptured.pi.length;

  const isUserTurn = currentTurn === 'user' && !pendingGoStop && !gameResult;
  const cardsDisabled = autoMode || !isUserTurn;

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-[200] bg-[#0F1712] p-2 sm:p-3 overflow-y-auto space-y-3' : 'space-y-5 pb-10'}>
      {/* Main Playing Table Arena — 실제 게임 클라이언트 구도(코너 아바타 + 대칭 바닥패) 참고, 한 화면에 다 들어오도록 컴팩트 레이아웃.
          모든 설정은 테이블 안의 ⚙️ 설정 아이콘을 눌러 여는 패널에서 관리한다. */}
      <div
        className="bg-[#2D4536] border-4 border-[#3D2817] rounded-2xl shadow-xl text-white relative overflow-hidden flex flex-col"
        style={{
          maxHeight: isFullscreen ? 'calc(100dvh - 24px)' : 'min(82vh, 720px)',
          height: isFullscreen ? 'calc(100dvh - 24px)' : undefined,
        }}
      >
        {/* Subtle Felt Texture Vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/10 to-black/35 pointer-events-none" />

        {/* Top status strip: 이유 보기 / 설정 / 전체화면 버튼만 표시 (훈수패 요약·차례 텍스트는 좁은 화면에서 버튼과
            겹쳐 보이는 문제가 있어 제거 — 추천 근거는 '이유 보기'에서, 차례는 아래 배지 강조로 이미 알 수 있다) */}
        <div className="relative z-10 shrink-0 flex items-center justify-end gap-2 px-3.5 py-1.5 bg-black/30 border-b border-white/10 text-[11px]">
          <div className="flex items-center gap-2 shrink-0">
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
                onClick={() => { playClick(); setIsFullscreen(false); }}
                className="shrink-0 px-2.5 py-1 rounded-md bg-black/40 hover:bg-black/60 border border-white/20 text-white text-[10.5px] font-bold cursor-pointer whitespace-nowrap"
              >
                ⤢ 전체화면 종료
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { playClick(); setIsFullscreen(true); }}
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
                <PlayerBadge
                  label="상대1"
                  sub={showOpponentCards ? '패 공개' : '비공개'}
                  avatarText="1"
                  colorClass="bg-[#9C3131]"
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

            {gameMode === 'gostop3' ? (
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
                  <PlayerBadge
                    label="상대2"
                    sub={showOpponentCards ? '패 공개' : '비공개'}
                    avatarText="2"
                    colorClass="bg-[#2B5F8A]"
                    align="right"
                    active={currentTurn === 'opp2' && !gameResult}
                  />
                </div>
                <CapturedStack captured={opponent2Captured} align="right" />
              </div>
            ) : (
              <div className="flex flex-col items-end gap-0.5 bg-black/25 border border-white/10 rounded-xl px-2.5 py-1.5 text-right shrink-0">
                <span className="text-[9px] text-[#A5C7B5] whitespace-nowrap">덱 남은 패</span>
                <span className="text-[13px] font-black text-white tabular-nums">{remainingDeck.length}장</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Deck + Floor — 덱을 가운데 두고 바닥패를 위/아래로 감싸는 대칭 구도 (컴팩트 xs 카드로 스크롤 없이 표시) */}
        <div className="relative z-10 my-1.5 mx-3.5 px-3 py-1.5 bg-black/25 rounded-xl border border-white/10 flex-1 flex flex-col items-center justify-center gap-1">
          <div className="w-full flex items-center justify-between text-[10px] text-[#A5C7B5]">
            <span className="font-bold text-[#FAF6EC]">바닥패 ({floorCards.length}장)</span>
            {lastDeckCard && (
              <span className="text-[#F3D999] truncate max-w-[55%]">뒤집힘: <b className="underline">{lastDeckCard.name}</b></span>
            )}
          </div>

          {/* 위쪽 바닥패 줄 */}
          <div className="flex flex-wrap items-center justify-center gap-1 min-h-[3rem]">
            {floorTop.map(card => (
              <CardView key={card.id} card={card} size="xs" disabled={true} />
            ))}
          </div>

          {/* 가운데 덱 */}
          <div className="shrink-0 flex items-center gap-1.5">
            {showDeckTopCard && remainingDeck.length > 0 ? (
              <CardView card={remainingDeck[0]} size="xs" disabled={true} />
            ) : (
              <div className="w-8 h-12 bg-[#9C3131] border border-[#FAF6EC]/30 rounded-sm shadow flex items-center justify-center text-white text-[8px] font-bold text-center leading-tight px-0.5">
                덱{remainingDeck.length}
              </div>
            )}
            <span className="text-[9px] text-white/60 leading-tight">
              {showDeckTopCard && remainingDeck.length > 0 ? '다음 뒤집힐 패' : '뒤집기 대기'}
            </span>
          </div>

          {/* 아래쪽 바닥패 줄 */}
          <div className="flex flex-wrap items-center justify-center gap-1 min-h-[3rem]">
            {floorBottom.length > 0 ? (
              floorBottom.map(card => (
                <CardView key={card.id} card={card} size="xs" disabled={true} />
              ))
            ) : floorTop.length === 0 ? (
              <div className="text-[10.5px] text-white/60 py-1">바닥이 비었습니다 (싹쓸이 상황!)</div>
            ) : null}
          </div>
        </div>

        {/* My Area — 코너 아바타 배지 구도 (상대와 대칭) */}
        <div className="relative z-10 shrink-0 px-3.5 pb-1 space-y-1">
          <div className="flex items-end justify-between gap-2">
            <PlayerBadge
              label="나"
              sub={`획득 ${userCapturedTotal}장 · 점수 ${calculateScore(userCaptured).total}`}
              avatarText="나"
              colorClass="bg-[#2B3F5C]"
              active={currentTurn === 'user' && !gameResult}
            />
            <CapturedStack captured={userCaptured} align="right" />
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#A5C7B5]">
            <span className="font-bold text-[#E5DFCE]">내 손패 ({userHand.length}장)</span>
            <span>획득 광{userCaptured.gwang.length}·열{userCaptured.yeol.length}·띠{userCaptured.tti.length}·피{userCaptured.pi.length}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {userHand.map(card => {
              const isRecommended = card.id === bestRecommendation.card.id;
              const isSecond = secondRecommendation && card.id === secondRecommendation.card.id;
              const isSelected = selectedCardId === card.id;

              return (
                <CardView
                  key={card.id}
                  card={card}
                  size="sm"
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

        {/* Bottom bar: 핵심 승부처(이유 보기 1번 항목 내용)를 상시 표시 + 자동 진행 */}
        <div className="relative z-10 shrink-0 flex items-center justify-between gap-2 px-3.5 py-1.5 mt-1 bg-black/30 border-t border-white/10 text-[10.5px] text-[#FAF6EC]">
          <span className="truncate flex-1">
            <b className="text-[#F3D999]">💡 핵심 승부처</b> · {bestRecommendation.primaryReason}
          </span>
          {autoMode && isUserTurn && userHand.length > 0 && (
            <button
              type="button"
              onClick={() => applyPlay('user', bestRecommendation.card)}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-[#A9791C] hover:bg-[#8F6516] text-white text-[11px] font-bold cursor-pointer whitespace-nowrap animate-pulse"
            >
              🤖 AI 추천대로 진행 →
            </button>
          )}
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

      {/* 고/스톱 선택 모달 (내 차례에서 7점 이상 달성 시) */}
      {pendingGoStop === 'user' && pendingScore && (
        <GoStopModal
          score={pendingScore}
          goCount={goCounts.user}
          onGo={() => resolveGoStop('user', 'go')}
          onStop={() => resolveGoStop('user', 'stop')}
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
          autoMode={autoMode}
          onSetAutoMode={v => { playClick(); setAutoMode(v); }}
          onNewGame={() => { playClick(); generateNewSituation(gameMode); setIsSettingsOpen(false); }}
          onLoadScenario={type => { loadScenario(type); setIsSettingsOpen(false); }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};
