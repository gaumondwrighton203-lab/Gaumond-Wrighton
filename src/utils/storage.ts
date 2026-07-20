class MemoryStorage {
  private data: Record<string, string> = {};

  getItem(key: string): string | null {
    return key in this.data ? this.data[key] : null;
  }

  setItem(key: string, value: string): void {
    this.data[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.data[key];
  }

  clear(): void {
    this.data = {};
  }
}

class SafeStorage {
  private isAvailable: boolean;
  private fallbackStore: MemoryStorage;

  constructor() {
    this.fallbackStore = new MemoryStorage();
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      this.isAvailable = true;
    } catch (e) {
      this.isAvailable = false;
      console.warn('localStorage is blocked or unavailable. Using safe in-memory storage fallback.');
    }
  }

  getItem(key: string): string | null {
    if (this.isAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return this.fallbackStore.getItem(key);
      }
    }
    return this.fallbackStore.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (this.isAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        // Fall back to memory on error (e.g., QuotaExceededError or SecurityError)
      }
    }
    this.fallbackStore.setItem(key, value);
  }

  removeItem(key: string): void {
    if (this.isAvailable) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {}
    }
    this.fallbackStore.removeItem(key);
  }

  clear(): void {
    if (this.isAvailable) {
      try {
        window.localStorage.clear();
        return;
      } catch (e) {}
    }
    this.fallbackStore.clear();
  }
}

export const safeStorage = new SafeStorage();
