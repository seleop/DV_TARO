// 마스코트 렌더 PNG 시퀀스 → 웹용 WebP 스프라이트 시트 + 포스터 + 검수용 미리보기, 그리고 src/config/mascot-assets.ts 생성.
//   node scripts/mascot/encode.mjs [--height 512] [--quality 90]
// 모든 동작·의상 프레임에서 캐릭터가 차지하는 영역(알파)의 합집합으로 빈 여백을 잘라낸다.
// 같은 영역으로 자르므로 동작을 바꿔도 위치가 어긋나지 않는다.
// FFmpeg 경로: FFMPEG_PATH 환경변수 → PATH 의 ffmpeg 순서로 찾는다.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, a) => (v.startsWith("--") ? [...acc, [v.slice(2), a[i + 1]]] : acc), []),
);
const FRAME_H = Number(args.height ?? 512); // 시트 한 칸의 높이(px)
const QUALITY = Number(args.quality ?? 90);
const MAX_SIDE = 4096; // iOS 사파리 등에서 안전한 이미지 한 변 최대
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFMPEG_PATH ? path.join(path.dirname(process.env.FFMPEG_PATH), path.basename(process.env.FFMPEG_PATH).replace("ffmpeg", "ffprobe")) : "ffprobe";

// build_mascot.py 가 렌더하면서 남긴 목록 (이름 → 의상·동작·fps·반복)
const renderManifest = JSON.parse(fs.readFileSync(path.join(root, "assets/mascot/render/manifest.json"), "utf8"));
const STATES = Object.fromEntries(Object.entries(renderManifest).map(([name, m]) => [name, { fps: m.fps, loop: m.loop, outfit: m.outfit, state: m.state }]));

/** 빈 칸이 적고, 한 변이 MAX_SIDE 이하이며, 정사각형에 가까운 격자 */
function grid(frames, fw, fh) {
  let best = null;
  for (let cols = 2; cols <= 12; cols++) {
    const rows = Math.ceil(frames / cols);
    const w = cols * fw;
    const h = rows * fh;
    if (w > MAX_SIDE || h > MAX_SIDE) continue;
    const score = (cols * rows - frames) * 400 + Math.abs(w - h);
    if (!best || score < best.score) best = { cols, rows, score };
  }
  if (!best) throw new Error(`프레임 ${frames}개를 ${MAX_SIDE}px 안에 넣을 수 없음: --height 를 줄이세요`);
  return best;
}

/** 폴더의 모든 프레임에서 불투명 영역 경계 (ffmpeg bbox) */
function alphaBox(dir) {
  const out = spawnSync(FFMPEG, ["-v", "info", "-start_number", "0", "-i", path.join(dir, "%04d.png"), "-vf", "alphaextract,bbox=min_val=8", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 64 << 20 }).stderr;
  const box = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  for (const m of out.matchAll(/x1:(\d+) x2:(\d+) y1:(\d+) y2:(\d+)/g)) {
    box.x1 = Math.min(box.x1, +m[1]);
    box.x2 = Math.max(box.x2, +m[2]);
    box.y1 = Math.min(box.y1, +m[3]);
    box.y2 = Math.max(box.y2, +m[4]);
  }
  return box;
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

// 공통 자르기 영역 (여백 3% 추가, 짝수 크기)
const renderSize = probe(path.join(renderDir, Object.keys(STATES)[0], "0000.png"));
const all = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
for (const name of Object.keys(STATES)) {
  const b = alphaBox(path.join(renderDir, name));
  all.x1 = Math.min(all.x1, b.x1);
  all.y1 = Math.min(all.y1, b.y1);
  all.x2 = Math.max(all.x2, b.x2);
  all.y2 = Math.max(all.y2, b.y2);
}
const pad = Math.round(renderSize.height * 0.03);
const cx1 = Math.max(0, all.x1 - pad);
const cy1 = Math.max(0, all.y1 - pad);
const cw = Math.min(renderSize.width, all.x2 + pad + 1) - cx1;
const ch = Math.min(renderSize.height, all.y2 + pad + 1) - cy1;
const CROP = `crop=${cw - (cw % 2)}:${ch - (ch % 2)}:${cx1}:${cy1}`;
const FRAME_W = Math.round((FRAME_H * cw) / ch / 2) * 2;
console.log(`자르기: 렌더 ${renderSize.width}x${renderSize.height} → 영역 ${cw}x${ch} (${cx1},${cy1}) → 칸 ${FRAME_W}x${FRAME_H}`);
const SCALE = `${CROP},scale=${FRAME_W}:${FRAME_H}:flags=lanczos`;

const manifest = {};
for (const [state, cfg] of Object.entries(STATES)) {
  const dir = path.join(renderDir, state);
  if (!fs.existsSync(dir)) {
    console.warn(`건너뜀: ${state} (렌더 없음)`);
    continue;
  }
  const frames = fs.readdirSync(dir).filter((f) => /^\d{4}\.png$/.test(f)).length;
  const { cols, rows } = grid(frames, FRAME_W, FRAME_H);
  const input = ["-framerate", String(cfg.fps), "-start_number", "0", "-i", path.join(dir, "%04d.png")];
  const file = `${state}.webp`;

  // 스프라이트 시트 (알파 유지)
  ff(...input, "-vf", `${SCALE},tile=${cols}x${rows}`, "-frames:v", "1", "-c:v", "libwebp", "-quality", String(QUALITY), "-compression_level", "6", "-pix_fmt", "yuva420p", path.join(outDir, file));
  // 검수용 미리보기 MP4 (보라 배경에 합성, 3회 반복)
  ff(
    "-stream_loop", cfg.loop ? "2" : "0", ...input,
    "-filter_complex", `color=c=0x2a1f5c:s=${FRAME_W}x${FRAME_H}:r=${cfg.fps}[bg];[0]${SCALE}[fg];[bg][fg]overlay=shortest=1:format=auto`,
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", path.join(previewDir, `${state}.mp4`),
  );
  const info = probe(path.join(outDir, file));
  const bytes = fs.statSync(path.join(outDir, file)).size;
  manifest[state] = { src: `/mascot/${file}`, outfit: cfg.outfit, state: cfg.state, frames, cols, rows, fps: cfg.fps, loop: cfg.loop, frameW: FRAME_W, frameH: FRAME_H, bytes };
  console.log(`${state}: ${frames}프레임 ${cols}x${rows} → ${info.width}x${info.height} ${info.codec_name}/${info.pix_fmt} ${(bytes / 1024).toFixed(0)}KB`);
}

// 이음새 검사: 한 번 재생 동작은 첫·끝 프레임이 휴식 자세(idle 첫 프레임)와 같아야 하고,
// 반복 동작은 끝→처음 차이가 평소 프레임 간 차이 수준이어야 한다 (PSNR이 높을수록 비슷함)
const frame = (st, i) => path.join(renderDir, st, `${String(i).padStart(4, "0")}.png`);
const restFrame = (m) => frame(m.outfit === "default" ? "idle" : `${m.outfit}-idle`, 0); // 의상별 휴식 자세
console.log("\n이음새 검사 (PSNR dB, 40 이상이면 눈으로 구분 어려움)");
for (const [st, m] of Object.entries(manifest)) {
  if (m.loop) {
    const seam = psnr(frame(st, m.frames - 1), frame(st, 0));
    const step = psnr(frame(st, 0), frame(st, 1));
    console.log(`  ${st.padEnd(16)} 반복: 끝→처음 ${seam.toFixed(1)} / 보통 프레임 간 ${step.toFixed(1)}`);
  } else {
    const a = psnr(frame(st, 0), restFrame(m));
    const b = psnr(frame(st, m.frames - 1), restFrame(m));
    console.log(`  ${st.padEnd(16)} 한 번: 시작=휴식 ${a.toFixed(1)} / 끝=휴식 ${b.toFixed(1)}`);
  }
}

// 포스터: 의상별 idle 첫 프레임 (로딩 중·동작 줄이기·오류 대체용)
const posters = {};
for (const m of Object.values(manifest)) {
  if (m.state !== "idle") continue;
  const name = m.outfit === "default" ? "poster.webp" : `poster-${m.outfit}.webp`;
  const src = path.join(renderDir, m.outfit === "default" ? "idle" : `${m.outfit}-idle`, "0000.png");
  ff("-i", src, "-vf", SCALE, "-c:v", "libwebp", "-quality", String(QUALITY), "-pix_fmt", "yuva420p", path.join(outDir, name));
  posters[m.outfit] = `/mascot/${name}`;
  console.log(`${name}: ${(fs.statSync(path.join(outDir, name)).size / 1024).toFixed(0)}KB`);
}

const ts = `// scripts/mascot/encode.mjs 가 생성한다. 직접 고치지 말 것.
// 마스코트 "별이" 스프라이트 시트 정보 (docs/MASCOT.md)
export type MascotState = ${Object.keys(manifest).map((k) => JSON.stringify(k)).join(" | ")};
export type MascotOutfit = ${[...new Set(Object.values(manifest).map((m) => m.outfit))].map((k) => JSON.stringify(k)).join(" | ")};

export type MascotSheet = {
  src: string;
  outfit: MascotOutfit;
  /** 의상과 상관없는 동작 이름 (idle, wave, read 등) */
  state: string;
  frames: number;
  cols: number;
  rows: number;
  fps: number;
  loop: boolean;
  /** 한 칸 크기(px). 캐릭터 주변 여백을 잘라 낸 크기라 정사각형이 아니다 */
  frameW: number;
  frameH: number;
  bytes: number;
};

export const MASCOT_POSTER = "/mascot/poster.webp";

export const MASCOT_POSTERS: Record<MascotOutfit, string> = ${JSON.stringify(posters, null, 2)};

export const MASCOT_SHEETS: Record<MascotState, MascotSheet> = ${JSON.stringify(manifest, null, 2)};
`;
fs.writeFileSync(path.join(root, "src/config/mascot-assets.ts"), ts);
console.log("src/config/mascot-assets.ts 갱신");
