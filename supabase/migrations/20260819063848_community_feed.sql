-- 0030 — Feed interne « Entre nous ».
--
-- Toutes les données sont rattachées au workspace. Les contrôles sont doublés :
-- RLS pour l'API et trigger d'intégrité pour empêcher tout lien inter-tenant.

-- =========================================================================
-- PERMISSIONS
-- =========================================================================
create or replace function public.permission_keys()
returns text[]
language sql
immutable
set search_path = public
as $$
  select array[
    'clients.view','clients.edit','clients.delete',
    'pools.view','pools.edit',
    'services.view','services.create','services.edit','services.complete',
    'planning.view','map.view',
    'tasks.view','tasks.manage',
    'community.view','community.publish',
    'documents.view','documents.manage',
    'contracts.manage',
    'invoices.manage',
    'team.manage',
    'settings.manage',
    'backups.manage',
    'sensitive.view'
  ]::text[];
$$;

-- Le feed est immédiatement utilisable par les équipes existantes. Un gérant
-- peut retirer séparément l'accès en lecture ou la faculté de publier depuis
-- la gestion des permissions.
insert into public.permissions (membership_id, workspace_id, key, granted)
select m.id, m.workspace_id, p.key, true
from public.memberships m
cross join (values ('community.view'), ('community.publish')) as p(key)
where m.status = 'active'
on conflict (membership_id, key) do nothing;

-- =========================================================================
-- TABLES
-- =========================================================================
create table public.community_posts (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  author_membership_id  uuid not null references public.memberships(id) on delete cascade,
  content               text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint community_posts_content_length
    check (content is null or char_length(trim(content)) between 1 and 2000)
);

create table public.community_post_media (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  post_id         uuid not null references public.community_posts(id) on delete cascade,
  storage_path    text not null unique,
  position        smallint not null default 0 check (position between 0 and 3),
  created_at      timestamptz not null default now(),
  unique (post_id, position)
);

create table public.community_post_reactions (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  post_id         uuid not null references public.community_posts(id) on delete cascade,
  membership_id   uuid not null references public.memberships(id) on delete cascade,
  reaction        text not null check (reaction in ('like', 'love', 'laugh')),
  created_at      timestamptz not null default now(),
  unique (post_id, membership_id, reaction)
);

create table public.community_post_comments (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  post_id               uuid not null references public.community_posts(id) on delete cascade,
  author_membership_id  uuid not null references public.memberships(id) on delete cascade,
  content               text not null check (char_length(trim(content)) between 1 and 4000),
  created_at            timestamptz not null default now()
);

create index community_posts_workspace_created_idx
  on public.community_posts (workspace_id, created_at desc, id desc);
create index community_post_media_workspace_post_idx
  on public.community_post_media (workspace_id, post_id, position);
create index community_post_reactions_workspace_post_idx
  on public.community_post_reactions (workspace_id, post_id);
create index community_post_comments_workspace_post_created_idx
  on public.community_post_comments (workspace_id, post_id, created_at);

create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row execute function public.set_updated_at();

-- =========================================================================
-- INTÉGRITÉ TENANT
-- =========================================================================
create or replace function public.community_feed_tenant_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid;
  actor_workspace uuid;
  post_workspace uuid;
begin
  if tg_table_name = 'community_posts' then
    actor_id := (to_jsonb(new) ->> 'author_membership_id')::uuid;
  else
    select workspace_id into post_workspace
    from public.community_posts
    where id = (to_jsonb(new) ->> 'post_id')::uuid;

    if post_workspace is distinct from new.workspace_id then
      raise exception 'post_id must belong to the community item workspace';
    end if;

    if tg_table_name = 'community_post_media' then
      return new;
    end if;

    actor_id := (
      to_jsonb(new) ->> case
        when tg_table_name = 'community_post_comments' then 'author_membership_id'
        else 'membership_id'
      end
    )::uuid;
  end if;

  select workspace_id into actor_workspace
  from public.memberships
  where id = actor_id;

  if actor_workspace is distinct from new.workspace_id then
    raise exception 'community actor must belong to the item workspace';
  end if;

  return new;
end;
$$;

revoke all on function public.community_feed_tenant_guard() from public, anon, authenticated;

create trigger community_posts_tenant_guard
  before insert or update on public.community_posts
  for each row execute function public.community_feed_tenant_guard();
create trigger community_post_media_tenant_guard
  before insert or update on public.community_post_media
  for each row execute function public.community_feed_tenant_guard();
create trigger community_post_reactions_tenant_guard
  before insert or update on public.community_post_reactions
  for each row execute function public.community_feed_tenant_guard();
create trigger community_post_comments_tenant_guard
  before insert or update on public.community_post_comments
  for each row execute function public.community_feed_tenant_guard();

-- =========================================================================
-- RLS — les écritures directes restent limitées à l'auteur connecté ; les
-- uploads/suppressions de fichiers passent uniquement par les actions serveur.
-- =========================================================================
alter table public.community_posts enable row level security;
alter table public.community_post_media enable row level security;
alter table public.community_post_reactions enable row level security;
alter table public.community_post_comments enable row level security;

grant select, insert, delete on public.community_posts to authenticated;
grant select on public.community_post_media to authenticated;
grant select, insert, delete on public.community_post_reactions to authenticated;
grant select, insert, delete on public.community_post_comments to authenticated;

create policy community_posts_select on public.community_posts
  for select to authenticated
  using ((select public.auth_has_permission(workspace_id, 'community.view')));
create policy community_posts_insert on public.community_posts
  for insert to authenticated
  with check (
    (select public.auth_has_permission(workspace_id, 'community.publish'))
    and author_membership_id in (
      select id from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = community_posts.workspace_id
        and status = 'active'
    )
  );
create policy community_posts_delete on public.community_posts
  for delete to authenticated
  using (
    (select public.auth_is_admin(workspace_id))
    or author_membership_id in (
      select id from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = community_posts.workspace_id
        and status = 'active'
    )
  );

create policy community_post_media_select on public.community_post_media
  for select to authenticated
  using ((select public.auth_has_permission(workspace_id, 'community.view')));

create policy community_post_reactions_select on public.community_post_reactions
  for select to authenticated
  using ((select public.auth_has_permission(workspace_id, 'community.view')));
create policy community_post_reactions_insert on public.community_post_reactions
  for insert to authenticated
  with check (
    (select public.auth_has_permission(workspace_id, 'community.publish'))
    and membership_id in (
      select id from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = community_post_reactions.workspace_id
        and status = 'active'
    )
  );
create policy community_post_reactions_delete on public.community_post_reactions
  for delete to authenticated
  using (
    membership_id in (
      select id from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = community_post_reactions.workspace_id
        and status = 'active'
    )
  );

create policy community_post_comments_select on public.community_post_comments
  for select to authenticated
  using ((select public.auth_has_permission(workspace_id, 'community.view')));
create policy community_post_comments_insert on public.community_post_comments
  for insert to authenticated
  with check (
    (select public.auth_has_permission(workspace_id, 'community.publish'))
    and author_membership_id in (
      select id from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = community_post_comments.workspace_id
        and status = 'active'
    )
  );
create policy community_post_comments_delete on public.community_post_comments
  for delete to authenticated
  using (
    (select public.auth_is_admin(workspace_id))
    or author_membership_id in (
      select id from public.memberships
      where user_id = (select auth.uid())
        and workspace_id = community_post_comments.workspace_id
        and status = 'active'
    )
  );

-- =========================================================================
-- STORAGE — bucket strictement privé. Les membres ne peuvent lire que les
-- photos de leur workspace ; aucune écriture directe n'est ouverte.
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('community-media', 'community-media', false)
on conflict (id) do update set public = false;

create policy "community_media_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'community-media'
    and public.auth_has_permission(public.storage_workspace_id(name), 'community.view')
  );
