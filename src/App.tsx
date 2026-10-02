import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, BoardPost, AuthUser, QuizQuestion } from './types/hwatu';
import {
  loadAuthUser,
  saveAuthUser,
  isAdminEmail,
  loadUserProfile,
  saveUserProfile,
  loadBoardPosts,
  saveBoardPosts,
  loadQuizzes,
  saveQuizzes,
  LEVEL_REQUIREMENTS,
  INITIAL_USER_PROFILE,
} from './utils/storage';
import { getNextLevelQuestConditions } from './utils/quests';
import { LEVEL_SCENARIOS, LevelScenario } from './utils/levelScenarios';
import { playSuccess } from './utils/sound';
import { HWATU_DECK } from './utils/hwatuData';
import { getCardImageSrc } from './utils/cardImages';
import { Navigation, TabKey } from './components/Navigation';
import { PracticeTab } from './components/PracticeTab';
import { RulesTab } from './components/RulesTab';
import { QuizTab } from './components/QuizTab';
import { BoardTab } from './components/BoardTab';
import { ProfileTab } from './components/ProfileTab';
import { AdminTab } from './components/AdminTab';
import { LoginGate } from './components/LoginGate';

export default function App() {
  // Authentication State
  const [authUser, setAuthUser] = useState<AuthUser | null>(loadAuthUser);
  // 로그인 버튼을 누른 바로 그 순간부터(이미 로그인된 채로 새로고침한 경우는 제외) 연습 화면을
  // 전체화면으로 띄운다. 페이지를 새로고침해 저장된 로그인 상태로 복귀하는 경우는 사용자 제스처가
  // 없어 브라우저가 네이티브 전체화면을 어차피 허용하지 않으므로 대상에서 제외한다.
  const [startFullscreen, setStartFullscreen] = useState(false);

  // 화투패 48장 SVG를 앱이 뜨자마자 미리 받아 브라우저 캐시에 데워 둔다. 연습 화면에 진입하는
  // 순간 손패·바닥패 수십 장의 <img>가 동시에 처음 요청되면, 느린 회선에서는 그림이 안 뜨고
  // 회색으로 잠깐 보이는 현상이 생길 수 있다(사용자 피드백: "화투패 표시가 지연된다"). 같은 그림을
  // 월별로 여러 장 재사용하므로 48장(실제로는 더 적은 고유 경로)만 한 번 미리 받아 두면 충분하다.
  useEffect(() => {
    const uniqueSrcs = new Set(HWATU_DECK.map(getCardImageSrc));
    uniqueSrcs.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // App Navigation & Core Data
  const [currentTab, setCurrentTab] = useState<TabKey>('practice');
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile);
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>(loadBoardPosts);
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>(loadQuizzes);

  // Check if current logged-in user is an administrator
  const isAdmin = isAdminEmail(authUser?.email);

  // Safety guard: if user is not admin but on admin tab, redirect to practice
  useEffect(() => {
    if (currentTab === 'admin' && !isAdmin) {
      setCurrentTab('practice');
    }
  }, [currentTab, isAdmin]);

  // Sync to local storage whenever profile changes
  useEffect(() => {
    saveUserProfile(userProfile);
  }, [userProfile]);

  // Sync board posts to local storage
  useEffect(() => {
    saveBoardPosts(boardPosts);
  }, [boardPosts]);

  // Sync quizzes to local storage
  useEffect(() => {
    saveQuizzes(quizzes);
  }, [quizzes]);

  // Check and update attendance streak on load
  useEffect(() => {
    if (!authUser) return;
    const today = new Date().toISOString().split('T')[0];
    if (userProfile.lastLoginDate !== today) {
      setUserProfile(prev => ({
        ...prev,
        attendanceStreak: prev.attendanceStreak + 1,
        lastLoginDate: today,
      }));
    }
  }, [authUser]);

  // 승급 퀘스트 체크리스트(경기 횟수/퀴즈/이유보기/게시판/출석) 중 하나라도 새로 달성되면,
  // 지금 어느 화면에 있든 즉시 축하 팝업을 띄운다. "이 레벨에서는 조건 없음(패스)"인 항목은
  // 사용자가 실제로 뭔가를 달성한 게 아니므로 제외한다. 앱을 처음 켰을 때 이미 달성돼 있던
  // 조건은(과거에 이미 이뤘던 것이므로) 팝업을 띄우지 않도록, 첫 실행 시에는 기준값만 기록한다.
  const prevQuestDoneRef = useRef<Record<string, boolean> | null>(null);
  const [questCelebration, setQuestCelebration] = useState<string[] | null>(null);
  useEffect(() => {
    const active = getNextLevelQuestConditions(userProfile).filter(c => c.required > 0);
    const currentMap: Record<string, boolean> = {};
    active.forEach(c => { currentMap[c.key] = c.done; });

    if (prevQuestDoneRef.current) {
      const newlyAchieved = active
        .filter(c => prevQuestDoneRef.current![c.key] === false && c.done)
        .map(c => c.label);
      if (newlyAchieved.length > 0) {
        setQuestCelebration(newlyAchieved);
        playSuccess();
      }
    }
    prevQuestDoneRef.current = currentMap;
  }, [userProfile]);

  // 축하 팝업은 몇 초 뒤 자동으로 닫는다 (수동으로 닫을 수도 있음).
  useEffect(() => {
    if (!questCelebration) return;
    const timer = window.setTimeout(() => setQuestCelebration(null), 4500);
    return () => window.clearTimeout(timer);
  }, [questCelebration]);

  // 레벨업 직후, 그 레벨에서 해금된 심화학습이 있으면 바로 해볼지 묻는 팝업. "지금 바로
  // 플레이하기"를 누르면 pendingScenarioId에 그 시나리오 id를 담아 연습 탭으로 넘겨주고,
  // PracticeTab이 마운트/갱신되는 즉시 그 시나리오를 로드한다.
  const [unlockedScenario, setUnlockedScenario] = useState<LevelScenario | null>(null);
  const [pendingScenarioId, setPendingScenarioId] = useState<string | null>(null);

  // Login / Logout handlers
  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
    saveAuthUser(user);
    setStartFullscreen(true);
    // 로그인 버튼 클릭이라는 사용자 제스처 안에서 바로 호출해야 브라우저가 전체화면 요청을
    // 허용한다(비동기 지연 없이 같은 클릭 핸들러 안에서 동기적으로 호출). 지원하지 않거나
    // 거부되는 기기에서는 조용히 무시되고, 연습 화면 쪽 CSS 전체화면 스타일(startFullscreen)만
    // 적용돼 시각적으로는 동일하게 꽉 찬 화면으로 보인다.
    const el = document.documentElement as (HTMLElement & { webkitRequestFullscreen?: () => Promise<void> });
    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    request?.()?.catch(() => {});
  };

  const handleLogout = () => {
    setAuthUser(null);
    saveAuthUser(null);
    setCurrentTab('practice');
  };

  // Handlers for quest events
  const handleIncrementGameCount = () => {
    setUserProfile(prev => ({
      ...prev,
      totalGames: prev.totalGames + 1,
    }));
  };

  const handleIncrementReasonCount = () => {
    setUserProfile(prev => ({
      ...prev,
      reasonsViewed: prev.reasonsViewed + 1,
    }));
  };

  const handleQuizCorrect = () => {
    setUserProfile(prev => ({
      ...prev,
      quizCorrect: prev.quizCorrect + 1,
    }));
  };

  const handleQuizAttempt = () => {
    setUserProfile(prev => ({
      ...prev,
      quizTotal: prev.quizTotal + 1,
    }));
  };

  const handleParticipateBoard = () => {
    setUserProfile(prev => ({
      ...prev,
      boardParticipation: prev.boardParticipation + 1,
    }));
  };

  // Board actions
  const handleAddPost = (newPost: BoardPost) => {
    setBoardPosts(prev => [newPost, ...prev]);
  };

  const handleDeletePost = (postId: string) => {
    setBoardPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleVotePost = (postId: string, choice: 'A' | 'B') => {
    setBoardPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;
        if (post.userVoted === choice) return post; // already voted for this

        let newVotesA = post.votesA;
        let newVotesB = post.votesB;

        if (post.userVoted === 'A' && choice === 'B') {
          newVotesA = Math.max(0, newVotesA - 1);
          newVotesB += 1;
        } else if (post.userVoted === 'B' && choice === 'A') {
          newVotesB = Math.max(0, newVotesB - 1);
          newVotesA += 1;
        } else if (!post.userVoted) {
          if (choice === 'A') newVotesA += 1;
          else newVotesB += 1;
        }

        return {
          ...post,
          votesA: newVotesA,
          votesB: newVotesB,
          userVoted: choice,
        };
      })
    );
  };

  const handleAddComment = (postId: string, commentText: string) => {
    setBoardPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;
        const newComment = {
          id: `comment_${Date.now()}`,
          author: authUser?.name || '동네훈수꾼',
          badge: LEVEL_REQUIREMENTS.find(r => r.level === userProfile.level)?.badgeName || '훈수패',
          content: commentText,
          createdAt: '방금 전',
        };
        return {
          ...post,
          comments: [...post.comments, newComment],
        };
      })
    );
  };

  // Level Up confirmed
  const handleLevelUp = () => {
    const nextLevel = userProfile.level + 1;
    const req = LEVEL_REQUIREMENTS.find(r => r.level === nextLevel);
    if (!req) return;

    setUserProfile(prev => ({
      ...prev,
      level: nextLevel,
      title: req.title,
      badges: prev.badges.includes(req.badgeName) ? prev.badges : [...prev.badges, req.badgeName],
    }));

    // 이 레벨에 도달하면 해금되는 심화학습(패 순서를 미리 짜 둔 교육용 시나리오)이 있으면, 바로
    // 그 자리에서 플레이해볼 기회를 제안한다 — "레벨업 될 때마다 심화학습게임을 할 수 있는 기회를
    // 달라"는 요청 반영.
    const scenario = LEVEL_SCENARIOS.find(s => s.unlockLevel === nextLevel);
    if (scenario) setUnlockedScenario(scenario);
  };

  // Reset Data
  const handleResetData = () => {
    setUserProfile(INITIAL_USER_PROFILE);
    saveUserProfile(INITIAL_USER_PROFILE);
  };

  // 1) GATE SCREEN: If user is not logged in, block all other screens!
  if (!authUser) {
    return <LoginGate onLogin={handleLogin} />;
  }

  // 2) MAIN APP (Authenticated)
  const isPracticeTab = currentTab === 'practice';

  return (
    <div className="min-h-screen bg-[#FAF6EC] text-[#222222] flex flex-col font-sans selection:bg-[#A9791C]/20 selection:text-[#A9791C] relative">
      {/* 퀘스트 달성 축하 팝업 — 연습 화면의 전체화면 모드(z-[200])보다도 위에 떠야 하므로 z를 더 높게 둔다.
          지금 어느 탭에 있든(연습/퀴즈/게시판 등) 승급 조건을 새로 달성하는 즉시 뜬다. */}
      {questCelebration && (
        <div
          className="fixed inset-0 z-[500] bg-black/55 flex items-center justify-center p-4"
          onClick={() => setQuestCelebration(null)}
        >
          <div
            className="bg-[#FAF6EC] border-2 border-[#A9791C] rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-4xl animate-bounce">🎉</div>
            <div className="text-lg font-black text-[#1F1F1F]">퀘스트 달성!</div>
            <div className="space-y-1">
              {questCelebration.map((label, i) => (
                <div key={i} className="text-sm font-bold text-[#A9791C]">
                  ✅ {label}
                </div>
              ))}
            </div>
            <p className="text-xs text-[#7A7466]">프로필 탭에서 승급 조건 달성 현황을 확인해보세요.</p>
            <button
              type="button"
              onClick={() => setQuestCelebration(null)}
              className="w-full py-2.5 rounded-lg bg-[#A9791C] hover:bg-[#8F6516] text-white text-sm font-bold cursor-pointer"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 레벨업으로 새 심화학습이 해금됐을 때 뜨는 팝업 — "지금 바로 플레이하기"를 누르면 연습
          탭으로 이동하면서 그 시나리오를 바로 불러온다. */}
      {unlockedScenario && (
        <div
          className="fixed inset-0 z-[500] bg-black/55 flex items-center justify-center p-4"
          onClick={() => setUnlockedScenario(null)}
        >
          <div
            className="bg-[#FAF6EC] border-2 border-[#A9791C] rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-4xl animate-bounce">🎓</div>
            <div className="text-lg font-black text-[#1F1F1F]">레벨업 기념 심화학습 해금!</div>
            <div className="text-sm font-bold text-[#A9791C]">{unlockedScenario.title}</div>
            <p className="text-xs text-[#7A7466] leading-relaxed text-left">{unlockedScenario.brief}</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUnlockedScenario(null)}
                className="flex-1 py-2.5 rounded-lg bg-white border border-[#DDD4C0] hover:border-[#A9791C] text-[#555] text-sm font-bold cursor-pointer"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingScenarioId(unlockedScenario.id);
                  setCurrentTab('practice');
                  setUnlockedScenario(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#A9791C] hover:bg-[#8F6516] text-white text-sm font-bold cursor-pointer"
              >
                🎮 지금 플레이하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation — 연습(게임) 화면에서는 메뉴를 게임 화면 안으로 옮기고 상단 바는 숨긴다 */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        userLevel={userProfile.level}
        userTitle={userProfile.title}
        totalGames={userProfile.totalGames}
        isAdmin={isAdmin}
        currentUser={authUser}
        onLogout={handleLogout}
        hideTopBar={isPracticeTab}
        hideBottomBar={isPracticeTab}
      />

      {/* Main Content Area — 연습(게임) 화면은 좌우 여백과 하단 여백(원래 고정 하단 탭바를 위해
          비워두던 공간)을 없애 테이블이 화면을 꽉 채우게 한다. 하단 탭바는 연습 화면에서 기본적으로
          숨겨져 있으므로(Navigation의 hideBottomBar) 그 공간을 더 이상 예약해 둘 필요가 없다. */}
      <main className={`flex-1 max-w-5xl w-full mx-auto ${isPracticeTab ? 'px-0 pb-0 pt-2' : 'px-4 sm:px-6 pb-20 md:pb-10 pt-5'}`}>
        {currentTab === 'practice' && (
          <PracticeTab
            onIncrementGameCount={handleIncrementGameCount}
            onIncrementReasonCount={handleIncrementReasonCount}
            userLevel={userProfile.level}
            totalGames={userProfile.totalGames}
            currentUser={authUser}
            onOpenProfile={() => setCurrentTab('profile')}
            onLogout={handleLogout}
            startFullscreen={startFullscreen}
            pendingScenarioId={pendingScenarioId}
            onScenarioConsumed={() => setPendingScenarioId(null)}
          />
        )}

        {currentTab === 'rules' && <RulesTab />}

        {currentTab === 'quiz' && (
          <QuizTab
            quizzes={quizzes}
            attendanceStreak={userProfile.attendanceStreak}
            quizCorrectCount={userProfile.quizCorrect}
            onQuizCorrect={handleQuizCorrect}
            onQuizAttempt={handleQuizAttempt}
          />
        )}

        {currentTab === 'board' && (
          <BoardTab
            posts={boardPosts}
            onAddPost={handleAddPost}
            onVote={handleVotePost}
            onAddComment={handleAddComment}
            onParticipateBoard={handleParticipateBoard}
            onGoToRules={() => setCurrentTab('rules')}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileTab
            userProfile={userProfile}
            currentUser={authUser}
            onLogout={handleLogout}
            onLevelUp={handleLevelUp}
            onResetData={handleResetData}
            onUpdateSound={() => {}}
          />
        )}

        {currentTab === 'admin' && isAdmin && (
          <AdminTab
            currentUser={authUser}
            quizzes={quizzes}
            posts={boardPosts}
            onUpdateQuizzes={setQuizzes}
            onDeletePost={handleDeletePost}
          />
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="hidden md:block py-6 border-t border-[#E5DFCE] text-center text-xs text-[#7A7466]">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1F1F1F]">훈수패</span>
            <span>·</span>
            <span>고스톱 수읽기 &amp; 실전 전략 훈련 시뮬레이터</span>
          </div>
          <div className="flex items-center gap-3">
            <span>불완전정보 기대 승률 계산 기반 연습 전용 앱</span>
            {isAdmin && (
              <span className="px-2 py-0.5 rounded bg-[#9C3131] text-white text-[10px] font-bold">
                관리자 모드 활성
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
