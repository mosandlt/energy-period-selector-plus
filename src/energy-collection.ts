import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { HomeAssistant } from './type/home-assistant';

export interface EnergyDataLike {
  start: Date;
  end?: Date;
  compareMode?: '' | 'previous' | 'yoy';
  startCompare?: Date;
}

// Only the API used by this card; HA owns the collection and its data loader.
export interface EnergyCollectionLike {
  start: Date;
  end?: Date;
  compare?: boolean | '' | 'previous' | 'yoy';
  subscribe(callback: (data: EnergyDataLike) => void): UnsubscribeFunc;
  setPeriod(start: Date, end?: Date): void;
  setCompare(mode: boolean | '' | 'previous' | 'yoy'): void;
  refresh(): void | Promise<unknown>;
}

export function findEnergyCollection(hass: HomeAssistant | undefined, collectionKey?: string): EnergyCollectionLike | undefined {
  const connection = hass?.connection as unknown as Record<string, unknown> | undefined;
  if (!connection) return undefined;
  const keys = [...(collectionKey ? [`_${collectionKey}`] : []), ...(hass?.panelUrl ? [`_energy_${hass.panelUrl}`] : []), '_energy'];
  for (const key of keys) {
    const candidate = connection[key] as EnergyCollectionLike | undefined;
    if (candidate && typeof candidate === 'object' && typeof candidate.setPeriod === 'function') return candidate;
  }
  return undefined;
}
