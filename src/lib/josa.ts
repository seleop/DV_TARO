/** 한국어 조사 선택: 받침 유무에 따라 "이/가", "은/는", "을/를", "과/와" 중 하나를 붙인다. */
export function josa(word: string, pair: "이/가" | "은/는" | "을/를" | "과/와") {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  const hasBatchim = code >= 0 && code <= 11171 ? code % 28 !== 0 : false;
  const [withB, withoutB] = pair.split("/");
  return `${word}${hasBatchim ? withB : withoutB}`;
}
