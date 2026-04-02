const QUEUE_KEY = 'fidanx-offline-queue';
const CACHE_KEY = 'fidanx-offline-cache';

export interface OfflineTransaction {
    id: string;
    timestamp: number;
    type: 'invoice' | 'consumption' | 'activity';
    endpoint: string;
    method: string;
    payload: any;
    synced: boolean;
}

export function getOfflineQueue(): OfflineTransaction[] {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function addToOfflineQueue(tx: Omit<OfflineTransaction, 'id' | 'timestamp' | 'synced'>): OfflineTransaction {
    const queue = getOfflineQueue();
    const entry: OfflineTransaction = {
        ...tx,
        id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        synced: false
    };
    queue.push(entry);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return entry;
}

export function markSynced(id: string) {
    const queue = getOfflineQueue();
    const updated = queue.map(t => t.id === id ? { ...t, synced: true } : t);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export function clearSyncedItems() {
    const queue = getOfflineQueue();
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter(t => !t.synced)));
}

export function getPendingCount(): number {
    return getOfflineQueue().filter(t => !t.synced).length;
}

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
    const queue = getOfflineQueue().filter(t => !t.synced);
    let synced = 0;
    let failed = 0;

    for (const tx of queue) {
        try {
            const res = await fetch(tx.endpoint, {
                method: tx.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tx.payload)
            });
            if (res.ok) {
                markSynced(tx.id);
                synced++;
            } else {
                failed++;
            }
        } catch {
            failed++;
        }
    }

    clearSyncedItems();
    return { synced, failed };
}

export function cacheData(key: string, data: any) {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        cache[key] = { data, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch { }
}

export function getCachedData<T = any>(key: string, maxAgeMs = 30 * 60 * 1000): T | null {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        const entry = cache[key];
        if (!entry) return null;
        if (Date.now() - entry.timestamp > maxAgeMs) return null;
        return entry.data as T;
    } catch { return null; }
}
