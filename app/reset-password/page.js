import { ResetPasswordForm } from "@/components/PasswordRecoveryForm";

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  return <main><ResetPasswordForm token={typeof params?.token === "string" ? params.token : ""} /></main>;
}
