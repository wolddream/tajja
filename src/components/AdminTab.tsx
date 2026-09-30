import React, { useState } from 'react';
import { AuthUser, QuizQuestion, BoardPost, HwatuCard } from '../types/hwatu';
import { HWATU_DECK } from '../utils/hwatuData';
import { playClick, playSuccess, playCardSnap } from '../utils/sound';

interface AdminTabProps {
  currentUser: AuthUser;
  quizzes: QuizQuestion[];
  posts: BoardPost[];
  onUpdateQuizzes: (quizzes: QuizQuestion[]) => void;
  onDeletePost: (postId: string) => void;
}

export const AdminTab: React.FC<AdminTabProps> = ({
  currentUser,
  quizzes,
  posts,
  onUpdateQuizzes,
  onDeletePost,
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'quizzes' | 'board'>('overview');

  // Quiz Editor State
  const [editingQuiz, setEditingQuiz] = useState<QuizQuestion | null>(null);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);

  // Form Fields for Quiz Create/Edit
  const [formTitle, setFormTitle] = useState('');
  const [formScenario, setFormScenario] = useState('');
  const [formMode, setFormMode] = useState<'matgo' | 'gostop3'>('matgo');
  const [formOpponentSummary, setFormOpponentSummary] = useState('');
  const [formHandCardIds, setFormHandCardIds] = useState<string[]>(['m8_godori', 'm3_gwang']);
  const [formFloorCardIds, setFormFloorCardIds] = useState<string[]>(['m8_pi1', 'm3_hongdan', 'm5_pi1']);
  
  // 4 Options
  const [option1CardId, setOption1CardId] = useState('m8_godori');
  const [option1Explanation, setOption1Explanation] = useState('고도리 5점 차단이 최우선입니다.');
  const [option2CardId, setOption2CardId] = useState('m3_gwang');
  const [option2Explanation, setOption2Explanation] = useState('오답: 광보다 고도리 차단이 급합니다.');
  const [option3CardId, setOption3CardId] = useState('m1_pi1');
  const [option3Explanation, setOption3Explanation] = useState('오답: 바닥에 1월 패가 없습니다.');
  const [option4CardId, setOption4CardId] = useState('m7_pi1');
  const [option4Explanation, setOption4Explanation] = useState('오답: 무의미한 실책입니다.');
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(0); // 0 = option1, 1 = option2, etc.

  // Stats calculation
  const totalVotes = posts.reduce((acc, p) => acc + p.votesA + p.votesB, 0);
  const totalComments = posts.reduce((acc, p) => acc + p.comments.length, 0);

  // Open Edit Quiz
  const handleStartEditQuiz = (quiz: QuizQuestion) => {
    playClick();
    setEditingQuiz(quiz);
    setIsCreatingQuiz(false);

    setFormTitle(quiz.title);
    setFormScenario(quiz.scenarioDescription);
    setFormMode(quiz.mode);
    setFormOpponentSummary(quiz.opponentCapturedSummary);
    setFormHandCardIds(quiz.userHand.map(c => c.id));
    setFormFloorCardIds(quiz.floorCards.map(c => c.id));

    if (quiz.options.length >= 4) {
      setOption1CardId(quiz.options[0].card.id);
      setOption1Explanation(quiz.options[0].explanation);
      setOption2CardId(quiz.options[1].card.id);
      setOption2Explanation(quiz.options[1].explanation);
      setOption3CardId(quiz.options[2].card.id);
      setOption3Explanation(quiz.options[2].explanation);
      setOption4CardId(quiz.options[3].card.id);
      setOption4Explanation(quiz.options[3].explanation);

      const correctIdx = quiz.options.findIndex(o => o.isCorrect);
      setCorrectOptionIndex(correctIdx !== -1 ? correctIdx : 0);
    }
  };

  // Open Create Quiz
  const handleStartCreateQuiz = () => {
    playClick();
    setEditingQuiz(null);
    setIsCreatingQuiz(true);

    setFormTitle('새로운 패 수읽기 퀴즈');
    setFormScenario('현재 바닥패 및 상대 전황을 확인하고 최선의 수를 선택하세요.');
    setFormMode('matgo');
    setFormOpponentSummary('피 8장 / 광 1장');
    setFormHandCardIds(['m1_gwang', 'm10_cheongdan']);
    setFormFloorCardIds(['m1_pi1', 'm10_pi1', 'm5_pi1']);

    setOption1CardId('m1_gwang');
    setOption1Explanation('1월 광을 선취하여 광박을 방어하는 최선의 수입니다.');
    setOption2CardId('m10_cheongdan');
    setOption2Explanation('청단도 좋지만 광 선취가 더 안전합니다.');
    setOption3CardId('m5_pi1');
    setOption3Explanation('피를 버리는 것은 타이밍상 불리합니다.');
    setOption4CardId('m8_pi1');
    setOption4Explanation('바닥에 8월이 없어 패를 낭비합니다.');
    setCorrectOptionIndex(0);
  };

  // Save Quiz (Create or Update)
  const handleSaveQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccess();

    const cardFinder = (id: string): HwatuCard => {
      return HWATU_DECK.find(c => c.id === id) || HWATU_DECK[0];
    };

    const updatedOptions = [
      { id: 1, card: cardFinder(option1CardId), isCorrect: correctOptionIndex === 0, explanation: option1Explanation },
      { id: 2, card: cardFinder(option2CardId), isCorrect: correctOptionIndex === 1, explanation: option2Explanation },
      { id: 3, card: cardFinder(option3CardId), isCorrect: correctOptionIndex === 2, explanation: option3Explanation },
      { id: 4, card: cardFinder(option4CardId), isCorrect: correctOptionIndex === 3, explanation: option4Explanation },
    ];

    const quizData: QuizQuestion = {
      id: editingQuiz ? editingQuiz.id : `quiz_${Date.now()}`,
      title: formTitle,
      scenarioDescription: formScenario,
      mode: formMode,
      opponentCapturedSummary: formOpponentSummary,
      userHand: formHandCardIds.map(id => cardFinder(id)),
      floorCards: formFloorCardIds.map(id => cardFinder(id)),
      options: updatedOptions,
    };

    if (editingQuiz) {
      const nextQuizzes = quizzes.map(q => q.id === editingQuiz.id ? quizData : q);
      onUpdateQuizzes(nextQuizzes);
    } else {
      onUpdateQuizzes([...quizzes, quizData]);
    }

    setEditingQuiz(null);
    setIsCreatingQuiz(false);
  };

  // Delete Quiz
  const handleDeleteQuiz = (quizId: string) => {
    if (!window.confirm('이 퀴즈 문제를 삭제하시겠습니까?')) return;
    playCardSnap();
    const nextQuizzes = quizzes.filter(q => q.id !== quizId);
    onUpdateQuizzes(nextQuizzes);
  };

  // Delete Board Post
  const handleDeletePostClick = (postId: string) => {
    if (!window.confirm('정말 이 게시글을 삭제(모더레이션)하시겠습니까?')) return;
    playCardSnap();
    onDeletePost(postId);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Admin Banner */}
      <div className="bg-gradient-to-r from-[#2B3F5C] to-[#1E2E44] border-2 border-[#A9791C]/50 rounded-2xl p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#A9791C] text-white">
              ADMINISTRATOR
            </span>
            <span className="text-xs text-[#E5DFCE]">
              훈수패 시스템 운영 콘솔
            </span>
          </div>
          <h2 className="text-xl font-bold font-serif">
            관리자 대시보드
          </h2>
          <p className="text-xs text-[#CCD9E8]">
            로그인 계정 <span className="font-mono text-[#F4D999]">{currentUser.email}</span> 은 관리자 목록(ADMIN_EMAILS)에 등재되어 있습니다.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-black/25 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => { playClick(); setActiveSection('overview'); }}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
              activeSection === 'overview'
                ? 'bg-[#A9791C] text-white shadow-xs'
                : 'text-white/70 hover:text-white'
            }`}
          >
            📊 운영 통계
          </button>
          <button
            type="button"
            onClick={() => { playClick(); setActiveSection('quizzes'); }}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
              activeSection === 'quizzes'
                ? 'bg-[#A9791C] text-white shadow-xs'
                : 'text-white/70 hover:text-white'
            }`}
          >
            ❓ 퀴즈 CRUD ({quizzes.length})
          </button>
          <button
            type="button"
            onClick={() => { playClick(); setActiveSection('board'); }}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
              activeSection === 'board'
                ? 'bg-[#A9791C] text-white shadow-xs'
                : 'text-white/70 hover:text-white'
            }`}
          >
            💬 게시판 관리 ({posts.length})
          </button>
        </div>
      </div>

      {/* SECTION 1: OVERVIEW STATS */}
      {activeSection === 'overview' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Account Info Card */}
            <div className="p-4 rounded-xl bg-white border border-[#DDD4C0] shadow-xs space-y-1">
              <div className="text-xs text-[#7A7466] flex items-center justify-between">
                <span>현재 관리자 계정</span>
                <span className="w-2 h-2 rounded-full bg-[#34A853]" />
              </div>
              <div className="font-bold text-sm text-[#1F1F1F] truncate">
                {currentUser.name}
              </div>
              <div className="text-[11px] font-mono text-[#A9791C] truncate">
                {currentUser.email}
              </div>
            </div>

            {/* Total Quizzes */}
            <div className="p-4 rounded-xl bg-white border border-[#DDD4C0] shadow-xs space-y-1">
              <div className="text-xs text-[#7A7466]">등록된 퀴즈 문제 수</div>
              <div className="text-2xl font-black text-[#2B3F5C] font-mono tabular-nums">
                {quizzes.length}개
              </div>
              <div className="text-[10px] text-[#7A7466]">로컬 스토리지에 영구 보관</div>
            </div>

            {/* Total Posts */}
            <div className="p-4 rounded-xl bg-white border border-[#DDD4C0] shadow-xs space-y-1">
              <div className="text-xs text-[#7A7466]">게시판 토론 글 수</div>
              <div className="text-2xl font-black text-[#9C3131] font-mono tabular-nums">
                {posts.length}건
              </div>
              <div className="text-[10px] text-[#7A7466]">수읽기 질문 &amp; 투표</div>
            </div>

            {/* Total Community Interactions */}
            <div className="p-4 rounded-xl bg-white border border-[#DDD4C0] shadow-xs space-y-1">
              <div className="text-xs text-[#7A7466]">커뮤니티 투표 &amp; 댓글</div>
              <div className="text-2xl font-black text-[#3B6255] font-mono tabular-nums">
                {totalVotes + totalComments}회
              </div>
              <div className="text-[10px] text-[#7A7466]">
                투표 {totalVotes}표 · 댓글 {totalComments}개
              </div>
            </div>
          </div>

          {/* Quick Action Helper Card */}
          <div className="p-5 rounded-2xl bg-[#FAF6EC] border border-[#DDD4C0] flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-[#1F1F1F]">
                퀴즈 콘텐츠 확장 및 커뮤니티 관리
              </h3>
              <p className="text-xs text-[#666]">
                새로운 고스톱 상황 퀴즈를 직접 등록하여 사용자 훈련 콘텐츠를 늘리거나, 부적절한 게시글을 즉시 삭제할 수 있습니다.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { setActiveSection('quizzes'); handleStartCreateQuiz(); }}
                className="px-3.5 py-2 rounded-xl bg-[#A9791C] hover:bg-[#8F6516] text-white text-xs font-bold cursor-pointer"
              >
                + 새 퀴즈 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: QUIZZES CRUD */}
      {activeSection === 'quizzes' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-[#1F1F1F]">
                오늘의 퀴즈 문제 목록 및 CRUD
              </h3>
              <p className="text-xs text-[#7A7466]">
                문제를 추가/수정/삭제하면 사용자의 '오늘의 퀴즈' 탭에 즉시 반영됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartCreateQuiz}
              className="px-4 py-2 rounded-xl bg-[#A9791C] hover:bg-[#8F6516] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              + 새 퀴즈 문제 작성
            </button>
          </div>

          {/* Quiz Edit/Create Modal or Card */}
          {(isCreatingQuiz || editingQuiz) && (
            <div className="p-6 bg-white border-2 border-[#A9791C] rounded-2xl shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-[#E5DFCE] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A9791C]" />
                  <h4 className="font-bold text-sm text-[#1F1F1F]">
                    {editingQuiz ? '퀴즈 문제 수정' : '새 퀴즈 문제 등록'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingQuiz(null); setIsCreatingQuiz(false); }}
                  className="text-xs text-[#7A7466] hover:text-[#111]"
                >
                  ✕ 닫기
                </button>
              </div>

              <form onSubmit={handleSaveQuiz} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block font-bold text-[#333] mb-1">문제 제목</label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#FAF6EC] border border-[#DDD4C0]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#333] mb-1">게임 모드</label>
                    <select
                      value={formMode}
                      onChange={e => setFormMode(e.target.value as 'matgo' | 'gostop3')}
                      className="w-full px-3 py-2 rounded-lg bg-[#FAF6EC] border border-[#DDD4C0]"
                    >
                      <option value="matgo">맞고 (2인)</option>
                      <option value="gostop3">3인 고스톱</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#333] mb-1">상황 설명 (시나리오)</label>
                  <textarea
                    rows={2}
                    required
                    value={formScenario}
                    onChange={e => setFormScenario(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF6EC] border border-[#DDD4C0]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#333] mb-1">상대방 먹은 패 요약</label>
                  <input
                    type="text"
                    required
                    value={formOpponentSummary}
                    onChange={e => setFormOpponentSummary(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF6EC] border border-[#DDD4C0]"
                  />
                </div>

                {/* 4 Choices Setup */}
                <div className="space-y-3 pt-2 border-t border-[#E5DFCE]">
                  <div className="font-bold text-[#1F1F1F] flex items-center justify-between">
                    <span>4지선다 보기 및 정답 설정</span>
                    <span className="text-[11px] text-[#A9791C]">정답 보기에 체크하세요</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Option 1 */}
                    <div className={`p-3 rounded-xl border ${correctOptionIndex === 0 ? 'bg-[#3B6255]/5 border-[#3B6255]' : 'bg-[#FAF6EC] border-[#DDD4C0]'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                          <input
                            type="radio"
                            name="correctOpt"
                            checked={correctOptionIndex === 0}
                            onChange={() => setCorrectOptionIndex(0)}
                          />
                          <span>보기 1 {correctOptionIndex === 0 && '(★ 정답)'}</span>
                        </label>
                        <select
                          value={option1CardId}
                          onChange={e => setOption1CardId(e.target.value)}
                          className="px-2 py-1 bg-white border border-[#DDD4C0] rounded text-[11px]"
                        >
                          {HWATU_DECK.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={option1Explanation}
                        onChange={e => setOption1Explanation(e.target.value)}
                        placeholder="해설 입력"
                        className="w-full px-2.5 py-1.5 bg-white border border-[#DDD4C0] rounded text-xs"
                      />
                    </div>

                    {/* Option 2 */}
                    <div className={`p-3 rounded-xl border ${correctOptionIndex === 1 ? 'bg-[#3B6255]/5 border-[#3B6255]' : 'bg-[#FAF6EC] border-[#DDD4C0]'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                          <input
                            type="radio"
                            name="correctOpt"
                            checked={correctOptionIndex === 1}
                            onChange={() => setCorrectOptionIndex(1)}
                          />
                          <span>보기 2 {correctOptionIndex === 1 && '(★ 정답)'}</span>
                        </label>
                        <select
                          value={option2CardId}
                          onChange={e => setOption2CardId(e.target.value)}
                          className="px-2 py-1 bg-white border border-[#DDD4C0] rounded text-[11px]"
                        >
                          {HWATU_DECK.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={option2Explanation}
                        onChange={e => setOption2Explanation(e.target.value)}
                        placeholder="해설 입력"
                        className="w-full px-2.5 py-1.5 bg-white border border-[#DDD4C0] rounded text-xs"
                      />
                    </div>

                    {/* Option 3 */}
                    <div className={`p-3 rounded-xl border ${correctOptionIndex === 2 ? 'bg-[#3B6255]/5 border-[#3B6255]' : 'bg-[#FAF6EC] border-[#DDD4C0]'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                          <input
                            type="radio"
                            name="correctOpt"
                            checked={correctOptionIndex === 2}
                            onChange={() => setCorrectOptionIndex(2)}
                          />
                          <span>보기 3 {correctOptionIndex === 2 && '(★ 정답)'}</span>
                        </label>
                        <select
                          value={option3CardId}
                          onChange={e => setOption3CardId(e.target.value)}
                          className="px-2 py-1 bg-white border border-[#DDD4C0] rounded text-[11px]"
                        >
                          {HWATU_DECK.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={option3Explanation}
                        onChange={e => setOption3Explanation(e.target.value)}
                        placeholder="해설 입력"
                        className="w-full px-2.5 py-1.5 bg-white border border-[#DDD4C0] rounded text-xs"
                      />
                    </div>

                    {/* Option 4 */}
                    <div className={`p-3 rounded-xl border ${correctOptionIndex === 3 ? 'bg-[#3B6255]/5 border-[#3B6255]' : 'bg-[#FAF6EC] border-[#DDD4C0]'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                          <input
                            type="radio"
                            name="correctOpt"
                            checked={correctOptionIndex === 3}
                            onChange={() => setCorrectOptionIndex(3)}
                          />
                          <span>보기 4 {correctOptionIndex === 3 && '(★ 정답)'}</span>
                        </label>
                        <select
                          value={option4CardId}
                          onChange={e => setOption4CardId(e.target.value)}
                          className="px-2 py-1 bg-white border border-[#DDD4C0] rounded text-[11px]"
                        >
                          {HWATU_DECK.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={option4Explanation}
                        onChange={e => setOption4Explanation(e.target.value)}
                        placeholder="해설 입력"
                        className="w-full px-2.5 py-1.5 bg-white border border-[#DDD4C0] rounded text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E5DFCE]">
                  <button
                    type="button"
                    onClick={() => { setEditingQuiz(null); setIsCreatingQuiz(false); }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-[#7A7466] hover:bg-[#FAF6EC]"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-[#2B3F5C] hover:bg-[#1E2E44] text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {editingQuiz ? '수정 내용 저장' : '새 퀴즈 저장하기'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Quiz Cards Table / List */}
          <div className="space-y-3">
            {quizzes.map((quiz, idx) => (
              <div
                key={quiz.id}
                className="bg-white border border-[#DDD4C0] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FAF6EC] border border-[#DDD4C0] flex items-center justify-center font-bold text-[11px] text-[#A9791C]">
                      {idx + 1}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#FAF6EC] text-[10px] text-[#666]">
                      {quiz.mode === 'matgo' ? '맞고' : '3인'}
                    </span>
                    <span className="font-bold text-xs text-[#1F1F1F]">
                      {quiz.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#666] line-clamp-1">
                    {quiz.scenarioDescription}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-[#7A7466]">
                    <span>보기 {quiz.options.length}개</span>
                    <span>·</span>
                    <span className="text-[#3B6255] font-semibold">
                      정답: {quiz.options.find(o => o.isCorrect)?.card.name || '미설정'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEditQuiz(quiz)}
                    className="px-3 py-1.5 rounded-lg border border-[#DDD4C0] hover:border-[#A9791C] bg-white text-xs font-semibold text-[#1F1F1F] cursor-pointer"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#9C3131]/10 hover:bg-[#9C3131] text-[#9C3131] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: BOARD MODERATION */}
      {activeSection === 'board' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div>
            <h3 className="font-bold text-base text-[#1F1F1F]">
              게시판 글 목록 및 모더레이션(삭제)
            </h3>
            <p className="text-xs text-[#7A7466]">
              비정상적인 스팸 글이나 부적절한 게시물을 검토하고 삭제할 수 있습니다.
            </p>
          </div>

          <div className="space-y-3">
            {posts.map(post => (
              <div
                key={post.id}
                className="bg-white border border-[#DDD4C0] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#1F1F1F]">
                      {post.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FAF6EC] text-[#7A7466] border border-[#DDD4C0]">
                      작성자: {post.author} ({post.authorBadge})
                    </span>
                  </div>
                  <p className="text-[11px] text-[#666] line-clamp-1">
                    {post.description}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-[#7A7466]">
                    <span>모드: {post.mode === 'matgo' ? '맞고' : '3인'}</span>
                    <span>·</span>
                    <span>투표 수: {post.votesA + post.votesB}표</span>
                    <span>·</span>
                    <span>댓글: {post.comments.length}개</span>
                    <span>·</span>
                    <span>작성: {post.createdAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeletePostClick(post.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#9C3131]/10 hover:bg-[#9C3131] text-[#9C3131] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    글 삭제 (모더레이션)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
