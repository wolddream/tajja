import { UserProfile } from '../types/hwatu';
import { LEVEL_REQUIREMENTS } from './storage';

export interface QuestCondition {
  key: 'games' | 'quiz' | 'reason' | 'board' | 'streak';
  label: string;
  required: number;
  current: number;
  done: boolean;
}

// 다음 레벨 승급을 위한 5개 체크리스트 항목을 계산한다 (ProfileTab의 조건식과 동일).
// required가 0인 항목은 "이 레벨에서는 조건 없음(패스)"으로 이미 달성 상태이며,
// 사용자가 실제로 뭔가를 해서 달성한 게 아니므로 "퀘스트 달성" 알림 대상에서는 제외한다.
export const getNextLevelQuestConditions = (profile: UserProfile): QuestCondition[] => {
  const nextLevelReq = LEVEL_REQUIREMENTS.find(r => r.level === profile.level + 1);
  if (!nextLevelReq) return [];

  return [
    {
      key: 'games',
      label: '경기/연습 진행 횟수',
      required: nextLevelReq.gamesRequired,
      current: profile.totalGames,
      done: profile.totalGames >= nextLevelReq.gamesRequired,
    },
    {
      key: 'quiz',
      label: '오늘의 퀴즈 정답 횟수',
      required: nextLevelReq.quizCorrectRequired,
      current: profile.quizCorrect,
      done: profile.quizCorrect >= nextLevelReq.quizCorrectRequired,
    },
    {
      key: 'reason',
      label: "'이유 자세히 보기' 확인 횟수",
      required: nextLevelReq.reasonsViewedRequired,
      current: profile.reasonsViewed,
      done: profile.reasonsViewed >= nextLevelReq.reasonsViewedRequired,
    },
    {
      key: 'board',
      label: '게시판 참여 횟수',
      required: nextLevelReq.boardParticipationRequired,
      current: profile.boardParticipation,
      done: profile.boardParticipation >= nextLevelReq.boardParticipationRequired,
    },
    {
      key: 'streak',
      label: '연속 출석일수',
      required: nextLevelReq.attendanceStreakRequired,
      current: profile.attendanceStreak,
      done: profile.attendanceStreak >= nextLevelReq.attendanceStreakRequired,
    },
  ];
};
