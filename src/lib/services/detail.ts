export interface ServiceDetailEditAction {
  href: string;
  label: string;
}

export function serviceDetailEditAction(input: {
  canEdit: boolean;
  serviceId?: string | null;
  seriesId?: string | null;
  weeklyContract: boolean;
}): ServiceDetailEditAction | undefined {
  if (!input.canEdit) return undefined;
  if (input.weeklyContract && input.seriesId) {
    return { href: `/app/services/contracts/${input.seriesId}`, label: "Modifier le contrat" };
  }
  if (input.serviceId) {
    return { href: `/app/services/${input.serviceId}/edit`, label: "Modifier l'entretien" };
  }
  return undefined;
}
