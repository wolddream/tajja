import { HwatuCard } from '../types/hwatu';

export const HWATU_DECK: HwatuCard[] = [
  // 1월 (송학 - 소나무)
  { id: 'm1_gwang', month: 1, name: '1월 송학 광', plant: '송학', type: 'gwang', scoreVal: 20, symbol: '☀️', label: '광' },
  { id: 'm1_hongdan', month: 1, name: '1월 송학 홍단', plant: '송학', type: 'tti', subType: 'hongdan', scoreVal: 10, symbol: '🔴', label: '홍단' },
  { id: 'm1_pi1', month: 1, name: '1월 송학 피 1', plant: '송학', type: 'pi', scoreVal: 1, symbol: '🍃', label: '피' },
  { id: 'm1_pi2', month: 1, name: '1월 송학 피 2', plant: '송학', type: 'pi', scoreVal: 1, symbol: '🍃', label: '피' },

  // 2월 (매화)
  { id: 'm2_godori', month: 2, name: '2월 매화 고도리(새)', plant: '매화', type: 'yeol', subType: 'godori', scoreVal: 15, symbol: '🐦', label: '고도리' },
  { id: 'm2_hongdan', month: 2, name: '2월 매화 홍단', plant: '매화', type: 'tti', subType: 'hongdan', scoreVal: 10, symbol: '🔴', label: '홍단' },
  { id: 'm2_pi1', month: 2, name: '2월 매화 피 1', plant: '매화', type: 'pi', scoreVal: 1, symbol: '🌸', label: '피' },
  { id: 'm2_pi2', month: 2, name: '2월 매화 피 2', plant: '매화', type: 'pi', scoreVal: 1, symbol: '🌸', label: '피' },

  // 3월 (벚꽃)
  { id: 'm3_gwang', month: 3, name: '3월 벚꽃 광', plant: '벚꽃', type: 'gwang', scoreVal: 20, symbol: '🌸', label: '광' },
  { id: 'm3_hongdan', month: 3, name: '3월 벚꽃 홍단', plant: '벚꽃', type: 'tti', subType: 'hongdan', scoreVal: 10, symbol: '🔴', label: '홍단' },
  { id: 'm3_pi1', month: 3, name: '3월 벚꽃 피 1', plant: '벚꽃', type: 'pi', scoreVal: 1, symbol: '🌸', label: '피' },
  { id: 'm3_pi2', month: 3, name: '3월 벚꽃 피 2', plant: '벚꽃', type: 'pi', scoreVal: 1, symbol: '🌸', label: '피' },

  // 4월 (흑싸리)
  { id: 'm4_godori', month: 4, name: '4월 흑싸리 고도리(새)', plant: '흑싸리', type: 'yeol', subType: 'godori', scoreVal: 15, symbol: '🐦', label: '고도리' },
  { id: 'm4_chodan', month: 4, name: '4월 흑싸리 초단', plant: '흑싸리', type: 'tti', subType: 'chodan', scoreVal: 10, symbol: '⚪', label: '초단' },
  { id: 'm4_pi1', month: 4, name: '4월 흑싸리 피 1', plant: '흑싸리', type: 'pi', scoreVal: 1, symbol: '🌿', label: '피' },
  { id: 'm4_pi2', month: 4, name: '4월 흑싸리 피 2', plant: '흑싸리', type: 'pi', scoreVal: 1, symbol: '🌿', label: '피' },

  // 5월 (난초)
  { id: 'm5_yeol', month: 5, name: '5월 난초 열끗(다리)', plant: '난초', type: 'yeol', scoreVal: 10, symbol: '🌉', label: '열끗' },
  { id: 'm5_chodan', month: 5, name: '5월 난초 초단', plant: '난초', type: 'tti', subType: 'chodan', scoreVal: 10, symbol: '⚪', label: '초단' },
  { id: 'm5_pi1', month: 5, name: '5월 난초 피 1', plant: '난초', type: 'pi', scoreVal: 1, symbol: '🌱', label: '피' },
  { id: 'm5_pi2', month: 5, name: '5월 난초 피 2', plant: '난초', type: 'pi', scoreVal: 1, symbol: '🌱', label: '피' },

  // 6월 (모란)
  { id: 'm6_yeol', month: 6, name: '6월 모란 열끗(나비)', plant: '모란', type: 'yeol', scoreVal: 10, symbol: '🦋', label: '열끗' },
  { id: 'm6_cheongdan', month: 6, name: '6월 모란 청단', plant: '모란', type: 'tti', subType: 'cheongdan', scoreVal: 10, symbol: '🔵', label: '청단' },
  { id: 'm6_pi1', month: 6, name: '6월 모란 피 1', plant: '모란', type: 'pi', scoreVal: 1, symbol: '🌺', label: '피' },
  { id: 'm6_pi2', month: 6, name: '6월 모란 피 2', plant: '모란', type: 'pi', scoreVal: 1, symbol: '🌺', label: '피' },

  // 7월 (홍싸리)
  { id: 'm7_yeol', month: 7, name: '7월 홍싸리 열끗(멧돼지)', plant: '홍싸리', type: 'yeol', scoreVal: 10, symbol: '🐗', label: '열끗' },
  { id: 'm7_chodan', month: 7, name: '7월 홍싸리 초단', plant: '홍싸리', type: 'tti', subType: 'chodan', scoreVal: 10, symbol: '⚪', label: '초단' },
  { id: 'm7_pi1', month: 7, name: '7월 홍싸리 피 1', plant: '홍싸리', type: 'pi', scoreVal: 1, symbol: '🌾', label: '피' },
  { id: 'm7_pi2', month: 7, name: '7월 홍싸리 피 2', plant: '홍싸리', type: 'pi', scoreVal: 1, symbol: '🌾', label: '피' },

  // 8월 (공포의 달 - 억새)
  { id: 'm8_gwang', month: 8, name: '8월 억새 광(달)', plant: '억새', type: 'gwang', scoreVal: 20, symbol: '🌕', label: '광' },
  { id: 'm8_godori', month: 8, name: '8월 억새 고도리(기러기)', plant: '억새', type: 'yeol', subType: 'godori', scoreVal: 15, symbol: '🐦', label: '고도리' },
  { id: 'm8_pi1', month: 8, name: '8월 억새 피 1', plant: '억새', type: 'pi', scoreVal: 1, symbol: '🌾', label: '피' },
  { id: 'm8_pi2', month: 8, name: '8월 억새 피 2', plant: '억새', type: 'pi', scoreVal: 1, symbol: '🌾', label: '피' },

  // 9월 (국화)
  { id: 'm9_gukjin', month: 9, name: '9월 국화 열끗(국진 술잔)', plant: '국화', type: 'yeol', subType: 'gukjin', scoreVal: 12, symbol: '🍶', label: '국진' },
  { id: 'm9_cheongdan', month: 9, name: '9월 국화 청단', plant: '국화', type: 'tti', subType: 'cheongdan', scoreVal: 10, symbol: '🔵', label: '청단' },
  { id: 'm9_ssangpi', month: 9, name: '9월 국화 쌍피', plant: '국화', type: 'ssangpi', scoreVal: 2, symbol: '🌼', label: '쌍피' },
  { id: 'm9_pi1', month: 9, name: '9월 국화 피 1', plant: '국화', type: 'pi', scoreVal: 1, symbol: '🌼', label: '피' },

  // 10월 (단풍)
  { id: 'm10_yeol', month: 10, name: '10월 단풍 열끗(사슴)', plant: '단풍', type: 'yeol', scoreVal: 10, symbol: '🦌', label: '열끗' },
  { id: 'm10_cheongdan', month: 10, name: '10월 단풍 청단', plant: '단풍', type: 'tti', subType: 'cheongdan', scoreVal: 10, symbol: '🔵', label: '청단' },
  { id: 'm10_pi1', month: 10, name: '10월 단풍 피 1', plant: '단풍', type: 'pi', scoreVal: 1, symbol: '🍁', label: '피' },
  { id: 'm10_pi2', month: 10, name: '10월 단풍 피 2', plant: '단풍', type: 'pi', scoreVal: 1, symbol: '🍁', label: '피' },

  // 11월 (오동)
  { id: 'm11_gwang', month: 11, name: '11월 오동 광(봉황)', plant: '오동', type: 'gwang', scoreVal: 20, symbol: '👑', label: '광' },
  { id: 'm11_ssangpi', month: 11, name: '11월 오동 쌍피', plant: '오동', type: 'ssangpi', scoreVal: 2, symbol: '🍂', label: '쌍피' },
  { id: 'm11_pi1', month: 11, name: '11월 오동 피 1', plant: '오동', type: 'pi', scoreVal: 1, symbol: '🍂', label: '피' },
  { id: 'm11_pi2', month: 11, name: '11월 오동 피 2', plant: '오동', type: 'pi', scoreVal: 1, symbol: '🍂', label: '피' },

  // 12월 (비)
  { id: 'm12_gwang', month: 12, name: '12월 비 광(비광 우산)', plant: '비', type: 'gwang', subType: 'bi_gwang', scoreVal: 15, symbol: '☔', label: '비광' },
  { id: 'm12_yeol', month: 12, name: '12월 비 열끗(제비)', plant: '비', type: 'yeol', scoreVal: 10, symbol: '🕊️', label: '열끗' },
  { id: 'm12_tti', month: 12, name: '12월 비 띠(비단)', plant: '비', type: 'tti', scoreVal: 8, symbol: '🎗️', label: '비단' },
  { id: 'm12_ssangpi', month: 12, name: '12월 비 쌍피', plant: '비', type: 'ssangpi', scoreVal: 2, symbol: '🌧️', label: '쌍피' },
];

export const getCardById = (id: string): HwatuCard => {
  const found = HWATU_DECK.find(c => c.id === id);
  if (!found) throw new Error(`Card ${id} not found`);
  return found;
};

// Shuffles deck
export const shuffleDeck = (deck: HwatuCard[] = HWATU_DECK): HwatuCard[] => {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
