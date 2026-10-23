import { ImageResponse } from "next/og";

/**
 * 홈 화면 아이콘 PNG (iOS apple-touch-icon, Android 매니페스트 아이콘).
 * 대표 캐릭터 이미지가 정해지면 이 그림을 캐릭터로 바꾼다.
 * maskable(안드로이드 원형 잘림)을 고려해 중요한 그림은 가운데 80% 안에 둔다.
 */
export function appIconResponse(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 35%, #4b2a8f, #0a0820 75%)",
        }}
      >
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 512 512">
          <circle cx="256" cy="270" r="190" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="16" />
          <circle cx="256" cy="282" r="132" fill="#e8e1ff" />
          <path d="M256 118 l18 40 44 4 -34 28 10 43 -38 -23 -38 23 10 -43 -34 -28 44 -4 z" fill="#ffd66b" />
          <path d="M200 288 q18 18 36 0 M276 288 q18 18 36 0" stroke="#3b2f63" strokeWidth="11" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
