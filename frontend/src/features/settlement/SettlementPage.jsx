import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { getMyUserId } from '../../api/currentUser.js'
import { fetchPod } from '../pod/podApi.js'
import { confirmSettlement, fetchSettlement, previewSettlement, recognizeReceipt } from './settlementApi.js'
import { describePaymentLink, getSavedPaymentLink, savePaymentLink } from './paymentLink.js'
import styles from './Settlement.module.css'

/**
 * 핵심 기능 ③: 영수증 업로드(S9 · Stitch 10번) → 금액 확인(S10 · Stitch 11번).
 * 두 화면이 사진·금액을 이어서 쓰기 때문에 한 컴포넌트 안에서 step 값으로 바꿔 그린다.
 *   upload(사진 고르기) → recognizing(OCR 중) → review(금액 확인·수정) → 확정 → 결과 화면(12)
 * OCR이 실패하거나 사진 업로드 자체가 실패하면 review로 넘어가되 금액 칸을 비워서 직접 입력하게 한다 (기획 문서 fallback).
 */
export default function SettlementPage() {
  const { podId } = useParams()
  const navigate = useNavigate()

  const [pod, setPod] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [step, setStep] = useState('upload')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [ocrFailed, setOcrFailed] = useState(false)
  const [amount, setAmount] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState(null)
  // 이웃들이 송금할 곳 (Stitch _4). 선택 항목 — 지난번에 "기본으로 사용"을 체크했으면 미리 채워둔다
  const [paymentLink, setPaymentLink] = useState(getSavedPaymentLink)
  const [rememberLink, setRememberLink] = useState(() => Boolean(getSavedPaymentLink()))

  const cameraInput = useRef(null)
  const albumInput = useRef(null)

  useEffect(() => {
    // 이미 정산했다면 결과 화면으로 바로 보낸다 (localStorage뿐이면 다른 기기에서 들어온 팟장이
    // 이미 확정된 걸 모르고 다시 확정하려다 400에 막히므로, 서버에 직접 확인한다)
    fetchSettlement(podId).then((settlement) => {
      if (settlement) {
        navigate(`/settlements/${podId}/result`, { replace: true })
        return
      }
      fetchPod(podId).then(setPod).catch((e) => setLoadError(e.message))
    })
  }, [podId, navigate])

  // 미리보기용 사진 주소(blob:)는 브라우저 메모리를 잡아먹으므로, 바뀌거나 화면을 떠날 때 해제
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl])

  if (loadError) return <Message text={loadError} podId={podId} />
  if (!pod) return <Message text="팟 정보를 불러오는 중이에요…" />
  if (pod.hostUserId !== getMyUserId()) {
    return <Message text="정산은 팟장만 진행할 수 있어요. 팟장이 영수증을 올리면 정산 금액을 알려드릴게요." podId={podId} />
  }
  if (!pod.closed) {
    return <Message text="모집을 마감한 뒤에 정산할 수 있어요. 팟 상세에서 먼저 모집을 마감해주세요." podId={podId} />
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 사진을 다시 골라도 onChange가 다시 불리게 비워둔다
    if (!file) return

    setPreviewUrl(URL.createObjectURL(file))
    setUploadError(null)
    setStep('recognizing')
    try {
      const result = await recognizeReceipt(file)
      setOcrFailed(!result.success)
      setAmount(result.success ? String(result.recognizedAmount) : '')
      setStep('review')
    } catch (err) {
      // 사진 형식/용량 문제 등 → 업로드 단계에 머물며 이유를 보여준다
      setUploadError(err.message)
      setStep('upload')
    }
  }

  /**
   * 사진 업로드 자체가 실패했을 때(형식·용량·서버 오류)도 정산이 막히지 않도록,
   * OCR 실패와 같은 수동 입력 화면으로 보낸다 (03-settlement.md 필수 fallback).
   * 실패한 사진은 금액 확인 화면에 보여주면 헷갈리니 지운다.
   */
  const enterAmountManually = () => {
    setPreviewUrl(null)
    setUploadError(null)
    setOcrFailed(true)
    setAmount('')
    setStep('review')
  }

  const cost = Number(amount)
  const validAmount = Number.isInteger(cost) && cost > 0
  const preview = previewSettlement(validAmount ? cost : 0, pod.commissionRate, pod.participantCount)
  const feePerPerson = preview.perPersonAmount - preview.baseShare

  const handleConfirm = async () => {
    setConfirming(true)
    setConfirmError(null)
    try {
      const settlement = await confirmSettlement(pod.id, {
        recognizedCost: cost,
        commissionRate: pod.commissionRate,
        hostPaymentLink: paymentLink,
      })
      savePaymentLink(rememberLink ? paymentLink.trim() : '')
      navigate(`/settlements/${pod.id}/result`, { replace: true, state: { settlement } })
    } catch (err) {
      setConfirmError(err.message)
      setConfirming(false)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title={step === 'review' ? '금액 확인' : '영수증 등록'} />

      {/* 숨겨둔 파일 선택 창. capture="environment" → 휴대폰에서 바로 뒷면 카메라가 열린다 */}
      <input ref={cameraInput} type="file" accept="image/jpeg,image/png" capture="environment" hidden onChange={handleFile} />
      <input ref={albumInput} type="file" accept="image/jpeg,image/png" hidden onChange={handleFile} />

      {step !== 'review' ? (
        <main className={styles.mainWithCta}>
          <div>
            <span className={styles.eyebrow}>
              <Icon name="auto_awesome" size={16} />
              스마트 영수증 정산
            </span>
            <h2 className={styles.title}>영수증을 등록해주세요</h2>
            <p className={styles.body}>
              <strong>{pod.title}</strong> 구매 영수증의 결제 금액을 자동으로 읽어드려요.
            </p>
          </div>

          <div className={styles.pickRow}>
            <button type="button" className={styles.pickButton} onClick={() => cameraInput.current.click()}>
              <span className={styles.pickIcon}>
                <Icon name="photo_camera" size={26} />
              </span>
              <strong>카메라로 촬영</strong>
              <span>바로 찍어서 인식</span>
            </button>
            <button type="button" className={styles.pickButton} onClick={() => albumInput.current.click()}>
              <span className={`${styles.pickIcon} ${styles.pickIconAlt}`}>
                <Icon name="photo_library" size={26} />
              </span>
              <strong>앨범에서 선택</strong>
              <span>저장된 사진 불러오기</span>
            </button>
          </div>

          {previewUrl && (
            <div className={styles.receiptPreview}>
              <img src={previewUrl} alt="올린 영수증" />
              {step === 'recognizing' && (
                <div className={styles.scanning}>
                  <Icon name="progress_activity" size={28} className={styles.spin} />
                  영수증 금액을 읽는 중이에요…
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <>
              <p className={styles.error}>{uploadError}</p>
              <button type="button" className={styles.textButton} onClick={enterAmountManually}>
                사진 없이 금액 직접 입력하기
              </button>
            </>
          )}

          <section className={styles.tips}>
            <h3 className={styles.tipsTitle}>
              <Icon name="lightbulb" size={20} className={styles.tertiaryIcon} />
              정확한 정산을 위한 팁
            </h3>
            <div className={styles.tipGrid}>
              <span>
                <Icon name="schedule" size={18} />
                결제 일시
              </span>
              <span>
                <Icon name="shopping_cart" size={18} />
                상품명·수량
              </span>
              <span>
                <Icon name="payments" size={18} />
                총 결제 금액
              </span>
            </div>
            <p>영수증 테두리가 화면 안에 다 들어오게 수평을 맞춰 찍으면 더 정확하게 읽어요. JPG·PNG, 10MB 이하만 올릴 수 있어요.</p>
          </section>
        </main>
      ) : (
        <main className={styles.mainWithCta}>
          <div>
            <span className={styles.eyebrow}>🧾 영수증 금액 확인</span>
            <h2 className={styles.title}>금액을 확인해주세요</h2>
            <p className={styles.body}>
              {ocrFailed
                ? '자동으로 금액을 읽지 못했어요. 영수증의 총 결제 금액을 직접 입력해주세요.'
                : '영수증에서 읽은 결제 금액이 맞는지 확인해주세요.'}
            </p>
          </div>

          <section className={styles.amountCard}>
            {previewUrl && <img src={previewUrl} alt="올린 영수증" className={styles.amountThumb} />}
            <label htmlFor="receipt-amount" className={styles.amountLabel}>
              {ocrFailed ? '총 결제 금액 입력' : '인식된 총 결제 금액 · 다르면 눌러서 고치세요'}
            </label>
            <div className={styles.amountInputWrap}>
              <input
                id="receipt-amount"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="0"
                className={styles.amountInput}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus={ocrFailed}
              />
              <span>원</span>
            </div>
            {amount && !validAmount && <p className={styles.error}>원 단위 정수로, 0원보다 크게 입력해주세요.</p>}
          </section>

          <section className={styles.breakdown}>
            <div className={styles.perPersonRow}>
              <span>
                1인당 정산 금액
                <small>
                  <Icon name="group" size={14} /> 총 {pod.participantCount}명
                </small>
              </span>
              <strong>
                {preview.perPersonAmount.toLocaleString()}
                <small>원</small>
              </strong>
            </div>
            <div className={styles.breakdownRow}>
              <span>상품 몫 ({validAmount ? cost.toLocaleString() : 0}원 ÷ {pod.participantCount}명)</span>
              <span>{preview.baseShare.toLocaleString()}원</span>
            </div>
            <div className={styles.breakdownRow}>
              <span>팟장 수고비 ({Math.round(pod.commissionRate * 100)}%)</span>
              <span>+{feePerPerson.toLocaleString()}원</span>
            </div>
            <p className={styles.note}>
              <Icon name="info" size={16} />
              원 단위 올림이라 합계가 영수증보다 몇 원 많을 수 있어요 (팟장이 손해 보지 않게).
            </p>
          </section>

          <section className={styles.linkSection}>
            <div className={styles.breakdownHead}>
              <h3>
                <Icon name="account_balance_wallet" size={20} className={styles.primaryIcon} /> 내 송금 링크 또는 계좌
              </h3>
              <span className={styles.badge}>선택</span>
            </div>
            <p className={styles.linkHelp}>토스 송금 링크나 계좌번호를 적어두면 이웃들이 정산 화면에서 바로 송금해요.</p>
            <input
              className={styles.linkInput}
              placeholder="예: toss.me/아이디 또는 카카오뱅크 3333-00-0000000"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              aria-label="송금 링크 또는 계좌"
            />
            {paymentLink.trim() && <LinkPreview link={paymentLink} />}
            <label className={styles.rememberRow}>
              <input type="checkbox" checked={rememberLink} onChange={(e) => setRememberLink(e.target.checked)} />
              이 정보를 다음 정산에도 기본으로 사용
            </label>
          </section>

          <p className={styles.note}>
            <Icon name="lock" size={16} />
            확정하면 금액은 수정할 수 없어요. 이웃들은 정산 결과 화면에서 1인 금액과 송금 정보를 보게 돼요.
          </p>

          {confirmError && <p className={styles.error}>{confirmError}</p>}

          <button type="button" className={styles.textButton} onClick={() => setStep('upload')}>
            <Icon name="refresh" size={18} />
            영수증 다시 올리기
          </button>
        </main>
      )}

      {step === 'review' && (
        <div className={styles.ctaDock}>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!validAmount || confirming}
            onClick={handleConfirm}
          >
            {confirming ? '정산 확정 중…' : `1인 ${preview.perPersonAmount.toLocaleString()}원으로 정산하기`}
            {!confirming && <Icon name="arrow_forward" size={20} />}
          </button>
        </div>
      )}
    </div>
  )
}

/** 입력한 송금 정보가 이웃에게 어떤 버튼으로 보일지 미리보기 */
function LinkPreview({ link }) {
  const info = describePaymentLink(link)
  if (!info) return null
  return (
    <p className={styles.linkPreview}>
      <Icon name={info.type === 'link' ? info.icon : 'content_copy'} size={16} />
      이웃에게는 {info.type === 'link' ? `[${info.label}] 버튼` : '계좌번호 + [복사] 버튼'}으로 보여요
    </p>
  )
}

function Message({ text, podId }) {
  return (
    <div className={styles.page}>
      <PageHeader title="정산" />
      <div className={styles.message}>
        <p>{text}</p>
        {podId && (
          <Link to={`/pods/${podId}`} className={styles.textLink}>
            팟 상세로 가기
          </Link>
        )}
      </div>
    </div>
  )
}
