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
  onGoToRules: () => void;
}

export const BoardTab: React.FC<BoardTabProps> = ({
  posts,
  onAddPost,
  onVote,
  onAddComment,
  onParticipateBoard,
  onGoToRules,
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
      {/* 1) Slim Banner: 상세 룰 가이드는 전용 페이지로 이동 */}
      <button
        type="button"
        onClick={onGoToRules}
        className="w-full bg-[#FAF6EC] border-2 border-[#A9791C]/40 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:border-[#A9791C] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl shrink-0">📜</span>
          <span className="min-w-0">
            <span className="block font-bold text-sm text-[#1F1F1F] truncate">
              화투 기본 룰 &amp; 점수 채점 기준 안내
            </span>
            <span className="block text-[11px] text-[#7A7466] truncate">
              패 이미지와 화투의 역사까지, 전용 가이드 페이지에서 확인하세요
            </span>
          </span>
        </div>
        <span className="shrink-0 text-xs font-semibold text-[#A9791C] flex items-center gap-1">
          룰 가이드 보기 →
        </span>
      </button>

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
