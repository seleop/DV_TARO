/**
 * 사주 원국 판 짚기용 풀이 (미리 써 둔 문구, AI 호출 없음 → 즉시·무료·항상 같은 답).
 * 별이 말투(다정한 반말)로, 전통적 상징만 짧게 쓴다. 성격·운세 판단은 하지 않는다(그건 AI 해석의 몫).
 */
import { josa } from "./josa";

/** 글자(한자) 뒤 조사: 한자 괄호 앞 글자의 받침으로 고른다 (갑(甲)은, 계(癸)는) */
const eunNeun = (ko: string) => josa(ko, "은/는").slice(ko.length);
/** "~야"/"~이야" (받침 있으면 이야) */
const iya = (ko: string) => (josa(ko, "이/가").endsWith("이") ? "이야" : "야");

type StemInfo = { hanja: string; element: string; yang: boolean; image: string };
type BranchInfo = { hanja: string; animal: string; season: string; element: string };

export const STEM_INFO: Record<string, StemInfo> = {
  갑: { hanja: "甲", element: "목", yang: true, image: "곧게 위로 뻗는 큰 나무" },
  을: { hanja: "乙", element: "목", yang: false, image: "부드럽게 휘며 어디서든 자라는 풀과 덩굴" },
  병: { hanja: "丙", element: "화", yang: true, image: "숨김없이 환하게 비추는 한낮의 태양" },
  정: { hanja: "丁", element: "화", yang: false, image: "가까운 곳을 따뜻하게 밝히는 촛불" },
  무: { hanja: "戊", element: "토", yang: true, image: "묵직하게 버티고 품어 주는 큰 산" },
  기: { hanja: "己", element: "토", yang: false, image: "씨앗을 길러 내는 논밭의 흙" },
  경: { hanja: "庚", element: "금", yang: true, image: "단단하게 결단하는 바위와 쇳덩이" },
  신: { hanja: "辛", element: "금", yang: false, image: "섬세하게 다듬어져 빛나는 보석" },
  임: { hanja: "壬", element: "수", yang: true, image: "넓게 흐르며 담아내는 바다와 큰 강" },
  계: { hanja: "癸", element: "수", yang: false, image: "조용히 스며들어 적시는 비와 이슬" },
};

export const BRANCH_INFO: Record<string, BranchInfo> = {
  자: { hanja: "子", animal: "쥐", season: "한겨울", element: "수" },
  축: { hanja: "丑", animal: "소", season: "늦겨울", element: "토" },
  인: { hanja: "寅", animal: "호랑이", season: "이른 봄", element: "목" },
  묘: { hanja: "卯", animal: "토끼", season: "한봄", element: "목" },
  진: { hanja: "辰", animal: "용", season: "늦봄", element: "토" },
  사: { hanja: "巳", animal: "뱀", season: "이른 여름", element: "화" },
  오: { hanja: "午", animal: "말", season: "한여름", element: "화" },
  미: { hanja: "未", animal: "양", season: "늦여름", element: "토" },
  신: { hanja: "申", animal: "원숭이", season: "이른 가을", element: "금" },
  유: { hanja: "酉", animal: "닭", season: "한가을", element: "금" },
  술: { hanja: "戌", animal: "개", season: "늦가을", element: "토" },
  해: { hanja: "亥", animal: "돼지", season: "이른 겨울", element: "수" },
};

export const ELEMENT_NAME: Record<string, string> = { 목: "나무", 화: "불", 토: "흙", 금: "쇠", 수: "물" };

/** 오행 다섯 식구: 원국 안의 오행을 '마음속 식구'로 비유 */
export const ELEMENT_FAMILY: Record<string, string> = {
  목: "자라고 뻗어 나가는 식구",
  화: "밝히고 표현하는 식구",
  토: "버티고 이어 주는 식구",
  금: "정리하고 결단하는 식구",
  수: "생각하고 스며드는 식구",
};

export const PILLAR_INFO = {
  year: { label: "년주", text: "태어난 해의 기둥이야. 뿌리와 어린 시절, 집안의 분위기를 봐." },
  month: { label: "월주", text: "태어난 달의 기둥이야. 자라 온 환경과 사회에서의 모습을 봐." },
  day: { label: "일주", text: "태어난 날의 기둥이야. 바로 너 자신과 가장 가까운 관계를 봐. 위 글자가 '일간'이지." },
  hour: { label: "시주", text: "태어난 시각의 기둥이야. 앞으로 펼칠 꿈과 늦은 시절을 봐." },
} as const;

export const TEN_GOD_INFO: Record<string, string> = {
  비견: "나와 같은 기운이야. 친구·동료처럼 나란히 서는 자립심.",
  겁재: "나와 닮았지만 겨루는 기운이야. 승부욕과 밀어붙이는 힘.",
  식신: "내가 만들어 내는 기운이야. 재능과 여유, 즐기는 표현.",
  상관: "날카롭게 드러내는 기운이야. 말솜씨와 개성, 새로운 시도.",
  편재: "크게 움직이는 재물 기운이야. 기회를 잡는 활동성.",
  정재: "차곡차곡 모으는 재물 기운이야. 성실함과 꼼꼼한 관리.",
  편관: "나를 단련하는 기운이야. 책임감과 도전, 때로는 압박.",
  정관: "나를 바르게 이끄는 기운이야. 규칙과 신뢰, 명예.",
  편인: "남다른 배움의 기운이야. 직관과 독창적인 생각.",
  정인: "나를 돕는 배움의 기운이야. 보살핌과 지식.",
};

/** 원국 판의 천간(위 글자) 풀이. 일주 천간이면 일간 설명을 붙인다 */
export function explainStem(stem: string, isDayMaster: boolean) {
  const s = STEM_INFO[stem];
  if (!s) return null;
  const head = `${stem}(${s.hanja})${eunNeun(stem)} ${s.yang ? "양" : "음"}의 ${ELEMENT_NAME[s.element]}(${s.element}), ${s.image}${iya(s.image)}.`;
  return isDayMaster ? `${head} 일간이라 바로 너 자신을 뜻해.` : head;
}

/** 원국 판의 지지(아래 글자) 풀이 */
export function explainBranch(branch: string) {
  const b = BRANCH_INFO[branch];
  if (!b) return null;
  return `${branch}(${b.hanja})${eunNeun(branch)} ${b.animal}, ${b.season}의 ${ELEMENT_NAME[b.element]}(${b.element}) 기운이야.`;
}

/** 기둥 이름 풀이 (확정되지 않았거나 출생 시각을 모르면 그 이유를 덧붙인다) */
export function explainPillar(field: keyof typeof PILLAR_INFO, missing: "unknown-time" | "unresolved" | null = null) {
  const base = PILLAR_INFO[field].text;
  if (missing === "unknown-time") return `${base} 태어난 시각을 몰라서 이 기둥은 비워 뒀어.`;
  if (missing === "unresolved") return `${base} 이 기둥은 확실하게 정해지지 않아서, 풀이에 쓰지 않았어.`;
  return base;
}

export function explainTenGod(name: string) {
  const t = TEN_GOD_INFO[name];
  return t ? `${name}: ${t}` : null;
}

/**
 * 지금 몇 번째 대운인지 (0부터). 대운 시작 시점("약 3세 4개월")과 양력 생일로 만 나이를 재서 정한다.
 * 첫 대운 전이면 -1, 시작 시점을 모르면(범위만 있음 등) null.
 */
export function currentDaewoonIndex(startText: string, birth: { year: number; month: number; day: number }, now: Date, count: number): number | null {
  const m = /^약 (\d+)세 (\d+)개월$/.exec(startText);
  if (!m) return null;
  const startMonths = Number(m[1]) * 12 + Number(m[2]);
  const kst = new Date(now.getTime() + 9 * 3600_000);
  let ageMonths = (kst.getUTCFullYear() - birth.year) * 12 + (kst.getUTCMonth() + 1 - birth.month);
  if (kst.getUTCDate() < birth.day) ageMonths -= 1;
  if (ageMonths < startMonths) return -1;
  return Math.min(count - 1, Math.floor((ageMonths - startMonths) / 120));
}
