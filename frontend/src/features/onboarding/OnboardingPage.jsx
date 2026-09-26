import { useState } from 'react'
import { api } from '../../api/client.js'

/**
 * 핵심 기능 ①: QR+GPS 건물 인증 온보딩 (담당: 김민준, 프론트)
 * TODO:
 *  - QR 스캔 라이브러리(zxing 등) 붙이기 -> qrToken 얻기
 *  - navigator.geolocation.getCurrentPosition으로 좌표 얻기 (아래는 기본 형태)
 *  - /api/auth/verify 로 qrToken + 좌표 전송, 통과하면 팟 목록으로 이동
 */
export default function OnboardingPage() {
  const [status, setStatus] = useState('idle')

  const handleScan = async (qrToken) => {
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.post('/auth/verify', {
            qrToken,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          setStatus('verified')
        } catch (e) {
          setStatus('failed')
        }
      },
      () => setStatus('location-denied'),
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>건물 인증</h1>
      <p>현재 상태: {status}</p>
      {/* TODO: QR 스캐너 컴포넌트로 교체, 지금은 임시 버튼 */}
      <button onClick={() => handleScan('temp-qr-token')}>QR 스캔 테스트</button>
    </div>
  )
}
