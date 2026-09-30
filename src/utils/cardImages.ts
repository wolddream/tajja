import { HwatuCard } from '../types/hwatu';

/**
 * 실제 한국식 화투(하나후다) 48장 SVG 일러스트.
 * 출처: Wikimedia Commons, 제작자 Spenĉjo (Louie Mantia Jr.의 원작 기반), CC BY-SA 4.0.
 * https://commons.wikimedia.org/wiki/Category:SVG_Hwatu
 * 파일은 /public/cards 에 그대로 보관되어 /cards/*.svg 경로로 서빙됩니다.
 */
export const CARD_IMAGE_CREDIT =
  '카드 일러스트: Spenĉjo, Wikimedia Commons (CC BY-SA 4.0) · 원작 Louie Mantia Jr.';

const MONTH_EN = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const getCardImageSrc = (card: HwatuCard): string => {
  const m = MONTH_EN[card.month];

  if (card.type === 'gwang') return `/cards/${m}_Hikari.svg`;
  if (card.type === 'yeol') return `/cards/${m}_Tane.svg`;
  if (card.type === 'tti') return `/cards/${m}_Tanzaku.svg`;

  // pi / ssangpi (피 · 쌍피)
  if (card.month === 12) return `/cards/December_Kasu.svg`; // 12월은 쌍피 한 장뿐
  if (card.month === 9) {
    return card.type === 'ssangpi' ? `/cards/September_Kasu_2.svg` : `/cards/September_Kasu_1.svg`;
  }
  if (card.month === 11) {
    if (card.id.endsWith('pi1')) return `/cards/November_Kasu_1.svg`;
    if (card.id.endsWith('pi2')) return `/cards/November_Kasu_2.svg`;
    return `/cards/November_Kasu_3.svg`; // 쌍피
  }
  const n = card.id.endsWith('pi2') ? 2 : 1;
  return `/cards/${m}_Kasu_${n}.svg`;
};
