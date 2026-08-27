/** Une note reste dans l’historique mais devient traitée dès qu’une exécution est enregistrée. */
export function isTeamNoteResolved(executionCount: number): boolean {
  return executionCount > 0;
}

export function teamNoteCommentLabel(commentCount: number): string {
  if (commentCount <= 0) return "Commenter";
  return `${commentCount} commentaire${commentCount > 1 ? "s" : ""}`;
}

export function teamNoteInteractionSummary(readCount: number, executionCount: number): string {
  const parts: string[] = [];
  if (readCount > 0) parts.push(`✓ Lu par ${readCount}`);
  if (executionCount > 0) parts.push(`Fait par ${executionCount}`);
  return parts.join(" · ");
}
