import { useState } from 'react'
import { useParams } from 'react-router-dom'

/**
 * 핵심 기능 ③: 대표 수고비 정산식 (담당: 홍수진 프론트 / 문소원 백엔드 페어)
 * TODO:
 *  - 영수증 이미지 업로드 폼 -> POST /api/settlements/receipts (multipart)
 *  - OCR 인식 실패 시 수동 입력 폼으로 전환(fallback)
 *  - 최종 정산 결과(원가 vs 정산 금액) 화면 표시
 */
export default function SettlementPage() {
  const { podId } = useParams()
  const [file, setFile] = useState(null)

  return (
    <div style={{ padding: 16 }}>
      <h1>팟 #{podId} 정산</h1>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
      {/* TODO: 업로드 버튼 + 결과 표시 UI */}
    </div>
  )
}
