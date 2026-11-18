import { Header } from "@/components/header";
import { LoginForm } from "@/components/login-form";
import { isAuthed } from "@/lib/auth";
import { getLocale } from "@/lib/current-locale";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (await isAuthed()) redirect("/admin");

  return (
    <>
      <Header />
      <main className="login-screen">
        <LoginForm
          locale={await getLocale()}
          configured={Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length >= 12)}
        />
      </main>
    </>
  );
}
