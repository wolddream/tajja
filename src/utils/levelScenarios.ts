import { HwatuCard } from '../types/hwatu';
import { getCardById } from './hwatuData';

interface ScenarioCaptured {
  gwang: HwatuCard[];
  yeol: HwatuCard[];
  tti: HwatuCard[];
  pi: HwatuCard[];
}

const EMPTY: ScenarioCaptured = { gwang: [], yeol: [], tti: [], pi: [] };
const c = (id: string): HwatuCard => getCardById(id);

export interface LevelScenario {
  // 이 레벨에 도달하면(레벨업하면) 해금되는 심화학습. 1은 처음부터 누구나 플레이 가능.
  unlockLevel: number;
  id: string;
  title: string;
  // 설정 패널 목록에 쓰는 한 줄 테마.
  focus: string;
  // 레벨업 팝업·학습 목표 모달에 보여줄 설명 — 어떤 패를 내고 왜 그 결과가 나오는지 짚어준다.
  brief: string;
  userHand: HwatuCard[];
  floorCards: HwatuCard[];
  userCaptured: ScenarioCaptured;
  opponentCaptured: ScenarioCaptured;
  // 지정하면, 상대 손패/남은 덱을 채우기 전에 이 패를 덱 맨 위(가장 먼저 뒤집히는 자리)에 강제로
  // 꽂아 둔다 — 뻑/따닥처럼 "낸 패 다음에 뒤집는 패가 무엇이냐"가 상황의 핵심인 시나리오에서,
  // 그 결과가 운에 맡겨지지 않고 반드시 의도한 대로 재현되게 하기 위함이다.
  deckTopCardId?: string;
}

// 패 순서(초기 손패·바닥패 배치 + 다음 뒤집힐 덱패)를 미리 짜 둔 심화학습 5종.
// 레벨 2~6으로 올라갈 때마다 하나씩 해금되며, 각각 실전에서 자주 헷갈리는 핵심 규칙 하나를
// 반드시 재현해서 보여준다(운에 맡기지 않고 결정론적으로 발생하도록 카드 배치를 짰다).
export const LEVEL_SCENARIOS: LevelScenario[] = [
  {
    unlockLevel: 2,
    id: 'godori',
    title: '고도리 사냥',
    focus: '새 패 선점 타이밍',
    brief:
      '상대는 이미 고도리(새) 2장(2월·4월)을 확보해 8월 기러기 1장만 더 먹으면 5점(고도리 완성)이 터지는 위기입니다. ' +
      '손패의 8월 피를 내서 바닥의 8월 기러기를 먼저 가져오면, 상대의 고도리 완성을 원천 차단하면서 내 쪽 고도리 조각도 쌓입니다.',
    userHand: [c('m8_godori'), c('m3_gwang'), c('m1_pi1'), c('m7_pi1')],
    floorCards: [c('m8_pi1'), c('m3_pi1'), c('m5_pi1'), c('m10_pi1')],
    userCaptured: EMPTY,
    opponentCaptured: {
      gwang: [],
      yeol: [c('m2_godori'), c('m4_godori')],
      tti: [],
      pi: [c('m6_pi1'), c('m9_pi1')],
    },
  },
  {
    unlockLevel: 3,
    id: 'ppeok',
    title: '뻑 읽기',
    focus: '묶이는 패 미리 알아채기',
    brief:
      '바닥에 9월 패가 "국진(열끗)" 1장뿐입니다. 손의 9월 피를 내면 짝이 맞아 먹을 수 있을 것 같지만, ' +
      '바로 다음에 뒤집는 덱패도 9월이면 셋(낸 패+바닥패+덱패) 다 못 먹고 바닥에 묶이는 "뻑"이 됩니다. ' +
      '뻑이 나면 이번 턴엔 0장, 나중에 그 달의 마지막 패가 나올 때 한꺼번에 4장을 쓸어가게 됩니다 — ' +
      '지금 9월 피를 내서 그 순간을 직접 확인해보세요.',
    userHand: [c('m9_pi1'), c('m1_pi1'), c('m5_pi2'), c('m7_pi2')],
    floorCards: [c('m9_gukjin'), c('m2_pi1'), c('m6_pi2'), c('m10_pi2')],
    userCaptured: EMPTY,
    opponentCaptured: EMPTY,
    deckTopCardId: 'm9_cheongdan',
  },
  {
    unlockLevel: 4,
    id: 'ddadak',
    title: '따닥 노림수',
    focus: '한 턴에 두 번 먹고 피 뺏기',
    brief:
      '손의 5월 피를 내면 바닥의 5월 열끗을 먹습니다(손패 매칭 성공). 그런데 바로 다음에 뒤집는 덱패가 ' +
      '바닥에 남아있는 10월 피와 또 맞아떨어져, 한 턴에 두 번(손패+덱패) 먹는 "따닥"이 됩니다. ' +
      '따닥이 뜨면 상대 전원에게서 피를 1장씩 뺏어옵니다 — 지금 5월 피를 내서 확인해보세요.',
    userHand: [c('m5_pi1'), c('m1_pi1'), c('m7_pi2'), c('m12_tti')],
    floorCards: [c('m5_yeol'), c('m10_pi1'), c('m2_pi2'), c('m6_pi1')],
    userCaptured: EMPTY,
    opponentCaptured: { gwang: [], yeol: [], tti: [], pi: [c('m3_pi1')] },
    deckTopCardId: 'm10_pi2',
  },
  {
    unlockLevel: 5,
    id: 'sweep',
    title: '쓸어담기',
    focus: '한 번에 3장 이상 쓸어가기',
    brief:
      '바닥에 6월 패가 열끗·피·피 3장이나 깔려 있습니다. 손의 6월 청단을 내면 3장을 전부 가져와 ' +
      '낸 패까지 한 번에 4장을 획득하는 "쓸어담기"가 됩니다. 한 번에 3장 이상을 쓸어가면 싹쓸이와 ' +
      '마찬가지로 상대 전원에게서 피를 1장씩 뺏어옵니다.',
    userHand: [c('m6_cheongdan'), c('m1_gwang'), c('m8_pi1'), c('m12_ssangpi')],
    floorCards: [c('m6_yeol'), c('m6_pi1'), c('m6_pi2')],
    userCaptured: EMPTY,
    opponentCaptured: EMPTY,
  },
  {
    unlockLevel: 6,
    id: 'pibak',
    title: '피박 위기 역전',
    focus: '쌍피로 피박 기준선 넘기기',
    brief:
      '이미 피를 5장(5점 환산) 모았습니다. 맞고의 피박 기준은 7장 — 지금처럼 바닥에 "쌍피"(2장 몫)와 ' +
      '평범한 피가 동시에 있을 때, 평범한 11월 피 대신 쌍피를 먼저 챙기면 1턴 만에 7장 기준선을 ' +
      '넘길 수 있습니다. 쌍피처럼 2장 몫을 하는 패를 우선하는 습관이 피박을 피하는 핵심입니다.',
    userHand: [c('m11_pi2'), c('m4_pi2'), c('m3_pi2'), c('m9_pi1')],
    floorCards: [c('m11_ssangpi'), c('m4_pi1'), c('m6_pi1'), c('m12_tti')],
    userCaptured: { gwang: [], yeol: [], tti: [], pi: [c('m1_pi1'), c('m2_pi1'), c('m7_pi1'), c('m7_pi2'), c('m10_pi1')] },
    opponentCaptured: EMPTY,
  },
  {
    unlockLevel: 1,
    id: 'hongdan',
    title: '홍단 완성 찬스',
    focus: '3장 모아 단숨에 3점',
    brief:
      '이미 홍단 2장(2월·3월)을 확보한 상태에서, 손의 1월 홍단을 내 바닥의 1월 홍단을 먹으면 ' +
      '홍단 3장이 모여 그 자리에서 3점이 완성됩니다.',
    userHand: [c('m1_hongdan'), c('m11_gwang'), c('m4_pi1')],
    floorCards: [c('m1_pi1'), c('m9_pi1'), c('m6_pi1')],
    userCaptured: { gwang: [], yeol: [], tti: [c('m2_hongdan'), c('m3_hongdan')], pi: [] },
    opponentCaptured: { gwang: [], yeol: [], tti: [], pi: [c('m7_pi1')] },
  },
];
