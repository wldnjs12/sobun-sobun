/**
 * Google Material Symbols 아이콘. 이미지 파일 없이 글꼴로 그려지므로 name만 바꾸면 된다.
 * 사용 가능한 이름: https://fonts.google.com/icons
 * 사용 예: <Icon name="home" size={24} filled />
 */
export default function Icon({ name, size = 20, filled = false, className, style }) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ''}`}
      style={{
        fontSize: size,
        fontVariationSettings: filled ? "'FILL' 1" : undefined,
        ...style,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
