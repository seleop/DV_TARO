// .env.local 생성 (없을 때만). 암호화 키·크론 비밀값을 무작위로 만들고, 처음에는 로컬 체험 모드로 켠다.
// 사용: npm run setup
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

if (existsSync(".env.local")) {
  console.log(".env.local 이 이미 있습니다. 덮어쓰지 않습니다.");
  process.exit(0);
}
copyFileSync(".env.example", ".env.local");
const text = readFileSync(".env.local", "utf8")
  .replace(/^DATA_ENCRYPTION_KEY=.*$/m, `DATA_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`)
  .replace(/^CRON_SECRET=.*$/m, `CRON_SECRET=${randomBytes(24).toString("base64url")}`)
  .replace(/^LOCAL_DEV_MODE=.*$/m, "LOCAL_DEV_MODE=true")
  .replace(/^ADMIN_EMAILS=.*$/m, "ADMIN_EMAILS=admin@example.test");
writeFileSync(".env.local", text);
console.log(".env.local 을 만들었습니다 (로컬 체험 모드 켜짐). admin@example.test 로 가입하면 관리자가 됩니다.");
console.log("Supabase를 연결하려면 LOCAL_DEV_MODE=false 로 바꾸고 Supabase 값을 채우세요.");
console.log("DATA_ENCRYPTION_KEY 를 잃어버리면 저장된 출생 정보·운세를 복호화할 수 없습니다. 안전한 곳에 백업하세요.");
