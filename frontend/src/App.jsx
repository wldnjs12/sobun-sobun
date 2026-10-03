import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import OnboardingPage from './features/onboarding/OnboardingPage.jsx'
import QrScanPage from './features/onboarding/QrScanPage.jsx'
import VerifyLocationPage from './features/onboarding/VerifyLocationPage.jsx'
import BuildingHomePage from './features/pod/BuildingHomePage.jsx'
import PodCreatePage from './features/pod/PodCreatePage.jsx'
import PodDetailPage from './features/pod/PodDetailPage.jsx'
import PodCompletePage from './features/pod/PodCompletePage.jsx'
import SettlementPage from './features/settlement/SettlementPage.jsx'
import SettlementResultPage from './features/settlement/SettlementResultPage.jsx'
import PickupPage from './features/settlement/PickupPage.jsx'
import ProductListPage from './features/products/ProductListPage.jsx'
import MyPage from './features/mypage/MyPage.jsx'

/**
 * 최종 산출물 플로우: 온보딩 → 팟 개설/참여 → 실시간 갱신 → 정산 → 픽업
 * 화면 번호는 stitch_new_starter_project 폴더 번호와 같다.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ① 온보딩 (01 시작 · 02 QR 스캔 · 03 위치 확인 + 04 인증 실패) */}
        <Route path="/" element={<OnboardingPage />} />
        <Route path="/onboarding/scan" element={<QrScanPage />} />
        <Route path="/onboarding/verify" element={<VerifyLocationPage />} />

        {/* ② 팟 (05/16 건물 홈 · 06 생성 · 07 상세 + 08 참여 확인 · 09 모집 완료) */}
        <Route path="/home" element={<BuildingHomePage />} />
        <Route path="/pods/new" element={<PodCreatePage />} />
        <Route path="/pods/:podId" element={<PodDetailPage />} />
        <Route path="/pods/:podId/complete" element={<PodCompletePage />} />

        {/* ③ 정산 (10 영수증 + 11 금액 확인 · 12 정산 결과 · 13 비대면 픽업) */}
        <Route path="/settlements/:podId" element={<SettlementPage />} />
        <Route path="/settlements/:podId/result" element={<SettlementResultPage />} />
        <Route path="/pods/:podId/pickup" element={<PickupPage />} />

        {/* ④ 최저가 (14) · 마이페이지 (15) */}
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/mypage" element={<MyPage />} />

        {/* 없는 주소로 오면 시작 화면으로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
