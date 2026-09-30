import React, { useState } from 'react';
import { BoardPost, HwatuCard } from '../types/hwatu';
import { HWATU_DECK } from '../utils/hwatuData';
import { CardView } from './CardView';
import { playClick, playSuccess } from '../utils/sound';

interface BoardTabProps {
  posts: BoardPost[];
  onAddPost: (post: BoardPost) => void;
  onVote: (postId: string, choice: 'A' | 'B') => void;
  onAddComment: (postId: string, commentText: string) => void;
  onParticipateBoard: () => void;
}

export const BoardTab: React.FC<BoardTabProps> = ({
  posts,
  onAddPost,
  onVote,
  onAddComment,
  onParticipateBoard,
}) => {
  const [isWriteModalOpen, setIsWriteModalOpen] = useState<boolean>(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // New post form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMode, setNewMode] = useState<'matgo' | 'gostop3'>('matgo');
  const [selectedCandidateA, setSelectedCandidateA] = useState<HwatuCard>(HWATU_DECK[0]);
  const [selectedCandidateB, setSelectedCandidateB] = useState<HwatuCard>(HWATU_DECK[4]);

  const handleVote = (postId: string, choice: 'A' | 'B') => {
    playClick();
    onVote(postId, choice);
    onParticipateBoard();
  };

  const handleCommentSubmit = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    playClick();
    onAddComment(postId, text);
    onParticipateBoard();
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newPost: BoardPost = {
      id: `post_${Date.now()}`,
      author: '동네훈수꾼',
      authorBadge: '동네 타짜',
      title: newTitle,
      description: newDescription || '이 패 상황에서 고수님들의 선택과 이유가 궁금합니다!',
      mode: newMode,
      floorCards: [HWATU_DECK[2], HWATU_DECK[6], HWATU_DECK[12], HWATU_DECK[18]],
      userHand: [selectedCandidateA, selectedCandidateB, HWATU_DECK[22]],
      candidateA: selectedCandidateA,
      candidateB: selectedCandidateB,
      votesA: 1,
      votesB: 0,
      userVoted: 'A',
      createdAt: '방금 전',
      comments: []
    };

    playSuccess();
    onAddPost(newPost);
    onParticipateBoard();
    setIsWriteModalOpen(false);
    setNewTitle('');
    setNewDescription('');
  };

  return (
    <div className="space-y-6 pb-10">
      {/* 1) Fixed Top Guide Card: Hwatu Basic Rules & Scoring Formula */}
      <div className="bg-[#FAF6EC] border-2 border-[#A9791C]/40 rounded-2xl p-5 shadow-xs relative overflow-hidden">
        {/* Decorative corner tag */}
        <div className="absolute top-0 right-0 bg-[#A9791C] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-tight">
          훈수패 화투 족보 &amp; 점수 공식 가이드
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📜</span>
          <h2 className="text-base font-bold text-[#1F1F1F]">
            화투 기본 룰 &amp; 점수 채점 기준 안내 (국룰 가이드)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 피 (Pi) */}
          <div className="p-3 rounded-xl bg-white border border-[#DDD4C0] space-y-1">
            <div className="font-bold text-[#8A6240] flex items-center justify-between">
              <span>🍃 피 (10장부터 1점)</span>
              <span className="text-[10px] font-normal text-[#7A7466]">쌍피는 2장</span>
            </div>
            <p className="text-[11px] text-[#444] leading-relaxed">
              피 10장 = 1점, 이후 1장마다 +1점 추가. 맞고에서 피 7장 이하, 3인에서 5장 이하로 패배 시 <strong>피박(점수 2배)</strong> 적용!
            </p>
          </div>

          {/* 띠 (Tti / Dan) */}
          <div className="p-3 rounded-xl bg-white border border-[#DDD4C0] space-y-1">
            <div className="font-bold text-[#9C3131] flex items-center justify-between">
              <span>🔴 띠 (5장부터 1점)</span>
              <span className="text-[10px] font-normal text-[#7A7466]">단 완성 3점</span>
            </div>
            <p className="text-[11px] text-[#444] leading-relaxed">
              띠 5장 = 1점, 이후 1장마다 +1점. <strong>홍단(1,2,3월), 청단(6,9,10월), 초단(4,5,7월)</strong> 각각 3점 획득!
            </p>
          </div>

          {/* 열끗 & 고도리 */}
          <div className="p-3 rounded-xl bg-white border border-[#DDD4C0] space-y-1">
            <div className="font-bold text-[#A9791C] flex items-center justify-between">
              <span>🐦 열끗 &amp; 고도리 (5점)</span>
              <span className="text-[10px] font-normal text-[#7A7466]">2, 4, 8월 새</span>
            </div>
            <p className="text-[11px] text-[#444] leading-relaxed">
              열끗 5장 = 1점, 1장마다 +1점. <strong>고도리(2월 매화새, 4월 흑싸리새, 8월 기러기 3장)</strong> 모으면 즉시 5점!
            </p>
          </div>

          {/* 광 (Gwang) */}
          <div className="p-3 rounded-xl bg-white border border-[#DDD4C0] space-y-1">
            <div className="font-bold text-[#2B3F5C] flex items-center justify-between">
              <span>☀️ 광 (3장 3점 / 5장 15점)</span>
              <span className="text-[10px] font-normal text-[#7A7466]">비삼광 2점</span>
            </div>
            <p className="text-[11px] text-[#444] leading-relaxed">
              광 3장 = 3점 (비광 포함 삼광은 2점), 4광 = 4점, <strong>오광 = 15점</strong>. 상대 광 점수 날 때 내 광 0장이면 <strong>광박(2배)</strong>!
            </p>
          </div>
        </div>

        {/* Extra Rule note */}
        <div className="mt-3 pt-2.5 border-t border-[#E5DFCE] text-[11px] text-[#7A7466] flex flex-wrap items-center justify-between gap-2">
          <span>* 특수 룰: 바닥패와 덱패가 일치하는 뻑(피 뺏기), 흔들기(동일 월 3장 보유), 싹쓸이(바닥을 전부 비우면 피 1장 강탈)</span>
          <span className="font-semibold text-[#A9791C]">승리 점수 기준: 맞고 7점 이상 / 3인 고스톱 3점 이상</span>
        </div>
      </div>

      {/* Community Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-[#1F1F1F]">
            타짜들의 패 상황 수읽기 토론방
          </h3>
          <p className="text-xs text-[#7A7466]">
            실전에서 애매한 패 상황을 투표하고 훈수를 나눠보세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            playClick();
            setIsWriteModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-[#2B3F5C] hover:bg-[#1E2E44] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <span>✍️ 애매한 패 질문 올리기</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white">퀘스트</span>
        </button>
      </div>

      {/* Posts List */}
      <div className="space-y-5">
        {posts.map(post => {
          const totalVotes = post.votesA + post.votesB;
          const pctA = totalVotes > 0 ? Math.round((post.votesA / totalVotes) * 100) : 50;
          const pctB = totalVotes > 0 ? 100 - pctA : 50;

          return (
            <div
              key={post.id}
              className="bg-white border border-[#DDD4C0] rounded-2xl p-5 shadow-xs space-y-4"
            >
              {/* Post Header */}
              <div className="flex items-center justify-between border-b border-[#E5DFCE] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#FAF6EC] border border-[#DDD4C0] flex items-center justify-center font-bold text-xs text-[#2B3F5C]">
                    {post.author.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-[#1F1F1F]">
                        {post.author}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FAF6EC] text-[#7A7466] border border-[#DDD4C0]">
                        {post.authorBadge}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#7A7466] flex items-center gap-1.5">
                      <span>{post.mode === 'matgo' ? '맞고(2인)' : '3인 고스톱'}</span>
                      <span>·</span>
                      <span>{post.createdAt}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Post Title & Description */}
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-[#1F1F1F]">
                  {post.title}
                </h4>
                <p className="text-xs text-[#444] leading-relaxed">
                  {post.description}
                </p>
              </div>

              {/* Dilemma Choice Voting Arena */}
              <div className="p-4 rounded-xl bg-[#FAF6EC] border border-[#E5DFCE] space-y-3">
                <div className="text-xs font-bold text-[#A9791C] flex items-center justify-between">
                  <span>어떤 패를 먼저 내시겠습니까? (실시간 투표)</span>
                  <span className="text-[11px] text-[#7A7466] font-normal">
                    총 {totalVotes}명 참여
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Candidate A */}
                  <button
                    type="button"
                    onClick={() => handleVote(post.id, 'A')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      post.userVoted === 'A'
                        ? 'bg-[#3B6255]/10 border-[#3B6255] ring-2 ring-[#3B6255]'
                        : 'bg-white border-[#DDD4C0] hover:border-[#3B6255]'
                    }`}
                  >
                    <CardView card={post.candidateA} size="sm" disabled={true} />
                    <div className="flex-1 text-xs">
                      <div className="font-bold text-[#1F1F1F] flex items-center justify-between">
                        <span>A 선택: {post.candidateA.name}</span>
                        <span className="font-mono text-[#3B6255] font-bold">{pctA}%</span>
                      </div>
                      <div className="text-[11px] text-[#7A7466]">
                        {post.candidateA.plant} ({post.candidateA.label})
                      </div>
                      <div className="w-full bg-[#E5DFCE] h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="bg-[#3B6255] h-full transition-all"
                          style={{ width: `${pctA}%` }}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Candidate B */}
                  <button
                    type="button"
                    onClick={() => handleVote(post.id, 'B')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      post.userVoted === 'B'
                        ? 'bg-[#9C3131]/10 border-[#9C3131] ring-2 ring-[#9C3131]'
                        : 'bg-white border-[#DDD4C0] hover:border-[#9C3131]'
                    }`}
                  >
                    <CardView card={post.candidateB} size="sm" disabled={true} />
                    <div className="flex-1 text-xs">
                      <div className="font-bold text-[#1F1F1F] flex items-center justify-between">
                        <span>B 선택: {post.candidateB.name}</span>
                        <span className="font-mono text-[#9C3131] font-bold">{pctB}%</span>
                      </div>
                      <div className="text-[11px] text-[#7A7466]">
                        {post.candidateB.plant} ({post.candidateB.label})
                      </div>
                      <div className="w-full bg-[#E5DFCE] h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="bg-[#9C3131] h-full transition-all"
                          style={{ width: `${pctB}%` }}
                        />
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                  <span>훈수 토론 댓글</span>
                  <span className="text-[#7A7466] font-normal">({post.comments.length})</span>
                </div>

                {/* Comment List */}
                <div className="space-y-2">
                  {post.comments.map(c => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg bg-[#FAF6EC]/70 border border-[#E5DFCE] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#1F1F1F]">{c.author}</span>
                          <span className="text-[10px] text-[#7A7466]">{c.badge}</span>
                        </div>
                        <span className="text-[10px] text-[#7A7466]">{c.createdAt}</span>
                      </div>
                      <p className="text-[#333] leading-relaxed">{c.content}</p>
                    </div>
                  ))}
                </div>

                {/* Write Comment Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={commentInputs[post.id] || ''}
                    onChange={e =>
                      setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))
                    }
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCommentSubmit(post.id);
                    }}
                    placeholder="내 수읽기 의견이나 훈수를 남겨보세요..."
                    className="flex-1 px-3 py-2 rounded-lg bg-[#FAF6EC] border border-[#DDD4C0] text-xs focus:outline-hidden focus:border-[#A9791C] placeholder:text-[#999]"
                  />
                  <button
                    type="button"
                    onClick={() => handleCommentSubmit(post.id)}
                    className="px-3.5 py-2 rounded-lg bg-[#2B3F5C] hover:bg-[#1E2E44] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    등록
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Write Question Modal */}
      {isWriteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-[#FAF6EC] border border-[#DDD4C0] rounded-2xl w-full max-w-lg shadow-2xl p-6 text-[#222] space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5DFCE] pb-3">
              <h3 className="font-bold text-base text-[#1F1F1F]">
                새 패 상황 질문 / 토론 올리기
              </h3>
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(false)}
                className="text-[#7A7466] hover:text-[#111]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
                  게임 모드
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewMode('matgo')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      newMode === 'matgo'
                        ? 'bg-[#2B3F5C] text-white border-[#2B3F5C]'
                        : 'bg-white text-[#555] border-[#DDD4C0]'
                    }`}
                  >
                    맞고 (2인)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMode('gostop3')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      newMode === 'gostop3'
                        ? 'bg-[#2B3F5C] text-white border-[#2B3F5C]'
                        : 'bg-white text-[#555] border-[#DDD4C0]'
                    }`}
                  >
                    3인 고스톱
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
                  질문 제목
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="예: 상대 피 8장 상태에서 3월 광 vs 9월 쌍피 무엇을 칠까요?"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#DDD4C0] text-xs focus:outline-hidden focus:border-[#A9791C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
                  상황 설명
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="현재 바닥패 상황이나 상대방의 먹은 패 상황을 적어주세요."
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#DDD4C0] text-xs focus:outline-hidden focus:border-[#A9791C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
                    후보 A 패 선택
                  </label>
                  <select
                    value={selectedCandidateA.id}
                    onChange={e => {
                      const found = HWATU_DECK.find(c => c.id === e.target.value);
                      if (found) setSelectedCandidateA(found);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DDD4C0] text-xs"
                  >
                    {HWATU_DECK.slice(0, 24).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
                    후보 B 패 선택
                  </label>
                  <select
                    value={selectedCandidateB.id}
                    onChange={e => {
                      const found = HWATU_DECK.find(c => c.id === e.target.value);
                      if (found) setSelectedCandidateB(found);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#DDD4C0] text-xs"
                  >
                    {HWATU_DECK.slice(24).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5DFCE]">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#7A7466] hover:bg-[#E5DFCE]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#A9791C] hover:bg-[#8F6516] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  토론 등록하기 (+참여 카운트)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
