import { QuizQuestion } from '../types/hwatu';
import { getCardById } from './hwatuData';

export const DEFAULT_QUIZZES: QuizQuestion[] = [
  {
    id: 'quiz_1',
    title: '상대 고도리 1장 남은 위기 상황!',
    scenarioDescription: '상대가 이미 2월 매화새와 4월 흑싸리새를 먹어서 고도리 1장(8월 기러기)만 남았습니다. 바닥에는 8월 억새와 3월 벚꽃이 깔려있습니다. 내 손패에는 8월 고도리(기러기)와 3월 벚꽃 광이 있습니다.',
    mode: 'matgo',
    userHand: [
      getCardById('m8_godori'),
      getCardById('m3_gwang'),
      getCardById('m1_pi1'),
      getCardById('m7_pi1'),
    ],
    floorCards: [
      getCardById('m8_pi1'),
      getCardById('m3_hongdan'),
      getCardById('m5_pi1'),
      getCardById('m10_pi1'),
    ],
    opponentCapturedSummary: '열끗: 2월 새, 4월 새 (고도리 2장 완료!) / 광 1장 / 피 5장',
    options: [
      {
        id: 1,
        card: getCardById('m8_godori'),
        isCorrect: true,
        explanation: '정답입니다! 고도리는 5점의 대형 점수이며, 상대가 이미 2장을 모았으므로 이번 턴에 8월 기러기를 즉시 수거하지 않으면 상대가 다음 턴에 고도리를 완성해 패배할 위험이 극대화됩니다. 내 광보다 상대 고도리 차단이 최우선입니다.'
      },
      {
        id: 2,
        card: getCardById('m3_gwang'),
        isCorrect: false,
        explanation: '오답입니다. 3월 광도 귀중하지만 상대가 다음 턴에 8월을 먹으면 즉시 5점(고도리)으로 게임을 끝낼 수 있습니다. 고스톱에서는 내 3점(광)보다 상대 5점 차단이 절대적 우선입니다.'
      },
      {
        id: 3,
        card: getCardById('m1_pi1'),
        isCorrect: false,
        explanation: '오답입니다. 바닥에 1월 패가 없으므로 1월 피를 바닥에 던지는 것은 상대에게 안전하게 턴을 넘겨주고 8월 기러기를 헌납하는 자살골입니다.'
      },
      {
        id: 4,
        card: getCardById('m7_pi1'),
        isCorrect: false,
        explanation: '오답입니다. 바닥에 7월이 없으므로 무의미하게 패를 버리는 수이며, 상대의 고도리 완성을 방치하게 됩니다.'
      }
    ]
  },
  {
    id: 'quiz_2',
    title: '바닥에 붙는 패가 전혀 없을 때, 안전패는?',
    scenarioDescription: '현재 바닥에는 2월, 4월, 6월, 10월 패가 깔려있으나 내 손에는 1월 송학 광, 3월 벚꽃 홍단, 8월 억새 피, 9월 국화 열끗이 있어 바닥과 일치하는 월이 하나도 없습니다. 어떤 패를 바닥에 내야 할까요?',
    mode: 'matgo',
    userHand: [
      getCardById('m1_gwang'),
      getCardById('m3_hongdan'),
      getCardById('m8_pi1'),
      getCardById('m9_gukjin'),
    ],
    floorCards: [
      getCardById('m2_pi1'),
      getCardById('m4_pi1'),
      getCardById('m6_pi1'),
      getCardById('m10_pi1'),
    ],
    opponentCapturedSummary: '광 0장 / 단 1장 / 피 4장',
    options: [
      {
        id: 1,
        card: getCardById('m8_pi1'),
        isCorrect: true,
        explanation: '정답입니다! 바닥에 매칭할 패가 없을 때는 상대에게 주었을 때 피해가 가장 적은 일반 피(1점 이하 가치)를 던지는 것이 철칙입니다. 광이나 열끗, 홍단 띠를 바닥에 던지는 것은 상대에게 점수를 상납하는 치명적인 실수가 됩니다.'
      },
      {
        id: 2,
        card: getCardById('m1_gwang'),
        isCorrect: false,
        explanation: '오답입니다! 광을 바닥에 그냥 던지는 것은 상대가 다음 턴에 1월 패를 내어 광을 먹게 만들 확률이 매우 높으므로 절대 금기입니다.'
      },
      {
        id: 3,
        card: getCardById('m3_hongdan'),
        isCorrect: false,
        explanation: '오답입니다! 홍단 띠를 바닥에 버리면 상대가 손쉽게 홍단을 모으는 기회를 제공하게 됩니다.'
      },
      {
        id: 4,
        card: getCardById('m9_gukjin'),
        isCorrect: false,
        explanation: '오답입니다! 9월 국진은 열끗으로도 쓰이고 쌍피로도 전환할 수 있는 귀중한 패이므로 절대 무의미하게 버려서는 안 됩니다.'
      }
    ]
  },
  {
    id: 'quiz_3',
    title: '상대 피 9장 vs 내 청단 완성 찬스',
    scenarioDescription: '상대의 피가 현재 9장(10장부터 점수 시작)입니다. 바닥에는 10월 단풍 청단과 11월 오동 쌍피가 있습니다. 내 손에는 10월 단풍피(내면 청단 3점 완성)와 11월 오동 피(내면 오동 쌍피 획득)가 있습니다. 무엇을 쳐야 할까요?',
    mode: 'matgo',
    userHand: [
      getCardById('m10_pi1'),
      getCardById('m11_pi1'),
      getCardById('m5_pi1'),
    ],
    floorCards: [
      getCardById('m10_cheongdan'),
      getCardById('m11_ssangpi'),
      getCardById('m1_pi1'),
    ],
    opponentCapturedSummary: '피 9장 (1장만 더 먹으면 피 점수 시작!) / 단 1장',
    options: [
      {
        id: 1,
        card: getCardById('m10_pi1'),
        isCorrect: true,
        explanation: '정답입니다! 10월 패를 내어 청단 3점을 즉시 완성하면 즉시 고/스톱을 선언할 수 있는 주도권을 잡게 됩니다. 상대의 피 10장 완성보다 내가 먼저 나는 것이 고스톱의 가장 빠른 승리 공식입니다.'
      },
      {
        id: 2,
        card: getCardById('m11_pi1'),
        isCorrect: false,
        explanation: '오답입니다. 11월 쌍피를 먹는 것도 좋지만, 내가 즉시 3점을 내어 스톱할 기회를 미루면 상대가 피 10장 이상을 모아 반격할 시간을 주게 됩니다.'
      },
      {
        id: 3,
        card: getCardById('m5_pi1'),
        isCorrect: false,
        explanation: '오답입니다. 바닥에 5월이 없는데 피를 버리는 것은 승기를 스스로 놓치는 잘못된 수입니다.'
      },
      {
        id: 4,
        card: getCardById('m10_cheongdan'), // dummy
        isCorrect: false,
        explanation: '오답입니다. 10월 청단은 바닥에 있는 카드입니다.'
      }
    ]
  },
  {
    id: 'quiz_4',
    title: '바닥 3장 겹침! 이른바 "뻑 먹기" 기회',
    scenarioDescription: '앞서 턴에서 뻑(Puck)이 발생하여 바닥에 6월 모란 3장이 겹쳐서 쌓여있습니다. 내 손에는 6월 모란 청단과 3월 벚꽃 광이 있습니다. 바닥에는 6월 3장과 3월 1장이 깔려 있습니다.',
    mode: 'matgo',
    userHand: [
      getCardById('m6_cheongdan'),
      getCardById('m3_gwang'),
      getCardById('m8_pi1'),
    ],
    floorCards: [
      getCardById('m6_yeol'),
      getCardById('m6_pi1'),
      getCardById('m6_pi2'),
      getCardById('m3_pi1'),
    ],
    opponentCapturedSummary: '피 6장 / 열끗 1장',
    options: [
      {
        id: 1,
        card: getCardById('m6_cheongdan'),
        isCorrect: true,
        explanation: '정답입니다! 바닥에 3장 겹친 뻑을 먹으면 바닥의 3장과 내는 1장까지 총 4장을 한꺼번에 독식하며, 국룰에 따라 상대방의 피 1장을 즉시 빼앗아 오는 강력한 혜택(피 뺏기)이 주어집니다. 3월 광 1장보다 훨씬 거대한 전황 반전 효과를 낳습니다.'
      },
      {
        id: 2,
        card: getCardById('m3_gwang'),
        isCorrect: false,
        explanation: '오답입니다. 3월 광도 좋지만 뻑 먹기는 피 4장 확보 + 상대 피 1장 강탈이라는 압도적 이득을 주므로 6월을 놓쳐서는 안 됩니다.'
      },
      {
        id: 3,
        card: getCardById('m8_pi1'),
        isCorrect: false,
        explanation: '오답입니다. 바닥에 8월이 없어 패를 버리는 수입니다.'
      },
      {
        id: 4,
        card: getCardById('m6_yeol'),
        isCorrect: false,
        explanation: '오답입니다. 6월 열끗은 바닥에 이미 깔린 패입니다.'
      }
    ]
  }
];
