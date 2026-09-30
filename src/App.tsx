import React, { useState, useEffect } from 'react';
import { UserProfile, BoardPost } from './types/hwatu';
import {
  loadUserProfile,
  saveUserProfile,
  loadBoardPosts,
  saveBoardPosts,
  LEVEL_REQUIREMENTS,
  INITIAL_USER_PROFILE,
} from './utils/storage';
import { Navigation, TabKey } from './components/Navigation';
import { PracticeTab } from './components/PracticeTab';
import { QuizTab } from './components/QuizTab';
import { BoardTab } from './components/BoardTab';
import { ProfileTab } from './components/ProfileTab';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabKey>('practice');
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile);
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>(loadBoardPosts);

  // Sync to local storage whenever profile changes
  useEffect(() => {
    saveUserProfile(userProfile);
  }, [userProfile]);

  // Sync board posts to local storage
  useEffect(() => {
    saveBoardPosts(boardPosts);
  }, [boardPosts]);

  // Check and update attendance streak on load
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (userProfile.lastLoginDate !== today) {
      setUserProfile(prev => ({
        ...prev,
        attendanceStreak: prev.attendanceStreak + 1,
        lastLoginDate: today,
      }));
    }
  }, []);

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
          author: '동네훈수꾼',
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
  };

  // Reset Data
  const handleResetData = () => {
    setUserProfile(INITIAL_USER_PROFILE);
    saveUserProfile(INITIAL_USER_PROFILE);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EC] text-[#222222] flex flex-col font-sans selection:bg-[#A9791C]/20 selection:text-[#A9791C]">
      {/* Top Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        userLevel={userProfile.level}
        userTitle={userProfile.title}
        totalGames={userProfile.totalGames}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-5 pb-20 md:pb-10">
        {currentTab === 'practice' && (
          <PracticeTab
            onIncrementGameCount={handleIncrementGameCount}
            onIncrementReasonCount={handleIncrementReasonCount}
          />
        )}

        {currentTab === 'quiz' && (
          <QuizTab
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
          />
        )}

        {currentTab === 'profile' && (
          <ProfileTab
            userProfile={userProfile}
            onLevelUp={handleLevelUp}
            onResetData={handleResetData}
            onUpdateSound={() => {}}
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
          <div>불완전정보 기대 승률 계산 기반 연습 전용 앱</div>
        </div>
      </footer>
    </div>
  );
}
