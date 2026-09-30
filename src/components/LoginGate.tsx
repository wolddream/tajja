import React, { useState } from 'react';
import { AuthUser } from '../types/hwatu';
import { ADMIN_EMAILS } from '../utils/storage';
import { playClick, playSuccess } from '../utils/sound';

interface LoginGateProps {
  onLogin: (user: AuthUser) => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({ onLogin }) => {
  const [showMockModal, setShowMockModal] = useState(false);
  const [name, setName] = useState('타짜 훈련생');
  const [email, setEmail] = useState('wolddream@gmail.com');

  const handleStartGoogleFlow = () => {
    playClick();
    setShowMockModal(true);
  };

  const handleQuickLogin = (selectedName: string, selectedEmail: string) => {
    playSuccess();
    const user: AuthUser = {
      name: selectedName,
      email: selectedEmail,
      loginAt: new Date().toISOString(),
    };
    onLogin(user);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    playSuccess();
    const user: AuthUser = {
      name: name.trim() || '타짜 훈련생',
      email: email.trim().toLowerCase(),
      loginAt: new Date().toISOString(),
    };
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EC] flex flex-col items-center justify-center p-4 selection:bg-[#A9791C]/20 selection:text-[#A9791C]">
      {/* Background traditional accent patterns */}
      <div className="w-full max-w-md bg-white border border-[#DDD4C0] rounded-3xl p-8 shadow-xl space-y-7 relative overflow-hidden text-center">
        {/* Top decorative badge */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#A9791C] text-white text-[10px] font-bold px-4 py-1 rounded-b-xl tracking-wider">
          고스톱 수읽기 &amp; 전술 트레이너
        </div>

        {/* Brand Logo & Title */}
        <div className="pt-2 flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#2B3F5C] text-[#FAF6EC] border-2 border-[#A9791C] shadow-md flex items-center justify-center text-2xl font-serif font-black">
            光
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#1F1F1F] font-serif">
              훈수패
            </h1>
            <p className="text-xs font-semibold text-[#A9791C] tracking-wide mt-0.5">
              HUNSU-PAE TACTICAL LAB
            </p>
          </div>
        </div>

        {/* Catchphrase & Value Proposition */}
        <div className="space-y-2 px-2">
          <h2 className="text-base font-bold text-[#1F1F1F] leading-snug">
            "지금 어떤 패를 내야 하는지와 그 이유"를<br />
            알려주는 고스톱 실전 연습 앱
          </h2>
          <p className="text-xs text-[#666666] leading-relaxed">
            실시간 대국 훈수가 아닌, 가상의 불완전정보 상황을 두고 몬테카를로 기대 승률과 수읽기 근거를 체계적으로 학습합니다.
          </p>
        </div>

        {/* 4 Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-2 text-left text-xs bg-[#FAF6EC] p-3.5 rounded-2xl border border-[#E5DFCE]">
          <div className="flex items-center gap-2">
            <span className="text-base">🎴</span>
            <span className="font-semibold text-[#333]">맞고 &amp; 3인 고스톱</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <span className="font-semibold text-[#333]">기대 승률 &amp; 근거 분석</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">❓</span>
            <span className="font-semibold text-[#333]">매일 실전 4지선다 퀴즈</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">💬</span>
            <span className="font-semibold text-[#333]">타짜 훈수 토론 커뮤니티</span>
          </div>
        </div>

        {/* Google Continue Button (Google Official Brand Style) */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleStartGoogleFlow}
            className="w-full h-12 bg-white hover:bg-[#F8F9FA] active:bg-[#EEEEEE] text-[#3c4043] border border-[#dadce0] rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-3 px-4 font-medium text-sm cursor-pointer"
          >
            {/* Official Google SVG G-Logo */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-semibold text-[#1F1F1F]">Google로 계속하기</span>
          </button>

          <p className="text-[11px] text-[#7A7466]">
            로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
          </p>
        </div>
      </div>

      {/* Mock Google Login Modal */}
      {showMockModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-[#FAF6EC] border border-[#DDD4C0] rounded-2xl w-full max-w-md shadow-2xl p-6 text-[#222] space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-[#E5DFCE] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#34A853]" />
                <h3 className="font-bold text-base text-[#1F1F1F]">
                  Google 계정 로그인 (시뮬레이션)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMockModal(false)}
                className="text-[#7A7466] hover:text-[#111] text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#666] leading-relaxed">
              실제 OAuth 연동 전 프로토타입 단계입니다. 이메일을 입력하거나 아래 빠른 선택 버튼으로 로그인 상태를 시뮬레이션할 수 있습니다.
            </p>

            {/* Quick Login Presets */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#A9791C]">
                빠른 계정 선택
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('관리자 타짜', ADMIN_EMAILS[0])}
                  className="w-full p-3 rounded-xl border border-[#A9791C]/50 bg-white hover:bg-[#FFFDF7] text-left flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-xs text-[#1F1F1F] flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#A9791C] text-white text-[10px]">관리자 권한</span>
                      <span>관리자 타짜</span>
                    </div>
                    <div className="text-[11px] font-mono text-[#7A7466]">
                      {ADMIN_EMAILS[0]}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#A9791C] group-hover:translate-x-1 transition-transform">
                    즉시 로그인 →
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('동네 초보', 'player@example.com')}
                  className="w-full p-3 rounded-xl border border-[#DDD4C0] bg-white hover:bg-[#F9F9F9] text-left flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-xs text-[#1F1F1F] flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#FAF6EC] border border-[#DDD4C0] text-[#555] text-[10px]">일반 회원</span>
                      <span>동네 초보</span>
                    </div>
                    <div className="text-[11px] font-mono text-[#7A7466]">
                      player@example.com
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#555] group-hover:translate-x-1 transition-transform">
                    즉시 로그인 →
                  </span>
                </button>
              </div>
            </div>

            {/* Custom Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-[#E5DFCE]">
              <div className="text-xs font-bold text-[#1F1F1F]">
                직접 입력하여 로그인
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#555] mb-1">
                  닉네임 / 이름
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#DDD4C0] text-xs focus:outline-hidden focus:border-[#A9791C]"
                  placeholder="예: 종로 타짜"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#555] mb-1">
                  구글 계정 이메일
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#DDD4C0] text-xs font-mono focus:outline-hidden focus:border-[#A9791C]"
                  placeholder="example@gmail.com"
                />
                <p className="text-[10px] text-[#888] mt-1">
                  * <span className="font-mono text-[#A9791C]">wolddream@gmail.com</span> 입력 시 관리자 탭이 활성화됩니다.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMockModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#7A7466] hover:bg-[#E5DFCE]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#2B3F5C] hover:bg-[#1E2E44] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  로그인 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
