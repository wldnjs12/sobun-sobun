import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import OnboardingPage from './features/onboarding/OnboardingPage.jsx'
import BuildingHomePage from './features/pod/BuildingHomePage.jsx'
import PodCreatePage from './features/pod/PodCreatePage.jsx'
import PodDetailPage from './features/pod/PodDetailPage.jsx'
import PodCompletePage from './features/pod/PodCompletePage.jsx'
import SettlementPage from './features/settlement/SettlementPage.jsx'
import ProductListPage from './features/products/ProductListPage.jsx'

/**
 * 최종 산출물 플로우: 온보딩 -> 팟 개설/참여 -> 실시간 갱신 -> 정산
 * 라우트 4개가 각각 기능 담당자의 작업 영역.
 */
export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ display: 'flex', gap: 12, padding: 16 }}>
        <Link to="/">온보딩</Link>
        <Link to="/home">건물 홈</Link>
        <Link to="/pods/1">팟</Link>
        <Link to="/settlements/1">정산</Link>
        <Link to="/products">최저가 조회</Link>
      </nav>
      <Routes>
        <Route path="/" element={<OnboardingPage />} />
        <Route path="/home" element={<BuildingHomePage />} />
        <Route path="/pods/new" element={<PodCreatePage />} />
        <Route path="/pods/:podId" element={<PodDetailPage />} />
        <Route path="/pods/:podId/complete" element={<PodCompletePage />} />
        <Route path="/settlements/:podId" element={<SettlementPage />} />
        <Route path="/products" element={<ProductListPage />} />
      </Routes>
    </BrowserRouter>
  )
}
