"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Screen } from "@/components/app/Screen";
import { useMascotNamed } from "@/components/MascotName";
import { MASCOT_SHEETS } from "@/config/mascot-assets";
import { HOME_MENUS } from "@/lib/home-menu";
import { thanksForName } from "@/lib/mascot-name";
import { HomeGreeting } from "./HomeGreeting";
import { HomeMenu } from "./HomeMenu";
import { ASK_NAME_LINE, NamingOverlay } from "./NamingOverlay";

/** 메뉴를 넘기는 중에 의상이 마구 바뀌지 않게, 멈춘 뒤 잠깐 있다가 갈아입는다 */
const POSE_DELAY_MS = 320;
/** 이름을 아직 짓지 않았으면 마스코트가 인사한 뒤 묻는다 */
const ASK_NAME_DELAY_MS = 1500;
/** 이름을 지어 주면 잠깐 기뻐하며 고맙다고 말한다 */
const THANKS_MS = 4200;

/**
 * 홈 화면: 장면(마스코트·말풍선) + 시트(좌우로 넘기는 메뉴)를 한 상태로 묶는다.
 *  - 메뉴를 넘기면 마스코트가 그 메뉴 의상으로 갈아입고, 배경도 그 기능의 배경으로 바뀌고, 말풍선이 메뉴 이야기를 한다
 *  - 마스코트 이름을 아직 짓지 않은 사용자에게는 한 번 이름을 묻는다(NamingOverlay)
 */
export function HomeView({ displayName, hasPrimary, viewedToday }: { displayName: string; hasPrimary: boolean; viewedToday: boolean }) {
  const router = useRouter();
  const named = useMascotNamed();
  const [index, setIndex] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const [pose, setPose] = useState(HOME_MENUS[0].pose);
  const [backdrop, setBackdrop] = useState(HOME_MENUS[0].backdrop);
  const [asking, setAsking] = useState(false);
  const [thanks, setThanks] = useState<string | null>(null);
  const menu = HOME_MENUS[index];

  useEffect(() => {
    // 마스코트 의상과 배경은 함께, 카드가 멈춘 뒤 잠깐 있다가 바꾼다 (넘기는 중에 깜빡이지 않게)
    const t = setTimeout(() => {
      setPose(thanks ? "happy" : menu.pose);
      setBackdrop(menu.backdrop);
    }, POSE_DELAY_MS);
    return () => clearTimeout(t);
  }, [menu.pose, menu.backdrop, thanks]);

  useEffect(() => {
    if (named) return;
    const t = setTimeout(() => setAsking(true), ASK_NAME_DELAY_MS);
    return () => clearTimeout(t);
  }, [named]);

  useEffect(() => {
    if (!thanks) return;
    const t = setTimeout(() => setThanks(null), THANKS_MS);
    return () => clearTimeout(t);
  }, [thanks]);

  // 다른 메뉴 의상 그림을 미리 받아 두어, 넘길 때 갈아입는 모습이 끊기지 않게 한다 (처음 그린 뒤 여유 있을 때)
  useEffect(() => {
    const t = setTimeout(() => {
      for (const name of ["saju-idle", "saju-read", "tarot-idle", "tarot-draw", "star-idle", "star-stargaze"] as const) {
        const sheet = MASCOT_SHEETS[name];
        if (sheet) new Image().src = sheet.src;
      }
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Screen backdrop={backdrop} scene={<HomeGreeting name={displayName} pose={pose} menu={swiped ? menu : null} viewedToday={viewedToday} special={asking && !named ? ASK_NAME_LINE : thanks} />}>
        <HomeMenu
          index={index}
          onIndexChange={(i) => {
            setIndex(i);
            setSwiped(true);
          }}
          hasPrimary={hasPrimary}
          viewedToday={viewedToday}
        />
      </Screen>
      {asking && !named && (
        <NamingOverlay
          onDone={(name) => {
            setAsking(false);
            setThanks(thanksForName(name, true));
            // 모든 화면이 새 이름을 쓰도록 서버에서 다시 받는다
            router.refresh();
          }}
        />
      )}
    </>
  );
}
