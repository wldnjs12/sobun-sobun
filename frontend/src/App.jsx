import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import OnboardingPage from './features/onboarding/OnboardingPage.jsx'
import LandingV2Page from './features/landing2/LandingV2Page.jsx'
import AddressSearchPage from './features/onboarding/AddressSearchPage.jsx'
import BuildingConfirmPage from './features/onboarding/BuildingConfirmPage.jsx'
import BuildingHomePage from './features/pod/BuildingHomePage.jsx'
import PodCreatePage from './features/pod/PodCreatePage.jsx'
import PodDetailPage from './features/pod/PodDetailPage.jsx'
import PodCompletePage from './features/pod/PodCompletePage.jsx'
import PodChatPage from './features/pod/PodChatPage.jsx'
import PodEditPage from './features/pod/PodEditPage.jsx'
import SettlementPage from './features/settlement/SettlementPage.jsx'
import SettlementResultPage from './features/settlement/SettlementResultPage.jsx'
import PaymentStatusPage from './features/settlement/PaymentStatusPage.jsx'
import PickupPage from './features/settlement/PickupPage.jsx'
import MyPage from './features/mypage/MyPage.jsx'
import MyPodsPage from './features/mypage/MyPodsPage.jsx'
import NotificationsPage from './features/mypage/NotificationsPage.jsx'
import CommunityListPage from './features/community/CommunityListPage.jsx'
import CommunityDetailPage from './features/community/CommunityDetailPage.jsx'
import CommunityWritePage from './features/community/CommunityWritePage.jsx'
import LoginPage from './features/account/LoginPage.jsx'
import SignupPage from './features/account/SignupPage.jsx'
import SessionLoading from './components/SessionLoading.jsx'
import { isLoggedIn, isVerified, loadMe } from './api/currentUser.js'

/** 로그인 화면으로 보내면서, 원래 가려던 주소를 ?next= 로 넘긴다 → 로그인 후 그 화면으로 돌아온다 */
function ToLogin() {
  const { pathname, search } = useLocation()
  return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />
}

/** 로그인만 필요한 화면 (주소 등록 등 — 건물이 아직 없어도 들어올 수 있어야 함) */
function RequireLogin({ children }) {
  return isLoggedIn() ? children : <ToLogin />
}

/**
 * 로그인 + 건물 등록(① 1차 인증)까지 마친 사용자만. 건물이 없으면 주소 등록으로 보낸다.
 * 목록·상세 같은 "보기"는 1차 인증만으로 허용 (docs/API_SPEC.md ①).
 * 개설·참여 같은 "행동"은 각 버튼에서 GPS 2차 확인을 한 번 더 거친다 (useLocationCheck).
 */
function RequireBuilding({ children }) {
  if (!isLoggedIn()) return <ToLogin />
  return isVerified() ? children : <Navigate to="/onboarding/address" replace />
}

/** 시작·로그인·가입 화면: 이미 로그인했으면 볼 필요가 없으니 건물 홈(또는 주소 등록)으로 보낸다 */
function GuestOnly({ children }) {
  if (!isLoggedIn()) return children
  return <Navigate to={isVerified() ? '/home' : '/onboarding/address'} replace />
}

/**
 * 앱을 열 때 토큰이 있으면 서버에서 내 정보(건물)를 먼저 받아온다.
 * 그래야 새로고침하거나 다른 기기에서 로그인해도 "내 건물"이 서버 값으로 복구된다.
 * 서버가 꺼져 있는 등으로 실패하면 이 브라우저에 남아 있던 사본으로 계속 진행한다.
 * (토큰이 만료됐으면 client.js가 세션을 지우고 로그인 화면으로 보낸다)
 */
function SessionBoot({ children }) {
  const [ready, setReady] = useState(() => !isLoggedIn())
  useEffect(() => {
    if (!isLoggedIn()) return
    let alive = true
    loadMe()
      .catch(() => {})
      .finally(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [])
  return ready ? children : <SessionLoading />
}

/**
 * 최종 산출물 플로우: 온보딩 → 팟 개설/참여 → 실시간 갱신 → 정산 → 픽업
 * 화면 번호는 stitch_new_starter_project 폴더 번호와 같다.
 */
export default function App() {
  return (
    <BrowserRouter>
      <SessionBoot>
        <Routes>
          {/* ① 온보딩: 시작 → 회원가입/로그인 → 주소 검색(S1') → 건물 확인·동 선택(S1'')
              GPS 2차 확인(S2')·실패 시트(S3)는 화면이 아니라 각 행동 버튼에서 뜬다 (useLocationCheck) */}
          {/* 시연용 랜딩 페이지 2번째 버전(화려한 버전). 로그인 여부와 상관없이 열린다 */}
          <Route path="/intro2" element={<LandingV2Page />} />
          <Route path="/" element={<GuestOnly><OnboardingPage /></GuestOnly>} />
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />
          <Route path="/onboarding/address" element={<RequireLogin><AddressSearchPage /></RequireLogin>} />
          <Route path="/onboarding/confirm" element={<RequireLogin><BuildingConfirmPage /></RequireLogin>} />

          {/* ② 팟 (05/16 건물 홈 · 06 생성 · 07 상세 + 08 참여 확인 · 09 모집 완료) */}
          <Route path="/home" element={<RequireBuilding><BuildingHomePage /></RequireBuilding>} />
          <Route path="/pods/new" element={<RequireBuilding><PodCreatePage /></RequireBuilding>} />
          <Route path="/pods/:podId" element={<RequireBuilding><PodDetailPage /></RequireBuilding>} />
          <Route path="/pods/:podId/edit" element={<RequireBuilding><PodEditPage /></RequireBuilding>} />
          <Route path="/pods/:podId/complete" element={<RequireBuilding><PodCompletePage /></RequireBuilding>} />
          <Route path="/pods/:podId/chat" element={<RequireBuilding><PodChatPage /></RequireBuilding>} />

          {/* ③ 정산 (10 영수증 + 11 금액 확인 · 12 정산 결과 · 13 비대면 픽업) */}
          <Route path="/settlements/:podId" element={<RequireBuilding><SettlementPage /></RequireBuilding>} />
          <Route path="/settlements/:podId/result" element={<RequireBuilding><SettlementResultPage /></RequireBuilding>} />
          <Route path="/settlements/:podId/payments" element={<RequireBuilding><PaymentStatusPage /></RequireBuilding>} />
          <Route path="/pods/:podId/pickup" element={<RequireBuilding><PickupPage /></RequireBuilding>} />

          {/* 마이페이지 (15) · 내 팟 */}
          <Route path="/mypage" element={<RequireBuilding><MyPage /></RequireBuilding>} />
          <Route path="/my-pods" element={<RequireBuilding><MyPodsPage /></RequireBuilding>} />
          <Route path="/notifications" element={<RequireBuilding><NotificationsPage /></RequireBuilding>} />

          {/* ⑤ 커뮤니티: 목록(S16) · 상세(S17) · 글쓰기(S18). 들어올 때 GPS 확인(COMMUNITY_ENTER) */}
          <Route path="/community" element={<RequireBuilding><CommunityListPage /></RequireBuilding>} />
          <Route path="/community/posts/:postId" element={<RequireBuilding><CommunityDetailPage /></RequireBuilding>} />
          <Route path="/community/write" element={<RequireBuilding><CommunityWritePage /></RequireBuilding>} />

          {/* 없는 주소로 오면 시작 화면으로 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionBoot>
    </BrowserRouter>
  )
}
