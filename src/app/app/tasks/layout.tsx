import { PageHeader } from "@/components/ui";
import { TasksSubnav } from "./TasksSubnav";

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader
        title="Tâches & notes"
        description="Organisez vos priorités, les missions de l'équipe et les informations partagées."
      />
      <TasksSubnav />
      {children}
    </div>
  );
}
