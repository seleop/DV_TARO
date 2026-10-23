import { requirePageAdmin } from "@/lib/auth/session";
import { CharacterLab } from "@/components/CharacterLab";
import { TopBar } from "@/components/ui";

/** 캐릭터 갤러리: 장면·기분·표정·몸짓을 한 화면에서 확인하는 시안 화면 (관리자 전용) */
export default async function CharacterLabPage() {
  await requirePageAdmin();
  return (
    <>
      <TopBar title="캐릭터 갤러리" back="/admin" />
      <CharacterLab />
    </>
  );
}
