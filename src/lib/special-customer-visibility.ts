import allRareCustomers from '@/data/customer_rare.json';
import type { ICustomerRare } from '@/lib/types';

function uniqueNumberIds(ids: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (!Number.isFinite(id)) continue;
    const normalized = Math.trunc(id);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export const COLLAB_CUSTOMER_IDS_BY_KEY: Record<string, number[]> = {
  MC_Gensokyo: [30],
  '3FARIES_Collab': [31],
  TBS_Kokoro: [41],
  TBC2_Collab: [36, 37, 38],
  THYG: [],
};

export const COLLAB_CUSTOMER_IDS = uniqueNumberIds(
  Object.values(COLLAB_CUSTOMER_IDS_BY_KEY).flat(),
);

export const META_MYSTIA_CUSTOMER_IDS = uniqueNumberIds(
  (allRareCustomers as unknown as ICustomerRare[])
    .filter((customer) => customer.dlc === 9)
    .map((customer) => customer.id),
);

export const DEFAULT_HIDDEN_SPECIAL_CUSTOMER_IDS = uniqueNumberIds([
  ...COLLAB_CUSTOMER_IDS,
  ...META_MYSTIA_CUSTOMER_IDS,
]);

const DEFAULT_HIDDEN_SPECIAL_CUSTOMER_ID_SET = new Set(DEFAULT_HIDDEN_SPECIAL_CUSTOMER_IDS);

export function isMetaMystiaActivated(activatedDLC: string[]): boolean {
  return activatedDLC.some((dlc) => /meta|mymystia|dlc9/i.test(dlc));
}

export function resolveVisibleSpecialCustomerIds(
  collabStatus: Record<string, boolean>,
  activatedDLC: string[],
): number[] {
  const visibleCustomerIds: number[] = [];

  for (const [key, enabled] of Object.entries(collabStatus)) {
    if (!enabled) continue;
    visibleCustomerIds.push(...(COLLAB_CUSTOMER_IDS_BY_KEY[key] ?? []));
  }

  if (isMetaMystiaActivated(activatedDLC)) {
    visibleCustomerIds.push(...META_MYSTIA_CUSTOMER_IDS);
  }

  return uniqueNumberIds(visibleCustomerIds);
}

export function mergeManagedSpecialHiddenCustomerIds(
  hiddenCustomerIds: number[],
  visibleSpecialCustomerIds: number[],
): number[] {
  const visibleIdSet = new Set(visibleSpecialCustomerIds);
  const nextHiddenIds = hiddenCustomerIds.filter(
    (id) => !DEFAULT_HIDDEN_SPECIAL_CUSTOMER_ID_SET.has(id),
  );

  for (const id of DEFAULT_HIDDEN_SPECIAL_CUSTOMER_IDS) {
    if (!visibleIdSet.has(id)) {
      nextHiddenIds.push(id);
    }
  }

  return uniqueNumberIds(nextHiddenIds);
}

export function stripManagedSpecialExtraCustomerIds(extraCustomerIds: number[]): number[] {
  return uniqueNumberIds(
    extraCustomerIds.filter((id) => !DEFAULT_HIDDEN_SPECIAL_CUSTOMER_ID_SET.has(id)),
  );
}