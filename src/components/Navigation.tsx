import React from 'react';
import { playClick } from '../utils/sound';
import { LEVEL_REQUIREMENTS } from '../utils/storage';

export type TabKey = 'practice' | 'quiz' | 'board' | 'profile';

interface NavigationProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  userLevel: number;
  userTitle: string;
  totalGames: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  userLevel,
  userTitle,
  totalGames,
}) => {
  // 경험치 게이지 퍼센트 (프로필 화면과 동일한 계산식: 다음 레벨의 "경기 진행 횟수" 기준)
  const currentReq = LEVEL_REQUIREMENTS.find(r => r.level === userLevel) || LEVEL_REQUIREMENTS[0];
  const nextReq = LEVEL_REQUIREMENTS.find(r => r.level === userLevel + 1);
  const isMaxLevel = !nextReq;
  const targetGames = nextReq ? nextReq.gamesRequired : currentReq.gamesRequired;
  const xpPct = isMaxLevel
    ? 100
    : Math.min(100, Math.max(0, Math.round((totalGames / targetGames) * 100)));

  const RING_RADIUS = 15;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const ringOffset = RING_CIRCUMFERENCE - (xpPct / 100) * RING_CIRCUMFERENCE;
  const handleTabClick = (tab: TabKey) => {
    if (tab === currentTab) return;
    playClick();
    onSelectTab(tab);
  };

  const navItems: { key: TabKey; label: string; icon: string }[] = [
    { key: 'practice', label: '연습 (수읽기)', icon: '🎴' },
    { key: 'quiz', label: '오늘의 퀴즈', icon: '❓' },
    { key: 'board', label: '게시판 (토론)', icon: '💬' },
    { key: 'profile', label: '프로필 & 퀘스트', icon: '🏆' },
  ];

  return (
    <>
      {/* Strict Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-40 bg-[#FAF6EC]/95 backdrop-blur-xs border-b border-[#DDD4C0] px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => handleTabClick('practice')}
            className="text-xl font-black tracking-tight text-[#1F1F1F] font-serif flex items-center gap-2 cursor-pointer"
          >
            <span className="w-7 h-7 rounded-lg bg-[#2B3F5C] text-[#FAF6EC] flex items-center justify-center text-xs font-serif shadow-xs">
              光
            </span>
            <span>훈수패</span>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#555]">
            {navItems.map(item => (
              <button
                type="button"
                key={item.key}
                onClick={() => handleTabClick(item.key)}
                className={`py-1 cursor-pointer transition-colors whitespace-nowrap text-xs font-semibold ${
                  currentTab === item.key
                    ? 'text-[#A9791C] border-b-2 border-[#A9791C]'
                    : 'text-[#666] hover:text-[#111]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-2">
            {/* 경험치 게이지 원형 차트: 어느 페이지에서든 눌러서 퀘스트 현황으로 이동 */}
            <button
              type="button"
              onClick={() => handleTabClick('profile')}
              title={`경험치 진행률 ${xpPct}% · 눌러서 퀘스트 현황 보기`}
              aria-label={`경험치 진행률 ${xpPct}%, 퀘스트 현황으로 이동`}
              className="relative w-9 h-9 shrink-0 flex items-center justify-center cursor-pointer group"
            >
              <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                <circle cx="18" cy="18" r={RING_RADIUS} fill="none" stroke="#E5DFCE" strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="#A9791C"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                  className="transition-[stroke-dashoffset] duration-300"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8.5px] font-bold text-[#1F1F1F] tabular-nums">
                {xpPct}%
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('profile')}
              className="px-3 py-1.5 rounded-lg bg-[#FAF6EC] border border-[#DDD4C0] hover:border-[#A9791C] text-xs font-semibold text-[#1F1F1F] flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-[#A9791C] text-white flex items-center justify-center text-[10px] font-bold">
                {userLevel}
              </span>
              <span className="hidden sm:inline text-xs">{userTitle}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Tab Navigation Bar (Required by prompt: 하단 탭 내비게이션으로 화면 전환) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAF6EC] border-t border-[#DDD4C0] px-2 py-1 shadow-lg md:hidden">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {navItems.map(item => {
            const isActive = currentTab === item.key;
            return (
              <button
                type="button"
                key={item.key}
                onClick={() => handleTabClick(item.key)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#A9791C] font-bold bg-[#A9791C]/10'
                    : 'text-[#7A7466] hover:text-[#111]'
                }`}
              >
                <span className="text-base leading-none mb-1">{item.icon}</span>
                <span className="text-[11px] truncate whitespace-nowrap">
                  {item.key === 'practice'
                    ? '연습'
                    : item.key === 'quiz'
                    ? '오늘의 퀴즈'
                    : item.key === 'board'
                    ? '게시판'
                    : '프로필'}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
