import { api } from '../../api/client.js'
import { getMyUserId } from '../../api/currentUser.js'
import { calcPerPersonPrice, totalWithCommission100 } from '../pod/podUtils.js'

/**
 * 정산(③) API. 백엔드: origin/feature/settlement
 * 접근: 팟의 대표와 참여자만 (다른 건물이면 403 BUILDING_ACCESS_DENIED, 같은 건물이라도 참여 안 했으면 403)
 *
 * 1인당 금액 계산은 백엔드 SettlementService와 같은 식이어야 화면 숫자와 서버 숫자가 같다:
 *   최종 금액 = 영수증 원가 × (1 + 수고비율)
 *   1인당 = 최종 금액 ÷ 참여자 수 (원 단위 올림)
 */

/**
 * 영수증 사진 → OCR로 총액 인식.
 * 결과: { recognizedAmount, success }. 인식에 실패해도 에러가 아니라 success=false로 온다 → 직접 입력으로 전환.
 * 사진 자체가 잘못되면(JPG/PNG 아님, 10MB 초과) 에러를 던진다.
 */
// 요청한 사람은 X-User-Id 헤더로 보낸다. 로그인 후에는 서버 필터가 이 헤더를 토큰 주인으로 덮어써서 사칭이 막힌다.
// (?userId= 쿼리는 예전 서버와의 호환용 — 서버는 헤더가 있으면 헤더를 쓴다)
const withMe = () => ({ headers: { 'X-User-Id': String(getMyUserId()) } })

export async function recognizeReceipt(file) {
  const formData = new FormData()
  formData.append('receipt', file) // 백엔드가 받는 이름이 "receipt"
  const result = await api.upload('/settlements/receipts', formData)
  return {
    success: result.success,
    recognizedAmount: result.recognizedAmount == null ? null : Number(result.recognizedAmount),
  }
}

/**
 * 정산 확정. 결과를 이 브라우저에도 저장해둔다 (정산 결과를 다시 조회하는 API가 아직 없어서).
 * hostPaymentLink: 팟장이 남기는 송금 링크(토스·카카오페이) 또는 계좌번호. 선택이라 비워두면 null로 보낸다.
 */
export async function confirmSettlement(podId, { recognizedCost, commissionRate, hostPaymentLink }) {
  const settlement = await api.post(
    `/settlements/${podId}/confirm?userId=${getMyUserId()}`,
    { recognizedCost, commissionRate, hostPaymentLink: hostPaymentLink?.trim() || null },
    withMe(),
  )
  const normalized = {
    ...settlement,
    recognizedCost: Number(settlement.recognizedCost),
    commissionRate: Number(settlement.commissionRate),
    finalAmount: Number(settlement.finalAmount),
    perPersonAmount: Number(settlement.perPersonAmount),
  }
  try {
    localStorage.setItem(storageKey(podId), JSON.stringify(normalized))
  } catch {
    // 저장 못 해도 이번 화면 이동에는 state로 넘기므로 괜찮다
  }
  return normalized
}

/** 저장해둔 정산 결과. 없으면 null */
export function getSavedSettlement(podId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(podId)))
  } catch {
    return null
  }
}

/**
 * 확정된 정산 결과를 서버에서 다시 받아온다 (GET /settlements/{podId}, 문소원님 구현).
 * 팟장이 아닌 다른 기기의 참여자도 결과를 볼 수 있게 해준다 — 기존엔 confirm 응답을
 * 이 브라우저에만 저장해서, 참여자는 팟장 브라우저가 아니면 결과를 볼 방법이 없었다.
 * 아직 확정 전이거나 없는 팟이면 에러가 아니라 200 + data:null로 온다 — 그대로 null을 돌려준다.
 * 권한이 없거나(403) 서버에 연결하지 못하면 에러를 그대로 던진다 — 예전처럼 null로 삼키면
 * "아직 정산 전"과 "볼 수 없음/연결 실패"가 구분되지 않아 사용자가 계속 기다리게 된다.
 */
export async function fetchSettlement(podId) {
  const settlement = await api.get(`/settlements/${podId}?userId=${getMyUserId()}`, withMe())
  if (!settlement) return null
  return {
    ...settlement,
    recognizedCost: Number(settlement.recognizedCost),
    commissionRate: Number(settlement.commissionRate),
    finalAmount: Number(settlement.finalAmount),
    perPersonAmount: Number(settlement.perPersonAmount),
  }
}

/**
 * 팟 응답에 "1인 몇 개씩 미개봉으로"(unitsPerPerson·unitLabel)가 있으면 "1인 10롤씩" 문구를 만든다.
 * 팟 필드는 팟 담당 쪽에서 새로 붙이는 중이라 없을 수도 있어서, 없으면 null.
 */
export function unitShareText(pod) {
  const units = pod?.unitsPerPerson
  const label = pod?.unitLabel
  if (!units || !label) return null
  return `1인 ${units}${label}씩`
}

const storageKey = (podId) => `sobun.settlement.${podId}`

/** 확정 전 미리보기용 계산 (백엔드와 같은 식) */
export function previewSettlement(cost, commissionRate, participantCount) {
  return {
    finalAmount: Math.round(totalWithCommission100(cost, commissionRate) / 100), // 백엔드: HALF_UP 반올림
    perPersonAmount: calcPerPersonPrice(cost, commissionRate, participantCount),
    baseShare: Math.ceil(cost / Math.max(participantCount, 1)),
  }
}
