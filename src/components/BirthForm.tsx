"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BRAND } from "@/config/brand";
import { api, errorText } from "@/lib/client";
import { josa } from "@/lib/josa";
import { BIRTHPLACES } from "@/lib/saju/input";
import { CharacterStage } from "./Character";
import { SafeForm } from "./SafeForm";
import { BottomActions, Button, Card, ErrorBox, Field, inputCls, TopBar } from "./ui";

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <div className="grid rounded-2xl bg-white/5 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-10 rounded-xl text-sm font-semibold transition ${value === o.value ? "bg-white text-[#2a2440] shadow" : "text-ink-2"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-[#b18cff]" />
      {children}
    </label>
  );
}

/** 폼 초기값 (프로필 설정에서 저장된 내 출생 정보를 채울 때) */
export interface BirthInitial {
  calendar: "solar" | "lunar";
  date: string;
  isLeapMonth: boolean;
  time: string | null;
  gender: "male" | "female" | null;
  birthplaceId: string | null;
  customLongitude: number | null;
  settings: { correction: "none" | "lmt" | "tst"; dayBoundary: "midnight" | "jasi" | "splitJasi"; applyHistoricalOffset: boolean };
}

/**
 * 출생 정보 입력 폼.
 * - mode="profile": 프로필 설정의 "내 출생 정보" (PUT /api/me/birth). 내 사주로 지정되어 오늘의 운세 등에 쓰인다.
 * - mode="other"  : 다른 사람(가족·친구)의 사주 (POST /api/saju)
 */
export function BirthForm({ mode, initial, embedded }: { mode: "profile" | "other"; initial?: BirthInitial | null; embedded?: boolean }) {
  const router = useRouter();
  const makePrimary = mode === "profile";
  const [calendar, setCalendar] = useState<"solar" | "lunar">(initial?.calendar ?? "solar");
  const [leap, setLeap] = useState(initial?.isLeapMonth ?? false);
  const [gender, setGender] = useState<"" | "female" | "male">(initial?.gender ?? "");
  const [timeKnown, setTimeKnown] = useState(initial ? initial.time !== null : true);
  const [correction, setCorrection] = useState<"none" | "lmt" | "tst">(initial?.settings.correction ?? "none");
  const [historical, setHistorical] = useState(initial?.settings.applyHistoricalOffset ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => (f.get(k) === "" || f.get(k) === null ? null : Number(f.get(k)));
    const [y, m, d] = String(f.get("date")).split("-").map(Number);
    const [hh, mm] = timeKnown ? String(f.get("time") || "").split(":").map(Number) : [null, null];
    const birthplaceId = (f.get("birthplaceId") as string) || "seoul";
    const birth = {
        calendar,
        year: y,
        month: m,
        day: d,
        isLeapMonth: calendar === "lunar" && leap,
        timeKnown,
        hour: timeKnown ? hh : null,
        minute: timeKnown ? mm : null,
        gender: gender || null,
        birthplaceId: correction !== "none" && birthplaceId !== "custom" ? birthplaceId : null,
        customLongitude: correction !== "none" && birthplaceId === "custom" ? num("customLongitude") : null,
        settings: { correction, dayBoundary: f.get("dayBoundary") ?? "midnight", applyHistoricalOffset: historical },
    };
    setBusy(true);
    setError(null);
    try {
      if (makePrimary) {
        await api("/api/me/birth", { method: "PUT", body: { birth } });
        router.push("/today");
      } else {
        const r = await api<{ calculation: { id: string } }>("/api/saju", { body: { label: (f.get("label") as string) || null, birth } });
        router.push(`/saju/${r.calculation.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <SafeForm onSubmit={onSubmit} className="flex flex-1 flex-col">
      {!embedded && <TopBar title="다른 사람 사주" back="/saju" />}
      {!embedded && (
      <div className="flex flex-col items-center pt-2 text-center">
        <CharacterStage size={150} orbs={false} />
        <p className="mt-1 text-[19px] font-semibold leading-snug">
          태어난 날을 알려 주면
          <br />
          {josa(BRAND.characterName, "이/가")} 운세를 점쳐 줄게요
        </p>
      </div>
      )}

      <Card className="mt-5 space-y-4">
        {!makePrimary && (
          <Field label="이름(별칭)" hint="기록 구분용. 예: 엄마, 친구">
            <input name="label" maxLength={30} className={inputCls} placeholder="선택 사항" />
          </Field>
        )}
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">달력</span>
          <Segmented value={calendar} onChange={setCalendar} options={[{ value: "solar", label: "양력" }, { value: "lunar", label: "음력" }]} />
        </div>
        <Field label={calendar === "solar" ? "양력 생년월일" : "음력 생년월일"}>
          <input name="date" type="date" required min="1900-01-01" max="2100-12-31" defaultValue={initial?.date} className={inputCls} />
        </Field>
        {calendar === "lunar" && (
          <Check checked={leap} onChange={setLeap}>
            윤달이에요
          </Check>
        )}
        <Field label="태어난 시각">
          <input name="time" type="time" required={timeKnown} disabled={!timeKnown} defaultValue={initial?.time ?? undefined} className={inputCls} />
        </Field>
        <Check
          checked={!timeKnown}
          onChange={(v) => {
            setTimeKnown(!v);
            if (v) setCorrection("none");
          }}
        >
          태어난 시간을 몰라요
        </Check>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">성별 (대운 계산에만 사용)</span>
          <Segmented
            value={gender}
            onChange={setGender}
            options={[
              { value: "", label: "선택 안 함" },
              { value: "female", label: "여" },
              { value: "male", label: "남" },
            ]}
          />
        </div>
      </Card>

      <details className="glass mt-3 rounded-[28px] px-5 py-4">
        <summary className="cursor-pointer text-[15px] font-semibold">고급 설정</summary>
        <div className="mt-4 space-y-4">
          <Field label="자시(23~01시) 처리" hint="학파마다 달라요. 모르면 기본값 그대로 두세요.">
            <select name="dayBoundary" defaultValue={initial?.settings.dayBoundary ?? "midnight"} className={inputCls}>
              <option value="midnight">자정 기준 (기본)</option>
              <option value="jasi">23시부터 다음 날</option>
              <option value="splitJasi">야자시·조자시 구분</option>
            </select>
          </Field>
          <Field label="시간 보정" hint={timeKnown ? "진태양시는 출생지 경도와 균시차를 반영해요." : "출생 시각을 알 때만 쓸 수 있어요."}>
            <select value={correction} onChange={(e) => setCorrection(e.target.value as typeof correction)} disabled={!timeKnown} className={inputCls}>
              <option value="none">보정 안 함 (기본)</option>
              <option value="lmt">지방평균시 (경도 보정)</option>
              <option value="tst">진태양시 (경도 + 균시차)</option>
            </select>
          </Field>
          {correction !== "none" && (
            <>
              <Field label="출생지">
                <select name="birthplaceId" defaultValue={initial?.birthplaceId ?? (initial?.customLongitude ? "custom" : "seoul")} className={inputCls}>
                  {BIRTHPLACES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label} (동경 {b.longitude}°)
                    </option>
                  ))}
                  <option value="custom">직접 입력</option>
                </select>
              </Field>
              <Field label="경도 직접 입력" hint="출생지에서 ‘직접 입력’을 고른 경우 (124~132)">
                <input name="customLongitude" type="number" step="0.01" min={124} max={132} defaultValue={initial?.customLongitude ?? undefined} className={inputCls} />
              </Field>
            </>
          )}
          <Check checked={historical} onChange={setHistorical}>
            과거 표준시·서머타임 반영 (권장)
          </Check>
        </div>
      </details>
      <p className="mt-3 px-2 text-center text-xs text-ink-2">
        출생 정보는 암호화되어 저장되고, MY에서 언제든 지울 수 있어요.
        {makePrimary && initial ? " 생년월일을 바꾸면 이전 내 사주 기록과 해석은 지워져요." : ""}
      </p>

      <BottomActions>
        <div className="space-y-2">
          <ErrorBox message={error} />
          <Button type="submit" size="lg" loading={busy} className="w-full">
            {busy ? "여러 엔진으로 계산·검증 중…" : makePrimary ? "저장하고 오늘의 운세 보기" : "사주 보기"}
          </Button>
        </div>
      </BottomActions>
    </SafeForm>
  );
}
