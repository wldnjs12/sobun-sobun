import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import { isBuildingAccessDenied } from '../../api/client.js'
import AccessDeniedView from '../../components/AccessDeniedView.jsx'
import { PodForm } from './PodCreatePage.jsx'
import { fetchPod } from './podApi.js'
import styles from './PodDetailPage.module.css'

/**
 * 팟 수정 화면 (/pods/:podId/edit). 개설 폼(PodForm)을 mode="edit"로 재사용한다.
 * 수정 가능 조건(대표 + 모집중 + 다른 참여자 없음)은 서버가 최종 판단하지만,
 * 안 되는 걸 뻔히 아는데 폼을 보여주면 헛수고라 여기서 먼저 안내한다.
 */
export default function PodEditPage() {
  const { podId } = useParams()
  const [pod, setPod] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPod(podId).then(setPod).catch(setError)
  }, [podId])

  if (isBuildingAccessDenied(error) && error?.code !== 'POD_FORBIDDEN') return <AccessDeniedView pageTitle="공동구매 수정" what="팟" />
  if (error) return <Message text={error.message} podId={podId} />
  if (!pod) return <Message text="불러오는 중이에요…" />

  if (!pod.isHost) return <Message text="대표만 글을 수정할 수 있어요." podId={podId} />
  if (pod.status !== 'OPEN') return <Message text="모집중인 공동구매만 수정할 수 있어요." podId={podId} />
  if (pod.participantCount > 1) return <Message text="이미 참여한 이웃이 있어서 수정할 수 없어요." podId={podId} />

  return <PodForm mode="edit" initialPod={pod} />
}

function Message({ text, podId }) {
  return (
    <div className={styles.page}>
      <PageHeader title="공동구매 수정" />
      <p className={styles.fallback}>
        {text}
        {podId && (
          <>
            <br />
            <Link to={`/pods/${podId}`}>상세로 돌아가기</Link>
          </>
        )}
      </p>
    </div>
  )
}
