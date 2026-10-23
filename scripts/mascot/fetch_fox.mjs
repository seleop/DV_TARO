// 마스코트 "별이" 원본 모델(Aurora Fox (Rigged), 작가 Eliška Pantůčková, BlenderKit 무료·royalty free)을 내려받는다.
//   node scripts/mascot/fetch_fox.mjs
// - 모델 파일은 저장소에 넣지 않는다 (라이선스상 모델 파일 재배포는 안 됨). 앱에는 렌더한 그림만 들어간다.
// - 로그인 없이 받을 수 있는 무료 에셋이다. 저장 위치: assets/reference/aurora-fox.glb (git 제외 폴더)
import fs from "node:fs";
import path from "node:path";

const ASSET_BASE_ID = "39407568-a74a-4cee-a018-173ea064858e";
const out = path.resolve(import.meta.dirname, "../../assets/reference/aurora-fox.glb");

const search = await fetch(`https://www.blenderkit.com/api/v1/search/?query=asset_base_id:${ASSET_BASE_ID}+asset_type:model`).then((r) => r.json());
const asset = search.results?.[0];
if (!asset) throw new Error("BlenderKit 에서 에셋을 찾지 못했습니다");
console.log(`${asset.name} · ${asset.license} · 무료=${asset.isFree}`);
const gltf = asset.files.find((f) => f.fileType === "gltf");
if (!gltf) throw new Error("glTF 파일이 없습니다");
const link = await fetch(`${gltf.downloadUrl}?scene_uuid=00000000-0000-0000-0000-000000000000`).then((r) => r.json());
const res = await fetch(link.filePath);
if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
console.log(`저장: ${path.relative(process.cwd(), out)} (${(fs.statSync(out).size / 1024).toFixed(0)}KB)`);
