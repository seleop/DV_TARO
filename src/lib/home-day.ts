import { josa } from "./josa";

/**
 * 홈 위쪽 "오늘 줄": 날짜 · 음력 · 일진 (2026-10-25 사용자 결정, 상단 여백 활용 1안).
 * 값은 서버가 계산해 넘기고(lib/home.ts homeDays: 음력은 KASI 기준 manseryeok, 일진은 두 엔진 교차검증),
 * 여기는 브라우저에서도 쓰는 글자 만들기만 한다 (계산 라이브러리를 브라우저로 보내지 않게).
 */
export type HomeDay = {
  /** 한국 날짜 "YYYY-MM-DD" */
  date: string;
  /** "10월 25일 일요일" */
  label: string;
  /** 음력 (변환 실패 시 null) */
  lunar: { month: number; day: number; leap: boolean } | null;
  /** 일진 "임신" (두 엔진이 다르면 null — 틀린 값을 보여 주지 않는다) */
  pillar: string | null;
};

/** 천간: 한자, 상징 */
const STEMS: Record<string, [string, string]> = {
  갑: ["甲", "큰 나무"],
  을: ["乙", "풀과 꽃"],
  병: ["丙", "한낮의 해"],
  정: ["丁", "촛불"],
  무: ["戊", "큰 산"],
  기: ["己", "기름진 땅"],
  경: ["庚", "단단한 바위"],
  신: ["辛", "빛나는 보석"],
  임: ["壬", "큰 바다"],
  계: ["癸", "보슬비"],
};
/** 지지: 한자, 띠 동물 */
const BRANCHES: Record<string, [string, string]> = {
  자: ["子", "쥐"],
  축: ["丑", "소"],
  인: ["寅", "호랑이"],
  묘: ["卯", "토끼"],
  진: ["辰", "용"],
  사: ["巳", "뱀"],
  오: ["午", "말"],
  미: ["未", "양"],
  신: ["申", "원숭이"],
  유: ["酉", "닭"],
  술: ["戌", "개"],
  해: ["亥", "돼지"],
};

/** "壬申" (모르는 글자면 null) */
export function pillarHanja(pillar: string) {
  const s = STEMS[pillar[0]];
  const b = BRANCHES[pillar[1]];
  return s && b && pillar.length === 2 ? s[0] + b[0] : null;
}

/** 음력 초하루·보름 */
export function moonWord(day: number) {
  return day === 1 ? "초하루" : day === 15 ? "보름" : null;
}

/** 오늘 줄 둘째 줄: "음력 9.15 보름 · 임신일 壬申" */
export function daySubline(d: HomeDay) {
  const parts: string[] = [];
  if (d.lunar) {
    const w = moonWord(d.lunar.day);
    parts.push(`음력 ${d.lunar.leap ? "윤" : ""}${d.lunar.month}.${d.lunar.day}${w ? ` ${w}` : ""}`);
  }
  if (d.pillar) {
    const h = pillarHanja(d.pillar);
    parts.push(`${d.pillar}일${h ? ` ${h}` : ""}`);
  }
  return parts.join(" · ");
}

/** 음력 날짜로 본 오늘 밤 달 모양 */
function moonShape(day: number) {
  if (day <= 1) return "달이 숨어 새 달이 시작되는 날이에요";
  if (day <= 6) return "저녁 하늘에 가는 초승달이 떠요";
  if (day <= 9) return "반쪽 반달(상현달)이 떠요";
  if (day <= 14) return "달이 점점 둥글게 차오르고 있어요";
  if (day === 15) return "밤하늘에 둥근 보름달이 떠요";
  if (day <= 21) return "보름을 지나 달이 조금씩 줄어요";
  if (day <= 24) return "새벽에 반달(하현달)이 떠요";
  return "새벽녘에 가는 그믐달이 떠요";
}

/** 오늘 줄을 누르면 마스코트가 들려주는 말 (누를 때마다 다음 말) */
export function dayTalk(d: HomeDay): string[] {
  const lines: string[] = [];
  if (d.pillar) {
    const s = STEMS[d.pillar[0]];
    const b = BRANCHES[d.pillar[1]];
    // 조사는 한자 괄호 앞 낱말에 맞춘다 ("큰 바다(壬)와", "촛불(丁)과")
    const and = s ? josa(s[1], "과/와").slice(s[1].length) : "";
    lines.push(s && b ? `오늘은 ${d.pillar}일이에요.\n${s[1]}(${s[0]})${and} ${b[1]}(${b[0]})의 날이래요` : `오늘은 ${d.pillar}일이에요`);
  }
  if (d.lunar) {
    const w = moonWord(d.lunar.day);
    lines.push(`음력으로는 ${d.lunar.leap ? "윤" : ""}${d.lunar.month}월 ${d.lunar.day}일${w ? `, ${w}${w === "보름" ? "이에요" : "예요"}` : "이에요"}.\n${moonShape(d.lunar.day)}`);
  }
  return lines;
}

/** 지금 한국 날짜 "YYYY-MM-DD" (lib/home.ts kstDateString 과 같은 기준) */
export function kstDateKey(ms: number) {
  const k = new Date(ms + 9 * 3600_000);
  return `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}-${String(k.getUTCDate()).padStart(2, "0")}`;
}
