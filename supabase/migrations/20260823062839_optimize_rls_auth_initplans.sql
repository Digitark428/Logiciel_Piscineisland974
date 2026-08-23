-- Evaluate auth.uid() once per statement instead of once per candidate row.
-- Only the execution shape changes: policy names, commands, roles and business
-- predicates remain identical to the production policies audited on 2026-08-23.

alter policy memberships_update_self on public.memberships
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy platform_admins_select on public.platform_admins
  using (user_id = (select auth.uid()));

alter policy notifications_select on public.notifications
  using (
    public.auth_is_member(workspace_id)
    and (
      (recipient_membership_id is null and public.auth_is_admin(workspace_id))
      or recipient_membership_id in (
        select memberships.id
        from public.memberships
        where memberships.user_id = (select auth.uid())
          and memberships.workspace_id = notifications.workspace_id
      )
    )
  );

alter policy notifications_update on public.notifications
  using (
    public.auth_is_member(workspace_id)
    and (
      (recipient_membership_id is null and public.auth_is_admin(workspace_id))
      or recipient_membership_id in (
        select memberships.id
        from public.memberships
        where memberships.user_id = (select auth.uid())
          and memberships.workspace_id = notifications.workspace_id
      )
    )
  )
  with check (public.auth_is_member(workspace_id));

alter policy service_tasks_update on public.service_tasks
  using (
    (select public.auth_has_permission(service_tasks.workspace_id, 'services.edit'))
    or exists (
      select 1
      from public.services s
      join public.memberships m on m.id = s.assigned_membership_id
      where s.id = service_tasks.service_id
        and s.workspace_id = service_tasks.workspace_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and (select public.auth_has_permission(service_tasks.workspace_id, 'services.complete'))
    )
  )
  with check (
    (select public.auth_has_permission(service_tasks.workspace_id, 'services.edit'))
    or exists (
      select 1
      from public.services s
      join public.memberships m on m.id = s.assigned_membership_id
      where s.id = service_tasks.service_id
        and s.workspace_id = service_tasks.workspace_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and (select public.auth_has_permission(service_tasks.workspace_id, 'services.complete'))
    )
  );

alter policy services_update on public.services
  using (
    public.auth_has_permission(workspace_id, 'services.edit')
    or (
      public.auth_has_permission(workspace_id, 'services.complete')
      and assigned_membership_id in (
        select memberships.id
        from public.memberships
        where memberships.user_id = (select auth.uid())
          and memberships.workspace_id = services.workspace_id
      )
    )
  )
  with check (
    public.auth_has_permission(workspace_id, 'services.edit')
    or public.auth_has_permission(workspace_id, 'services.complete')
  );

alter policy support_conversations_select on public.support_conversations
  using (
    public.auth_is_platform_admin()
    or public.auth_is_admin(workspace_id)
    or membership_id in (
      select memberships.id
      from public.memberships
      where memberships.user_id = (select auth.uid())
        and memberships.workspace_id = support_conversations.workspace_id
    )
  );

alter policy support_messages_select on public.support_messages
  using (
    public.auth_is_platform_admin()
    or public.auth_is_admin(workspace_id)
    or conversation_id in (
      select c.id
      from public.support_conversations c
      where c.membership_id in (
        select m.id
        from public.memberships m
        where m.user_id = (select auth.uid())
          and m.workspace_id = c.workspace_id
      )
    )
  );

alter policy tasks_select on public.tasks
  using (
    public.auth_is_member(workspace_id)
    and (
      created_by in (
        select memberships.id
        from public.memberships
        where memberships.user_id = (select auth.uid())
          and memberships.workspace_id = tasks.workspace_id
      )
      or assigned_membership_id in (
        select memberships.id
        from public.memberships
        where memberships.user_id = (select auth.uid())
          and memberships.workspace_id = tasks.workspace_id
      )
      or (category = 'professional' and public.auth_is_admin(workspace_id))
    )
  );

alter policy tasks_insert on public.tasks
  with check (
    public.auth_is_member(workspace_id)
    and created_by in (
      select memberships.id
      from public.memberships
      where memberships.user_id = (select auth.uid())
        and memberships.workspace_id = tasks.workspace_id
    )
    and (
      public.auth_has_permission(workspace_id, 'tasks.manage')
      or (
        category = 'personal'
        and (
          assigned_membership_id is null
          or assigned_membership_id in (
            select memberships.id
            from public.memberships
            where memberships.user_id = (select auth.uid())
              and memberships.workspace_id = tasks.workspace_id
          )
        )
      )
    )
  );

alter policy tasks_update on public.tasks
  using (
    public.auth_is_member(workspace_id)
    and (
      created_by in (
        select memberships.id
        from public.memberships
        where memberships.user_id = (select auth.uid())
          and memberships.workspace_id = tasks.workspace_id
      )
      or assigned_membership_id in (
        select memberships.id
        from public.memberships
        where memberships.user_id = (select auth.uid())
          and memberships.workspace_id = tasks.workspace_id
      )
      or (category = 'professional' and public.auth_is_admin(workspace_id))
    )
  )
  with check (public.auth_is_member(workspace_id));

alter policy tasks_delete on public.tasks
  using (
    created_by in (
      select memberships.id
      from public.memberships
      where memberships.user_id = (select auth.uid())
        and memberships.workspace_id = tasks.workspace_id
    )
    or (category = 'professional' and public.auth_is_admin(workspace_id))
  );

alter policy team_notes_insert on public.team_notes
  with check (
    public.auth_is_member(workspace_id)
    and author_membership_id in (
      select memberships.id
      from public.memberships
      where memberships.user_id = (select auth.uid())
        and memberships.workspace_id = team_notes.workspace_id
    )
  );

alter policy team_notes_delete on public.team_notes
  using (
    public.auth_is_admin(workspace_id)
    or author_membership_id in (
      select memberships.id
      from public.memberships
      where memberships.user_id = (select auth.uid())
        and memberships.workspace_id = team_notes.workspace_id
    )
  );
