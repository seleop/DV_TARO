// 마스코트 렌더 PNG 시퀀스 → 웹용 WebP 스프라이트 시트 + 포스터 + 검수용 미리보기, 그리고 src/config/mascot-assets.ts 생성.
//   node scripts/mascot/encode.mjs [--frame 384] [--quality 80]
// FFmpeg 경로: FFMPEG_PATH 환경변수 → PATH 의 ffmpeg 순서로 찾는다.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, a) => (v.startsWith("--") ? [...acc, [v.slice(2), a[i + 1]]] : acc), []),
);
const FRAME = Number(args.frame ?? 384);
const QUALITY = Number(args.quality ?? 80);
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFMPEG_PATH ? path.join(path.dirname(process.env.FFMPEG_PATH), path.basename(process.env.FFMPEG_PATH).replace("ffmpeg", "ffprobe")) : "ffprobe";

// build_mascot.py 의 STATES 와 맞춘다
const STATES = {
  idle: { fps: 15, loop: true },
  walk: { fps: 20, loop: true },
  think: { fps: 15, loop: true },
  happy: { fps: 20, loop: true },
  wave: { fps: 20, loop: false },
  nod: { fps: 20, loop: false },
  surprised: { fps: 20, loop: false },
  reveal: { fps: 20, loop: false },
  celebrate: { fps: 20, loop: false },
  yawn: { fps: 18, loop: false },
};

/** 빈 칸이 가장 적고 정사각형에 가까운 격자 (4~8열) */
function grid(frames) {
  let best = null;
  for (let cols = 4; cols <= 8; cols++) {
    const rows = Math.ceil(frames / cols);
    const score = (cols * rows - frames) * 10 + Math.abs(cols - rows);
    if (!best || score < best.score) best = { cols, rows, score };
  }
  return best;
}

/** 두 PNG 의 PSNR(dB, 알파 포함 비교). 같으면 inf */
function psnr(a, b) {
  // 결과는 stderr 로 나온다
  const out = spawnSync(FFMPEG, ["-v", "info", "-i", a, "-i", b, "-lavfi", "[0]format=rgba[x];[1]format=rgba[y];[x][y]psnr", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const m = /average:(\S+)/.exec(out);
  return m ? (m[1] === "inf" ? Infinity : Number(m[1])) : NaN;
}

const renderDir = path.join(root, "assets/mascot/render");
const outDir = path.join(root, "public/mascot");
const previewDir = path.join(root, "assets/mascot/preview");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });

const ff = (...a) => execFileSync(FFMPEG, ["-v", "error", "-y", ...a], { stdio: ["ignore", "inherit", "inherit"] });
const probe = (file) =>
  JSON.parse(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "stream=width,height,pix_fmt,codec_name", "-of", "json", file]).toString()).streams[0];

const manifest = {};
for (const [state, cfg] of Object.entries(STATES)) {
  const dir = path.join(renderDir, state);
  if (!fs.existsSync(dir)) {
    console.warn(`건너뜀: ${state} (렌더 없음)`);
    continue;
  }
  const frames = fs.readdirSync(dir).filter((f) => /^\d{4}\.png$/.test(f)).length;
  const { cols, rows } = grid(frames);
  const input = ["-framerate", String(cfg.fps), "-start_number", "0", "-i", path.join(dir, "%04d.png")];
  const file = `${state}.webp`;

  // 스프라이트 시트 (알파 유지)
  ff(...input, "-vf", `scale=${FRAME}:${FRAME}:flags=lanczos,tile=${cols}x${rows}`, "-frames:v", "1", "-c:v", "libwebp", "-quality", String(QUALITY), "-compression_level", "6", "-pix_fmt", "yuva420p", path.join(outDir, file));
  // 검수용 미리보기 MP4 (보라 배경에 합성, 3회 반복)
  ff(
    "-stream_loop", cfg.loop ? "2" : "0", ...input,
    "-filter_complex", `color=c=0x2a1f5c:s=${FRAME}x${FRAME}:r=${cfg.fps}[bg];[0]scale=${FRAME}:${FRAME}[fg];[bg][fg]overlay=shortest=1:format=auto`,
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", path.join(previewDir, `${state}.mp4`),
  );
  const info = probe(path.join(outDir, file));
  const bytes = fs.statSync(path.join(outDir, file)).size;
  manifest[state] = { src: `/mascot/${file}`, frames, cols, rows, fps: cfg.fps, loop: cfg.loop, frameSize: FRAME, bytes };
  console.log(`${state}: ${frames}프레임 ${cols}x${rows} → ${info.width}x${info.height} ${info.codec_name}/${info.pix_fmt} ${(bytes / 1024).toFixed(0)}KB`);
}

// 이음새 검사: 한 번 재생 동작은 첫·끝 프레임이 휴식 자세(idle 첫 프레임)와 같아야 하고,
// 반복 동작은 끝→처음 차이가 평소 프레임 간 차이 수준이어야 한다 (PSNR이 높을수록 비슷함)
const frame = (st, i) => path.join(renderDir, st, `${String(i).padStart(4, "0")}.png`);
const restFrame = frame("idle", 0);
console.log("\n이음새 검사 (PSNR dB, 40 이상이면 눈으로 구분 어려움)");
for (const [st, m] of Object.entries(manifest)) {
  if (m.loop) {
    const seam = psnr(frame(st, m.frames - 1), frame(st, 0));
    const step = psnr(frame(st, 0), frame(st, 1));
    console.log(`  ${st.padEnd(10)} 반복: 끝→처음 ${seam.toFixed(1)} / 보통 프레임 간 ${step.toFixed(1)}`);
  } else {
    const a = psnr(frame(st, 0), restFrame);
    const b = psnr(frame(st, m.frames - 1), restFrame);
    console.log(`  ${st.padEnd(10)} 한 번: 시작=휴식 ${a.toFixed(1)} / 끝=휴식 ${b.toFixed(1)}`);
  }
}

// 포스터: idle 첫 프레임 (로딩 중·동작 줄이기·오류 대체용)
if (manifest.idle) {
  ff("-i", path.join(renderDir, "idle/0000.png"), "-vf", `scale=${FRAME}:${FRAME}:flags=lanczos`, "-c:v", "libwebp", "-quality", String(QUALITY), "-pix_fmt", "yuva420p", path.join(outDir, "poster.webp"));
  console.log(`poster: ${(fs.statSync(path.join(outDir, "poster.webp")).size / 1024).toFixed(0)}KB`);
}

const ts = `// scripts/mascot/encode.mjs 가 생성한다. 직접 고치지 말 것.
// 마스코트 "복이" 스프라이트 시트 정보 (docs/MASCOT.md)
export type MascotState = ${Object.keys(manifest).map((k) => JSON.stringify(k)).join(" | ")};

export type MascotSheet = {
  src: string;
  frames: number;
  cols: number;
  rows: number;
  fps: number;
  loop: boolean;
  frameSize: number;
  bytes: number;
};

export const MASCOT_POSTER = "/mascot/poster.webp";

export const MASCOT_SHEETS: Record<MascotState, MascotSheet> = ${JSON.stringify(manifest, null, 2)};
`;
fs.writeFileSync(path.join(root, "src/config/mascot-assets.ts"), ts);
console.log("src/config/mascot-assets.ts 갱신");
