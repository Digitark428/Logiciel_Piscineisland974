import { redirect } from "next/navigation";
import { getSuperAdmin } from "@/lib/auth/superadmin";
import { SuperAdminLoginForm } from "./LoginForm";

export default async function SuperAdminLoginPage() {
  if (await getSuperAdmin()) redirect("/super-admin");
  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-950 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-xl bg-graphite-800 px-3 py-1.5 text-sm font-semibold text-graphite-100">
            🛡️ Super Admin
          </div>
          <p className="mt-3 text-sm text-graphite-400">Console propriétaire de la plateforme</p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-float">
          <SuperAdminLoginForm />
        </div>
      </div>
    </div>
  );
}
