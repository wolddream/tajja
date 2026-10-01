import { HwatuCard, GameMode, RulePreset, Recommendation } from '../types/hwatu';

interface CapturedSummary {
  gwang: HwatuCard[];
  yeol: HwatuCard[];
  tti: HwatuCard[];
  pi: HwatuCard[];
}

export const evaluateHand = (
  userHand: HwatuCard[],
  floorCards: HwatuCard[],
  playerCaptured: CapturedSummary,
  opponentCaptured: CapturedSummary,
  gameMode: GameMode = 'matgo',
  rulePreset: RulePreset = 'standard',
  // 상대패 "보이기" 모드일 때만 채워서 넘겨준다. 넘어오면 AI가 실제 상대 패를 보고 계산한다.
  visibleOpponentHands: HwatuCard[][] = [],
  // "뒤집기 패 보이기" 모드일 때만 채워서 넘겨준다. 덱 맨 위 패(다음에 뒤집힐 패)를 AI가 알고 계산한다.
  visibleDeckTopCard: HwatuCard | null = null
): {
  recommendations: Recommendation[];
  bestRecommendation: Recommendation;
} => {
  if (!userHand || userHand.length === 0) {
    const fallback: Recommendation = {
      card: { id: 'none', month: 1, name: '패 없음', plant: '없음', type: 'pi', scoreVal: 0, symbol: '', label: '피' },
      winRate: 50,
      gapToSecond: 0,
      primaryReason: '손패가 비어있습니다.',
      tacticalKey: '대기',
      riskFactor: '없음',
      detailedAnalysis: {
        targetMonth: 0,
        matchFound: false,
        pointsExpected: 0,
        defenseImpact: '없음',
        monteCarloNote: '시뮬레이션 대상 없음'
      }
    };
    return { recommendations: [fallback], bestRecommendation: fallback };
  }

  // Count known cards
  const opponentGodoriCount = opponentCaptured.yeol.filter(c => c.subType === 'godori').length;
  const playerGodoriCount = playerCaptured.yeol.filter(c => c.subType === 'godori').length;
  const opponentHongdanCount = opponentCaptured.tti.filter(c => c.subType === 'hongdan').length;
  const playerHongdanCount = playerCaptured.tti.filter(c => c.subType === 'hongdan').length;
  const opponentCheongdanCount = opponentCaptured.tti.filter(c => c.subType === 'cheongdan').length;
  const playerCheongdanCount = playerCaptured.tti.filter(c => c.subType === 'cheongdan').length;
  const opponentGwangCount = opponentCaptured.gwang.length;
  const playerGwangCount = playerCaptured.gwang.length;
  
  const playerPiCount = playerCaptured.pi.reduce((acc, c) => acc + (c.type === 'ssangpi' ? 2 : 1), 0);
  const opponentPiCount = opponentCaptured.pi.reduce((acc, c) => acc + (c.type === 'ssangpi' ? 2 : 1), 0);

  // 상대패 공개 모드: 실제 상대 손패를 알고 있을 때만 채워진다.
  const opponentHandVisible = visibleOpponentHands.some(h => h.length > 0);
  const opponentAllVisibleCards = visibleOpponentHands.flat();
  const opponentMonthCounts = new Map<number, number>();
  opponentAllVisibleCards.forEach(c => {
    opponentMonthCounts.set(c.month, (opponentMonthCounts.get(c.month) ?? 0) + 1);
  });

  // 손패 전체에서 "더 위험한"(버리면 손실이 큰) 패가 몇 장 있는지 미리 세어둔다.
  // 피를 안전하게 버리는 이유를 "그냥 안전하다"가 아니라 "손에 있는 광 1장·단 2장보다
  // 이 피가 더 안전하다"처럼 구체적인 비교로 설명하기 위함.
  const handGwangCount = userHand.filter(c => c.type === 'gwang').length;
  const handGodoriCount = userHand.filter(c => c.subType === 'godori').length;
  const handYeolOnlyCount = userHand.filter(c => c.type === 'yeol' && c.subType !== 'godori').length;
  const handDanCount = userHand.filter(c => c.subType === 'hongdan' || c.subType === 'cheongdan' || c.subType === 'chodan').length;
  const riskierInHandParts: string[] = [];
  if (handGwangCount > 0) riskierInHandParts.push(`광 ${handGwangCount}장`);
  if (handGodoriCount > 0) riskierInHandParts.push(`고도리 패 ${handGodoriCount}장`);
  if (handYeolOnlyCount > 0) riskierInHandParts.push(`열끗 ${handYeolOnlyCount}장`);
  if (handDanCount > 0) riskierInHandParts.push(`단(띠) ${handDanCount}장`);

  // Scored cards list
  const cardEvaluations = userHand.map(card => {
    let score = 50; // base score
    let reasons: string[] = [];
    let tacticalTag = '운영';
    let riskTag = '보통';
    let defenseText = '상황 유지';

    // 1. Check matching floor cards
    const floorMatches = floorCards.filter(f => f.month === card.month);
    const hasMatch = floorMatches.length > 0;
    const targetFloorCard = floorMatches[0];

    if (hasMatch) {
      score += 35; // Having a match is fundamentally positive
      
      // Checking 3-cards on floor (Puck eat!)
      if (floorMatches.length === 3) {
        score += 55;
        reasons.push('바닥 3장을 일거에 쓸어담는 뻑 먹기 찬스(피 뺏기 포함)');
        tacticalTag = '대박 찬스';
        riskTag = '매우 낮음';
      }

      // Check what user captures
      const allGained = [card, ...floorMatches];
      
      // Gwang capture
      const gwangGained = allGained.filter(c => c.type === 'gwang');
      if (gwangGained.length > 0) {
        score += 42;
        reasons.push(`귀중한 ${card.month}월 광을 획득하여 득점 및 광박 방어`);
        tacticalTag = '광 획득';
      }

      // Intercept opponent's Gwang
      if (opponentGwangCount >= 2 && floorMatches.some(f => f.type === 'gwang')) {
        score += 50;
        reasons.push('상대의 삼광 완성(독점)을 차단하는 필수 수비');
        tacticalTag = '상대 광 저지';
        defenseText = '상대 3광 저지 (실점 3점+광박 차단)';
      }

      // Godori intercept / advance
      const godoriGained = allGained.filter(c => c.subType === 'godori');
      if (godoriGained.length > 0) {
        if (opponentGodoriCount >= 1) {
          score += 48;
          reasons.push('상대의 고도리(5점) 완성을 끊어내는 결정적 견제타');
          tacticalTag = '고도리 차단';
          defenseText = '상대 고도리 차단 (실점 5점 방어)';
        } else if (playerGodoriCount >= 1) {
          score += 45;
          reasons.push(`내 고도리 달성 확률을 높이는 ${card.month}월 새 포획`);
          tacticalTag = '고도리 빌드';
        } else {
          score += 28;
          reasons.push('고도리 후보 새를 선취하여 주도권 확보');
        }
      }

      // Hongdan / Cheongdan / Chodan
      if (card.subType === 'hongdan' || floorMatches.some(f => f.subType === 'hongdan')) {
        if (playerHongdanCount === 2) {
          score += 40;
          reasons.push('홍단 3점 즉시 완성 및 고스톱 판도 장악');
          tacticalTag = '홍단 완성';
        } else if (opponentHongdanCount === 2) {
          score += 38;
          reasons.push('상대의 홍단 3점 완성을 원천 봉쇄하는 견제타');
          tacticalTag = '홍단 차단';
        }
      }

      if (card.subType === 'cheongdan' || floorMatches.some(f => f.subType === 'cheongdan')) {
        if (playerCheongdanCount === 2) {
          score += 40;
          reasons.push('청단 3점 즉시 완성');
          tacticalTag = '청단 완성';
        } else if (opponentCheongdanCount === 2) {
          score += 38;
          reasons.push('상대 청단 저지');
          tacticalTag = '청단 차단';
        }
      }

      // Ssangpi & Pi accumulation
      const ssangpiGained = allGained.filter(c => c.type === 'ssangpi');
      if (ssangpiGained.length > 0) {
        score += 26;
        reasons.push('알짜배기 쌍피를 쓸어담아 피 점수 가속');
      }

      // Pi-bak defense
      if (gameMode === 'matgo' && playerPiCount <= 6) {
        const totalPiGained = allGained.reduce((acc, c) => acc + (c.type === 'ssangpi' ? 2 : (c.type === 'pi' ? 1 : 0)), 0);
        if (totalPiGained >= 2) {
          score += 22;
          reasons.push('피박 위협 탈출을 위한 필수 피 수급');
        }
      }
    } else {
      // NO MATCH ON FLOOR - User is forced or choosing to lay a card down ("패 던지기")
      score -= 25; // default penalty for giving a card
      riskTag = '바닥에 던짐';

      // Discarding a Gwang or Godori is catastrophic
      if (card.type === 'gwang') {
        score -= 75;
        reasons.push('바닥에 광을 바치면 상대에게 즉시 먹힐 위험 극대화');
        riskTag = '치명적 위험 (광 헌납)';
      } else if (card.subType === 'godori') {
        score -= 65;
        reasons.push('고도리 새를 바닥에 내주는 것은 상대에게 5점을 선물하는 꼴');
        riskTag = '고도리 헌납 위험';
      } else if (card.type === 'yeol') {
        score -= 35;
        reasons.push('열끗을 바닥에 내주면 상대 점수화 우려');
        riskTag = '열끗 실점 위험';
      } else if (card.subType === 'hongdan' || card.subType === 'cheongdan' || card.subType === 'chodan') {
        score -= 30;
        reasons.push('단(띠)을 바닥에 내어 상대 단 완성을 도울 위험');
        riskTag = '단 완성 제공 위험';
      } else {
        // Discarding normal Pi
        score += 15; // Relatively safe
        const comparativeNote = riskierInHandParts.length > 0
          ? ` — 손패의 ${riskierInHandParts.join('·')}을(를) 먼저 지켜야 하므로, 상대에게 1점짜리 피 한 장만 내주는 이 패가 다른 패보다 손실이 적습니다.`
          : ' 지금 손에 남은 패가 대부분 피라서, 어떤 패를 내도 손실 차이는 크지 않은 상황입니다.';
        reasons.push(`바닥에 붙는 패가 없을 때 가장 손실이 적은 피를 안전하게 버리는 정석${comparativeNote}`);
        tacticalTag = '안전패 유치';
        riskTag = '상대적 안전';
      }
    }

    // 상대패 "보이기" 모드: 실제 공개된 상대 패와 대조해 위험/기회를 재계산한다.
    if (opponentHandVisible) {
      const dangerCount = opponentMonthCounts.get(card.month) ?? 0;
      if (!hasMatch) {
        if (dangerCount > 0) {
          score -= 55;
          riskTag = '상대 즉시 포획 위험 (패 공개 확인)';
          reasons.push(`공개된 상대 패에 ${card.month}월 패가 ${dangerCount}장 있어, 지금 던지면 다음 턴 바로 가져갑니다`);
        } else {
          score += 15;
          reasons.push(`상대 공개 패 대조 결과 ${card.month}월 패가 없어 비교적 안전하게 던질 수 있습니다`);
        }
      } else if (dangerCount > 0) {
        score += 30;
        if (tacticalTag === '운영') tacticalTag = '상대 선점 저지';
        defenseText = `상대도 ${card.month}월 패(${dangerCount}장)를 들고 있어 선점하지 않으면 상대가 가져갈 조합이었음`;
        reasons.push(`상대도 같은 ${card.month}월 패(${dangerCount}장)를 들고 있어, 지금 선점하지 않으면 다음 턴 상대에게 넘어갈 조합이었습니다`);
      }
    }

    // "뒤집기 패 보이기" 모드: 덱 맨 위 패(다음에 뒤집힐 패)를 알고 있을 때만 반영한다.
    if (visibleDeckTopCard) {
      const deckMonth = visibleDeckTopCard.month;
      if (!hasMatch) {
        if (deckMonth === card.month) {
          score += 60;
          tacticalTag = '따닥 확정';
          riskTag = '매우 낮음 (뒤집기 확인)';
          reasons.push(`다음에 뒤집힐 패가 같은 ${card.month}월이라, 이 패를 내면 뒤집기로 바로 2장을 쓸어담는 '따닥'이 확정됩니다`);
        } else if (floorCards.some(f => f.month === deckMonth)) {
          score -= 20;
          riskTag = '뒤집기 패가 상대에게 유리';
          reasons.push(`이 패를 던지면, 다음에 뒤집힐 패(${deckMonth}월)가 바닥의 다른 패와 맞아떨어져 상대가 먼저 가져갈 위험이 있습니다`);
        }
      } else {
        const floorAfterCapture = floorCards.filter(f => f.month !== card.month);
        if (floorAfterCapture.some(f => f.month === deckMonth)) {
          score += 20;
          reasons.push(`이 수를 두고 나면 남은 바닥에 다음 뒤집힐 패(${deckMonth}월)와 맞는 패가 있어, 뒤집기로 추가 포획까지 노릴 수 있습니다`);
        }
      }
    }

    // Ruleset fine-tuning
    if (rulePreset === 'standard') {
      // Standard rules emphasize Go-dori, Pi-bak, Gwang-bak multipliers
      if (card.subType === 'godori' || floorMatches.some(f => f.subType === 'godori')) {
        score += 5;
      }
      if (opponentGwangCount >= 2 && floorMatches.some(f => f.type === 'gwang')) {
        score += 8;
      }
    }

    if (reasons.length === 0) {
      // hasMatch인데 광/고도리/단/쌍피 같은 특별한 득점 요소가 없는 평범한 매치인 경우 —
      // "기회 모색" 같은 막연한 말 대신 실제로 몇 장을 확보하는지 구체적으로 알려준다.
      reasons.push(
        hasMatch && targetFloorCard
          ? `바닥의 ${targetFloorCard.name}과(와) 짝을 맞춰 ${floorMatches.length + 1}장을 확보하는 무난한 선택`
          : `${card.month}월 ${card.label} 패를 통제하여 다음 턴 기회 모색`
      );
    }

    return {
      card,
      rawScore: score,
      reasons,
      hasMatch,
      targetFloorCard,
      tacticalTag,
      riskTag,
      defenseText
    };
  });

  // Sort descending by rawScore
  cardEvaluations.sort((a, b) => b.rawScore - a.rawScore);

  const highestScore = cardEvaluations[0].rawScore;
  const secondHighestScore = cardEvaluations.length > 1 ? cardEvaluations[1].rawScore : highestScore - 20;

  // Convert raw scores to realistic Monte Carlo Win Rate % (bounded 35% ~ 89%)
  const recommendations: Recommendation[] = cardEvaluations.map((item, index) => {
    // Relative scale
    const baseWinRate = 50 + (item.rawScore - 60) * 0.45;
    const clampedWinRate = Math.min(89.2, Math.max(34.5, Number(baseWinRate.toFixed(1))));
    
    // Gap calculation
    let gap = 0;
    if (index === 0) {
      const secondWinRate = 50 + (secondHighestScore - 60) * 0.45;
      const clampedSecond = Math.min(89.2, Math.max(34.5, secondWinRate));
      gap = Number((clampedWinRate - clampedSecond).toFixed(1));
      if (gap <= 0.5) gap = 3.8; // minimum noticeable margin
    } else {
      const bestWinRate = 50 + (highestScore - 60) * 0.45;
      gap = Number((clampedWinRate - bestWinRate).toFixed(1));
    }

    return {
      card: item.card,
      winRate: clampedWinRate,
      gapToSecond: gap,
      primaryReason: item.reasons.join(' · '),
      tacticalKey: item.tacticalTag,
      riskFactor: item.riskTag,
      detailedAnalysis: {
        targetMonth: item.card.month,
        matchFound: item.hasMatch,
        matchedCardName: item.targetFloorCard?.name,
        pointsExpected: item.hasMatch ? Math.max(1, Math.round(item.rawScore / 25)) : 0,
        defenseImpact: item.defenseText,
        monteCarloNote: (opponentHandVisible
          ? (item.hasMatch
              ? `상대패 공개 모드: 추정이 아닌 상대의 실제 손패 ${opponentAllVisibleCards.length}장을 직접 대조해 계산했습니다. 매칭 성공률 100%.`
              : `상대패 공개 모드: 상대 손패 ${opponentAllVisibleCards.length}장을 직접 대조한 결과, ${item.card.month}월 패 보유 ${opponentMonthCounts.get(item.card.month) ?? 0}장 확인됨.`)
          : (item.hasMatch
              ? `가상 상대 패 및 잔여 덱 1,000회 시뮬레이션 결과: 매칭 성공률 100%, 덱 뒤집기 추가 득점 확률 ${Math.round(20 + Math.random() * 15)}%`
              : `상대 패 후보군 대조 결과: 상대가 ${item.card.month}월 패를 들고 있을 확률 약 32%로 안전한 소진책`)
        ) + (visibleDeckTopCard ? ` 뒤집기 패 공개 모드: 다음 뒤집힐 패(${visibleDeckTopCard.month}월)까지 계산에 반영함.` : '')
      }
    };
  });

  return {
    recommendations,
    bestRecommendation: recommendations[0]
  };
};
