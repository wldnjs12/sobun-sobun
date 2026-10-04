import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import OnboardingPage from './features/onboarding/OnboardingPage.jsx'
import AddressSearchPage from './features/onboarding/AddressSearchPage.jsx'
import BuildingConfirmPage from './features/onboarding/BuildingConfirmPage.jsx'
import BuildingHomePage from './features/pod/BuildingHomePage.jsx'
import PodCreatePage from './features/pod/PodCreatePage.jsx'
import PodDetailPage from './features/pod/PodDetailPage.jsx'
import PodCompletePage from './features/pod/PodCompletePage.jsx'
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
import { isVerified } from './api/currentUser.js'

/**
 * 건물 등록(① 1차 인증)을 안 한 사용자는 시작 화면으로 돌려보낸다.
 * 목록·상세 같은 "보기"는 1차 인증만으로 허용 (docs/API_SPEC.md ①).
 * 개설·참여 같은 "행동"은 각 버튼에서 GPS 2차 확인을 한 번 더 거친다 (useLocationCheck).
 */
function RequireBuilding({ children }) {
  return isVerified() ? children : <Navigate to="/" replace />
}

/**
 * 최종 산출물 플로우: 온보딩 → 팟 개설/참여 → 실시간 갱신 → 정산 → 픽업
 * 화면 번호는 stitch_new_starter_project 폴더 번호와 같다.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ① 온보딩: 시작 → 주소 검색(S1') → 건물 확인·동 선택(S1'')
            GPS 2차 확인(S2')·실패 시트(S3)는 화면이 아니라 각 행동 버튼에서 뜬다 (useLocationCheck) */}
        <Route path="/" element={<OnboardingPage />} />
        <Route path="/onboarding/address" element={<AddressSearchPage />} />
        <Route path="/onboarding/confirm" element={<BuildingConfirmPage />} />

        {/* ② 팟 (05/16 건물 홈 · 06 생성 · 07 상세 + 08 참여 확인 · 09 모집 완료) */}
        <Route path="/home" element={<RequireBuilding><BuildingHomePage /></RequireBuilding>} />
        <Route path="/pods/new" element={<RequireBuilding><PodCreatePage /></RequireBuilding>} />
        <Route path="/pods/:podId" element={<RequireBuilding><PodDetailPage /></RequireBuilding>} />
        <Route path="/pods/:podId/complete" element={<RequireBuilding><PodCompletePage /></RequireBuilding>} />

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
    </BrowserRouter>
  )
}
