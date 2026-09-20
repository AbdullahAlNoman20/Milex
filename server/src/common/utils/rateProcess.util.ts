// server/src/common/utils/rateProcess.util.ts

// A live customer asking for new terms runs the same quote-and-accept loop
// again, but it is a separate episode from the onboarding that made them a
// customer in the first place. Its steps are written to their own column so
// neither trail has to be read through the other.
//
// This lives outside both service modules because both of them need it, and
// having either own it would make them import each other.
export const appendRateProcessStep = async (
  tx: any,
  customerId: string,
  actorId: string,
  action: string,
  subText = ''
) => {
  const actor = actorId
    ? await tx.user.findUnique({ where: { id: actorId }, select: { name: true } })
    : null;
  const current = await tx.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { rateProcessHistory: true },
  });

  // Whatever was in progress is finished; this is now the live step.
  const completed = (current.rateProcessHistory || []).map((s: any) => ({
    ...s,
    status: 'completed',
  }));

  await tx.customer.update({
    where: { id: customerId },
    data: {
      rateProcessActive: true,
      rateProcessHistory: [
        ...completed,
        {
          action: actor ? `${action} (${actor.name})` : action,
          subText,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ],
    },
  });
};