import React, { useState } from 'react';
import { UserProfile, AuthUser } from '../types/hwatu';
import { LEVEL_REQUIREMENTS, isAdminEmail } from '../utils/storage';
import { isSoundEnabled, setSoundEnabled, playSuccess, playClick } from '../utils/sound';
import { CARD_IMAGE_CREDIT } from '../utils/cardImages';

interface ProfileTabProps {
  userProfile: UserProfile;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onLevelUp: () => void;
  onResetData: () => void;
  onUpdateSound: (enabled: boolean) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  userProfile,
  currentUser,
  onLogout,
  onLevelUp,
  onResetData,
  onUpdateSound,
}) => {
  const [soundActive, setSoundActive] = useState(isSoundEnabled());
  const [levelUpSuccessMsg, setLevelUpSuccessMsg] = useState<string | null>(null);

  const currentLevelReq = LEVEL_REQUIREMENTS.find(r => r.level === userProfile.level) || LEVEL_REQUIREMENTS[0];
  const nextLevelReq = LEVEL_REQUIREMENTS.find(r => r.level === userProfile.level + 1);

  // Check conditions for level up
  const isMaxLevel = !nextLevelReq;

  // Criteria checks for next level
  const gamesDone = userProfile.totalGames >= (nextLevelReq?.gamesRequired || 0);
  const quizDone = userProfile.quizCorrect >= (nextLevelReq?.quizCorrectRequired || 0);
  const reasonDone = (nextLevelReq?.reasonsViewedRequired || 0) === 0 || userProfile.reasonsViewed >= (nextLevelReq?.reasonsViewedRequired || 0);
  const boardDone = (nextLevelReq?.boardParticipationRequired || 0) === 0 || userProfile.boardParticipation >= (nextLevelReq?.boardParticipationRequired || 0);
  const streakDone = (nextLevelReq?.attendanceStreakRequired || 0) === 0 || userProfile.attendanceStreak >= (nextLevelReq?.attendanceStreakRequired || 0);

  const allConditionsMet = !isMaxLevel && gamesDone && quizDone && reasonDone && boardDone && streakDone;

  // Calculate experience progress percentage (based on game count)
  const prevReqGames = currentLevelReq.gamesRequired;
  const targetReqGames = nextLevelReq ? nextLevelReq.gamesRequired : prevReqGames;
  const gameProgressPct = isMaxLevel
    ? 100
    : Math.min(100, Math.max(0, Math.round((userProfile.totalGames / targetReqGames) * 100)));

  // Quiz correct rate
  const quizRate = userProfile.quizTotal > 0
    ? Math.round((userProfile.quizCorrect / userProfile.quizTotal) * 100)
    : 0;

  // Badges catalog — b3·b4는 레벨3("수읽기 달인")·레벨4("고도리 사냥꾼")와 이름이 같은 배지인데,
  // 과거에는 그 레벨의 실제 요구 수치가 아니라 다른 레벨의 수치가 하드코딩돼 있어 이름이 암시하는
  // 난이도보다 훨씬 쉽게 풀리는 불일치가 있었다(예: b4가 "고도리 사냥꾼"인데 레벨4 요구치 80회가
  // 아니라 레벨2 요구치 25회만 넘으면 잠금 해제됨). LEVEL_REQUIREMENTS에서 직접 가져와 앞으로도
  // 레벨 조건이 바뀌면 배지 조건도 함께 따라가도록 고쳤다.
  const level3Req = LEVEL_REQUIREMENTS.find(r => r.level === 3)!;
  const level4Req = LEVEL_REQUIREMENTS.find(r => r.level === 4)!;
  const ALL_BADGES = [
    { id: 'b1', name: '새내기 훈수패', icon: '🌱', desc: '훈수패 앱에 첫 발을 내딛음', unlocked: true },
    { id: 'b2', name: '첫 훈수 탐색', icon: '🔍', desc: '이유 자세히 보기를 1회 이상 확인', unlocked: userProfile.reasonsViewed >= 1 },
    { id: 'b3', name: '수읽기 달인', icon: '🦅', desc: `오늘의 퀴즈 ${level3Req.quizCorrectRequired}회 이상 정답`, unlocked: userProfile.quizCorrect >= level3Req.quizCorrectRequired },
    { id: 'b4', name: '고도리 사냥꾼', icon: '🐦', desc: `연습 경기 ${level4Req.gamesRequired}회 이상 진행`, unlocked: userProfile.totalGames >= level4Req.gamesRequired },
    { id: 'b5', name: '커뮤니티 타짜', icon: '✍️', desc: '게시판 토론에 3회 이상 참여', unlocked: userProfile.boardParticipation >= 3 },
    { id: 'b6', name: '출석의 신', icon: '🔥', desc: '연속 3일 이상 출석 달성', unlocked: userProfile.attendanceStreak >= 3 },
    { id: 'b7', name: '천하제일 타짜', icon: '✨', desc: '레벨 5(명인) 도달', unlocked: userProfile.level >= 5 },
    { id: 'b8', name: '화투의 신', icon: '🐉', desc: '최고 등급 레벨 6 달성', unlocked: userProfile.level >= 6 },
  ];

  const handleLevelUpClick = () => {
    if (!allConditionsMet) return;
    playSuccess();
    onLevelUp();
    setLevelUpSuccessMsg(`축하합니다! [${nextLevelReq?.title}] 등급으로 승급하였습니다!`);
    setTimeout(() => setLevelUpSuccessMsg(null), 5000);
  };

  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    onUpdateSound(next);
    if (next) playClick();
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Level Up Celebration Toast */}
      {levelUpSuccessMsg && (
        <div className="p-4 rounded-xl bg-[#3B6255] text-white flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div className="font-bold text-sm">{levelUpSuccessMsg}</div>
          </div>
          <button
            type="button"
            onClick={() => setLevelUpSuccessMsg(null)}
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1) User Profile Header Card */}
      <div className="bg-white border border-[#DDD4C0] rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FAF6EC] to-[#E5DFCE] border-2 border-[#A9791C] flex items-center justify-center text-3xl shadow-xs">
            {currentLevelReq.badgeIcon}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#A9791C] text-white">
                Lv.{userProfile.level}
              </span>
              <span className="font-bold text-base text-[#1F1F1F]">
                {currentLevelReq.title}
              </span>
            </div>
            <div className="text-xs text-[#7A7466] flex items-center gap-2">
              <span>칭호: {currentLevelReq.badgeName}</span>
              <span>·</span>
              <span>연속 출석 {userProfile.attendanceStreak}일차</span>
            </div>
          </div>
        </div>

        {/* Level Up Status Badge */}
        <div>
          {isMaxLevel ? (
            <span className="px-3.5 py-1.5 rounded-xl bg-[#2B3F5C] text-white text-xs font-bold">
              👑 최고 등급 달성
            </span>
          ) : allConditionsMet ? (
            <button
              type="button"
              onClick={handleLevelUpClick}
              className="px-5 py-2.5 rounded-xl bg-[#A9791C] hover:bg-[#8F6516] text-white text-xs font-black shadow-md animate-bounce cursor-pointer flex items-center gap-1.5"
            >
              <span>🎉 승급 확정하기! (클릭)</span>
            </button>
          ) : (
            <span className="px-3.5 py-1.5 rounded-xl bg-[#FAF6EC] border border-[#DDD4C0] text-[#7A7466] text-xs font-medium">
              승급 조건 심사 중
            </span>
          )}
        </div>
      </div>

      {/* 2) Level-Up Quest Checklist (핵심 요구사항) */}
      <div className="bg-white border border-[#DDD4C0] rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#E5DFCE] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A9791C]" />
              <h3 className="font-bold text-base text-[#1F1F1F]">
                레벨업 승급 퀘스트 체크리스트
              </h3>
            </div>
            <p className="text-xs text-[#7A7466] mt-0.5">
              경험치 게이지(경기 진행)가 가득 차도, 아래 필수 승급 조건을 <strong>모두 달성해야만</strong> 실제 레벨업이 확정됩니다.
            </p>
          </div>
          {nextLevelReq && (
            <span className="text-xs font-bold text-[#A9791C] px-2.5 py-1 rounded bg-[#FAF6EC] border border-[#E5DFCE]">
              다음 등급: Lv.{nextLevelReq.level} {nextLevelReq.title}
            </span>
          )}
        </div>

        {/* Experience Gauge (경기 진행 횟수) */}
        <div className="space-y-1.5 p-4 rounded-xl bg-[#FAF6EC] border border-[#E5DFCE]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#1F1F1F]">
              경험치 게이지 (경기/연습 진행 횟수)
            </span>
            <span className="font-mono tabular-nums text-[#A9791C] font-bold">
              {userProfile.totalGames} / {nextLevelReq ? nextLevelReq.gamesRequired : currentLevelReq.gamesRequired} 회 ({gameProgressPct}%)
            </span>
          </div>
          <div className="w-full bg-[#E5DFCE] h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#A9791C] to-[#C9993C] h-full transition-all duration-300"
              style={{ width: `${gameProgressPct}%` }}
            />
          </div>
          <div className="text-[11px] text-[#7A7466]">
            * 연습 화면에서 패를 내거나 대국을 진행할 때마다 경험치가 누적됩니다.
          </div>
        </div>

        {/* Requirements Checklist */}
        {nextLevelReq ? (
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#1F1F1F] flex items-center justify-between">
              <span>승급 필수 조건 목록 (모두 충족 필요)</span>
              <span className="text-[11px] text-[#7A7466]">
                조건 충족: {[gamesDone, quizDone, reasonDone, boardDone, streakDone].filter(Boolean).length} / 5
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Condition 1: Total Games */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  gamesDone
                    ? 'bg-[#3B6255]/5 border-[#3B6255]/40 text-[#3B6255]'
                    : 'bg-white border-[#DDD4C0] text-[#555]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>{gamesDone ? '✅' : '⚪'}</span>
                    <span>경기/연습 진행 횟수</span>
                  </div>
                  <div className="text-[11px] text-[#7A7466]">
                    목표: {nextLevelReq.gamesRequired}회 이상 (현재: {userProfile.totalGames}회)
                  </div>
                </div>
                <span className="text-xs font-bold">
                  {gamesDone ? '달성' : `${userProfile.totalGames}/${nextLevelReq.gamesRequired}`}
                </span>
              </div>

              {/* Condition 2: Quiz Correct */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  quizDone
                    ? 'bg-[#3B6255]/5 border-[#3B6255]/40 text-[#3B6255]'
                    : 'bg-white border-[#DDD4C0] text-[#555]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>{quizDone ? '✅' : '⚪'}</span>
                    <span>오늘의 퀴즈 정답 횟수</span>
                  </div>
                  <div className="text-[11px] text-[#7A7466]">
                    목표: {nextLevelReq.quizCorrectRequired}회 이상 (현재: {userProfile.quizCorrect}회)
                  </div>
                </div>
                <span className="text-xs font-bold">
                  {quizDone ? '달성' : `${userProfile.quizCorrect}/${nextLevelReq.quizCorrectRequired}`}
                </span>
              </div>

              {/* Condition 3: Reasons Viewed */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  reasonDone
                    ? 'bg-[#3B6255]/5 border-[#3B6255]/40 text-[#3B6255]'
                    : 'bg-white border-[#DDD4C0] text-[#555]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>{reasonDone ? '✅' : '⚪'}</span>
                    <span>'이유 자세히 보기' 확인 횟수</span>
                  </div>
                  <div className="text-[11px] text-[#7A7466]">
                    목표: {nextLevelReq.reasonsViewedRequired}회 이상 (현재: {userProfile.reasonsViewed}회)
                  </div>
                </div>
                <span className="text-xs font-bold">
                  {reasonDone ? '달성' : `${userProfile.reasonsViewed}/${nextLevelReq.reasonsViewedRequired}`}
                </span>
              </div>

              {/* Condition 4: Board Participation (for higher levels) */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  boardDone
                    ? 'bg-[#3B6255]/5 border-[#3B6255]/40 text-[#3B6255]'
                    : 'bg-white border-[#DDD4C0] text-[#555]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>{boardDone ? '✅' : '⚪'}</span>
                    <span>게시판 참여 횟수 (글/투표/댓글)</span>
                  </div>
                  <div className="text-[11px] text-[#7A7466]">
                    {nextLevelReq.boardParticipationRequired > 0
                      ? `목표: ${nextLevelReq.boardParticipationRequired}회 이상 (현재: ${userProfile.boardParticipation}회)`
                      : '이 레벨에서는 조건 없음 (패스)'}
                  </div>
                </div>
                <span className="text-xs font-bold">
                  {boardDone ? '달성' : `${userProfile.boardParticipation}/${nextLevelReq.boardParticipationRequired}`}
                </span>
              </div>

              {/* Condition 5: Attendance Streak (for high levels) */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between md:col-span-2 ${
                  streakDone
                    ? 'bg-[#3B6255]/5 border-[#3B6255]/40 text-[#3B6255]'
                    : 'bg-white border-[#DDD4C0] text-[#555]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>{streakDone ? '✅' : '⚪'}</span>
                    <span>연속 출석일수 (스트릭)</span>
                  </div>
                  <div className="text-[11px] text-[#7A7466]">
                    {nextLevelReq.attendanceStreakRequired > 0
                      ? `목표: 연속 ${nextLevelReq.attendanceStreakRequired}일 이상 (현재: ${userProfile.attendanceStreak}일)`
                      : '이 레벨에서는 조건 없음 (패스)'}
                  </div>
                </div>
                <span className="text-xs font-bold">
                  {streakDone ? '달성' : `${userProfile.attendanceStreak}/${nextLevelReq.attendanceStreakRequired}일`}
                </span>
              </div>
            </div>

            {/* Level Up CTA Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleLevelUpClick}
                disabled={!allConditionsMet}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-2 ${
                  allConditionsMet
                    ? 'bg-[#A9791C] hover:bg-[#8F6516] text-white cursor-pointer ring-2 ring-[#A9791C]/50'
                    : 'bg-[#E5DFCE] text-[#888] cursor-not-allowed'
                }`}
              >
                <span>{allConditionsMet ? '🎉 모든 조건 충족! 지금 승급 확정하기' : '모든 조건을 달성해야 승급할 수 있습니다'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#FAF6EC] border border-[#DDD4C0] text-center text-xs text-[#2B3F5C] font-semibold">
            축하합니다! 고스톱 수읽기의 최고 경지인 '천하제일 훈수신'에 올랐습니다.
          </div>
        )}
      </div>

      {/* 3) User Statistics Summary */}
      <div className="bg-white border border-[#DDD4C0] rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-[#1F1F1F] flex items-center gap-2">
          <span>📊</span>
          <span>내 수읽기 훈련 통계</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3.5 rounded-xl bg-[#FAF6EC] border border-[#E5DFCE]">
            <div className="text-xs text-[#7A7466] mb-1">총 대국/연습</div>
            <div className="text-xl font-black text-[#1F1F1F] tabular-nums font-mono">
              {userProfile.totalGames}회
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAF6EC] border border-[#E5DFCE]">
            <div className="text-xs text-[#7A7466] mb-1">퀴즈 정답률</div>
            <div className="text-xl font-black text-[#3B6255] tabular-nums font-mono">
              {quizRate}%
            </div>
            <div className="text-[10px] text-[#7A7466]">{userProfile.quizCorrect} / {userProfile.quizTotal}회</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAF6EC] border border-[#E5DFCE]">
            <div className="text-xs text-[#7A7466] mb-1">이유 확인</div>
            <div className="text-xl font-black text-[#A9791C] tabular-nums font-mono">
              {userProfile.reasonsViewed}회
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAF6EC] border border-[#E5DFCE]">
            <div className="text-xs text-[#7A7466] mb-1">게시판 참여</div>
            <div className="text-xl font-black text-[#2B3F5C] tabular-nums font-mono">
              {userProfile.boardParticipation}회
            </div>
          </div>
        </div>
      </div>

      {/* 4) Acquired Badges Grid */}
      <div className="bg-white border border-[#DDD4C0] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-[#1F1F1F] flex items-center gap-2">
            <span>🏆</span>
            <span>획득 배지 컬렉션</span>
          </h3>
          <span className="text-xs text-[#7A7466]">
            획득: {ALL_BADGES.filter(b => b.unlocked).length} / {ALL_BADGES.length}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ALL_BADGES.map(badge => (
            <div
              key={badge.id}
              className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                badge.unlocked
                  ? 'bg-[#FAF6EC] border-[#A9791C]/50 shadow-xs'
                  : 'bg-[#F5F2EB]/50 border-[#DDD4C0] opacity-50 grayscale'
              }`}
            >
              <div className="text-2xl mb-1.5">{badge.icon}</div>
              <div className="font-bold text-xs text-[#1F1F1F] truncate w-full">
                {badge.name}
              </div>
              <div className="text-[10px] text-[#7A7466] mt-0.5 line-clamp-2">
                {badge.desc}
              </div>
              <div className="mt-2">
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                    badge.unlocked
                      ? 'bg-[#A9791C] text-white'
                      : 'bg-[#DDD4C0] text-[#666]'
                  }`}
                >
                  {badge.unlocked ? '보유 중' : '잠김'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5) Settings & Preferences */}
      <div className="bg-white border border-[#DDD4C0] rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-[#1F1F1F] flex items-center gap-2">
          <span>⚙️</span>
          <span>환경 설정</span>
        </h3>

        <div className="divide-y divide-[#E5DFCE] text-xs">
          {/* Account Info */}
          {currentUser && (
            <div className="py-3 flex items-center justify-between">
              <div>
                <div className="font-bold text-[#1F1F1F] flex items-center gap-1.5">
                  <span>로그인 계정: {currentUser.name}</span>
                  {isAdminEmail(currentUser.email) && (
                    <span className="text-[10px] bg-[#9C3131] text-white px-1.5 py-0.2 rounded font-bold">
                      관리자
                    </span>
                  )}
                </div>
                <div className="text-[#7A7466] font-mono text-[11px]">{currentUser.email}</div>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    onLogout();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#DDD4C0] hover:border-[#9C3131] hover:text-[#9C3131] cursor-pointer transition-colors"
                >
                  로그아웃
                </button>
              )}
            </div>
          )}

          {/* Sound Toggle */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="font-bold text-[#1F1F1F]">화투 손맛 효과음 (Web Audio)</div>
              <div className="text-[#7A7466]">화투패를 칠 때의 '짝!' 소리와 승리 차임 효과음</div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                soundActive
                  ? 'bg-[#3B6255] text-white border-[#3B6255]'
                  : 'bg-white text-[#777] border-[#DDD4C0]'
              }`}
            >
              {soundActive ? '켜짐 (ON)' : '꺼짐 (OFF)'}
            </button>
          </div>

          {/* Reset Data */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="font-bold text-[#9C3131]">훈련 기록 초기화</div>
              <div className="text-[#7A7466]">레벨, 통계, 퀴즈 기록을 처음 상태로 되돌립니다.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('정말 훈련 기록과 레벨을 초기화하시겠습니까?')) {
                  onResetData();
                }
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#9C3131]/10 text-[#9C3131] hover:bg-[#9C3131] hover:text-white border border-[#9C3131]/30 transition-colors cursor-pointer"
            >
              초기화
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-[#B0A88E] pt-1">{CARD_IMAGE_CREDIT}</p>
    </div>
  );
};
