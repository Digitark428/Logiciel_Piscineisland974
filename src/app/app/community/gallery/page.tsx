import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth/context";
import { COMMUNITY_GALLERY_INITIAL_POSTS, getCommunityGalleryPage } from "@/lib/community";
import { normalizeCommunitySearch } from "@/lib/community-search";
import { CommunityGallery } from "./CommunityGallery";

export const dynamic = "force-dynamic";

export default async function CommunityGalleryPage({ searchParams }: { searchParams: { q?: string } }) {
  const ctx = await requirePermission("community.view");
  const searchQuery = normalizeCommunitySearch(searchParams.q);
  const page = await getCommunityGalleryPage(ctx, COMMUNITY_GALLERY_INITIAL_POSTS, undefined, searchQuery);
  const feedHref = searchQuery ? `/app/community?q=${encodeURIComponent(searchQuery)}` : "/app/community";

  return (
    <div>
      <PageHeader
        title="Galerie photos"
        description="Toutes les photos partagées par votre équipe."
        action={<Link href={feedHref} prefetch={false} className="btn-secondary">Retour à Entre nous</Link>}
      />
      <form method="get" className="community-search mb-5 flex max-w-3xl flex-wrap gap-2" role="search">
        <label htmlFor="gallery-search" className="sr-only">Rechercher dans la galerie</label>
        <input id="gallery-search" name="q" defaultValue={searchParams.q ?? ""} className="input min-w-0 flex-1 bg-white/90" placeholder="Rechercher un mot, #hashtag ou auteur…" />
        <button type="submit" className="btn-secondary">Rechercher</button>
        {searchQuery && <Link href="/app/community/gallery" className="btn-ghost">Effacer</Link>}
      </form>
      <CommunityGallery
        key={searchQuery}
        initialItems={page.items}
        initialHasMore={page.hasMore}
        initialCursor={page.nextCursor}
        searchQuery={searchQuery}
      />
    </div>
  );
}
