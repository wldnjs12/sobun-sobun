import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { BUILDING, createPod } from './podApi.js'
import { calcPerPersonPrice } from './podUtils.js'
import useLocationCheck from '../onboarding/useLocationCheck.jsx'
import styles from './PodCreatePage.module.css'

const MIN_MEMBERS = 2
const MAX_MEMBERS = 10

// 수고비율 기본값 5% (docs/features/02-pod.md). 조정 허용 여부는 팀 논의 중이라 선택지로 둠.
const FEE_OPTIONS = [
  { rate: 0, label: '봉사' },
  { rate: 0.03, label: '가벼운 팁' },
  { rate: 0.05, label: '추천 ⭐' },
  { rate: 0.08, label: '정성 포장' },
]

const DEADLINE_OPTIONS = [
  { key: 'tonight', icon: 'bedtime', label: '오늘 밤 10시' },
  { key: 'tomorrowNoon', icon: 'wb_sunny', label: '내일 정오' },
  { key: 'custom', icon: 'tune', label: '직접 설정' },
]

/** 선택한 마감 옵션을 실제 날짜로 바꾼다. */
function resolveDeadline(key, customValue) {
  const date = new Date()
  if (key === 'tonight') {
    date.setHours(22, 0, 0, 0)
    return date
  }
  if (key === 'tomorrowNoon') {
    date.setDate(date.getDate() + 1)
    date.setHours(12, 0, 0, 0)
    return date
  }
  return customValue ? new Date(customValue) : null
}

/**
 * 팟 생성 (디자인 핸드오프 S5 · Stitch 06번).
 * 입력값을 전부 state로 들고 있다가 "팟 만들기"를 누르면 POST /pods 로 보낸다.
 * 이렇게 input의 값을 React state가 쥐고 있는 방식을 "제어 컴포넌트(controlled component)"라고 한다.
 */
export default function PodCreatePage() {
  const navigate = useNavigate()
  // ⑤ 커뮤니티 "공구 제안" 글의 [이 품목으로 팟 열기]로 넘어오면 state에 { title, totalAmount? }가 담겨 온다
  const fromSuggestion = useLocation().state

  const [title, setTitle] = useState(fromSuggestion?.title ?? '')
  const [memberCount, setMemberCount] = useState(4)
  const [totalAmount, setTotalAmount] = useState(fromSuggestion?.totalAmount ? String(fromSuggestion.totalAmount) : '')
  const [originalPrice, setOriginalPrice] = useState('')
  const [commissionRate, setCommissionRate] = useState(0.05)
  const [deadlineKey, setDeadlineKey] = useState('tomorrowNoon')
  const [customDeadline, setCustomDeadline] = useState('')
  const [pledged, setPledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const total = Number(totalAmount) || 0
  const perPerson = calcPerPersonPrice(total, commissionRate, memberCount)
  const myFee = Math.round(total * commissionRate)
  const deadline = resolveDeadline(deadlineKey, customDeadline)
  const tonightPassed = new Date().getHours() >= 22

  // 제출 전에 막아야 할 조건을 한 곳에 모아두면, 버튼 비활성화와 에러 문구에 같이 쓸 수 있다
  const problem = !title.trim()
    ? '소분할 품목을 입력해주세요'
    : total <= 0
      ? '구매 예정 총액을 입력해주세요'
      : !deadline || deadline <= new Date()
        ? '마감 시간은 지금보다 뒤여야 해요'
        : !pledged
          ? '안심 비대면 약속에 동의해주세요'
          : null

  // ① 2차 인증: 팟을 열기 직전에 "지금 등록한 건물 근처에 있는지" GPS로 확인 (실패하면 바텀시트)
  const { runWithLocationCheck, checking, locationSheet } = useLocationCheck()

  const handleSubmit = (e) => {
    e.preventDefault() // form 기본 동작(페이지 새로고침)을 막는다
    if (problem) return
    runWithLocationCheck('POD_CREATE', submitPod)
  }

  const submitPod = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const pod = await createPod({
        title: title.trim(),
        totalAmount: total,
        originalPrice: Number(originalPrice) > 0 ? Number(originalPrice) : null,
        targetParticipantCount: memberCount,
        commissionRate,
        deadline,
      })
      // replace: 뒤로가기 했을 때 다시 생성 폼으로 돌아오지 않게 기록을 바꿔치기
      navigate(`/pods/${pod.id}`, { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="팟 생성" />

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.tip}>
          <span className={styles.tipIcon}>
            <Icon name="eco" size={20} filled />
          </span>
          <div className={styles.tipText}>
            <span className={styles.tipLabel}>{fromSuggestion ? '커뮤니티 제안에서 가져왔어요' : '스마트 소분 팁'}</span>
            <p>
              {fromSuggestion
                ? '제안 글의 품목이 채워져 있어요. 총액은 실제 구매 금액으로 입력해주세요.'
                : '혼자 사긴 많은 대용량 묶음, 이웃과 똑똑하게 나눠요'}
            </p>
          </div>
        </div>

        <section className={styles.section}>
          <label htmlFor="pod-title" className={styles.sectionTitle}>
            <Icon name="shopping_bag" size={18} className={styles.primaryIcon} />
            소분할 품목
          </label>
          <div className={styles.inputWrap}>
            <Icon name="search" size={20} className={styles.inputIconLeft} />
            <input
              id="pod-title"
              className={`${styles.input} ${styles.inputWithIcon}`}
              placeholder="나누고 싶은 대용량 상품을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {title && (
              <button type="button" aria-label="지우기" className={styles.clearButton} onClick={() => setTitle('')}>
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <Icon name="groups" size={18} className={styles.primaryIcon} />
              소분 인원 및 금액
            </span>
            <span className={styles.secondaryHint}>
              최소 {MIN_MEMBERS}명 ~ 최대 {MAX_MEMBERS}명
            </span>
          </div>

          <div className={styles.stepperRow}>
            <div>
              <div className={styles.fieldLabel}>나누어 살 인원</div>
              <div className={styles.fieldHint}>(본인 포함)</div>
            </div>
            <div className={styles.stepper}>
              <button
                type="button"
                aria-label="인원 줄이기"
                disabled={memberCount <= MIN_MEMBERS}
                onClick={() => setMemberCount(memberCount - 1)}
              >
                <Icon name="remove" size={18} />
              </button>
              <span className={styles.stepperValue}>{memberCount}</span>
              <button
                type="button"
                aria-label="인원 늘리기"
                disabled={memberCount >= MAX_MEMBERS}
                onClick={() => setMemberCount(memberCount + 1)}
              >
                <Icon name="add" size={18} />
              </button>
            </div>
          </div>

          <div>
            <div className={styles.fieldRow}>
              <label htmlFor="pod-total" className={styles.fieldLabel}>
                구매 예정 총액
              </label>
              <span className={styles.fieldHint}>최종 정산은 영수증 금액 기준</span>
            </div>
            <div className={styles.inputWrap}>
              <input
                id="pod-total"
                type="number"
                inputMode="numeric"
                min="0"
                step="1" /* 100원 단위로 막으면 21,990원 같은 실제 가격을 브라우저가 거절한다 */
                placeholder="0"
                className={`${styles.input} ${styles.amountInput}`}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
              <span className={styles.amountUnit}>원</span>
            </div>
          </div>

          <div>
            <div className={styles.fieldRow}>
              <label htmlFor="pod-original-price" className={styles.fieldLabel}>
                혼자 샀을 때 가격 (선택)
              </label>
              <span className={styles.fieldHint}>정산 결과에서 절약액을 보여줄 때 씀</span>
            </div>
            <div className={styles.inputWrap}>
              <input
                id="pod-original-price"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="예: 일반 마트 소량 구매가"
                className={`${styles.input} ${styles.amountInput}`}
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
              />
              <span className={styles.amountUnit}>원</span>
            </div>
          </div>

          <div className={styles.preview}>
            <div className={styles.previewRow}>
              <span className={styles.fieldHint}>1인당 예상 소분가 (수고비 포함)</span>
              <span className={styles.previewPrice}>약 {perPerson.toLocaleString()}원</span>
            </div>
            <div className={styles.shares}>
              {Array.from({ length: memberCount }, (_, i) => (
                <span key={i} className={`${styles.share} ${i === 0 ? styles.shareMine : ''}`}>
                  {i === 0 ? '나' : `${i + 1}번`}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <Icon name="volunteer_activism" size={18} className={styles.secondaryIcon} />
              대표 수고비율
            </span>
            <span className={styles.fieldHint}>포장·이동 비용 보상</span>
          </div>
          <div className={styles.feeGrid}>
            {FEE_OPTIONS.map((option) => (
              <button
                key={option.rate}
                type="button"
                className={`${styles.feeChip} ${commissionRate === option.rate ? styles.feeChipActive : ''}`}
                onClick={() => setCommissionRate(option.rate)}
              >
                <span>{Math.round(option.rate * 100)}%</span>
                <small>{option.label}</small>
              </button>
            ))}
          </div>
          <div className={styles.feeInfo}>
            <Icon name="lightbulb" size={22} filled className={styles.secondaryIcon} />
            <p>
              총액 {total.toLocaleString()}원 기준, 내 수고비는 <u>{myFee.toLocaleString()}원</u>이에요.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <Icon name="lock_clock" size={18} className={styles.primaryIcon} />
              비대면 픽업 거점
            </span>
            <span className={styles.defaultTag}>기본설정</span>
          </div>
          <div className={styles.pickup}>
            <span className={styles.pickupIcon}>
              <Icon name="apartment" size={24} />
            </span>
            <div>
              <div className={styles.fieldLabel}>{BUILDING.name} 1층 무인락커</div>
              <div className={styles.fieldHint}>얼굴 마주치지 않고 보관함에서 주고받아요</div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.sectionTitle}>
            <Icon name="schedule" size={18} className={styles.primaryIcon} />
            모집 마감 시간
          </span>
          <div className={styles.deadlineGrid}>
            {DEADLINE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                disabled={option.key === 'tonight' && tonightPassed}
                className={`${styles.deadlineChip} ${deadlineKey === option.key ? styles.deadlineChipActive : ''}`}
                onClick={() => setDeadlineKey(option.key)}
              >
                <Icon name={option.icon} size={16} />
                {option.label}
              </button>
            ))}
          </div>
          {deadlineKey === 'custom' && (
            <input
              type="datetime-local"
              aria-label="마감 시간 직접 입력"
              className={styles.input}
              value={customDeadline}
              onChange={(e) => setCustomDeadline(e.target.value)}
            />
          )}
          <p className={styles.fieldHint}>마감 시간은 안내용이에요. 시간이 지나도 자동으로 마감되지 않아요.</p>
        </section>

        <label className={styles.pledge}>
          <input type="checkbox" checked={pledged} onChange={(e) => setPledged(e.target.checked)} />
          <span>
            <strong>안심 비대면 약속:</strong> 이웃과 직접 대면하지 않고 위생 포장 후 1층 무인보관함에 정성껏
            전달할게요.
          </span>
        </label>

        <div className={styles.dock}>
          {(problem || error) && <p className={styles.dockHint}>{error ?? problem}</p>}
          <button type="submit" className={styles.submitButton} disabled={Boolean(problem) || submitting || checking}>
            <Icon name={checking ? 'my_location' : 'bolt'} size={24} />
            {checking ? '위치를 확인하고 있어요…' : submitting ? '팟 만드는 중…' : `팟 만들기 (${memberCount}명 모집)`}
          </button>
          {checking && <p className={styles.dockHint}>건물 안에 있는 이웃인지 확인하는 용도예요</p>}
        </div>
      </form>
      {locationSheet}
    </div>
  )
}
