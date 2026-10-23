import { getConfig } from "@/lib/config";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return <LoginForm signupMode={getConfig().SIGNUP_MODE} />;
}
