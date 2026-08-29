import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { compareTasks } from "@/lib/tasks";
import { PersonalTasksView, type PersonalTaskItem } from "./PersonalTasksView";

export const dynamic = "force-dynamic";

export default async function PersonalTasksPage() {
  const ctx = await requirePermission("tasks.view");
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id,title,description,category,status,priority,due_date,due_time,created_at,created_by,assigned_membership_id")
    .eq("workspace_id", ctx.workspace.id)
    .eq("category", "personal")
    .eq("created_by", ctx.membership.id)
    .order("created_at", { ascending: false });

  const tasks = (data ?? []).sort(compareTasks) as PersonalTaskItem[];
  return <PersonalTasksView initialTasks={tasks} />;
}
