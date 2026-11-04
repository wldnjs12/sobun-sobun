import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { CATEGORIES, createPod, updatePod } from './podApi.js'
import { calcPerPersonPrice } from './podUtils.js'
import useLocationCheck from '../onboarding/useLocationCheck.jsx'
import styles from './PodCreatePage.module.css'

const MIN_MEMBERS = 2
const MAX_MEMBERS = 10
const UNIT_PICKS = ['롤', '팩', '개', '병', '매']

// 수고비율 기본값 5%. 개설할 때만 고를 수 있고, 수정 화면에서는 바꿀 수 없다(서버도 안 받음).
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

const toInt = (value) => (value === '' || value == null ? null : Math.floor(Number(value)))

/**
 * 입력값 검사. 필드 이름 → 에러 문구. 서버(PodCreateRequest)와 같은 규칙을 화면에서도 먼저 확인해서
 * 버튼을 누르기 전에 무엇이 잘못됐는지 보여준다. (최종 판단은 서버가 한 번 더 한다)
 */
function validate(f, { requirePledge }) {
  const errors = {}
  if (!f.category) errors.category = '카테고리를 골라주세요'
  if (!f.title.trim()) errors.title = '제품명을 입력해주세요'
  else if (f.title.trim().length > 60) errors.title = '제품명은 60자 이하로 적어주세요'
  if (f.description.length > 500) errors.description = '설명은 500자 이하로 적어주세요'

  const totalUnits = toInt(f.totalUnits)
  const perPerson = toInt(f.unitsPerPerson)
  if (!totalUnits || totalUnits < 1) errors.totalUnits = '총 개수를 1 이상으로 입력해주세요'
  if (!f.unitLabel.trim()) errors.unitLabel = '단위를 입력해주세요 (예: 롤, 팩)'
  else if (f.unitLabel.trim().length > 10) errors.unitLabel = '단위는 10자 이하로 적어주세요'
  if (!perPerson || perPerson < 1) errors.unitsPerPerson = '1인당 개수를 1 이상으로 입력해주세요'
  else if (totalUnits && perPerson * f.memberCount > totalUnits) {
    errors.unitsPerPerson = `${perPerson}${f.unitLabel || '개'} × ${f.memberCount}명 = ${perPerson * f.memberCount}${f.unitLabel || '개'}라서 총 ${totalUnits}${f.unitLabel || '개'}보다 많아요`
  }

  if (!(Number(f.totalAmount) > 0)) errors.totalAmount = '총 결제 금액을 입력해주세요'
  if (f.originalPrice !== '' && !(Number(f.originalPrice) > 0)) errors.originalPrice = '0원보다 큰 금액을 입력하거나 비워두세요'
  if (!f.deadline || f.deadline <= new Date()) errors.deadline = '마감 일시는 지금보다 뒤여야 해요'
  if (f.pickupNote.length > 100) errors.pickupNote = '픽업 안내는 100자 이하로 적어주세요'
  if (requirePledge && !f.pledged) errors.pledged = '미개봉 나눔 약속에 동의해주세요'
  return errors
}

/** 서버의 "2026-11-05T12:00:00" → datetime-local 입력값 "2026-11-05T12:00" */
const toInputDateTime = (value) => (value ? String(value).slice(0, 16) : '')

/**
 * 팟 개설 화면. 같은 폼을 수정 화면(PodEditPage)도 쓴다 — mode="edit" + initialPod.
 * 입력값을 전부 state로 들고 있는 방식을 "제어 컴포넌트(controlled component)"라고 한다.
 */
export default function PodCreatePage() {
  return <PodForm mode="create" />
}

export function PodForm({ mode = 'create', initialPod = null }) {
  const isEdit = mode === 'edit'
  const navigate = useNavigate()
  // ⑤ 커뮤니티 "공구 제안" 글의 [이 품목으로 팟 열기]로 넘어오면 state에 { title, totalAmount? }가 담겨 온다
  // (훅은 조건문 안에서 부르면 안 되므로 먼저 부르고, 수정 모드면 값만 버린다)
  const locationState = useLocation().state
  const fromSuggestion = isEdit ? null : locationState

  const [category, setCategory] = useState(initialPod?.category ?? '')
  const [title, setTitle] = useState(initialPod?.title ?? fromSuggestion?.title ?? '')
  const [description, setDescription] = useState(initialPod?.description ?? '')
  const [totalUnits, setTotalUnits] = useState(initialPod?.totalUnits != null ? String(initialPod.totalUnits) : '')
  const [unitLabel, setUnitLabel] = useState(initialPod?.unitLabel ?? '')
  const [memberCount, setMemberCount] = useState(initialPod?.targetParticipantCount ?? 3)
  const [unitsPerPerson, setUnitsPerPerson] = useState(
    initialPod?.unitsPerPerson != null ? String(initialPod.unitsPerPerson) : '',
  )
  // 1인당 개수를 사용자가 직접 고친 적이 없으면 "총 개수 ÷ 인원"으로 자동 채운다
  const [perPersonTouched, setPerPersonTouched] = useState(isEdit)
  const [totalAmount, setTotalAmount] = useState(
    initialPod ? String(initialPod.totalAmount) : fromSuggestion?.totalAmount ? String(fromSuggestion.totalAmount) : '',
  )
  const [originalPrice, setOriginalPrice] = useState(initialPod?.originalPrice != null ? String(initialPod.originalPrice) : '')
  const [commissionRate, setCommissionRate] = useState(initialPod?.commissionRate ?? 0.05)
  const [deadlineKey, setDeadlineKey] = useState(isEdit ? 'custom' : 'tomorrowNoon')
  const [customDeadline, setCustomDeadline] = useState(toInputDateTime(initialPod?.deadline))
  const [pickupNote, setPickupNote] = useState(initialPod?.pickupNote ?? '')
  const [pledged, setPledged] = useState(false)
  const [touched, setTouched] = useState({})
  const [submitTried, setSubmitTried] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)

  const deadline = resolveDeadline(deadlineKey, customDeadline)
  const tonightPassed = new Date().getHours() >= 22
  const errors = validate(
    { category, title, description, totalUnits, unitLabel, unitsPerPerson, memberCount, totalAmount, originalPrice, deadline, pickupNote, pledged },
    { requirePledge: !isEdit },
  )
  const hasErrors = Object.keys(errors).length > 0
  // 처음부터 빨간 글씨가 가득하면 부담스러우니, 한 번 건드린 칸 또는 제출을 눌러본 뒤에만 보여준다
  const errorOf = (field) => (submitTried || touched[field] ? errors[field] : null)
  const touch = (field) => () => setTouched((t) => ({ ...t, [field]: true }))

  const suggestPerPerson = (units, members) => {
    const n = toInt(units)
    if (!perPersonTouched && n && members) setUnitsPerPerson(String(Math.max(1, Math.floor(n / members))))
  }
  const changeTotalUnits = (value) => {
    setTotalUnits(value)
    suggestPerPerson(value, memberCount)
  }
  const changeMemberCount = (value) => {
    setMemberCount(value)
    suggestPerPerson(totalUnits, value)
  }

  const total = Number(totalAmount) || 0
  // 미리보기는 "목표 인원이 다 모이면" 기준 (실제 1인당 금액은 참여 인원으로 나눠 다시 계산된다)
  const perPersonPrice = calcPerPersonPrice(total, commissionRate, memberCount)
  const perPersonUnits = toInt(unitsPerPerson)
  const unit = unitLabel.trim() || '개'
  const leftover = toInt(totalUnits) && perPersonUnits ? toInt(totalUnits) - perPersonUnits * memberCount : null

  // ① 2차 인증: 팟을 열기 직전에 "지금 등록한 건물 근처에 있는지" GPS로 확인 (실패하면 바텀시트)
  const { runWithLocationCheck, checking, locationSheet } = useLocationCheck()

  const form = () => ({
    category,
    title: title.trim(),
    description: description.trim(),
    totalAmount: total,
    totalUnits: toInt(totalUnits),
    unitLabel: unitLabel.trim(),
    unitsPerPerson: perPersonUnits,
    targetParticipantCount: memberCount,
    commissionRate,
    deadline,
    pickupNote: pickupNote.trim(),
    originalPrice: Number(originalPrice) > 0 ? Number(originalPrice) : null,
  })

  const handleSubmit = (e) => {
    e.preventDefault() // form 기본 동작(페이지 새로고침)을 막는다
    setSubmitTried(true)
    if (hasErrors) return
    if (isEdit) submitEdit()
    else runWithLocationCheck('POD_CREATE', submitCreate)
  }

  const submitCreate = async () => {
    setSubmitting(true)
    setServerError(null)
    try {
      const pod = await createPod(form())
      // replace: 뒤로가기 했을 때 다시 생성 폼으로 돌아오지 않게 기록을 바꿔치기
      navigate(`/pods/${pod.id}`, { replace: true })
    } catch (err) {
      setServerError(err.message)
      setSubmitting(false)
    }
  }

  const submitEdit = async () => {
    setSubmitting(true)
    setServerError(null)
    try {
      await updatePod(initialPod.id, form())
      navigate(`/pods/${initialPod.id}`, { replace: true })
    } catch (err) {
      setServerError(err.message)
      setSubmitting(false)
    }
  }

  const firstError = submitTried ? Object.values(errors)[0] : null

  return (
    <div className={styles.page}>
      <PageHeader title={isEdit ? '공동구매 수정' : '공동구매 열기'} />

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.tip}>
          <span className={styles.tipIcon}>
            <Icon name="inventory_2" size={20} filled />
          </span>
          <div className={styles.tipText}>
            <span className={styles.tipLabel}>
              {isEdit ? '아직 참여한 이웃이 없어서 고칠 수 있어요' : fromSuggestion ? '커뮤니티 제안에서 가져왔어요' : '미개봉 단위로 나눠요'}
            </span>
            <p>
              {fromSuggestion
                ? '제안 글의 품목이 채워져 있어요. 개수와 금액은 실제 구매 기준으로 입력해주세요.'
                : '화장지 30롤은 3명이 10롤씩, 생수 2L×24병은 4명이 6병씩처럼 뜯지 않은 단위 그대로 나눠요. 식재료는 다루지 않아요.'}
            </p>
          </div>
        </div>

        {/* ── 카테고리 ── */}
        <section className={styles.section}>
          <span className={styles.sectionTitle}>
            <Icon name="category" size={18} className={styles.primaryIcon} />
            카테고리
          </span>
          <div className={styles.categoryGrid} role="radiogroup" aria-label="카테고리">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={category === c.key}
                className={`${styles.categoryChip} ${category === c.key ? styles.categoryChipActive : ''}`}
                onClick={() => {
                  setCategory(c.key)
                  touch('category')()
                }}
              >
                <Icon name={c.icon} size={16} />
                {c.label}
              </button>
            ))}
          </div>
          <FieldError message={errorOf('category')} />
        </section>

        {/* ── 제품 ── */}
        <section className={styles.section}>
          <label htmlFor="pod-title" className={styles.sectionTitle}>
            <Icon name="shopping_bag" size={18} className={styles.primaryIcon} />
            제품명
          </label>
          <input
            id="pod-title"
            className={`${styles.input} ${errorOf('title') ? styles.inputInvalid : ''}`}
            placeholder="예: 깨끗한나라 화장지 30롤"
            maxLength={60}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={touch('title')}
          />
          <FieldError message={errorOf('title')} />

          <label htmlFor="pod-description" className={styles.fieldLabel}>
            설명 (선택)
          </label>
          <textarea
            id="pod-description"
            className={`${styles.input} ${styles.textarea}`}
            placeholder="구매처, 규격 등 (예: 온라인몰 구매, 3겹 30m)"
            maxLength={500}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={touch('description')}
          />
          <span className={styles.fieldHint}>{description.length}/500</span>
          <FieldError message={errorOf('description')} />
        </section>

        {/* ── 개수·인원 ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <Icon name="splitscreen" size={18} className={styles.primaryIcon} />
              얼마나 나눌까요?
            </span>
          </div>

          <div>
            <label htmlFor="pod-total-units" className={styles.fieldLabel}>
              총 개수와 단위
            </label>
            <div className={styles.unitRow}>
              <input
                id="pod-total-units"
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="30"
                className={`${styles.input} ${errorOf('totalUnits') ? styles.inputInvalid : ''}`}
                value={totalUnits}
                onChange={(e) => changeTotalUnits(e.target.value)}
                onBlur={touch('totalUnits')}
              />
              <input
                aria-label="단위"
                placeholder="롤"
                maxLength={10}
                className={`${styles.input} ${errorOf('unitLabel') ? styles.inputInvalid : ''}`}
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                onBlur={touch('unitLabel')}
              />
            </div>
            <div className={styles.unitPicks}>
              {UNIT_PICKS.map((u) => (
                <button
                  key={u}
                  type="button"
                  className={`${styles.unitPick} ${unitLabel === u ? styles.unitPickActive : ''}`}
                  onClick={() => setUnitLabel(u)}
                >
                  {u}
                </button>
              ))}
            </div>
            <FieldError message={errorOf('totalUnits') ?? errorOf('unitLabel')} />
          </div>

          <div className={styles.stepperRow}>
            <div>
              <div className={styles.fieldLabel}>목표 인원</div>
              <div className={styles.fieldHint}>(나 포함, {MIN_MEMBERS}~{MAX_MEMBERS}명)</div>
            </div>
            <div className={styles.stepper}>
              <button
                type="button"
                aria-label="인원 줄이기"
                disabled={memberCount <= MIN_MEMBERS}
                onClick={() => changeMemberCount(memberCount - 1)}
              >
                <Icon name="remove" size={18} />
              </button>
              <span className={styles.stepperValue}>{memberCount}</span>
              <button
                type="button"
                aria-label="인원 늘리기"
                disabled={memberCount >= MAX_MEMBERS}
                onClick={() => changeMemberCount(memberCount + 1)}
              >
                <Icon name="add" size={18} />
              </button>
            </div>
          </div>

          <div>
            <div className={styles.fieldRow}>
              <label htmlFor="pod-per-person" className={styles.fieldLabel}>
                1인당 개수
              </label>
              {!perPersonTouched && toInt(totalUnits) ? (
                <span className={styles.fieldHint}>총 개수 ÷ 인원으로 자동 계산했어요</span>
              ) : null}
            </div>
            <div className={styles.inputWrap}>
              <input
                id="pod-per-person"
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="10"
                className={`${styles.input} ${styles.amountInput} ${errorOf('unitsPerPerson') ? styles.inputInvalid : ''}`}
                value={unitsPerPerson}
                onChange={(e) => {
                  setPerPersonTouched(true)
                  setUnitsPerPerson(e.target.value)
                }}
                onBlur={touch('unitsPerPerson')}
              />
              <span className={styles.amountUnit}>{unit}</span>
            </div>
            <FieldError message={errorOf('unitsPerPerson')} />
            {leftover > 0 && !errors.unitsPerPerson && (
              <p className={styles.fieldHint}>
                나누고 남는 개수: {leftover}
                {unit} · 대표가 가져가거나 참여자와 정해주세요.
              </p>
            )}
          </div>
        </section>

        {/* ── 금액 ── */}
        <section className={styles.section}>
          <span className={styles.sectionTitle}>
            <Icon name="payments" size={18} className={styles.primaryIcon} />
            금액
          </span>
          <div>
            <div className={styles.fieldRow}>
              <label htmlFor="pod-total" className={styles.fieldLabel}>
                총 결제 금액
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
                className={`${styles.input} ${styles.amountInput} ${errorOf('totalAmount') ? styles.inputInvalid : ''}`}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                onBlur={touch('totalAmount')}
              />
              <span className={styles.amountUnit}>원</span>
            </div>
            <FieldError message={errorOf('totalAmount')} />
          </div>

          <div>
            <div className={styles.fieldRow}>
              <label htmlFor="pod-original-price" className={styles.fieldLabel}>
                혼자 살 때 가격 (선택)
              </label>
              <span className={styles.fieldHint}>
                1인 몫({perPersonUnits ? `${perPersonUnits}${unit}` : '1인분'})을 따로 살 때
              </span>
            </div>
            <div className={styles.inputWrap}>
              <input
                id="pod-original-price"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="비워둬도 돼요"
                className={`${styles.input} ${styles.amountInput} ${errorOf('originalPrice') ? styles.inputInvalid : ''}`}
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                onBlur={touch('originalPrice')}
              />
              <span className={styles.amountUnit}>원</span>
            </div>
            <FieldError message={errorOf('originalPrice')} />
          </div>

          <div className={styles.preview} aria-live="polite">
            <div className={styles.previewRow}>
              <span className={styles.fieldHint}>{memberCount}명이 모이면 (수고비 포함)</span>
              <span className={styles.previewPrice}>
                {perPersonUnits ? `1인 ${perPersonUnits}${unit}` : '1인분'} · 예상 1인당 ₩{perPersonPrice.toLocaleString()}
              </span>
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

        {/* ── 수고비 (개설할 때만) ── */}
        {!isEdit && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>
                <Icon name="volunteer_activism" size={18} className={styles.secondaryIcon} />
                대표 수고비율
              </span>
              <span className={styles.fieldHint}>구매·전달 수고 보상</span>
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
                총액 {total.toLocaleString()}원 기준, 내 수고비는 <u>{Math.round(total * commissionRate).toLocaleString()}원</u>
                이에요.
              </p>
            </div>
          </section>
        )}

        {/* ── 마감 ── */}
        <section className={styles.section}>
          <span className={styles.sectionTitle}>
            <Icon name="schedule" size={18} className={styles.primaryIcon} />
            모집 마감 일시
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
              aria-label="마감 일시 직접 입력"
              className={`${styles.input} ${errorOf('deadline') ? styles.inputInvalid : ''}`}
              value={customDeadline}
              onChange={(e) => setCustomDeadline(e.target.value)}
              onBlur={touch('deadline')}
            />
          )}
          <FieldError message={errorOf('deadline')} />
          <p className={styles.fieldHint}>마감 시간이 지나면 새로 참여할 수 없어요. 마감은 대표가 직접 눌러요.</p>
        </section>

        {/* ── 픽업 ── */}
        <section className={styles.section}>
          <label htmlFor="pod-pickup" className={styles.sectionTitle}>
            <Icon name="pin_drop" size={18} className={styles.primaryIcon} />
            픽업 안내 (선택)
          </label>
          <input
            id="pod-pickup"
            className={`${styles.input} ${errorOf('pickupNote') ? styles.inputInvalid : ''}`}
            placeholder="예: 1층 공동현관 앞, 편의점 앞"
            maxLength={100}
            value={pickupNote}
            onChange={(e) => setPickupNote(e.target.value)}
            onBlur={touch('pickupNote')}
          />
          <p className={styles.warning}>
            <Icon name="warning" size={16} />
            동·호수 같은 상세 주소는 적지 마세요. 이 글은 같은 건물 이웃 모두에게 보여요.
          </p>
          <FieldError message={errorOf('pickupNote')} />
        </section>

        {!isEdit && (
          <label className={styles.pledge}>
            <input type="checkbox" checked={pledged} onChange={(e) => setPledged(e.target.checked)} />
            <span>
              <strong>미개봉 나눔 약속:</strong> 포장을 뜯지 않은 단위 그대로, 약속한 개수만큼 나눠 드릴게요.
            </span>
          </label>
        )}
        {!isEdit && <FieldError message={errorOf('pledged')} />}

        <div className={styles.dock}>
          {(serverError || firstError) && <p className={styles.dockHint}>{serverError ?? firstError}</p>}
          <button type="submit" className={styles.submitButton} disabled={submitting || checking}>
            <Icon name={checking ? 'my_location' : isEdit ? 'save' : 'bolt'} size={24} />
            {checking
              ? '위치를 확인하고 있어요…'
              : submitting
                ? isEdit
                  ? '저장하는 중…'
                  : '여는 중…'
                : isEdit
                  ? '수정 내용 저장'
                  : `공동구매 열기 (${memberCount}명 모집)`}
          </button>
          {checking && <p className={styles.dockHint}>등록한 건물 근처에 있는지 확인하는 용도예요</p>}
        </div>
      </form>
      {locationSheet}
    </div>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return (
    <p className={styles.fieldError} role="alert">
      {message}
    </p>
  )
}
