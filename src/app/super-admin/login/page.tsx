import { redirect } from "next/navigation";
import { getSuperAdmin } from "@/lib/auth/superadmin";
import { SuperAdminLoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";

export default async function SuperAdminLoginPage() {
  if (await getSuperAdmin()) redirect("/super-admin");
  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-50 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-graphite-900"><Logo showText={false} /> Administration LETI</div>
          <p className="mt-3 text-sm text-graphite-500">Console propriétaire de la plateforme</p>
        </div>
        <div className="card p-8 shadow-float">
          <SuperAdminLoginForm />
        </div>
      </div>
    </div>
  );
}
