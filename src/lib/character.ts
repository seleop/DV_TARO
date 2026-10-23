/**
 * 대표 캐릭터의 표정·행동 규칙 (화면 없이 테스트할 수 있는 순수 로직).
 *
 * - Scene(장면): 화면이 캐릭터에게 주는 상황 (기본, 점치는 중, 결과, 타로, 별자리)
 * - Mood(기분): 운세 결과의 전반적 분위기. AI 응답(mood)이나 타로 카드 방향에서 정한다
 * - Expression(표정): 실제로 그려지는 얼굴. 캐릭터 이미지도 표정별로 넣는다 (src/config/brand.ts)
 * - Action(행동): 잠깐 하는 몸짓 (점프, 흔들기 등). 대기 중 무작위·터치 반응으로 나온다
 * - Loop(반복 동작): 장면 내내 이어지는 움직임 (둥실, 갸웃, 카드 섞기 등)
 */

export const SCENES = ["default", "thinking", "happy", "tarot", "star", "saju"] as const;
export type Scene = (typeof SCENES)[number];

export const MOODS = ["great", "good", "calm", "careful"] as const;
export type Mood = (typeof MOODS)[number];

export const EXPRESSIONS = ["neutral", "blink", "happy", "excited", "calm", "thinking", "worried", "surprised", "sleepy"] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export type Action = "jump" | "spin" | "wiggle" | "nod" | "tilt" | "yawn";
export type Loop = "breathe" | "sway" | "bounce" | "shuffle" | "twinkle";

/** 장면·기분에 따른 기본 표정과 반복 동작 */
export function baseLook(scene: Scene, mood?: Mood | null): { expression: Expression; loop: Loop } {
  if (mood) {
    if (mood === "great") return { expression: "excited", loop: "bounce" };
    if (mood === "good") return { expression: "happy", loop: scene === "star" ? "twinkle" : "bounce" };
    if (mood === "calm") return { expression: "calm", loop: "breathe" };
    return { expression: "worried", loop: "sway" };
  }
  switch (scene) {
    case "thinking":
      return { expression: "thinking", loop: "sway" };
    case "happy":
      return { expression: "happy", loop: "bounce" };
    case "tarot":
      return { expression: "calm", loop: "shuffle" };
    case "star":
      return { expression: "happy", loop: "twinkle" };
    default:
      return { expression: "neutral", loop: "breathe" };
  }
}

/**
 * 장면·기분별로 캐릭터가 드는 소품. 결과 화면에서는 기분이 장면보다 우선한다.
 * 별 지팡이(기본) · 수정구슬(점치는 중) · 두루마리(결과) · 타로 카드 · 망원경(별자리) · 책(사주)
 * 꽃가루(대길) · 네잎클로버(좋음) · 따뜻한 차(차분) · 우산(쉬어가기)
 */
export const PROPS = ["wand", "crystal", "scroll", "cards", "telescope", "books", "confetti", "clover", "tea", "umbrella"] as const;
export type Prop = (typeof PROPS)[number];

const SCENE_PROP: Record<Scene, Prop> = { default: "wand", thinking: "crystal", happy: "scroll", tarot: "cards", star: "telescope", saju: "books" };
const MOOD_PROP: Record<Mood, Prop> = { great: "confetti", good: "clover", calm: "tea", careful: "umbrella" };

export function propFor(scene: Scene, mood?: Mood | null): Prop {
  return mood ? MOOD_PROP[mood] : SCENE_PROP[scene];
}

/**
 * 소품을 들 때 팔 각도(도). 0 = 아래로 늘어뜨림, 음수 = 왼팔이 몸 안쪽으로, 오른팔은 부호가 반대.
 * wave 가 true 면 그 팔을 흔든다.
 */
export const ARM_POSE: Record<Prop, { left: number; right: number; waveLeft?: boolean; waveRight?: boolean }> = {
  wand: { left: 35, right: -140, waveRight: true },
  crystal: { left: -60, right: 60 },
  scroll: { left: -55, right: 55 },
  cards: { left: -50, right: 50 },
  telescope: { left: 20, right: -75 },
  books: { left: -50, right: 50 },
  confetti: { left: 162, right: -162, waveLeft: true, waveRight: true },
  clover: { left: 15, right: -150 },
  tea: { left: -55, right: 55 },
  umbrella: { left: 15, right: -25 },
};

/** 고깔모자를 쓰는 장면 (점술가 모드) */
export function wearsHat(prop: Prop) {
  return prop === "crystal" || prop === "cards";
}

/** 몸짓별 움직임 (Web Animations API 키프레임). 반복 동작은 globals.css 의 char-loop-* 클래스 */
export const ACTION_KEYFRAMES: Record<Action, { frames: Keyframe[]; duration: number; origin?: string }> = {
  jump: {
    frames: [
      { transform: "translateY(0) scale(1, 1)" },
      { transform: "translateY(2%) scale(1.08, 0.9)", offset: 0.15 },
      { transform: "translateY(-22%) scale(0.95, 1.06)", offset: 0.45 },
      { transform: "translateY(0) scale(1.06, 0.94)", offset: 0.8 },
      { transform: "translateY(0) scale(1, 1)" },
    ],
    duration: 650,
  },
  spin: { frames: [{ transform: "rotate(0deg) scale(1)" }, { transform: "rotate(180deg) scale(0.92)", offset: 0.5 }, { transform: "rotate(360deg) scale(1)" }], duration: 700, origin: "50% 55%" },
  wiggle: {
    frames: [
      { transform: "rotate(0deg)" },
      { transform: "rotate(-10deg)", offset: 0.2 },
      { transform: "rotate(9deg)", offset: 0.45 },
      { transform: "rotate(-6deg)", offset: 0.7 },
      { transform: "rotate(0deg)" },
    ],
    duration: 600,
  },
  nod: { frames: [{ transform: "translateY(0)" }, { transform: "translateY(5%)", offset: 0.3 }, { transform: "translateY(0)", offset: 0.6 }, { transform: "translateY(4%)", offset: 0.8 }, { transform: "translateY(0)" }], duration: 700 },
  tilt: { frames: [{ transform: "rotate(0deg)" }, { transform: "rotate(-12deg)", offset: 0.3 }, { transform: "rotate(-12deg)", offset: 0.75 }, { transform: "rotate(0deg)" }], duration: 1300 },
  yawn: { frames: [{ transform: "scale(1, 1)" }, { transform: "scale(1.04, 1.07)", offset: 0.4 }, { transform: "scale(1.04, 1.07)", offset: 0.7 }, { transform: "scale(1, 1)" }], duration: 2200 },
};

/** 몸짓 동안 잠깐 바뀌는 표정 */
export const ACTION_EXPRESSION: Partial<Record<Action, Expression>> = {
  jump: "surprised",
  spin: "excited",
  wiggle: "happy",
  tilt: "thinking",
  yawn: "sleepy",
};

export type Rand = () => number;

/** 가중치 목록에서 하나 고르기 */
export function pickWeighted<T>(items: ReadonlyArray<readonly [T, number]>, rand: Rand): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) {
    if ((r -= w) < 0) return v;
  }
  return items[items.length - 1][0];
}

export type IdleBehavior = { kind: "blink" } | { kind: "look"; dir: -1 | 1 } | { kind: "action"; action: Action };

/**
 * 가만히 있을 때 하는 동작. 대부분은 눈 깜빡임이고, 가끔 두리번거리거나 몸을 흔든다.
 * 오래 건드리지 않으면 하품을 한다. 점치는 중에는 고개를 갸웃한다.
 */
export function pickIdleBehavior(scene: Scene, idleMs: number, rand: Rand): IdleBehavior {
  const sleepy = idleMs > 25_000;
  return pickWeighted<IdleBehavior>(
    [
      [{ kind: "blink" }, 6],
      [{ kind: "look", dir: rand() < 0.5 ? -1 : 1 }, 2],
      [{ kind: "action", action: scene === "thinking" ? "tilt" : "wiggle" }, 1.5],
      [{ kind: "action", action: "yawn" }, sleepy && scene !== "thinking" ? 2 : 0],
    ],
    rand,
  );
}

/** 다음 대기 동작까지 기다릴 시간 (ms) */
export function nextIdleDelay(rand: Rand) {
  return 2200 + Math.floor(rand() * 3800);
}

const LINES: Record<Scene | Mood | "dizzy", readonly string[]> = {
  default: ["오늘도 반가워요!", "별빛 충전 완료 ✨", "간지러워요~", "운세 보러 갈까요?", "톡톡! 저 여기 있어요", "좋은 일이 생길 것 같아요"],
  thinking: ["조금만 기다려 주세요…", "별을 세는 중이에요", "음… 거의 다 됐어요!"],
  happy: ["결과가 나왔어요!", "같이 읽어 봐요", "오늘 하루도 응원해요"],
  tarot: ["마음속으로 질문을 떠올려 보세요", "카드가 기다리고 있어요", "준비되면 카드를 뽑아요"],
  star: ["별들이 속삭이고 있어요", "반짝반짝 ✨", "오늘 밤하늘은 어떨까요?"],
  saju: ["사주책을 펼쳐 볼까요?", "여덟 글자에 담긴 이야기", "열심히 공부하는 중이에요 📚"],
  great: ["오늘 기운이 정말 좋아요!", "최고의 하루 예감 🌟", "신나는 일이 생길지도!"],
  good: ["좋은 흐름이에요", "기분 좋은 하루 보내요", "작은 행운이 따라와요"],
  calm: ["차분하게 가요", "천천히 숨 한 번 쉬어요", "잔잔한 하루도 좋아요"],
  careful: ["천천히 가도 괜찮아요", "오늘은 쉬엄쉬엄 가요", "제가 옆에서 응원할게요"],
  dizzy: ["어지러워요~ @_@", "살살 해 주세요!", "빙글빙글…"],
};

export function linesFor(key: Scene | Mood | "dizzy") {
  return LINES[key];
}

export type TapReaction = { action: Action; expression: Expression; line: string };

/** 짧은 시간에 이 횟수 이상 두드리면 어지러워한다 */
export const DIZZY_TAPS = 5;
export const DIZZY_WINDOW_MS = 2500;

/** 터치했을 때 반응. 연타하면 어지러워한다. 같은 대사가 연달아 나오지 않게 직전 대사를 피한다 */
export function pickTapReaction(scene: Scene, mood: Mood | null | undefined, recentTaps: number, prevLine: string | null, rand: Rand): TapReaction {
  if (recentTaps >= DIZZY_TAPS) {
    return { action: "spin", expression: "surprised", line: pickLine(linesFor("dizzy"), prevLine, rand) };
  }
  const action = pickWeighted<Action>(
    [
      ["jump", 3],
      ["wiggle", 2],
      ["spin", 1],
      ["nod", mood === "careful" || mood === "calm" ? 3 : 1],
    ],
    rand,
  );
  const expression: Expression = mood === "careful" ? "calm" : (ACTION_EXPRESSION[action] ?? "happy");
  const pool = [...linesFor(mood ?? scene), ...(scene === "default" ? [] : linesFor("default").slice(0, 2))];
  return { action, expression, line: pickLine(pool, prevLine, rand) };
}

function pickLine(pool: readonly string[], prev: string | null, rand: Rand) {
  const options = pool.length > 1 && prev ? pool.filter((l) => l !== prev) : pool;
  return options[Math.floor(rand() * options.length)] ?? pool[0];
}

/** 타로 결과의 분위기: 정방향 카드가 많을수록 밝다 (해석을 단정하지 않는 가벼운 연출용) */
export function moodFromTarot(drawn: ReadonlyArray<{ reversed: boolean }>): Mood {
  if (!drawn.length) return "calm";
  const upright = drawn.filter((c) => !c.reversed).length / drawn.length;
  if (upright === 1) return drawn.length > 1 ? "great" : "good";
  if (upright >= 0.5) return "good";
  if (upright > 0) return "calm";
  return "careful";
}

export function isMood(v: unknown): v is Mood {
  return typeof v === "string" && (MOODS as readonly string[]).includes(v);
}
