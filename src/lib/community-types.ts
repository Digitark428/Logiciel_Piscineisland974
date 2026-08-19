export const COMMUNITY_REACTIONS = ["like", "love", "laugh"] as const;

export type CommunityReactionKind = (typeof COMMUNITY_REACTIONS)[number];

export interface CommunityMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: "admin" | "member" | null;
  job_title: string | null;
  photo_path: string | null;
}

export interface CommunityFeedItem {
  id: string;
  content: string | null;
  createdAt: string;
  authorMembershipId: string;
  author: CommunityMember;
  authorAvatarUrl: string | null;
  media: Array<{ id: string; url: string | null; position: number }>;
  reactionCounts: Record<CommunityReactionKind, number>;
  currentReactions: CommunityReactionKind[];
  commentCount: number;
  canDelete: boolean;
}

export interface CommunityCursor {
  createdAt: string;
  id: string;
}

export interface CommunityCommentItem {
  id: string;
  content: string;
  createdAt: string;
  authorMembershipId: string;
  author: CommunityMember;
  authorAvatarUrl: string | null;
  canDelete: boolean;
}
