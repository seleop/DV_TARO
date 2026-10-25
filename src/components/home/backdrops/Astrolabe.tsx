/** 시안 1. 점성술사의 언덕: 은하수 아래 금빛 아스트롤라베(십이지·천간 고리), 관측소 돔·망원경, 등불 나무, 반딧불·안개 */
import { BRANCHES, Fireflies, Glint, HANJA_FONT, Mist, Nebula, STEMS, Scene, ShootingStar, StarField, polar, v } from "./common";
import { CrescentMoon, Grass } from "./art";

const ID = "a1";
const GOLD = "#f4d38a";
const CX = 187;
const CY = 232;

export function AstrolabeHill() {
  return (
    <Scene id={ID}>
      <defs>
        <linearGradient id={`${ID}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#04061c" />
          <stop offset=".3" stopColor="#0e1146" />
          <stop offset=".55" stopColor="#24196a" />
          <stop offset=".74" stopColor="#4a2a84" />
          <stop offset=".86" stopColor="#8a4690" />
          <stop offset="1" stopColor="#d27a8e" />
        </linearGradient>
        <radialGradient id={`${ID}-dusk`} cx=".5" cy="1" r=".8">
          <stop offset="0" stopColor="#ffb08a" stopOpacity=".55" />
          <stop offset=".5" stopColor="#ff7aa8" stopOpacity=".12" />
          <stop offset="1" stopColor="#ff7aa8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${ID}-rim`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffb08a" stopOpacity="0" />
          <stop offset=".5" stopColor="#ffd0b0" />
          <stop offset="1" stopColor="#ffb08a" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${ID}-core`}>
          <stop offset="0" stopColor="#fff6d8" />
          <stop offset=".25" stopColor="#ffd98a" stopOpacity=".6" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="375" height="520" fill={`url(#${ID}-sky)`} />
      <rect y="300" width="375" height="220" fill={`url(#${ID}-dusk)`} />

      {/* 은하수: 잡음 구름 여러 겹 + 어두운 먼지 띠 + 빽빽한 별 띠 */}
      <Nebula id={`${ID}-mw1`} cx={190} cy={190} rx={300} ry={70} rotate={-32} color="#c9b6ff" seed={3} freq={0.014} cut={0.5} opacity={0.75} />
      <Nebula id={`${ID}-mw2`} cx={170} cy={200} rx={240} ry={42} rotate={-32} color="#ffd6f0" seed={9} freq={0.022} cut={0.56} opacity={0.6} />
      <Nebula id={`${ID}-mw3`} cx={180} cy={196} rx={250} ry={22} rotate={-32} color="#140c3a" seed={17} freq={0.03} cut={0.5} density={2.4} blend="normal" opacity={0.7} />
      <Nebula id={`${ID}-n1`} cx={60} cy={110} rx={120} ry={90} color="#ff5fb8" seed={22} freq={0.012} cut={0.6} opacity={0.5} />
      <Nebula id={`${ID}-n2`} cx={330} cy={290} rx={130} ry={90} color="#3cc8ff" seed={31} freq={0.013} cut={0.62} opacity={0.4} />
      <StarField seed={1} n={240} y={[0, 420]} size={[0.25, 1.1]} halo={0.05} />
      <StarField seed={2} n={320} size={[0.2, 0.8]} band={{ x1: -40, y1: 340, x2: 420, y2: 50, w: 34 }} halo={0.02} />
      <Glint x={46} y={150} r={1.5} delay={0.3} />
      <Glint x={300} y={78} r={1.3} delay={1.4} color="#ffe7b8" />
      <Glint x={342} y={236} r={1.1} delay={2.6} color="#cfe4ff" />
      <Glint x={20} y={300} r={1} delay={3.1} />
      <ShootingStar id={`${ID}-s1`} x={20} y={120} delay={1} />
      <ShootingStar id={`${ID}-s2`} x={200} y={60} dx={150} dy={90} delay={5.5} d={11} />
      <CrescentMoon id={`${ID}-moon`} x={326} y={140} r={15} />

      {/* 아스트롤라베 */}
      <circle cx={CX} cy={CY} r={175} fill={`url(#${ID}-core)`} opacity=".25" />
      <g filter={`url(#${ID}-glow)`} opacity=".88">
        {/* 바깥 고리: 눈금 + 십이지 (아주 천천히) */}
        <g className="hb-spin" style={v({ "--d": "320s", transformOrigin: `${CX}px ${CY}px` })}>
          <circle cx={CX} cy={CY} r={156} fill="none" stroke={GOLD} strokeWidth="1.8" />
          <circle cx={CX} cy={CY} r={151} fill="none" stroke={GOLD} strokeWidth=".6" />
          <circle cx={CX} cy={CY} r={124} fill="none" stroke={GOLD} strokeWidth="1.2" />
          {Array.from({ length: 120 }, (_, i) => {
            const [x1, y1] = polar(CX, CY, i % 10 === 0 ? 140 : i % 5 === 0 ? 144 : 147, i * 3);
            const [x2, y2] = polar(CX, CY, 151, i * 3);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth={i % 10 === 0 ? 1.1 : 0.5} />;
          })}
          {BRANCHES.map((ch, i) => {
            const deg = i * 30 + 15;
            const [x, y] = polar(CX, CY, 132, deg);
            const [lx1, ly1] = polar(CX, CY, 124, i * 30);
            const [lx2, ly2] = polar(CX, CY, 140, i * 30);
            return (
              <g key={ch}>
                <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={GOLD} strokeWidth=".8" />
                <text x={x} y={y} fontSize="11" fill={GOLD} textAnchor="middle" dominantBaseline="central" fontFamily={HANJA_FONT} fontWeight="700" transform={`rotate(${deg} ${x} ${y})`}>
                  {ch}
                </text>
              </g>
            );
          })}
        </g>
        {/* 가운데 고리: 천간 + 점선 (반대로) */}
        <g className="hb-spin-r" style={v({ "--d": "200s", transformOrigin: `${CX}px ${CY}px` })}>
          <circle cx={CX} cy={CY} r={104} fill="none" stroke={GOLD} strokeWidth=".8" strokeDasharray="1 3" />
          <circle cx={CX} cy={CY} r={92} fill="none" stroke={GOLD} strokeWidth=".9" />
          {STEMS.map((ch, i) => {
            const deg = i * 36;
            const [x, y] = polar(CX, CY, 98, deg);
            return (
              <text key={ch} x={x} y={y} fontSize="8" fill={GOLD} textAnchor="middle" dominantBaseline="central" fontFamily={HANJA_FONT} transform={`rotate(${deg} ${x} ${y})`}>
                {ch}
              </text>
            );
          })}
        </g>
        {/* 황도 고리(기울어진 타원) + 레테(별 가리키는 바늘) */}
        <g className="hb-spin" style={v({ "--d": "90s", transformOrigin: `${CX}px ${CY}px` })}>
          <ellipse cx={CX} cy={CY - 16} rx={70} ry={58} fill="none" stroke={GOLD} strokeWidth="1.1" />
          <ellipse cx={CX} cy={CY - 16} rx={62} ry={50} fill="none" stroke={GOLD} strokeWidth=".5" strokeDasharray="3 2" />
          {Array.from({ length: 7 }, (_, i) => {
            const deg = i * 51 + 10;
            const [bx, by] = polar(CX, CY, 30, deg);
            const [tx, ty] = polar(CX, CY, 84 - (i % 3) * 8, deg + 14);
            const [cx2, cy2] = polar(CX, CY, 60, deg - 10);
            return (
              <g key={i}>
                <path d={`M${bx} ${by}Q${cx2} ${cy2} ${tx} ${ty}`} stroke={GOLD} strokeWidth="1.3" fill="none" />
                <path d={`M${tx} ${ty}m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0`} fill="none" stroke={GOLD} strokeWidth=".9" />
                <circle cx={tx} cy={ty} r="1.4" fill="#fff6d8" />
              </g>
            );
          })}
        </g>
        {/* 중심: 십자 바늘 + 빛나는 별 */}
        <g className="hb-spin-r" style={v({ "--d": "60s", transformOrigin: `${CX}px ${CY}px` })}>
          <path d={`M${CX} ${CY - 118}L${CX + 3} ${CY}L${CX} ${CY + 118}L${CX - 3} ${CY}Z`} fill={GOLD} opacity=".7" />
          <path d={`M${CX - 118} ${CY}L${CX} ${CY - 2}L${CX + 118} ${CY}L${CX} ${CY + 2}Z`} fill={GOLD} opacity=".45" />
        </g>
        <circle cx={CX} cy={CY} r={16} fill="none" stroke={GOLD} strokeWidth="1.4" />
        <circle cx={CX} cy={CY} r={5} fill="#fff6d8" />
      </g>
      <Glint x={CX} y={CY} r={2.4} d={3} color="#fff6d8" />

      {/* 먼 언덕 → 가까운 언덕 (윗면 빛 테두리) */}
      <path d="M0 412 Q60 388 120 400 T250 392 T375 398 V520 H0Z" fill="#3a2168" />
      <Mist id={ID} y={410} color="#f0a8d0" opacity={0.35} />
      <path d="M0 430 Q80 404 170 420 T375 414 V520 H0Z" fill="#241650" />
      <path d="M0 430 Q80 404 170 420 T375 414" fill="none" stroke={`url(#${ID}-rim)`} strokeWidth="1.4" />

      {/* 왼쪽 언덕 위 관측소 */}
      <g>
        <path d="M14 452 L14 418 Q14 394 40 392 Q66 394 66 418 L66 452 Z" fill="#170e3a" />
        <path d="M18 418 Q18 398 40 396 Q62 398 62 418 Z" fill="#2c1d5c" />
        <path d="M36 396 L44 396 L46 418 L34 418 Z" fill="#0c0626" />
        <rect x="30" y="428" width="9" height="12" rx="1" fill="#ffcf7a" className="hb-pulse" style={v({ "--d": "5s" })} />
        <rect x="30" y="428" width="9" height="12" rx="1" fill="#ffcf7a" opacity=".25" filter={`url(#${ID}-soft)`} />
        {/* 망원경 */}
        <g transform="rotate(-38 46 404)">
          <rect x="40" y="398" width="34" height="7" rx="2" fill="#3c2a74" />
          <rect x="70" y="396.5" width="8" height="10" rx="1.5" fill={GOLD} />
          <circle cx="78" cy="401.5" r="2" fill="#cfe4ff" opacity=".9" />
        </g>
      </g>
      {/* 오른쪽 나무와 등불 */}
      <g fill="#120a30">
        <path d="M330 450 C326 420 334 404 324 380 L330 380 C342 404 336 424 340 450 Z" />
        <path d="M327 392 Q306 382 292 388 M331 384 Q352 370 366 378 M328 404 Q312 404 304 414" stroke="#120a30" strokeWidth="3" fill="none" />
        {[
          [300, 380, 18],
          [322, 366, 22],
          [352, 368, 20],
          [366, 384, 14],
          [310, 396, 12],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} />
        ))}
      </g>
      <g className="hb-sway" style={v({ "--d": "4.5s" })}>
        <line x1="304" y1="414" x2="304" y2="424" stroke="#5a4a2a" strokeWidth=".8" />
        <circle cx="304" cy="430" r="12" fill="#ffcf7a" opacity=".2" />
        <rect x="300" y="424" width="8" height="11" rx="2" fill="#ffcf7a" />
        <rect x="299" y="423" width="10" height="2" fill="#6a4a2a" />
      </g>
      <Grass y={452} color="#160d36" seed={4} n={70} h={9} />
      <Fireflies seed={5} n={22} x={[0, 375]} y={[360, 450]} />
    </Scene>
  );
}
