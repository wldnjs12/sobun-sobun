import { useEffect, useState } from 'react'
import { fetchPodPhoto, podImage } from './podApi.js'

/**
 * 팟에 보여줄 사진 주소. 화면(PodCard·상세·내 팟)은 이 훅 하나만 쓰면 된다.
 *
 * 1) 대표가 올린 사진이 있으면(pod.imageVersion) 서버에서 받아온 사진
 * 2) 없거나 받아오는 중·실패면 제목·카테고리로 고른 예시 사진 (podImage)
 * 3) 예시 사진도 없으면 null → 화면이 카테고리 아이콘을 그린다
 */
export default function usePodPhoto(pod) {
  const podId = pod?.id
  const version = pod?.imageVersion
  const [uploaded, setUploaded] = useState(null)

  useEffect(() => {
    setUploaded(null)
    if (podId == null || version == null) return undefined
    let ignore = false // 응답이 오기 전에 다른 팟으로 바뀌면 옛 사진을 넣지 않도록
    fetchPodPhoto(podId, version)
      .then((dataUrl) => !ignore && setUploaded(dataUrl))
      .catch(() => {}) // 실패하면 예시 사진을 그대로 보여준다
    return () => {
      ignore = true
    }
  }, [podId, version])

  return uploaded ?? podImage(pod)
}
