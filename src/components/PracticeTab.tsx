import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HwatuCard, GameMode, RulePreset } from '../types/hwatu';
import { HWATU_DECK, shuffleDeck } from '../utils/hwatuData';
import { evaluateHand } from '../utils/engine';
import { CardView } from './CardView';
import { ReasonModal } from './ReasonModal';
import { playCardSnap, playCapture, playClick } from '../utils/sound';

interface PracticeTabProps {
  onIncrementGameCount: () => void;
  onIncrementReasonCount: () => void;
}

export const PracticeTab: React.FC<PracticeTabProps> = ({
  onIncrementGameCount,
  onIncrementReasonCount,
}) => {
  // Game settings
  const [gameMode, setGameMode] = useState<GameMode>('matgo');
  const [rulePreset, setRulePreset] = useState<RulePreset>('standard');
  const [showOpponentCards, setShowOpponentCards] = useState<boolean>(false);
  // 바닥패는 실제 고스톱에서도 항상 공개 정보라 항상 보여준다.
  // 대신 실전에서 미리 알 수 없는 "뒤집기 패(덱 맨 위 패)"를 보이기/안보기로 전환한다.
  const [showDeckTopCard, setShowDeckTopCard] = useState<boolean>(false);

  // Board State
  const [userHand, setUserHand] = useState<HwatuCard[]>([]);
  const [floorCards, setFloorCards] = useState<HwatuCard[]>([]);
  const [opponentHand, setOpponentHand] = useState<HwatuCard[]>([]);
  const [opponentHand2, setOpponentHand2] = useState<HwatuCard[]>([]);
  const [remainingDeck, setRemainingDeck] = useState<HwatuCard[]>([]);

  // Captured cards
  const [userCaptured, setUserCaptured] = useState<{
    gwang: HwatuCard[];
    yeol: HwatuCard[];
    tti: HwatuCard[];
    pi: HwatuCard[];
  }>({ gwang: [], yeol: [], tti: [], pi: [] });

  const [opponentCaptured, setOpponentCaptured] = useState<{
    gwang: HwatuCard[];
    yeol: HwatuCard[];
    tti: HwatuCard[];
    pi: HwatuCard[];
  }>({ gwang: [], yeol: [], tti: [], pi: [] });

  // Play animation / action feedback log
  const [actionLog, setActionLog] = useState<string>('원하는 패를 누르면 실제 한 수를 두고 전황을 확인할 수 있습니다.');
  const [lastDeckCard, setLastDeckCard] = useState<HwatuCard | null>(null);

  // Selected card for playing
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Reason Modal
  const [isReasonModalOpen, setIsReasonModalOpen] = useState<boolean>(false);

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

      // Pre-seed some realistic captured cards to make tactical choices deep
      const seedOppGwang = deck.find(c => c.type === 'gwang');
      const seedOppGodori = deck.find(c => c.subType === 'godori');
      const seedOppPi = deck.filter(c => c.type === 'pi').slice(0, 6);

      setUserHand(uHand);
      setOpponentHand(oHand);
      setOpponentHand2([]);
      setFloorCards(floor);
      setRemainingDeck(deck);

      setUserCaptured({
        gwang: [],
        yeol: [],
        tti: [],
        pi: deck.filter(c => c.type === 'pi').slice(6, 10),
      });

      setOpponentCaptured({
        gwang: seedOppGwang ? [seedOppGwang] : [],
        yeol: seedOppGodori ? [seedOppGodori] : [],
        tti: [],
        pi: seedOppPi,
      });
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

      setUserCaptured({ gwang: [], yeol: [], tti: [], pi: [] });
      setOpponentCaptured({ gwang: [], yeol: [], tti: [], pi: [] });
    }

    setLastDeckCard(null);
    setSelectedCardId(null);
    setActionLog('새로운 패 상황이 생성되었습니다. 추천 패와 근거를 확인하세요.');
  }, [gameMode]);

  // Initial deal
  useEffect(() => {
    generateNewSituation(gameMode);
  }, [gameMode, generateNewSituation]);

  // Run AI Recommendation Engine
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
      rulePreset,
      visibleOpponentHands,
      visibleDeckTopCard
    );
  }, [userHand, floorCards, userCaptured, opponentCaptured, gameMode, rulePreset, visibleOpponentHands, visibleDeckTopCard]);

  // Second recommendation for comparison
  const secondRecommendation = recommendations.length > 1 ? recommendations[1] : null;

  // Handle Mode Change
  const handleModeChange = (newMode: GameMode) => {
    if (newMode === gameMode) return;
    playClick();
    setGameMode(newMode);
    generateNewSituation(newMode);
  };

  // Handle Preset Change
  const handleRuleChange = (preset: RulePreset) => {
    playClick();
    setRulePreset(preset);
  };

  // Handle "이유 자세히 보기" click
  const handleOpenReason = () => {
    playClick();
    setIsReasonModalOpen(true);
    onIncrementReasonCount();
  };

  // Handle Card Play (Interactive Simulator)
  const handlePlayCard = (card: HwatuCard) => {
    playCardSnap();
    onIncrementGameCount(); // Increments practice / game count for quest!

    // Check match with floor
    const matches = floorCards.filter(f => f.month === card.month);
    let newFloor = floorCards.filter(f => f.month !== card.month);
    let capturedThisTurn: HwatuCard[] = [];

    if (matches.length > 0) {
      // Normal or multi match
      capturedThisTurn = [card, ...matches];
      playCapture();
    } else {
      // Laid down on floor
      newFloor = [...newFloor, card];
    }

    // Flip top card from deck
    let flippedDeckCard: HwatuCard | null = null;
    if (remainingDeck.length > 0) {
      flippedDeckCard = remainingDeck[0];
      setRemainingDeck(prev => prev.slice(1));
      setLastDeckCard(flippedDeckCard);

      // Check if deck card matches anything on floor
      const deckMatches = newFloor.filter(f => f.month === flippedDeckCard!.month);
      if (deckMatches.length > 0) {
        capturedThisTurn = [...capturedThisTurn, flippedDeckCard, ...deckMatches];
        newFloor = newFloor.filter(f => f.month !== flippedDeckCard!.month);
        setTimeout(() => playCapture(), 120);
      } else {
        newFloor = [...newFloor, flippedDeckCard];
      }
    }

    // Update player's captured cards
    if (capturedThisTurn.length > 0) {
      setUserCaptured(prev => {
        const next = { ...prev };
        capturedThisTurn.forEach(c => {
          if (c.type === 'gwang') next.gwang.push(c);
          else if (c.type === 'yeol') next.yeol.push(c);
          else if (c.type === 'tti') next.tti.push(c);
          else next.pi.push(c);
        });
        return next;
      });
    }

    // Remove played card from hand
    setUserHand(prev => prev.filter(c => c.id !== card.id));
    setSelectedCardId(null);
    setFloorCards(newFloor);

    // Build tactical narration
    const isBest = card.id === bestRecommendation.card.id;
    const matchNote = matches.length > 0
      ? `바닥의 ${card.month}월(${matches.map(m => m.name).join(', ')})을 먹었습니다!`
      : `바닥에 일치하는 월이 없어 ${card.month}월을 깔았습니다.`;
    const deckNote = flippedDeckCard
      ? ` 뒤집은 패: [${flippedDeckCard.name}]`
      : '';
    const ratingNote = isBest
      ? '★ 훈수패 1순위 추천수를 두었습니다!'
      : `대안 수를 두었습니다 (추천 1위: ${bestRecommendation.card.name})`;

    setActionLog(`${matchNote}${deckNote} - ${ratingNote}`);
  };

  // Preset situations for deliberate practice
  const loadScenario = (type: 'godori' | 'hongdan' | 'puck' | 'safe') => {
    playClick();
    if (type === 'godori') {
      // Opponent has 2 birds, floor has 8th month bird
      const m8bird = HWATU_DECK.find(c => c.id === 'm8_godori')!;
      const m3gwang = HWATU_DECK.find(c => c.id === 'm3_gwang')!;
      const m8floor = HWATU_DECK.find(c => c.id === 'm8_pi1')!;
      const m3floor = HWATU_DECK.find(c => c.id === 'm3_pi1')!;
      const m1pi = HWATU_DECK.find(c => c.id === 'm1_pi1')!;
      const m7pi = HWATU_DECK.find(c => c.id === 'm7_pi1')!;

      setUserHand([m8bird, m3gwang, m1pi, m7pi]);
      setFloorCards([m8floor, m3floor, HWATU_DECK.find(c => c.id === 'm5_pi1')!, HWATU_DECK.find(c => c.id === 'm10_pi1')!]);
      setOpponentCaptured({
        gwang: [],
        yeol: [HWATU_DECK.find(c => c.id === 'm2_godori')!, HWATU_DECK.find(c => c.id === 'm4_godori')!],
        tti: [],
        pi: [HWATU_DECK.find(c => c.id === 'm6_pi1')!, HWATU_DECK.find(c => c.id === 'm9_pi1')!]
      });
      setUserCaptured({ gwang: [], yeol: [], tti: [], pi: [] });
      setActionLog('시나리오 로드: [상대 고도리 위기] 상대가 새 2장을 확보했습니다. 8월 기러기 차단이 시급합니다.');
    } else if (type === 'hongdan') {
      const m1hong = HWATU_DECK.find(c => c.id === 'm1_hongdan')!;
      const m11gwang = HWATU_DECK.find(c => c.id === 'm11_gwang')!;
      const m1floor = HWATU_DECK.find(c => c.id === 'm1_pi1')!;
      setUserHand([m1hong, m11gwang, HWATU_DECK.find(c => c.id === 'm4_pi1')!]);
      setFloorCards([m1floor, HWATU_DECK.find(c => c.id === 'm9_pi1')!, HWATU_DECK.find(c => c.id === 'm6_pi1')!]);
      setUserCaptured({
        gwang: [],
        yeol: [],
        tti: [HWATU_DECK.find(c => c.id === 'm2_hongdan')!, HWATU_DECK.find(c => c.id === 'm3_hongdan')!],
        pi: []
      });
      setOpponentCaptured({ gwang: [], yeol: [], tti: [], pi: [HWATU_DECK.find(c => c.id === 'm7_pi1')!] });
      setActionLog('시나리오 로드: [홍단 완성 찬스] 내 홍단 2장 확보 상태에서 1월 홍단을 먹어 3점을 완성할 기회입니다.');
    } else if (type === 'puck') {
      const m6clean = HWATU_DECK.find(c => c.id === 'm6_cheongdan')!;
      setUserHand([m6clean, HWATU_DECK.find(c => c.id === 'm1_gwang')!, HWATU_DECK.find(c => c.id === 'm8_pi1')!]);
      setFloorCards([
        HWATU_DECK.find(c => c.id === 'm6_yeol')!,
        HWATU_DECK.find(c => c.id === 'm6_pi1')!,
        HWATU_DECK.find(c => c.id === 'm6_pi2')!,
        HWATU_DECK.find(c => c.id === 'm1_pi1')!,
      ]);
      setActionLog('시나리오 로드: [바닥 3장 뻑 먹기 찬스] 6월 3장이 바닥에 겹쳐있습니다. 쓸어담으면 피 뺏기까지 발동합니다.');
    } else {
      generateNewSituation(gameMode);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Control Header: Mode, Preset, Toggles, Random Button */}
      <div className="bg-white border border-[#DDD4C0] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mode & Rules Selection */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 1) 인원 선택 */}
          <div className="flex items-center gap-1 p-1 bg-[#FAF6EC] border border-[#E5DFCE] rounded-lg">
            <button
              type="button"
              onClick={() => handleModeChange('matgo')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                gameMode === 'matgo'
                  ? 'bg-[#2B3F5C] text-white shadow-xs'
                  : 'text-[#666] hover:text-[#111]'
              }`}
            >
              맞고 (2인)
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('gostop3')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                gameMode === 'gostop3'
                  ? 'bg-[#2B3F5C] text-white shadow-xs'
                  : 'text-[#666] hover:text-[#111]'
              }`}
            >
              3인 고스톱
            </button>
          </div>

          {/* Rules Preset Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[#FAF6EC] border border-[#E5DFCE] rounded-lg text-xs">
            <button
              type="button"
              onClick={() => handleRuleChange('standard')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                rulePreset === 'standard'
                  ? 'bg-[#A9791C] text-white shadow-xs'
                  : 'text-[#666] hover:text-[#111]'
              }`}
            >
              국룰 (표준)
            </button>
            <button
              type="button"
              onClick={() => handleRuleChange('basic')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                rulePreset === 'basic'
                  ? 'bg-[#A9791C] text-white shadow-xs'
                  : 'text-[#666] hover:text-[#111]'
              }`}
            >
              기본 규칙
            </button>
          </div>
        </div>

        {/* Right: Visibility Toggles & Random Situation Button */}
        <div className="flex flex-wrap items-center gap-2 relative">
          {/* Show/Hide Opponent Hands Toggle */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => {
                playClick();
                setShowOpponentCards(prev => !prev);
              }}
              title="'보이기'로 설정하면, 보이는 패를 반영하여 AI가 낼 패를 선정합니다."
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                showOpponentCards
                  ? 'bg-[#3B6255] text-white border-[#3B6255]'
                  : 'bg-white text-[#555] border-[#DDD4C0] hover:border-[#3B6255]'
              }`}
            >
              <span>상대패:</span>
              <span>{showOpponentCards ? '보이기' : '안보기(실전)'}</span>
            </button>
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-30 w-56 px-2.5 py-1.5 rounded-md bg-[#1F1F1F] text-white text-[10.5px] leading-snug text-center opacity-0 group-hover:opacity-100 transition-opacity">
              보기 설정 시, 보이는 패를 반영하여 낼 패를 선정합니다.
            </div>
          </div>

          {/* Show/Hide Deck Top (뒤집기 패) Toggle */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => {
                playClick();
                setShowDeckTopCard(prev => !prev);
              }}
              title="'보이기'로 설정하면, 보이는 패를 반영하여 AI가 낼 패를 선정합니다."
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                showDeckTopCard
                  ? 'bg-[#3B6255] text-white border-[#3B6255]'
                  : 'bg-white text-[#555] border-[#DDD4C0] hover:border-[#3B6255]'
              }`}
            >
              <span>뒤집기 패:</span>
              <span>{showDeckTopCard ? '보이기' : '안보기(실전)'}</span>
            </button>
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-30 w-56 px-2.5 py-1.5 rounded-md bg-[#1F1F1F] text-white text-[10.5px] leading-snug text-center opacity-0 group-hover:opacity-100 transition-opacity">
              보기 설정 시, 보이는 패를 반영하여 낼 패를 선정합니다.
            </div>
          </div>

          {/* 설정을 바꾸는 순간에도 같은 안내를 눈에 띄게 보여준다 */}
          {(showOpponentCards || showDeckTopCard) && (
            <span className="text-[11px] font-medium text-[#3B6255] bg-[#3B6255]/10 border border-[#3B6255]/30 px-2.5 py-1 rounded-full whitespace-nowrap">
              💡 보기 설정 시, 보이는 패를 반영하여 낼 패를 선정합니다
            </span>
          )}

          {/* "패 랜덤 변경" button */}
          <button
            type="button"
            onClick={() => {
              playClick();
              generateNewSituation(gameMode);
            }}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#A9791C] hover:bg-[#8F6516] text-white shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <span>🔄 패 랜덤 변경</span>
          </button>
        </div>
      </div>

      {/* Quick Scenario Preset Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-[#7A7466]">
        <span className="shrink-0 font-medium">실전 특수 상황:</span>
        <button
          type="button"
          onClick={() => loadScenario('godori')}
          className="px-2.5 py-1 rounded-md bg-white border border-[#DDD4C0] hover:border-[#A9791C] text-[#222] whitespace-nowrap transition-colors cursor-pointer"
        >
          🐦 상대 고도리 위기 차단
        </button>
        <button
          type="button"
          onClick={() => loadScenario('hongdan')}
          className="px-2.5 py-1 rounded-md bg-white border border-[#DDD4C0] hover:border-[#A9791C] text-[#222] whitespace-nowrap transition-colors cursor-pointer"
        >
          🔴 내 홍단 3점 완성
        </button>
        <button
          type="button"
          onClick={() => loadScenario('puck')}
          className="px-2.5 py-1 rounded-md bg-white border border-[#DDD4C0] hover:border-[#A9791C] text-[#222] whitespace-nowrap transition-colors cursor-pointer"
        >
          💥 3장 겹친 뻑 먹기 찬스
        </button>
      </div>

      {/* Main Playing Table Arena */}
      <div className="bg-[#2D4536] border-4 border-[#3D2817] rounded-2xl p-5 shadow-xl text-white space-y-6 relative overflow-hidden">
        {/* Subtle Felt Texture Vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/10 to-black/35 pointer-events-none" />

        {/* Top: Opponent Area */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#E5DFCE]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#F4EEDC]">
                {gameMode === 'matgo' ? '상대 타짜 (2인)' : '상대 1 & 2 (3인)'}
              </span>
              <span>·</span>
              <span>
                {showOpponentCards ? '공개 모드 (AI 훈수에 실제 반영됨)' : '비공개 모드 (실전 불완전정보)'}
              </span>
            </div>
            <div className="text-[11px] text-[#A5C7B5]">
              먹은 패: 광 {opponentCaptured.gwang.length}장 · 열 {opponentCaptured.yeol.length}장 · 띠 {opponentCaptured.tti.length}장 · 피 {opponentCaptured.pi.length}장
            </div>
          </div>

          {/* Opponent Captured Pile (먹은 패 실제 카드) */}
          {(opponentCaptured.gwang.length + opponentCaptured.yeol.length + opponentCaptured.tti.length + opponentCaptured.pi.length) > 0 && (
            <div className="flex flex-wrap items-center gap-1 p-2 bg-black/15 rounded-lg">
              {[...opponentCaptured.gwang, ...opponentCaptured.yeol, ...opponentCaptured.tti, ...opponentCaptured.pi].map((card, idx) => (
                <CardView key={`opp-cap-${card.id}-${idx}`} card={card} size="xs" disabled={true} hideInfo={true} />
              ))}
            </div>
          )}

          {/* Opponent Card Stack */}
          <div className="flex flex-wrap items-center gap-2 min-h-16">
            {opponentHand.length > 0 ? (
              opponentHand.map((card, idx) => (
                <CardView
                  key={card.id + idx}
                  card={card}
                  size="sm"
                  isHidden={!showOpponentCards}
                  disabled={true}
                />
              ))
            ) : (
              <div className="text-xs text-white/60 py-3">패를 모두 소진했습니다.</div>
            )}
          </div>
        </div>

        {/* Center: The Floor (바닥패) & Deck Pile */}
        <div className="relative z-10 py-3 px-4 bg-black/25 rounded-xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#E5DFCE]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#FAF6EC]">바닥에 깔린 패 (바닥패)</span>
              <span>({floorCards.length}장)</span>
            </div>
            {lastDeckCard && (
              <div className="text-[11px] text-[#F3D999] flex items-center gap-1.5">
                <span>방금 덱에서 뒤집힌 패:</span>
                <span className="font-bold underline">{lastDeckCard.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 overflow-x-auto py-1">
            {/* Draw Deck Stack Visual */}
            <div className="shrink-0 flex flex-col items-center">
              {showDeckTopCard && remainingDeck.length > 0 ? (
                <CardView card={remainingDeck[0]} size="sm" disabled={true} />
              ) : (
                <div className="w-13 h-20 bg-[#9C3131] border border-[#FAF6EC]/30 rounded-md shadow flex items-center justify-center text-white text-[10px] font-bold">
                  덱 {remainingDeck.length}장
                </div>
              )}
              <span className="text-[10px] text-white/60 mt-1">
                {showDeckTopCard && remainingDeck.length > 0 ? `다음 뒤집힐 패 (${remainingDeck.length}장 남음)` : '뒤집기 대기'}
              </span>
            </div>

            {/* Floor Cards Grid (바닥패는 실제 고스톱처럼 항상 공개) */}
            <div className="flex-1 flex flex-wrap items-center gap-2 min-h-20">
              {floorCards.length > 0 ? (
                floorCards.map(card => (
                  <CardView key={card.id} card={card} size="sm" disabled={true} />
                ))
              ) : (
                <div className="text-xs text-white/60 py-3">바닥이 비었습니다 (싹쓸이 상황!)</div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Player's Hand (내 손패) */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#E5DFCE]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#F4EEDC]">내 손패 ({userHand.length}장)</span>
              <span className="text-[11px] text-[#F3D999]">
                * 카드를 클릭하면 실제로 한 수를 두어 전황을 시뮬레이션합니다.
              </span>
            </div>
            <div className="text-[11px] text-[#A5C7B5]">
              내 획득: 광 {userCaptured.gwang.length}장 · 열 {userCaptured.yeol.length}장 · 띠 {userCaptured.tti.length}장 · 피 {userCaptured.pi.length}장
            </div>
          </div>

          {/* My Captured Pile (내 먹은 패 실제 카드) */}
          {(userCaptured.gwang.length + userCaptured.yeol.length + userCaptured.tti.length + userCaptured.pi.length) > 0 && (
            <div className="flex flex-wrap items-center gap-1 p-2 bg-black/15 rounded-lg">
              {[...userCaptured.gwang, ...userCaptured.yeol, ...userCaptured.tti, ...userCaptured.pi].map((card, idx) => (
                <CardView key={`my-cap-${card.id}-${idx}`} card={card} size="xs" disabled={true} hideInfo={true} />
              ))}
            </div>
          )}

          {/* Cards in Hand */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {userHand.map((card, idx) => {
              const isRecommended = card.id === bestRecommendation.card.id;
              const isSecond = secondRecommendation && card.id === secondRecommendation.card.id;
              const isSelected = selectedCardId === card.id;

              return (
                <div key={card.id} className="relative group">
                  <CardView
                    card={card}
                    size="md"
                    isRecommended={isRecommended}
                    recommendationRank={isRecommended ? 1 : (isSecond ? 2 : undefined)}
                    isSelected={isSelected}
                    onClick={() => {
                      setSelectedCardId(card.id);
                      handlePlayCard(card);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Action Feedback Narration */}
        <div className="relative z-10 px-3.5 py-2 rounded-lg bg-black/30 border border-white/10 text-xs text-[#FAF6EC] flex items-center justify-between">
          <span className="truncate">{actionLog}</span>
          <span className="text-[11px] text-[#A5C7B5] shrink-0 ml-2">
            누적 대국 연습 반영 중
          </span>
        </div>
      </div>

      {/* AI Recommendation Outcome Panel */}
      <div className="bg-white border border-[#DDD4C0] rounded-xl p-5 shadow-xs space-y-4">
        {/* Panel Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#E5DFCE] pb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A9791C]" />
            <h2 className="font-bold text-base text-[#1F1F1F]">
              훈수패 수읽기 결과 (실시간 추천 분석)
            </h2>
            <span className="text-xs text-[#7A7466]">
              몬테카를로 기대 승률 분석
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenReason}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#2B3F5C] hover:bg-[#1E2E44] text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>🔍 이유 자세히 보기</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white">퀘스트</span>
          </button>
        </div>

        {/* Highlighted Recommendation Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Col 1: Recommended Card Visual & Tag */}
          <div className="flex items-center gap-4 p-3 bg-[#FAF6EC] rounded-xl border border-[#E5DFCE]">
            <CardView card={bestRecommendation.card} size="md" isRecommended={true} />
            <div className="space-y-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#A9791C] text-white">
                ★ 1순위 추천
              </span>
              <div className="font-bold text-sm text-[#1F1F1F]">
                {bestRecommendation.card.name}
              </div>
              <div className="text-xs text-[#7A7466]">
                전술: {bestRecommendation.tacticalKey}
              </div>
            </div>
          </div>

          {/* Col 2: Probability & Superiority Metrics */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF6EC] rounded-xl border border-[#E5DFCE] text-center">
            <div>
              <div className="text-xs text-[#7A7466] mb-0.5">기대 승률</div>
              <div className="text-2xl font-black text-[#9C3131] tabular-nums font-mono">
                {bestRecommendation.winRate}%
              </div>
              <div className="text-[10px] text-[#7A7466]">가상 1,000국 시뮬</div>
            </div>
            <div>
              <div className="text-xs text-[#7A7466] mb-0.5">2위 대비 우위</div>
              <div className="text-2xl font-black text-[#3B6255] tabular-nums font-mono">
                +{bestRecommendation.gapToSecond}%p
              </div>
              <div className="text-[10px] text-[#7A7466]">안전도 & 득점차</div>
            </div>
          </div>

          {/* Col 3: Primary Tactical Rationale */}
          <div className="p-3 bg-[#FAF6EC] rounded-xl border border-[#E5DFCE] flex flex-col justify-center">
            <div className="text-xs font-bold text-[#A9791C] mb-1">
              핵심 수읽기 근거
            </div>
            <p className="text-xs leading-relaxed text-[#2F2F2F] line-clamp-3">
              {bestRecommendation.primaryReason}
            </p>
          </div>
        </div>

        {/* Ranking List of Other Cards in Hand */}
        {recommendations.length > 1 && (
          <div className="border-t border-[#E5DFCE] pt-3">
            <div className="text-xs font-semibold text-[#7A7466] mb-2">
              손패 전체 순위 및 승률 비교:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {recommendations.slice(0, 4).map((rec, index) => (
                <div
                  key={rec.card.id}
                  className={`p-2 rounded-lg border flex items-center justify-between ${
                    index === 0
                      ? 'bg-[#FAF6EC] border-[#A9791C] font-semibold text-[#A9791C]'
                      : 'bg-white border-[#E5DFCE] text-[#555]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold">{index + 1}위</span>
                    <span className="truncate">{rec.card.name}</span>
                  </div>
                  <span className="font-mono tabular-nums text-xs ml-1 shrink-0">
                    {rec.winRate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reason Detail Modal */}
      <ReasonModal
        isOpen={isReasonModalOpen}
        onClose={() => setIsReasonModalOpen(false)}
        recommendation={bestRecommendation}
        secondRecommendation={secondRecommendation}
        opponentVisible={showOpponentCards}
      />
    </div>
  );
};
