import { BirthForm } from "@/components/BirthForm";

/** 다른 사람(가족·친구)의 사주. 내 사주는 프로필 설정에서 관리한다. */
export default function NewSajuPage() {
  return <BirthForm mode="other" />;
}
