import { can, requirePermission } from "@/lib/auth/context";
import { getMemberOptions } from "@/lib/db/queries";
import { signedUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { compareTasks } from "@/lib/tasks";
import { todayInReunion } from "@/lib/utils/date";
import { AssignedTasksView, type AssignedTaskItem } from "./AssignedTasksView";

export const dynamic = "force-dynamic";

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function AssignedTasksPage() {
  const ctx = await requirePermission("tasks.view");
  const supabase = createClient();
  const canManage = can(ctx, "tasks.manage");
  const myId = ctx.membership.id;
  const [tasksRes, members] = await Promise.all([
    supabase
      .from("tasks")
      .select("id,title,description,category,status,priority,due_date,due_time,created_at,created_by,assigned_membership_id,assignee:memberships!tasks_assigned_membership_id_fkey(id,first_name,last_name,email,role,job_title,photo_path)")
      .eq("workspace_id", ctx.workspace.id)
      .eq("category", "professional")
      .order("created_at", { ascending: false }),
    canManage ? getMemberOptions(supabase, ctx.workspace.id) : Promise.resolve([]),
  ]);

  const rows = (tasksRes.data ?? []).map((task: any) => ({
    ...task,
    assignee: relationOne(task.assignee),
    canToggle: task.created_by === myId || task.assigned_membership_id === myId || ctx.isAdmin,
    canDelete: task.created_by === myId || ctx.isAdmin,
  })).sort(compareTasks);
  const avatarByPath = await signedUrls("avatars", rows.map((task: any) => task.assignee?.photo_path));

  const tasks = rows.map((task: any) => ({
    ...task,
    assigneeAvatarUrl: task.assignee?.photo_path ? avatarByPath.get(task.assignee.photo_path) ?? null : null,
  })) as AssignedTaskItem[];

  return (
    <AssignedTasksView
      initialTasks={tasks}
      members={members}
      canManage={canManage}
      today={todayInReunion()}
    />
  );
}
