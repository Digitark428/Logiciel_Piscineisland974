"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/forms/ActionForm";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { PermissionsFields } from "@/components/forms/PermissionsFields";
import { Card, Avatar } from "@/components/ui";
import {
  updateMemberProfile, updateMemberPermissions, updateMemberEmail,
  resetMemberPassword, setMemberStatus, uploadMemberPhoto, removeMemberPhoto,
} from "@/lib/actions/team";
import { MEMBER_TYPE_LABELS } from "@/lib/utils/format";
import type { Membership } from "@/lib/db/types";

export function MemberManagement({
  member,
  avatarUrl,
  permissions,
  isSelf,
  currentEmail,
}: {
  member: Membership;
  avatarUrl: string | null;
  permissions: string[];
  isSelf: boolean;
  currentEmail: string;
}) {
  const router = useRouter();
  const name = [member.first_name, member.last_name].filter(Boolean).join(" ") || "Membre";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6">
        <PhotoCard memberId={member.id} avatarUrl={avatarUrl} name={name} />
        <StatusCard memberId={member.id} disabled={member.status === "disabled"} isSelf={isSelf} />
      </div>

      <div className="space-y-6 lg:col-span-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-graphite-900">Profil</h2>
          <ActionForm action={updateMemberProfile} successMessage="Membre enregistré.">
            <input type="hidden" name="id" value={member.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="first_name">Prénom</label>
                <input id="first_name" name="first_name" required className="input" defaultValue={member.first_name ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="last_name">Nom</label>
                <input id="last_name" name="last_name" required className="input" defaultValue={member.last_name ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="member_type">Type</label>
                <select id="member_type" name="member_type" className="input" defaultValue={member.member_type}>
                  {Object.entries(MEMBER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="role">Rôle</label>
                <select id="role" name="role" className="input" defaultValue={member.role} disabled={isSelf}>
                  <option value="member">Membre</option>
                  <option value="admin">Administrateur</option>
                </select>
                {isSelf && <input type="hidden" name="role" value={member.role} />}
              </div>
              <div>
                <label className="label" htmlFor="job_title">Poste</label>
                <input id="job_title" name="job_title" className="input" defaultValue={member.job_title ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="phone">Téléphone</label>
                <input id="phone" name="phone" className="input" defaultValue={member.phone ?? ""} />
              </div>
            </div>
            <div className="mt-4 flex justify-end"><SubmitButton>Enregistrer</SubmitButton></div>
          </ActionForm>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-graphite-900">Identifiants</h2>
          <div className="space-y-6">
            <ActionForm action={updateMemberEmail} refreshOnSuccess={false} successMessage="E-mail modifié.">
              <input type="hidden" name="id" value={member.id} />
              <label className="label" htmlFor="email">Adresse e-mail</label>
              <div className="flex gap-2">
                <input id="email" name="email" type="email" required className="input" defaultValue={currentEmail} />
                <SubmitButton variant="secondary">Modifier</SubmitButton>
              </div>
            </ActionForm>

            <ActionForm action={resetMemberPassword} refreshOnSuccess={false} resetOnSuccess successMessage="Mot de passe réinitialisé.">
              <input type="hidden" name="id" value={member.id} />
              <label className="label" htmlFor="password">Nouveau mot de passe</label>
              <div className="flex gap-2">
                <input id="password" name="password" type="text" minLength={8} required className="input" placeholder="8 caractères min." autoComplete="off" />
                <SubmitButton variant="secondary">Réinitialiser</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </Card>

        {member.role === "member" && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-graphite-900">Permissions</h2>
            <ActionForm action={updateMemberPermissions} successMessage="Permissions enregistrées.">
              <input type="hidden" name="id" value={member.id} />
              <PermissionsFields selected={permissions} />
              <div className="mt-4 flex justify-end"><SubmitButton>Enregistrer les permissions</SubmitButton></div>
            </ActionForm>
          </Card>
        )}
      </div>
    </div>
  );
}

function PhotoCard({ memberId, avatarUrl, name }: { memberId: string; avatarUrl: string | null; name: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <Avatar name={name} src={avatarUrl} size={96} />
        <div className="mt-2 text-base font-semibold text-graphite-900">{name}</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.set("id", memberId);
            fd.set("photo", file);
            start(async () => {
              const r = await uploadMemberPhoto(fd);
              setMsg(r.message ?? null);
              router.refresh();
            });
          }}
        />
        <div className="mt-4 flex gap-2">
          <button type="button" disabled={pending} className="btn-secondary" onClick={() => inputRef.current?.click()}>
            {pending ? "Envoi…" : "Changer la photo"}
          </button>
          {avatarUrl && (
            <button type="button" disabled={pending} className="btn-ghost" onClick={() => start(async () => { await removeMemberPhoto(memberId); router.refresh(); })}>
              Retirer
            </button>
          )}
        </div>
        {msg && <p className="mt-2 text-xs text-graphite-500">{msg}</p>}
      </div>
    </Card>
  );
}

function StatusCard({ memberId, disabled, isSelf }: { memberId: string; disabled: boolean; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Card>
      <h2 className="mb-2 text-base font-semibold text-graphite-900">Statut du compte</h2>
      <p className="mb-3 text-sm text-graphite-500">{disabled ? "Ce compte est désactivé (connexion bloquée)." : "Ce compte est actif."}</p>
      {isSelf ? (
        <p className="text-xs text-graphite-400">Vous ne pouvez pas modifier le statut de votre propre compte.</p>
      ) : (
        <button
          type="button"
          disabled={pending}
          className={disabled ? "btn-primary" : "btn-secondary"}
          onClick={() =>
            start(async () => {
              if (!disabled && !confirm("Désactiver ce compte ? Le membre ne pourra plus se connecter.")) return;
              await setMemberStatus(memberId, !disabled);
              router.refresh();
            })
          }
        >
          {pending ? "…" : disabled ? "Réactiver le compte" : "Désactiver le compte"}
        </button>
      )}
    </Card>
  );
}
