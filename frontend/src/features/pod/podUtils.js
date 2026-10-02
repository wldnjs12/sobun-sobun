import { useEffect, useState } from 'react'

/**
 * 1인당 금액 계산. 백엔드 PodService와 같은 식이어야 화면 숫자와 서버 숫자가 어긋나지 않는다.
 *   1인당 금액 = 총액 × (1 + 수고비율) ÷ 인원, 원 단위 올림
 * headCount에 무엇을 넣느냐로 의미가 달라진다:
 *   - 목표 인원 → "다 모이면 이 가격" (목록·모집 완료 화면)
 *   - 현재 인원 + 1 → "내가 지금 참여하면 이 가격" (상세·참여 확인 화면)
 */
export function calcPerPersonPrice(totalAmount, commissionRate, headCount) {
  return Math.ceil((totalAmount * (1 + commissionRate)) / Math.max(headCount, 1))
}

/** 혼자 샀을 때 가격 대비 몇 % 싸게 사는지. 비교 가격이 없으면 null. */
export function calcDiscountRate(perPersonPrice, originalPrice) {
  if (!originalPrice) return null
  return Math.round((1 - perPersonPrice / originalPrice) * 100)
}

/**
 * 마감 기한까지 남은 시간을 1초마다 다시 계산하는 훅.
 * 팟 정책상 deadline은 표시용일 뿐 자동 마감되지 않으므로(docs/features/02-pod.md),
 * 기한이 지나도 화면은 그대로 두고 문구만 바꾼다.
 */
export function useRemainingTime(deadline) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timerId = setInterval(() => setNow(Date.now()), 1000)
    // 화면에서 사라질 때 타이머를 정리하지 않으면 계속 돌면서 메모리를 쓴다
    return () => clearInterval(timerId)
  }, [])

  const diff = new Date(deadline).getTime() - now
  if (diff <= 0) return '기한 지남'

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  if (days >= 1) return `${days}일 남음`

  const pad = (n) => String(n).padStart(2, '0')
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)} 남음`
}
