// server/src/modules/service-providers/serviceProviders.service.ts 
import { prisma } from '../../config/db';

export const listServiceProviders = async () => {
  const items = await prisma.serviceProvider.findMany({ orderBy: { name: 'asc' } });
  return items.map((p) => p.name);
};

// Called automatically whenever a recommendation is submitted with a
// provider name not already in the list — this is how "Others" entries
// become permanent dropdown options for every future form, with no
// separate admin step required.
export const ensureServiceProvidersExist = async (names: string[]) => {
  const cleanNames = [...new Set(names.map((n) => n?.trim()).filter(Boolean))];
  if (cleanNames.length === 0) return;
  await prisma.serviceProvider.createMany({
    data: cleanNames.map((name) => ({ name })),
    skipDuplicates: true,
  });
};