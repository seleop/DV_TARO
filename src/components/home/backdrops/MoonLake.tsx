/** 시안 3. 달의 호수: 달무리 진 큰 보름달과 흐르는 구름, 정자와 겹산, 달빛 기둥이 일렁이는 호수, 연꽃 유등·떠오르는 풍등·갈대 */
import { Fireflies, Glint, Mist, Nebula, Scene, ShootingStar, StarField, v } from "./common";
import { FullMoon, LotusLantern, Reeds, SkyLantern } from "./art";

const ID = "m3";
const MX = 187;
const MY = 196;

export function MoonLake() {
  return (
    <Scene id={ID}>
      <defs>
        <linearGradient id={`${ID}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#030824" />
          <stop offset=".4" stopColor="#0c1b4e" />
          <stop offset=".7" stopColor="#1f3474" />
          <stop offset=".82" stopColor="#3a4f8c" />
          <stop offset="1" stopColor="#5a5e98" />
        </linearGradient>
        <linearGradient id={`${ID}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a3c7c" />
          <stop offset=".4" stopColor="#14235a" />
          <stop offset="1" stopColor="#070e32" />
        </linearGradient>
        <linearGradient id={`${ID}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1c9" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff1c9" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${ID}-m1`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4c8a" />
          <stop offset="1" stopColor="#1c2a62" />
        </linearGradient>
        <linearGradient id={`${ID}-m2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22336e" />
          <stop offset="1" stopColor="#111c4a" />
        </linearGradient>
      </defs>
      <rect width="375" height="520" fill={`url(#${ID}-sky)`} />
      <Nebula id={`${ID}-n1`} cx={70} cy={120} rx={160} ry={110} color="#7a6cff" seed={5} freq={0.012} cut={0.6} opacity={0.4} />
      <Nebula id={`${ID}-n2`} cx={320} cy={110} rx={140} ry={100} color="#ff8ad0" seed={14} freq={0.013} cut={0.64} opacity={0.3} />
      <StarField seed={31} n={260} y={[0, 400]} size={[0.25, 1.1]} halo={0.05} />
      <Glint x={44} y={74} r={1.4} />
      <Glint x={330} y={60} r={1.2} delay={2} color="#cfe4ff" />
      <Glint x={300} y={300} r={1} delay={3.3} />
      <ShootingStar id={`${ID}-s1`} x={240} y={60} dx={-160} dy={70} delay={3} />

      <FullMoon id={`${ID}-moon`} x={MX} y={MY} r={44} />

      {/* 흐르는 구름 두 겹 (달 앞을 살짝 지난다) */}
      <g className="hb-drift" style={v({ "--d": "40s" })}>
        <Nebula id={`${ID}-c1`} cx={110} cy={250} rx={170} ry={36} color="#c8d4ff" seed={21} freq={0.02} cut={0.52} density={2} opacity={0.55} />
      </g>
      <g className="hb-drift" style={v({ "--d": "55s", animationDelay: "-20s" })}>
        <Nebula id={`${ID}-c2`} cx={280} cy={200} rx={150} ry={26} color="#e8dcff" seed={29} freq={0.024} cut={0.55} density={2} opacity={0.45} />
        <Nebula id={`${ID}-c3`} cx={90} cy={150} rx={110} ry={20} color="#b8c8ff" seed={37} freq={0.026} cut={0.56} density={2} opacity={0.4} />
      </g>

      {/* 떠오르는 풍등 */}
      <SkyLantern id={`${ID}-l1`} x={60} y={400} s={0.9} delay={-4} d={34} />
      <SkyLantern id={`${ID}-l2`} x={110} y={420} s={0.6} delay={-14} d={40} />
      <SkyLantern id={`${ID}-l3`} x={300} y={410} s={0.8} delay={-9} d={36} />
      <SkyLantern id={`${ID}-l4`} x={250} y={430} s={0.55} delay={-24} d={44} />
      <SkyLantern id={`${ID}-l5`} x={340} y={440} s={0.7} delay={-30} d={38} />

      {/* 겹산과 안개 */}
      <path d="M0 386 L30 360 L62 372 L104 334 L140 362 L178 350 L214 366 L254 330 L292 356 L330 340 L375 362 V420 H0Z" fill={`url(#${ID}-m1)`} />
      <Mist id={ID} y={384} color="#9fb2ff" opacity={0.4} d={46} />
      <path d="M0 404 L40 382 L84 396 L120 376 L170 398 L230 384 L280 400 L330 378 L375 396 V430 H0Z" fill={`url(#${ID}-m2)`} />
      {/* 왼쪽 언덕 위 정자 */}
      <g fill="#0b1236">
        <path d="M0 414 Q40 392 92 404 L92 430 L0 430Z" />
        <path d="M30 392 L76 392 L70 386 L36 386Z" />
        <path d="M24 393 Q53 380 82 393 Q66 384 53 374 Q40 384 24 393Z" />
        <rect x="35" y="393" width="3" height="18" />
        <rect x="68" y="393" width="3" height="18" />
        <rect x="32" y="410" width="42" height="3" />
      </g>
      <rect x="44" y="398" width="16" height="10" fill="#ffcf7a" opacity=".85" className="hb-pulse" style={v({ "--d": "4s" })} />
      <rect x="40" y="394" width="24" height="18" fill="#ffcf7a" opacity=".3" filter={`url(#${ID}-soft)`} />

      {/* 호수 */}
      <rect x="0" y="420" width="375" height="100" fill={`url(#${ID}-water)`} />
      {/* 산 그림자 반사 */}
      <path d="M0 420 L40 436 L84 428 L120 440 L170 426 L230 436 L280 424 L330 440 L375 428 V420 Z" fill="#0f1a48" opacity=".6" />
      {/* 달빛 기둥: 일렁이는 짧은 빛줄 여러 개 */}
      <ellipse cx={MX} cy="470" rx="34" ry="56" fill={`url(#${ID}-beam)`} opacity=".28" filter={`url(#${ID}-soft)`} />
      {Array.from({ length: 34 }, (_, i) => {
        // 가늘고 짧은 물빛이 아래로 갈수록 넓게 흩어진다
        const t = i / 34;
        const y = 423 + t * 86 + ((i * 7) % 5);
        const spread = 10 + t * 34;
        const x = MX + (((i * 37) % 21) / 10 - 1) * spread;
        const w = 4 + ((i * 11) % 9) + (1 - t) * 10;
        return <rect key={i} x={x - w / 2} y={y} width={w} height={0.9 + ((i * 3) % 3) * 0.35} rx=".6" fill="#fff1c9" opacity={0.85 - t * 0.5} className="hb-shimmer" style={v({ "--d": `${1.6 + (i % 5) * 0.5}s`, animationDelay: `${-i * 0.29}s` })} />;
      })}
      {/* 잔물결 */}
      {Array.from({ length: 14 }, (_, i) => {
        const x = (i * 53) % 375;
        const y = 430 + ((i * 37) % 80);
        return <path key={i} d={`M${x} ${y}q8 -2 16 0`} stroke="#8aa0e0" strokeWidth=".8" fill="none" opacity=".5" className="hb-shimmer" style={v({ "--d": "4s", animationDelay: `${-i * 0.6}s` })} />;
      })}
      {/* 연꽃 유등 */}
      <LotusLantern x={60} y={452} s={0.9} delay={0} />
      <LotusLantern x={118} y={474} s={0.7} delay={1.4} />
      <LotusLantern x={262} y={466} s={0.8} delay={0.7} />
      <LotusLantern x={320} y={448} s={0.65} delay={2.1} />
      <LotusLantern x={350} y={486} s={0.9} delay={1} />
      {/* 앞쪽 물가와 갈대 */}
      <path d="M0 496 Q90 484 187 492 T375 488 V520 H0Z" fill="#060a28" />
      <Reeds x={22} y={500} n={8} s={1.1} seed={3} />
      <Reeds x={356} y={498} n={7} s={1} seed={9} />
      <Fireflies seed={13} n={18} x={[0, 375]} y={[380, 490]} color="#fff3a8" />
    </Scene>
  );
}
