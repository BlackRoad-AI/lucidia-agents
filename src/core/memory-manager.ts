import type { Memory, MemoryEntry, MemoryConfig, MemoryStats } from './types/memory.js';

/**
 * In-memory implementation of the Memory interface
 */
export class MemoryManager implements Memory {
  private entries: Map<string, MemoryEntry> = new Map();
  private config: MemoryConfig;
  private idCounter = 0;

  constructor(config: MemoryConfig = {}) {
    this.config = {
      maxEntries: 1000,
      persist: false,
      useEmbeddings: false,
      ...config
    };
  }

  /**
   * Add an entry to memory
   */
  async add(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry> {
    const id = `mem_${++this.idCounter}_${Date.now()}`;
    const fullEntry: MemoryEntry = {
      ...entry,
      id,
      timestamp: Date.now()
    };

    this.entries.set(id, fullEntry);

    // Enforce max entries
    if (this.config.maxEntries && this.entries.size > this.config.maxEntries) {
      this.pruneOldest();
    }

    return fullEntry;
  }

  /**
   * Get an entry by ID
   */
  async get(id: string): Promise<MemoryEntry | null> {
    return this.entries.get(id) ?? null;
  }

  /**
   * Search memory by query (simple text matching)
   */
  async search(query: string, limit = 10): Promise<MemoryEntry[]> {
    const queryLower = query.toLowerCase();
    const results: MemoryEntry[] = [];

    for (const entry of this.entries.values()) {
      if (entry.content.toLowerCase().includes(queryLower)) {
        results.push(entry);
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  /**
   * Get recent entries
   */
  async getRecent(limit = 10): Promise<MemoryEntry[]> {
    const entries = Array.from(this.entries.values());
    entries.sort((a, b) => b.timestamp - a.timestamp);
    return entries.slice(0, limit);
  }

  /**
   * Clear all memory
   */
  async clear(): Promise<void> {
    this.entries.clear();
  }

  /**
   * Get memory statistics
   */
  async stats(): Promise<MemoryStats> {
    const entries = Array.from(this.entries.values());
    const byType: Record<string, number> = {};

    let oldest: number | undefined;
    let newest: number | undefined;

    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] ?? 0) + 1;

      if (!oldest || entry.timestamp < oldest) {
        oldest = entry.timestamp;
      }
      if (!newest || entry.timestamp > newest) {
        newest = entry.timestamp;
      }
    }

    return {
      totalEntries: entries.length,
      byType,
      oldestEntry: oldest,
      newestEntry: newest
    };
  }

  /**
   * Remove oldest entries to stay within limit
   */
  private pruneOldest(): void {
    const entries = Array.from(this.entries.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.length - (this.config.maxEntries ?? 1000);
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      if (entry) {
        this.entries.delete(entry[0]);
      }
    }
  }
}
