export interface EntitySyncValue {
  entityId: string;
  timestamp: number;
  hasTime: boolean;
}

export interface EntitySyncPayload {
  entity_id: string;
  date?: string;
  datetime?: string;
}

// Compare timestamps, not Date object identities. No HA calls or mutable state here.
export function entitySyncPayload(value: EntitySyncValue, previous?: EntitySyncValue): EntitySyncPayload | undefined {
  if (previous?.entityId === value.entityId && previous.timestamp === value.timestamp && previous.hasTime === value.hasTime) return undefined;
  const date = new Date(value.timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return value.hasTime
    ? { entity_id: value.entityId, datetime: `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` }
    : { entity_id: value.entityId, date: day };
}
