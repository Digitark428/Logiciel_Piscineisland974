import { Logo } from "@/components/Logo";
import { SuperAdminResetPasswordForm } from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default function SuperAdminResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-50 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-graphite-900"><Logo showText={false} /> Administration LETI</div>
          <p className="mt-3 text-sm text-graphite-500">Choisissez un nouveau mot de passe</p>
        </div>
        <div className="card p-8 shadow-float">
          <SuperAdminResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
