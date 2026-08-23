import { can, requirePermission } from "@/lib/auth/context";
import { COMMUNITY_INITIAL_POSTS, getCommunityFeedPage } from "@/lib/community";
import { CommunityFeed } from "./CommunityFeed";
import { PageHeader } from "@/components/ui";
import Link from "next/link";
import { normalizeCommunitySearch } from "@/lib/community-search";

export const dynamic = "force-dynamic";

export default async function CommunityPage({ searchParams }: { searchParams: { q?: string } }) {
  const ctx = await requirePermission("community.view");
  const searchQuery = normalizeCommunitySearch(searchParams.q);
  const { items, hasMore } = await getCommunityFeedPage(ctx, COMMUNITY_INITIAL_POSTS, undefined, searchQuery);

  return (
    <div>
      <PageHeader
        title="Entre nous"
        description="Un espace privé pour partager les petits et grands moments de votre équipe."
        action={<Link href="/app/community/gallery" prefetch={false} className="btn-secondary">Galerie photos</Link>}
      />
      <form method="get" className="mx-auto mb-5 flex max-w-3xl flex-wrap gap-2" role="search">
        <label htmlFor="community-search" className="sr-only">Rechercher une publication, un hashtag ou un auteur</label>
        <input id="community-search" name="q" defaultValue={searchParams.q ?? ""} className="input min-w-0 flex-1" placeholder="Rechercher un mot, #hashtag ou auteur…" />
        <button type="submit" className="btn-secondary">Rechercher</button>
        {searchQuery && <Link href="/app/community" className="btn-ghost">Effacer</Link>}
      </form>
      <CommunityFeed key={searchQuery} initialItems={items} initialHasMore={hasMore} canPublish={can(ctx, "community.publish")} searchQuery={searchQuery} />
    </div>
  );
}
