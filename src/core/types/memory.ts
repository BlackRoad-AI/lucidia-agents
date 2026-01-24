/**
 * A single entry in memory
 */
export interface MemoryEntry {
  /** Unique identifier for this entry */
  id: string;

  /** Type of memory (e.g., 'conversation', 'fact', 'task') */
  type: string;

  /** The actual content */
  content: string;

  /** When this entry was created */
  timestamp: number;

  /** Optional metadata */
  metadata?: Record<string, unknown>;

  /** Optional embedding vector for semantic search */
  embedding?: number[];
}

/**
 * Configuration for memory storage
 */
export interface MemoryConfig {
  /** Maximum number of entries to keep */
  maxEntries?: number;

  /** Whether to persist to disk */
  persist?: boolean;

  /** Path for persistence */
  persistPath?: string;

  /** Whether to enable embeddings */
  useEmbeddings?: boolean;
}

/**
 * Memory interface for agents
 */
export interface Memory {
  /** Add an entry to memory */
  add: (entry: Omit<MemoryEntry, 'id' | 'timestamp'>) => Promise<MemoryEntry>;

  /** Get an entry by ID */
  get: (id: string) => Promise<MemoryEntry | null>;

  /** Search memory by query */
  search: (query: string, limit?: number) => Promise<MemoryEntry[]>;

  /** Get recent entries */
  getRecent: (limit?: number) => Promise<MemoryEntry[]>;

  /** Clear all memory */
  clear: () => Promise<void>;

  /** Get memory statistics */
  stats: () => Promise<MemoryStats>;
}

/**
 * Statistics about memory usage
 */
export interface MemoryStats {
  totalEntries: number;
  byType: Record<string, number>;
  oldestEntry?: number;
  newestEntry?: number;
}
