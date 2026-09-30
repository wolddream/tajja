import React, { useState } from 'react';
import { QuizQuestion } from '../types/hwatu';
import { DEFAULT_QUIZZES } from '../utils/quizData';
import { CardView } from './CardView';
import { playClick, playSuccess, playCardSnap } from '../utils/sound';

interface QuizTabProps {
  attendanceStreak: number;
  quizCorrectCount: number;
  onQuizCorrect: () => void;
  onQuizAttempt: () => void;
}

export const QuizTab: React.FC<QuizTabProps> = ({
  attendanceStreak,
  quizCorrectCount,
  onQuizCorrect,
  onQuizAttempt,
}) => {
  const [currentQuizIdx, setCurrentQuizIdx] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);

  const currentQuiz: QuizQuestion = DEFAULT_QUIZZES[currentQuizIdx % DEFAULT_QUIZZES.length];

  const handleSelectOption = (optionId: number) => {
    if (isAnswered) return;
    playClick();
    setSelectedOptionId(optionId);
  };

  const handleSubmitAnswer = () => {
    if (selectedOptionId === null || isAnswered) return;

    setIsAnswered(true);
    onQuizAttempt();

    const chosen = currentQuiz.options.find(o => o.id === selectedOptionId);
    if (chosen && chosen.isCorrect) {
      playSuccess();
      onQuizCorrect();
    } else {
      playCardSnap();
    }
  };

  const handleNextQuiz = () => {
    playClick();
    setCurrentQuizIdx(prev => (prev + 1) % DEFAULT_QUIZZES.length);
    setSelectedOptionId(null);
    setIsAnswered(false);
  };

  const chosenOption = currentQuiz.options.find(o => o.id === selectedOptionId);
  const isCorrectAnswer = chosenOption?.isCorrect ?? false;

  return (
    <div className="space-y-6 pb-10">
      {/* Top Banner: Daily Streak & Stats */}
      <div className="bg-white border border-[#DDD4C0] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#9C3131]/10 text-[#9C3131] flex items-center justify-center text-xl font-bold">
            🔥
          </div>
          <div>
            <div className="text-xs text-[#7A7466]">출석 현황</div>
            <div className="font-bold text-base text-[#1F1F1F]">
              연속 <span className="text-[#9C3131] font-mono">{attendanceStreak}</span>일 출석 중!
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#FAF6EC] border border-[#E5DFCE]">
            <span className="text-[#7A7466]">오늘의 문제: </span>
            <span className="font-bold text-[#A9791C]">
              {(currentQuizIdx % DEFAULT_QUIZZES.length) + 1} / {DEFAULT_QUIZZES.length}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#FAF6EC] border border-[#E5DFCE]">
            <span className="text-[#7A7466]">누적 퀴즈 정답: </span>
            <span className="font-bold text-[#3B6255] font-mono">{quizCorrectCount}회</span>
          </div>
        </div>
      </div>

      {/* Quiz Card Container */}
      <div className="bg-white border border-[#DDD4C0] rounded-2xl p-6 shadow-sm space-y-6">
        {/* Quiz Title & Scenario */}
        <div className="space-y-2 border-b border-[#E5DFCE] pb-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-[#2B3F5C] text-white">
              실전 수읽기 퀴즈
            </span>
            <span className="text-xs text-[#7A7466]">
              {currentQuiz.mode === 'matgo' ? '2인 맞고 규칙' : '3인 고스톱 규칙'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#1F1F1F]">
            Q. {currentQuiz.title}
          </h2>
          <p className="text-sm leading-relaxed text-[#444]">
            {currentQuiz.scenarioDescription}
          </p>
        </div>

        {/* Board Situation Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Floor Cards */}
          <div className="p-4 rounded-xl bg-[#FAF6EC] border border-[#E5DFCE] space-y-2">
            <div className="text-xs font-bold text-[#A9791C] flex items-center justify-between">
              <span>바닥에 깔린 패 (바닥패)</span>
              <span className="text-[11px] text-[#7A7466]">{currentQuiz.floorCards.length}장</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {currentQuiz.floorCards.map(c => (
                <CardView key={c.id} card={c} size="sm" disabled={true} />
              ))}
            </div>
          </div>

          {/* Opponent Situation */}
          <div className="p-4 rounded-xl bg-[#FAF6EC] border border-[#E5DFCE] space-y-2 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[#9C3131]">
                상대 전황 요약 (현재 획득 패)
              </div>
              <div className="text-xs text-[#333] mt-2 font-medium leading-relaxed">
                {currentQuiz.opponentCapturedSummary}
              </div>
            </div>
            <div className="text-[11px] text-[#7A7466] border-t border-[#E5DFCE] pt-2">
              * 상대의 다음 턴 잠재 득점을 예측하고 최적의 수를 선택하세요.
            </div>
          </div>
        </div>

        {/* 4 Multiple Choice Options (4지선다) */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-[#1F1F1F]">
            가장 최선의 한 수는 무엇인가요? (4지선다)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuiz.options.map((option, idx) => {
              const isSelected = selectedOptionId === option.id;
              let optionStyle = 'bg-white border-[#DDD4C0] hover:border-[#A9791C]';

              if (isAnswered) {
                if (option.isCorrect) {
                  optionStyle = 'bg-[#3B6255]/10 border-[#3B6255] text-[#3B6255] font-semibold';
                } else if (isSelected && !option.isCorrect) {
                  optionStyle = 'bg-[#9C3131]/10 border-[#9C3131] text-[#9C3131]';
                } else {
                  optionStyle = 'opacity-50 border-[#E5DFCE]';
                }
              } else if (isSelected) {
                optionStyle = 'bg-[#A9791C]/10 border-[#A9791C] ring-2 ring-[#A9791C]';
              }

              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  disabled={isAnswered}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${optionStyle}`}
                >
                  <span className="w-6 h-6 rounded-full bg-[#FAF6EC] border border-[#DDD4C0] flex items-center justify-center font-bold text-xs text-[#555] shrink-0">
                    {idx + 1}
                  </span>
                  <CardView card={option.card} size="sm" disabled={true} />
                  <div className="flex-1 text-xs">
                    <div className="font-bold text-[#1F1F1F]">
                      {option.card.name}
                    </div>
                    <div className="text-[11px] text-[#7A7466]">
                      {option.card.plant} ({option.card.label})
                    </div>
                  </div>
                  {isAnswered && option.isCorrect && (
                    <span className="text-xs font-bold text-[#3B6255] px-2 py-0.5 rounded bg-white">
                      정답 ✓
                    </span>
                  )}
                  {isAnswered && isSelected && !option.isCorrect && (
                    <span className="text-xs font-bold text-[#9C3131] px-2 py-0.5 rounded bg-white">
                      오답 ✕
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit or Next Controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-[#7A7466]">
            {!isAnswered ? '보기를 선택한 후 정답 확인을 누르세요.' : '해설을 꼼꼼히 확인하세요.'}
          </div>

          <div className="flex items-center gap-2">
            {!isAnswered ? (
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={selectedOptionId === null}
                className="px-6 py-2.5 rounded-xl bg-[#A9791C] hover:bg-[#8F6516] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                정답 확인하기
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextQuiz}
                className="px-6 py-2.5 rounded-xl bg-[#2B3F5C] hover:bg-[#1E2E44] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                다음 퀴즈 풀기 →
              </button>
            )}
          </div>
        </div>

        {/* Answer Feedback & Detailed Explanation */}
        {isAnswered && (
          <div
            className={`p-4 rounded-xl border animate-in fade-in duration-200 ${
              isCorrectAnswer
                ? 'bg-[#3B6255]/5 border-[#3B6255]/30'
                : 'bg-[#9C3131]/5 border-[#9C3131]/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">
                {isCorrectAnswer ? '🎉' : '💡'}
              </span>
              <span
                className={`font-bold text-sm ${
                  isCorrectAnswer ? 'text-[#3B6255]' : 'text-[#9C3131]'
                }`}
              >
                {isCorrectAnswer
                  ? '정답입니다! 훌륭한 수읽기입니다.'
                  : '아쉽습니다! 오답입니다.'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#2F2F2F]">
              {chosenOption?.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
