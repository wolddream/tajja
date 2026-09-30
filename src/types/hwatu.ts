export type CardType = 'gwang' | 'yeol' | 'tti' | 'pi' | 'ssangpi';

export type CardSubType = 
  | 'godori' 
  | 'hongdan' 
  | 'cheongdan' 
  | 'chodan' 
  | 'bi_gwang' 
  | 'gukjin';

export interface HwatuCard {
  id: string;
  month: number; // 1 ~ 12
  name: string; // e.g. "1월 송학 광"
  plant: string; // e.g. "송학", "매화", "벚꽃", ...
  type: CardType;
  subType?: CardSubType;
  scoreVal: number;
  symbol: string; // emoji or icon tag
  label: string; // "광", "열", "홍단", "청단", "초단", "피", "쌍피"
}

export type GameMode = 'matgo' | 'gostop3'; // 2인 맞고 / 3인 고스톱
export type RulePreset = 'standard' | 'basic'; // 국룰 (표준) / 기본 규칙

export interface Recommendation {
  card: HwatuCard;
  winRate: number; // e.g. 78.5
  gapToSecond: number; // e.g. +14.2%
  primaryReason: string;
  tacticalKey: string;
  riskFactor: string;
  detailedAnalysis: {
    targetMonth: number;
    matchFound: boolean;
    matchedCardName?: string;
    pointsExpected: number;
    defenseImpact: string;
    monteCarloNote: string;
  };
}

export interface PlayerState {
  id: string;
  name: string;
  hand: HwatuCard[];
  captured: {
    gwang: HwatuCard[];
    yeol: HwatuCard[];
    tti: HwatuCard[];
    pi: HwatuCard[];
  };
  score: number;
}

export interface QuizQuestion {
  id: string;
  title: string;
  scenarioDescription: string;
  mode: GameMode;
  userHand: HwatuCard[];
  floorCards: HwatuCard[];
  opponentCapturedSummary: string;
  options: {
    id: number;
    card: HwatuCard;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export interface BoardPost {
  id: string;
  author: string;
  authorBadge: string;
  title: string;
  description: string;
  mode: GameMode;
  floorCards: HwatuCard[];
  userHand: HwatuCard[];
  candidateA: HwatuCard;
  candidateB: HwatuCard;
  votesA: number;
  votesB: number;
  userVoted?: 'A' | 'B';
  createdAt: string;
  comments: {
    id: string;
    author: string;
    badge: string;
    content: string;
    createdAt: string;
  }[];
}

export interface LevelRequirement {
  level: number;
  title: string;
  badgeName: string;
  badgeIcon: string;
  gamesRequired: number;
  quizCorrectRequired: number;
  reasonsViewedRequired: number;
  boardParticipationRequired: number;
  attendanceStreakRequired: number;
}

export interface UserProfile {
  level: number;
  title: string;
  totalGames: number;
  quizCorrect: number;
  quizTotal: number;
  reasonsViewed: number;
  boardParticipation: number;
  attendanceStreak: number;
  lastLoginDate: string;
  badges: string[];
}

export interface AuthUser {
  name: string;
  email: string;
  photoUrl?: string;
  loginAt: string;
}
