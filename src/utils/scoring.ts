import { HwatuCard } from '../types/hwatu';

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

// 스톱 선언이 가능한 최소 점수 (국룰 기준 7점)
export const STOP_THRESHOLD = 7;

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
