import { UserProfile, LevelRequirement, BoardPost } from '../types/hwatu';
import { getCardById } from './hwatuData';

const STORAGE_KEY_PROFILE = 'hunsu_pae_profile_v1';
const STORAGE_KEY_POSTS = 'hunsu_pae_posts_v1';
const STORAGE_KEY_QUIZ_INDEX = 'hunsu_pae_quiz_idx_v1';

export const LEVEL_REQUIREMENTS: LevelRequirement[] = [
  {
    level: 1,
    title: '화투 초심자 (하수)',
    badgeName: '새내기 훈수패',
    badgeIcon: '🌱',
    gamesRequired: 10,
    quizCorrectRequired: 1,
    reasonsViewedRequired: 0,
    boardParticipationRequired: 0,
    attendanceStreakRequired: 0,
  },
  {
    level: 2,
    title: '동네 훈수꾼 (중수)',
    badgeName: '동네 타짜',
    badgeIcon: '🎴',
    gamesRequired: 25,
    quizCorrectRequired: 3,
    reasonsViewedRequired: 2,
    boardParticipationRequired: 0,
    attendanceStreakRequired: 0,
  },
  {
    level: 3,
    title: '종로 꾼 (고수)',
    badgeName: '수읽기 달인',
    badgeIcon: '🦅',
    gamesRequired: 50,
    quizCorrectRequired: 6,
    reasonsViewedRequired: 5,
    boardParticipationRequired: 1,
    attendanceStreakRequired: 0,
  },
  {
    level: 4,
    title: '화투의 눈 (타짜)',
    badgeName: '고도리 사냥꾼',
    badgeIcon: '👑',
    gamesRequired: 80,
    quizCorrectRequired: 10,
    reasonsViewedRequired: 8,
    boardParticipationRequired: 3,
    attendanceStreakRequired: 3,
  },
  {
    level: 5,
    title: '신의 손 (명인)',
    badgeName: '천하제일 타짜',
    badgeIcon: '✨',
    gamesRequired: 120,
    quizCorrectRequired: 15,
    reasonsViewedRequired: 12,
    boardParticipationRequired: 5,
    attendanceStreakRequired: 7,
  },
  {
    level: 6,
    title: '천하제일 훈수신 (도사)',
    badgeName: '화투의 신',
    badgeIcon: '🐉',
    gamesRequired: 200,
    quizCorrectRequired: 25,
    reasonsViewedRequired: 20,
    boardParticipationRequired: 10,
    attendanceStreakRequired: 14,
  }
];

export const INITIAL_USER_PROFILE: UserProfile = {
  level: 1,
  title: '화투 초심자 (하수)',
  totalGames: 4,
  quizCorrect: 0,
  quizTotal: 0,
  reasonsViewed: 1,
  boardParticipation: 0,
  attendanceStreak: 1,
  lastLoginDate: new Date().toISOString().split('T')[0],
  badges: ['새내기 훈수패', '첫 훈수 탐색'],
};

export const INITIAL_POSTS: BoardPost[] = [
  {
    id: 'post_1',
    author: '종로타짜박씨',
    authorBadge: '고도리 사냥꾼',
    title: '상대 초단 2장 모았을 때 5월 초단 vs 3월 광 스틸, 여러분 선택은?',
    description: '맞고 4턴째인데 상대가 4월, 7월 초단을 이미 먹었습니다. 바닥에 5월 난초 초단과 3월 벚꽃 광이 동시에 깔렸네요. 제 손에는 5월 피와 3월 피가 있습니다. 초단을 끊어야 할까요, 광을 챙겨야 할까요?',
    mode: 'matgo',
    floorCards: [
      getCardById('m5_chodan'),
      getCardById('m3_gwang'),
      getCardById('m8_pi1'),
      getCardById('m10_pi1'),
    ],
    userHand: [
      getCardById('m5_pi1'),
      getCardById('m3_pi1'),
      getCardById('m1_hongdan'),
      getCardById('m9_ssangpi'),
    ],
    candidateA: getCardById('m5_pi1'),
    candidateB: getCardById('m3_pi1'),
    votesA: 34,
    votesB: 19,
    createdAt: '10분 전',
    comments: [
      {
        id: 'c1',
        author: '화투명인',
        badge: '천하제일 타짜',
        content: '초단은 3점밖에 안 되지만, 초단을 내주면 상대가 곧바로 3점 나서 고/스톱을 선언합니다. 스톱 당하기 전에 초단을 먼저 끊어놓는 게 정석입니다.',
        createdAt: '8분 전'
      },
      {
        id: 'c2',
        author: '광박주의자',
        badge: '수읽기 달인',
        content: '저는 3월 광 먹겠습니다. 상대가 아직 피가 적어서 초단 3점 나더라도 스톱 못하고 고 할 확률이 높습니다. 광박 압박이 더 큽니다.',
        createdAt: '3분 전'
      }
    ]
  },
  {
    id: 'post_2',
    author: '고도리러버',
    authorBadge: '동네 타짜',
    title: '3인 고스톱에서 첫 턴 8월 기러기 vs 11월 오동 쌍피',
    description: '3인 고스톱 첫 턴입니다. 바닥에 8월 기러기와 11월 쌍피가 있습니다. 첫 턴부터 고도리 새를 선점하는 게 맞을까요, 아니면 알짜배기 쌍피를 먹고 피박을 방어하는 게 맞을까요?',
    mode: 'gostop3',
    floorCards: [
      getCardById('m8_godori'),
      getCardById('m11_ssangpi'),
      getCardById('m2_pi1'),
      getCardById('m6_pi1'),
    ],
    userHand: [
      getCardById('m8_pi1'),
      getCardById('m11_pi1'),
      getCardById('m4_chodan'),
    ],
    candidateA: getCardById('m8_pi1'),
    candidateB: getCardById('m11_pi1'),
    votesA: 48,
    votesB: 12,
    createdAt: '42분 전',
    comments: [
      {
        id: 'c3',
        author: '을지로타짜',
        badge: '수읽기 달인',
        content: '3인 고스톱은 3명이 경쟁해서 1장이라도 새를 놓치면 고도리가 불가능합니다. 8월 기러기 선취가 90% 이상 정답입니다.',
        createdAt: '25분 전'
      }
    ]
  }
];

export const loadUserProfile = (): UserProfile => {
  if (typeof window === 'undefined') return INITIAL_USER_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!raw) return INITIAL_USER_PROFILE;
    return JSON.parse(raw);
  } catch {
    return INITIAL_USER_PROFILE;
  }
};

export const saveUserProfile = (profile: UserProfile): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
};

export const loadBoardPosts = (): BoardPost[] => {
  if (typeof window === 'undefined') return INITIAL_POSTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POSTS);
    if (!raw) return INITIAL_POSTS;
    return JSON.parse(raw);
  } catch {
    return INITIAL_POSTS;
  }
};

export const saveBoardPosts = (posts: BoardPost[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(posts));
  } catch {
    // Ignore
  }
};

export const loadQuizIndex = (): number => {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUIZ_INDEX);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
};

export const saveQuizIndex = (idx: number): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_QUIZ_INDEX, idx.toString());
  } catch {
    // Ignore
  }
};
