import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { extractQrToken } from './onboardingApi.js'
import styles from './Onboarding.module.css'

// DB building 테이블의 qr_token 값과 같아야 인증된다
const DEMO_QR_TOKEN = 'demo-qr-token'

/**
 * 글자를 클립보드에 복사한다.
 * navigator.clipboard는 보안 주소(localhost, https)에서만 쓸 수 있어서,
 * 휴대폰으로 http://192.168.x.x 처럼 접속하면 없다 → 예전 방식(숨긴 입력칸에 넣고 선택 후 복사)으로 대신한다.
 */
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // 권한 거부 등 → 아래 예전 방식으로
    }
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed' // 화면이 스크롤로 튀지 않게
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

const CAMERA_MESSAGES = {
  starting: '카메라를 켜는 중이에요…',
  denied: '카메라 권한이 없어요. 브라우저 설정에서 카메라를 허용하거나, 아래에서 코드를 직접 입력해주세요.',
  unsupported: '이 브라우저에서는 카메라를 쓸 수 없어요. 아래에서 코드를 직접 입력해주세요.',
  noDetector:
    '이 브라우저는 QR 자동 인식을 지원하지 않아요. 휴대폰 기본 카메라 앱으로 QR을 찍거나, 코드를 직접 입력해주세요.',
}

/**
 * QR 스캔 (디자인 핸드오프 S1 · Stitch 02번).
 *
 * 카메라 영상을 <video>로 띄우고, 브라우저 내장 BarcodeDetector로 0.3초마다 QR을 찾는다.
 * (외부 라이브러리 없이 되지만, iOS Safari 등 BarcodeDetector가 없는 브라우저는 직접 입력으로 대체)
 * QR을 읽으면 토큰을 들고 위치 확인 화면(03)으로 넘어간다.
 */
export default function QrScanPage() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [cameraState, setCameraState] = useState('starting') // starting | scanning | denied | unsupported | noDetector
  const [manualOpen, setManualOpen] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyDemoCode = async () => {
    await copyText(DEMO_QR_TOKEN)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500) // 1.5초 뒤 "복사" 글자로 되돌림
  }

  const goVerify = (rawText) => {
    const qrToken = extractQrToken(rawText)
    if (qrToken) navigate('/onboarding/verify', { state: { qrToken } })
  }

  useEffect(() => {
    let stream = null
    let timerId = null
    let stopped = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unsupported')
        return
      }
      try {
        // facingMode: 'environment' → 휴대폰 뒷면 카메라
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      } catch {
        setCameraState('denied')
        return
      }
      // 권한 창이 떠 있는 사이 화면을 떠났다면, 늦게 도착한 카메라를 바로 끈다
      if (stopped) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      videoRef.current.srcObject = stream
      await videoRef.current.play().catch(() => {})

      if (!('BarcodeDetector' in window)) {
        setCameraState('noDetector')
        return
      }
      setCameraState('scanning')
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      timerId = setInterval(async () => {
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes.length > 0 && !stopped) {
            stopped = true
            goVerify(codes[0].rawValue)
          }
        } catch {
          // 영상이 아직 준비 안 된 순간에는 실패할 수 있다 → 다음 0.3초에 다시 시도
        }
      }, 300)
    }
    start()

    // 화면을 떠날 때 카메라를 꼭 꺼야 한다. 안 끄면 다른 화면에서도 카메라 표시등이 계속 켜져 있다.
    // (빈 배열 []: 화면이 처음 뜰 때 한 번만 카메라를 켠다)
    return () => {
      stopped = true
      clearInterval(timerId)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const handleManualSubmit = (e) => {
    e.preventDefault()
    goVerify(manualCode)
  }

  return (
    <div className={styles.page}>
      <PageHeader title="건물 인증" />

      <main className={styles.main}>
        <div className={styles.viewfinder}>
          <video ref={videoRef} className={styles.video} playsInline muted />
          <div className={styles.frame}>
            <span className={`${styles.corner} ${styles.cornerTL}`} />
            <span className={`${styles.corner} ${styles.cornerTR}`} />
            <span className={`${styles.corner} ${styles.cornerBL}`} />
            <span className={`${styles.corner} ${styles.cornerBR}`} />
            {cameraState === 'scanning' && <span className={styles.scanLine} />}
          </div>
          {cameraState === 'scanning' ? (
            <span className={styles.viewfinderHint}>
              <Icon name="verified" size={16} />
              소분소분 인증 QR을 비춰주세요
            </span>
          ) : (
            <p className={styles.cameraMessage}>{CAMERA_MESSAGES[cameraState]}</p>
          )}
        </div>

        <div className={styles.chips}>
          <span className={`${styles.chip} ${styles.chipBlue}`}>
            <Icon name="meeting_room" size={15} />
            1층 현관 인증
          </span>
          <span className={`${styles.chip} ${styles.chipPeach}`}>
            <Icon name="timer" size={15} />약 3초 소요
          </span>
          <span className={`${styles.chip} ${styles.chipButter}`}>
            <Icon name="lock" size={15} />
            동호수 비공개
          </span>
        </div>

        <div>
          <h2 className={styles.sectionTitle}>건물 1층의 QR을 스캔해주세요</h2>
          <p className={styles.sectionBody}>
            우편함, 엘리베이터 옆, 또는 건물 공용 게시판에 붙은 소분소분 인증 QR을 카메라 틀에 맞춰주세요.
          </p>
        </div>

        <div className={styles.infoBox}>
          <span className={styles.infoIcon}>
            <Icon name="shield_person" size={20} />
          </span>
          <div>
            <strong>같은 건물 이웃만 참여해요</strong>
            <p>건물 1층에 들어올 수 있는 이웃만 참여할 수 있게 해서, 외부인과 허위 주문을 막아요.</p>
          </div>
        </div>

        <div className={styles.accordion}>
          <button type="button" className={styles.accordionHead} onClick={() => setHelpOpen(!helpOpen)}>
            <Icon name="help" size={20} className={styles.secondaryIcon} />
            QR 코드를 찾기 어렵나요?
            <Icon name={helpOpen ? 'expand_less' : 'expand_more'} size={20} />
          </button>
          {helpOpen && (
            <p className={styles.accordionBody}>
              원룸이나 다세대 주택은 우편함 안쪽 또는 관리사무소 입구 게시판 하단에 붙어 있어요. 스티커가 훼손됐다면
              관리인에게 인증 코드를 받아 아래에서 직접 입력해주세요.
            </p>
          )}
        </div>

        {/* 해커톤 데모용 안내. 실제 서비스에서는 지워야 한다 (QR 토큰을 화면에 노출하는 셈이라서) */}
        <p className={styles.demoHint}>
          데모 인증코드: <code>{DEMO_QR_TOKEN}</code>
          <button type="button" className={styles.copyButton} onClick={handleCopyDemoCode}>
            <Icon name={copied ? 'check' : 'content_copy'} size={14} />
            {copied ? '복사됨' : '복사'}
          </button>
        </p>

        {manualOpen ? (
          <form className={styles.manualForm} onSubmit={handleManualSubmit}>
            <label htmlFor="manual-code" className={styles.fieldLabel}>
              인증 코드
            </label>
            <input
              id="manual-code"
              className={styles.input}
              placeholder="QR 아래에 적힌 코드를 입력하세요"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              autoFocus
            />
            <button type="submit" className={styles.primaryButton} disabled={!manualCode.trim()}>
              이 코드로 인증하기
            </button>
          </form>
        ) : (
          <button type="button" className={styles.primaryButton} onClick={() => setManualOpen(true)}>
            <Icon name="pin" size={20} />
            인증 코드 직접 입력하기
          </button>
        )}
      </main>
    </div>
  )
}
