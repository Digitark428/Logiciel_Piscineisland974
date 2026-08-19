-- 0031 — Index de couverture des clés étrangères du feed « Entre nous ».
-- Ces index protègent les suppressions en cascade et les jointures auteur à long terme.
create index community_posts_author_membership_idx
  on public.community_posts (author_membership_id);
create index community_post_reactions_membership_idx
  on public.community_post_reactions (membership_id);
create index community_post_comments_post_idx
  on public.community_post_comments (post_id);
create index community_post_comments_author_membership_idx
  on public.community_post_comments (author_membership_id);
