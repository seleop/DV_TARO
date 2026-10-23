import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getConfig } from "./config";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

let keys: { enc: Buffer; mac: Buffer } | null = null;

function getKeys() {
  if (keys) return keys;
  const master = Buffer.from(getConfig().DATA_ENCRYPTION_KEY, "base64");
  keys = {
    enc: Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), "fortune-app/enc/v1", 32)),
    mac: Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), "fortune-app/mac/v1", 32)),
  };
  return keys;
}

export function resetKeysForTests() {
  keys = null;
}

/** AES-256-GCM. 출력: v1.<iv>.<tag>.<ciphertext> (base64url) */
export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKeys().enc, iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptJson<T>(payload: string): T {
  const [v, iv, tag, ct] = payload.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("암호문 형식 오류");
  const decipher = createDecipheriv("aes-256-gcm", getKeys().enc, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const pt = Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]);
  return JSON.parse(pt.toString("utf8")) as T;
}

/** 익명화 식별자·캐시 키용 HMAC (서버 키 없이는 역산·대조 불가) */
export function hmac(text: string): string {
  return createHmac("sha256", getKeys().mac).update(text).digest("base64url");
}

/** 로그용 익명 사용자 ID */
export function anonId(userId: string): string {
  return hmac(`user:${userId}`).slice(0, 16);
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("base64url");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** 사람이 입력하기 쉬운 초대 코드 (혼동 문자 제외) */
export function randomInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = randomBytes(12);
  let s = "";
  for (let i = 0; i < 12; i++) s += alphabet[buf[i] % alphabet.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize("NFKC"), salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, salt, key] = stored.split("$");
  if (alg !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64url");
  const actual = await scryptAsync(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, { ...SCRYPT, N: Number(n) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
