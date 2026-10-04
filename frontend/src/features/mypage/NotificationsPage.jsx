import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import Icon from '../../components/Icon.jsx'
import { getMyUserId } from '../../api/currentUser.js'
import useMyPods from './useMyPods.js'
import styles from './MyPage.module.css'

/**
 * 내 팟 하나에서 "지금 내가 알아야 할 소식"을 만든다. 할 일이 없는 단계(모집 중)면 null.
 * 위에서부터 먼저 맞는 조건이 이긴다 (useMyPods의 statusOf와 같은 순서).
 */
function noticeOf(pod, settlement, isHost) {
  if (settlement) {
    return isHost
      ? {
          key: 'settled',
          tag: '정산 확정',
          icon: 'payments',
          text: '정산을 확정했어요. 이웃들의 송금 현황을 확인해보세요.',
          link: `/settlements/${pod.id}/payments`,
        }
      : {
          key: 'settled',
          tag: '송금 요청',
          icon: 'payments',
          text: `정산이 확정됐어요. 1인당 ${settlement.perPersonAmount.toLocaleString()}원을 송금해주세요.`,
          link: `/settlements/${pod.id}/result`,
        }
  }
  if (pod.closed) {
    return {
      key: 'closed',
      tag: '모집 마감',
      icon: 'receipt_long',
      text: isHost ? '모집을 마감했어요. 구매 후 영수증을 등록해 정산을 시작하세요.' : '모집이 마감됐어요. 팟장이 정산을 확정하면 여기에 알려드려요.',
      link: `/pods/${pod.id}/complete`,
    }
  }
  if (pod.participantCount >= pod.targetParticipantCount) {
    return {
      key: 'recruiting',
      tag: '인원 다 모임',
      icon: 'groups',
      text: isHost ? '목표 인원이 모두 모였어요. 마감하고 구매를 진행하세요.' : '목표 인원이 모두 모였어요. 팟장이 곧 마감할 거예요.',
      link: `/pods/${pod.id}`,
    }
  }
  return null
}

/**
 * 알림 (상단 헤더의 종 아이콘).
 * 알림 전용 서버 API가 없어서, "내 팟" 탭과 같은 데이터(이 브라우저에서 참여한 팟 + 정산 조회)로
 * 지금 할 일이 있는 팟 소식만 모아 보여준다. 그래서 푸시 알림처럼 "언제 왔는지"는 없고 현재 상태 기준이다.
 */
export default function NotificationsPage() {
  const items = useMyPods()
  const myUserId = getMyUserId()

  const notices =
    items
      ?.map(({ pod, settlement }) => ({ pod, notice: noticeOf(pod, settlement, pod.hostUserId === myUserId) }))
      .filter(({ notice }) => notice !== null) ?? []

  return (
    <div className={styles.page}>
      <PageHeader title="알림" />

      <main className={styles.main}>
        <section className={styles.history}>
          {items === null && <p className={styles.empty}>불러오는 중이에요…</p>}
          {items !== null && notices.length === 0 && (
            <div className={styles.empty}>
              <p>새 소식이 없어요.</p>
              <p>참여한 팟이 마감되거나 정산이 확정되면 여기에 보여드려요.</p>
              <Link to="/home" className={styles.link}>
                건물 홈에서 팟 둘러보기
              </Link>
            </div>
          )}

          {notices.map(({ pod, notice }) => (
            <Link key={pod.id} to={notice.link} className={styles.item}>
              <span className={styles.thumb}>
                <Icon name={notice.icon} size={26} />
              </span>
              <div className={styles.itemInfo}>
                <span className={`${styles.statusTag} ${styles[notice.key]}`}>{notice.tag}</span>
                <strong className={styles.itemTitle}>{pod.title}</strong>
                <span className={styles.itemSub}>{notice.text}</span>
              </div>
              <Icon name="chevron_right" size={20} />
            </Link>
          ))}
        </section>
      </main>
    </div>
  )
}
