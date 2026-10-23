// SIGNUP_MODE=invite 일 때 Supabase DB에 초대 코드를 만든다. 사용: npm run invite -- --role user --memo 홍길동 --days 7
// .env.local(또는 환경변수)의 DATABASE_URL 을 사용한다. 관리자 화면에서도 만들 수 있다.
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const args = process.argv.slice(2);
const arg = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const role = arg("role", "user");
if (role !== "user" && role !== "admin") {
  console.error("--role 은 user 또는 admin 이어야 합니다.");
  process.exit(1);
}
const days = Number(arg("days", "14"));
const memo = arg("memo", "") || null;
const url = process.env.DATABASE_URL;
if (!url || url.includes("YOUR-PROJECT-REF")) {
  console.error("DATABASE_URL 이 설정되지 않았습니다 (.env.local 확인).");
  process.exit(1);
}

// src/lib/crypto.ts 의 randomInviteCode / sha256(normalizeInviteCode) 와 같은 규칙
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const buf = randomBytes(12);
let raw = "";
for (let i = 0; i < 12; i++) raw += alphabet[buf[i] % alphabet.length];
const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
const hash = createHash("sha256").update(raw).digest("base64url");

const sql = postgres(url, { prepare: false, max: 1 });
await sql`insert into public.invitations (code_hash, role, memo, expires_at) values (${hash}, ${role}, ${memo}, now() + make_interval(days => ${days}))`;
await sql.end();
console.log(`초대 코드(${role}, ${days}일 유효): ${code}`);
console.log("이 코드는 다시 표시되지 않습니다.");
