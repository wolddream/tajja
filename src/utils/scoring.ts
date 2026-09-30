import { HwatuCard, GameMode } from '../types/hwatu';

interface CapturedSummary {
  gwang: HwatuCard[];
  yeol: HwatuCard[];
  tti: HwatuCard[];
  pi: HwatuCard[];
}

export interface ScoreBreakdown {
  total: number;
  gwangScore: number;
  yeolScore: number;
  ttiScore: number;
  piScore: number;
  gwangCount: number;
  piCount: number;
  godori: boolean;
  hongdan: boolean;
  cheongdan: boolean;
  chodan: boolean;
}

// 스톱 선언이 가능한 최소 점수. 맞고(2인)는 7점, 3인 고스톱은 3점부터로 서로 다르다
// (실제 국룰 기준 — 이전에는 게임 모드와 무관하게 7점으로 고정되어 있던 오류를 수정함).
export const getStopThreshold = (gameMode: GameMode): number => (gameMode === 'gostop3' ? 3 : 7);

// 피박 기준 장수(미만이면 피박). 맞고는 7장 미만, 3인 고스톱은 5장 미만
// (이전에는 게임 모드와 무관하게 5장으로 고정되어 있던 오류를 수정함).
export const getPiBakThreshold = (gameMode: GameMode): number => (gameMode === 'gostop3' ? 5 : 7);

export const calculateScore = (captured: CapturedSummary): ScoreBreakdown => {
  const gwangCount = captured.gwang.length;
  const hasRainGwang = captured.gwang.some(c => c.subType === 'bi_gwang');
  let gwangScore = 0;
  if (gwangCount === 5) gwangScore = 15;
  else if (gwangCount === 4) gwangScore = 4;
  else if (gwangCount === 3) gwangScore = hasRainGwang ? 2 : 3;

  const yeolCount = captured.yeol.length;
  const godori = captured.yeol.filter(c => c.subType === 'godori').length === 3;
  let yeolScore = yeolCount >= 5 ? yeolCount - 4 : 0;
  if (godori) yeolScore += 5;

  const ttiCount = captured.tti.length;
  const hongdan = captured.tti.filter(c => c.subType === 'hongdan').length === 3;
  const cheongdan = captured.tti.filter(c => c.subType === 'cheongdan').length === 3;
  const chodan = captured.tti.filter(c => c.subType === 'chodan').length === 3;
  let ttiScore = ttiCount >= 5 ? ttiCount - 4 : 0;
  if (hongdan) ttiScore += 3;
  if (cheongdan) ttiScore += 3;
  if (chodan) ttiScore += 3;

  const piCount = captured.pi.reduce((acc, c) => acc + (c.type === 'ssangpi' ? 2 : 1), 0);
  const piScore = piCount >= 10 ? piCount - 9 : 0;

  return {
    total: gwangScore + yeolScore + ttiScore + piScore,
    gwangScore,
    yeolScore,
    ttiScore,
    piScore,
    gwangCount,
    piCount,
    godori,
    hongdan,
    cheongdan,
    chodan,
  };
};
