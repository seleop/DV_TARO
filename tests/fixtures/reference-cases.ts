/**
 * 기준 결과 데이터.
 *
 * 기대값은 임의로 만들지 않았다. 각 사례는 서로 독립적인 세 출처가 모두 같은 값을 낸 경우만 채택했다.
 *  1) manseryeok 2.0.0 (KASI 정본 음력·절입표 기반)
 *  2) lunar-javascript 1.7.7 (자체 천문 계산, 중국 표준시 기준 → UTC+8 환산)
 *  3) 점봄 만세력 API (2026-10-23 실측, tests/fixtures/jeombom/*.json 에 원본 기록)
 * 추가로 공개 사실과 대조한 항목은 note에 적었다.
 */
export const REFERENCE_CASES = [
  {
    id: "R1",
    description: "1992-10-24 05:30 (manseryeok README 예시)",
    wall: { year: 1992, month: 10, day: 24, hour: 5, minute: 30 },
    expected: { year: "임신", month: "경술", day: "계유", hour: "을묘" },
    note: "점봄 응답 s19921024_0530_m 일치",
  },
  {
    id: "R2",
    description: "2024-01-01 12:00 (갑자일)",
    wall: { year: 2024, month: 1, day: 1, hour: 12, minute: 0 },
    expected: { year: "계묘", month: "갑자", day: "갑자", hour: "경오" },
    note: "점봄 응답 s20240101_1200 일치. 2024-01-01이 갑자일임은 공개 만세력과도 일치",
  },
  {
    id: "R3",
    description: "1990-05-15 14:30",
    wall: { year: 1990, month: 5, day: 15, hour: 14, minute: 30 },
    expected: { year: "경오", month: "신사", day: "경진", hour: "계미" },
    note: "점봄 응답 s19900515_1430_m 일치",
  },
  {
    id: "R4",
    description: "2024-02-04 17:00 (입춘 17:27 직전)",
    wall: { year: 2024, month: 2, day: 4, hour: 17, minute: 0 },
    expected: { year: "계묘", month: "을축", day: "무술", hour: "신유" },
    note: "점봄 응답 s20240204_1700 일치. 2024 입춘 17:27 KST(KASI 발표)",
  },
  {
    id: "R5",
    description: "2024-02-04 17:30 (입춘 17:27 직후)",
    wall: { year: 2024, month: 2, day: 4, hour: 17, minute: 30 },
    expected: { year: "갑진", month: "병인", day: "무술", hour: "신유" },
    note: "점봄 응답 s20240204_1730 일치",
  },
] as const;
