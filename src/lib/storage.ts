export type StorageKey =
  | 'academix.theme'
  | 'academix.data.v1'

export function storageGet<T>(key: StorageKey, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function storageSet<T>(key: StorageKey, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function storageRemove(key: StorageKey) {
  localStorage.removeItem(key)
}

export function storageClearAcademix() {
  // Clear all AcademiX keys (future-proof).
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i)
    if (!k) continue
    if (k.startsWith('academix.')) localStorage.removeItem(k)
  }
}



