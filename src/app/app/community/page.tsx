import { can, requirePermission } from "@/lib/auth/context";
import { COMMUNITY_INITIAL_POSTS, getCommunityFeedPage } from "@/lib/community";
import { CommunityFeed } from "./CommunityFeed";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const ctx = await requirePermission("community.view");
  const { items, hasMore } = await getCommunityFeedPage(ctx, COMMUNITY_INITIAL_POSTS);

  return (
    <div>
      <PageHeader
        title="Entre nous"
        description="Un espace privé pour partager les petits et grands moments de votre équipe."
      />
      <CommunityFeed initialItems={items} initialHasMore={hasMore} canPublish={can(ctx, "community.publish")} />
    </div>
  );
}
