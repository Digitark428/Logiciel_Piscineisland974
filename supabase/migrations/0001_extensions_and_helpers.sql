-- 0001 — Extensions & fonctions utilitaires
-- Piscine Island — fondations multi-tenant

create extension if not exists "pgcrypto";      -- gen_random_uuid, crypt, digest
create extension if not exists "citext";        -- emails insensibles à la casse

-- updated_at auto
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Génère un code entreprise unique, non prévisible : PREFIX-XXXXXX
-- (base32 sans caractères ambigus : pas de 0/O/1/I)
create or replace function public.generate_company_code(p_prefix text default 'PI')
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  exists_already boolean;
begin
  loop
    code := upper(regexp_replace(coalesce(nullif(trim(p_prefix), ''), 'PI'), '[^A-Za-z0-9]', '', 'g'));
    code := substr(code, 1, 3);
    if length(code) = 0 then code := 'PI'; end if;
    code := code || '-';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    select exists(select 1 from public.workspaces where company_code = code) into exists_already;
    exit when not exists_already;
  end loop;
  return code;
end;
$$;
