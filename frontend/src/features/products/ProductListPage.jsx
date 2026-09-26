import { useState } from 'react'
import { api } from '../../api/client.js'

/**
 * 핵심 기능 ④: 최저가 조회 기반 상품 리스트 (담당: 도우현 프론트 / 김민준 백엔드)
 * 다른 기능과 독립적으로 개발 가능 -> 초보 팀원 학습용으로 적합.
 */
export default function ProductListPage() {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState([])

  const handleSearch = async () => {
    const data = await api.get(`/products/search?keyword=${encodeURIComponent(keyword)}`)
    setResults(data)
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>최저가 조회</h1>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="예: 계란 30구" />
      <button onClick={handleSearch}>검색</button>
      <ul>
        {results.map((r, i) => (
          <li key={i}>{r.name} - {r.price}원 ({r.mallName})</li>
        ))}
      </ul>
    </div>
  )
}
