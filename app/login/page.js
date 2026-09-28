import AuthForm from "@/components/AuthForm";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }) {
  const user = await getSessionUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
  const params = await searchParams;
  return <main><AuthForm mode="login" registrationComplete={params?.registered === "1"} /></main>;
}
