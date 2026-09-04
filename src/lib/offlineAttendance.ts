import { api, ApiError } from "../api/client";
import type { Attendance } from "../api/types";

const STORAGE_KEY = "shiftline_offline_attendance";

export interface PendingAttendance {
  localId: string;
  shiftId: number;
  // Set once the clock-in itself is already synced (a real server record
  // exists) and only the clock-out failed to reach the server -- sync then
  // skips straight to clock-out instead of trying to clock in again.
  serverId?: number;
  clockInAt: string;
  clockInLat?: number;
  clockInLng?: number;
  clockOutAt?: string;
  clockOutLat?: number;
  clockOutLng?: number;
  syncError?: string;
}

export type DisplayAttendance = Attendance & { pending?: boolean; localId?: string };

function readQueue(): PendingAttendance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingAttendance[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage unavailable (private mode, quota, etc.) -- the queue just
    // won't survive a reload, but still works for the current session.
  }
}

export function getPendingAttendance(): PendingAttendance[] {
  return readQueue();
}

export function queueClockIn(
  shiftId: number,
  coords?: { lat: number; lng: number },
): PendingAttendance {
  const entry: PendingAttendance = {
    localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    shiftId,
    clockInAt: new Date().toISOString(),
    clockInLat: coords?.lat,
    clockInLng: coords?.lng,
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

export function queueClockOut(localId: string, coords?: { lat: number; lng: number }): void {
  const queue = readQueue();
  const entry = queue.find((p) => p.localId === localId);
  if (!entry) return;
  entry.clockOutAt = new Date().toISOString();
  entry.clockOutLat = coords?.lat;
  entry.clockOutLng = coords?.lng;
  writeQueue(queue);
}

// For a clock-out that failed offline on a record whose clock-in already
// synced successfully. Reuses an existing queued clock-out for the same
// server record instead of creating a duplicate if one is already pending
// (e.g. a second offline attempt).
export function queueClockOutForServerRecord(
  serverId: number,
  shiftId: number,
  clockInAt: string,
  coords?: { lat: number; lng: number },
): void {
  const queue = readQueue();
  const existing = queue.find((p) => p.serverId === serverId);
  const clockOutAt = new Date().toISOString();
  if (existing) {
    existing.clockOutAt = clockOutAt;
    existing.clockOutLat = coords?.lat;
    existing.clockOutLng = coords?.lng;
  } else {
    queue.push({
      localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      shiftId,
      serverId,
      clockInAt,
      clockOutAt,
      clockOutLat: coords?.lat,
      clockOutLng: coords?.lng,
    });
  }
  writeQueue(queue);
}

function removePending(localId: string): void {
  writeQueue(readQueue().filter((p) => p.localId !== localId));
}

function markError(localId: string, message: string): void {
  const queue = readQueue();
  const entry = queue.find((p) => p.localId === localId);
  if (entry) {
    entry.syncError = message;
    writeQueue(queue);
  }
}

// Merges queued offline actions into the server's record list: a pending
// clock-out on an already-synced record overlays that same row, while a
// clock-in that never made it to the server at all becomes its own
// negative-id row (so it can't collide with a real server id).
export function mergeAttendance(
  serverRecords: Attendance[],
  pending: PendingAttendance[],
): DisplayAttendance[] {
  const result: DisplayAttendance[] = serverRecords.map((r) => ({ ...r }));
  let localSeq = 0;

  for (const p of pending) {
    if (p.serverId != null) {
      const match = result.find((r) => r.id === p.serverId);
      if (match) {
        match.clockOut = p.clockOutAt ?? match.clockOut;
        match.clockOutLat = p.clockOutLat ?? match.clockOutLat;
        match.clockOutLng = p.clockOutLng ?? match.clockOutLng;
        match.pending = true;
        match.localId = p.localId;
        continue;
      }
    }
    localSeq += 1;
    result.push({
      id: -localSeq,
      userId: 0,
      shiftId: p.shiftId,
      clockIn: p.clockInAt,
      clockOut: p.clockOutAt ?? null,
      clockInLat: p.clockInLat ?? null,
      clockInLng: p.clockInLng ?? null,
      clockOutLat: p.clockOutLat ?? null,
      clockOutLng: p.clockOutLng ?? null,
      createdAt: p.clockInAt,
      updatedAt: p.clockOutAt ?? p.clockInAt,
      pending: true,
      localId: p.localId,
    });
  }

  return result;
}

let syncing = false;

// Replays queued clock-in/out actions against the real API, in order,
// preserving the timestamps captured at the moment they actually happened.
// Stops at the first network failure (still offline) but keeps going past a
// real server rejection so one bad entry doesn't block the rest of the
// queue. Returns whether anything in the queue changed.
export async function syncPendingAttendance(): Promise<boolean> {
  if (syncing) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  syncing = true;
  let changed = false;
  try {
    for (const entry of readQueue()) {
      try {
        let serverId = entry.serverId;

        if (serverId == null) {
          const inCoords =
            entry.clockInLat != null && entry.clockInLng != null
              ? { lat: entry.clockInLat, lng: entry.clockInLng }
              : undefined;
          const created = await api.clockIn(entry.shiftId, inCoords, entry.clockInAt);
          serverId = created.id;
        }

        if (entry.clockOutAt) {
          const outCoords =
            entry.clockOutLat != null && entry.clockOutLng != null
              ? { lat: entry.clockOutLat, lng: entry.clockOutLng }
              : undefined;
          await api.clockOut(serverId, outCoords, entry.clockOutAt);
        }
        removePending(entry.localId);
        changed = true;
      } catch (err) {
        if (err instanceof ApiError) {
          markError(entry.localId, err.message);
          changed = true;
        } else {
          break;
        }
      }
    }
  } finally {
    syncing = false;
  }
  return changed;
}

// Attempts a sync now, on reconnect, on tab focus, and on a slow interval
// as a fallback -- calling `onSynced` whenever the queue actually changed
// so the caller can refresh its own data. Returns a cleanup function.
export function watchForSync(onSynced: () => void): () => void {
  let cancelled = false;

  async function attempt() {
    const changed = await syncPendingAttendance();
    if (changed && !cancelled) onSynced();
  }

  function handleVisibility() {
    if (document.visibilityState === "visible") attempt();
  }

  attempt();
  const interval = setInterval(attempt, 30000);
  window.addEventListener("online", attempt);
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    cancelled = true;
    clearInterval(interval);
    window.removeEventListener("online", attempt);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}
