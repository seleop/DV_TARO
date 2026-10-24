/**
 * 홈 화면 인사: 시간대·요일에 맞춘 제목과 별이 말풍선 문구.
 * AI를 부르지 않는 미리 쓴 문구라 비용이 들지 않는다 (2026-10-24 사용자 결정).
 * 시간은 사용자 기기 시간 기준이다.
 */
export type TimeSlot = "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night";

export function timeSlot(hour: number): TimeSlot {
  if (hour < 5) return "dawn";
  if (hour < 11) return "morning";
  if (hour < 14) return "noon";
  if (hour < 18) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

/** 장면 제목에 붙는 인사 ("좋은 저녁이에요, ○○님") */
export const SLOT_TITLE: Record<TimeSlot, string> = {
  dawn: "고요한 새벽이에요",
  morning: "좋은 아침이에요",
  noon: "즐거운 점심이에요",
  afternoon: "좋은 오후예요",
  evening: "좋은 저녁이에요",
  night: "편안한 밤이에요",
};

const SLOT_LINES: Record<TimeSlot, readonly string[]> = {
  dawn: ["아직 안 주무셨어요? 별이 제일 반짝일 시간이에요", "조용한 새벽, 마음속 질문을 떠올려 봐요", "따뜻한 차 한 잔 하고 푹 쉬어요"],
  morning: ["오늘 하루가 궁금하지 않아요? 운세부터 볼까요?", "아침 햇살 같은 하루가 되길 바라요 ☀️", "기지개 켜고, 오늘도 같이 시작해요!"],
  noon: ["점심은 맛있게 드셨어요?", "잠깐 쉬어 가요. 카드 한 장 뽑아 볼까요?", "오후를 위해 별빛 충전 중이에요 ✨"],
  afternoon: ["나른한 오후엔 타로 한 장 어때요?", "조금만 더 힘내요! 제가 응원할게요", "오늘 남은 하루는 어떨지 같이 볼까요?"],
  evening: ["오늘 하루 수고 많았어요", "노을이 예뻐요. 오늘은 어땠어요?", "별이 하나둘 뜨기 시작했어요 ✨"],
  night: ["하루를 마무리하며 별자리를 볼까요?", "오늘도 고생했어요. 푹 자요 🌙", "내일은 더 좋은 일이 있을 거예요"],
};

/** 요일 문구 (getDay: 0=일 … 6=토). 없는 요일은 시간대 문구만 쓴다 */
const WEEKDAY_LINES: Partial<Record<number, readonly string[]>> = {
  0: ["느긋한 일요일, 다음 주 흐름이 궁금하지 않아요?"],
  1: ["한 주의 시작이에요! 이번 주도 함께해요"],
  5: ["금요일이에요! 주말이 코앞이에요 🎉"],
  6: ["주말엔 여유롭게 운세 한 판 어때요?"],
};

/** 그날 보여 줄 말풍선 문구 목록 (요일 문구가 있으면 먼저) */
export function greetingLines(date: Date): readonly string[] {
  return [...(WEEKDAY_LINES[date.getDay()] ?? []), ...SLOT_LINES[timeSlot(date.getHours())]];
}

/**
 * n번째(0부터)로 보여 줄 문구. 첫 문구는 요일 문구가 있으면 그것, 없으면 날짜마다 바뀐다.
 * 말풍선을 누를 때마다 n을 하나씩 올려 다음 문구를 보여 준다.
 */
export function pickGreeting(date: Date, n: number): string {
  const lines = greetingLines(date);
  const start = WEEKDAY_LINES[date.getDay()] ? 0 : date.getDate() % lines.length;
  return lines[(start + n) % lines.length];
}

const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** "10월 24일 토요일" */
export function formatHomeDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_NAMES[date.getDay()]}요일`;
}
