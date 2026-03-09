import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';
import type { Tool } from '../core/types/tool.js';
import type { LLMProvider } from '../providers/base-provider.js';

/**
 * Plugin metadata
 */
export interface PluginMeta {
  name: string;
  version: string;
  description?: string;
  author?: string;
}

/**
 * Plugin interface - what a plugin can provide
 */
export interface Plugin {
  meta: PluginMeta;

  /** Tools provided by this plugin */
  tools?: Tool[];

  /** LLM providers provided by this plugin */
  providers?: LLMProvider[];

  /** Called when plugin is loaded */
  onLoad?: () => Promise<void> | void;

  /** Called when plugin is unloaded */
  onUnload?: () => Promise<void> | void;
}

/**
 * Loaded plugin instance
 */
interface LoadedPlugin {
  plugin: Plugin;
  path: string;
  enabled: boolean;
}

/**
 * Plugin manager for loading and managing plugins
 */
export class PluginManager {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private pluginDirs: string[] = [];

  constructor() {
    // Default plugin directories
    this.pluginDirs = [
      join(process.cwd(), 'plugins'),
      join(process.cwd(), 'node_modules')
    ];
  }

  /**
   * Add a directory to search for plugins
   */
  addPluginDirectory(dir: string): void {
    if (!this.pluginDirs.includes(dir)) {
      this.pluginDirs.push(dir);
    }
  }

  /**
   * Load a plugin from a path or name
   */
  async loadPlugin(nameOrPath: string): Promise<Plugin> {
    // Check if already loaded
    if (this.plugins.has(nameOrPath)) {
      return this.plugins.get(nameOrPath)!.plugin;
    }

    // Try to find the plugin
    let pluginPath = nameOrPath;

    if (!existsSync(pluginPath)) {
      // Search in plugin directories
      for (const dir of this.pluginDirs) {
        const candidate = join(dir, nameOrPath);
        if (existsSync(candidate)) {
          pluginPath = candidate;
          break;
        }
        // Try with lucidia-plugin- prefix
        const prefixed = join(dir, `lucidia-plugin-${nameOrPath}`);
        if (existsSync(prefixed)) {
          pluginPath = prefixed;
          break;
        }
      }
    }

    if (!existsSync(pluginPath)) {
      throw new Error(`Plugin not found: ${nameOrPath}`);
    }

    // Load the plugin
    const module = await import(pluginPath);
    const plugin: Plugin = module.default || module;

    if (!plugin.meta || !plugin.meta.name) {
      throw new Error(`Invalid plugin: missing meta.name`);
    }

    // Call onLoad if defined
    if (plugin.onLoad) {
      await plugin.onLoad();
    }

    // Store the plugin
    this.plugins.set(plugin.meta.name, {
      plugin,
      path: pluginPath,
      enabled: true
    });

    return plugin;
  }

  /**
   * Unload a plugin by name
   */
  async unloadPlugin(name: string): Promise<void> {
    const loaded = this.plugins.get(name);
    if (!loaded) {
      throw new Error(`Plugin not loaded: ${name}`);
    }

    // Call onUnload if defined
    if (loaded.plugin.onUnload) {
      await loaded.plugin.onUnload();
    }

    this.plugins.delete(name);
  }

  /**
   * Enable a plugin
   */
  enablePlugin(name: string): void {
    const loaded = this.plugins.get(name);
    if (!loaded) {
      throw new Error(`Plugin not loaded: ${name}`);
    }
    loaded.enabled = true;
  }

  /**
   * Disable a plugin
   */
  disablePlugin(name: string): void {
    const loaded = this.plugins.get(name);
    if (!loaded) {
      throw new Error(`Plugin not loaded: ${name}`);
    }
    loaded.enabled = false;
  }

  /**
   * Get a loaded plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name)?.plugin;
  }

  /**
   * Get all loaded plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
      .filter(p => p.enabled)
      .map(p => p.plugin);
  }

  /**
   * Get all tools from all enabled plugins
   */
  getAllTools(): Tool[] {
    const tools: Tool[] = [];
    for (const { plugin, enabled } of this.plugins.values()) {
      if (enabled && plugin.tools) {
        tools.push(...plugin.tools);
      }
    }
    return tools;
  }

  /**
   * Get all providers from all enabled plugins
   */
  getAllProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    for (const { plugin, enabled } of this.plugins.values()) {
      if (enabled && plugin.providers) {
        providers.push(...plugin.providers);
      }
    }
    return providers;
  }

  /**
   * Discover plugins in plugin directories
   */
  async discoverPlugins(): Promise<string[]> {
    const discovered: string[] = [];

    for (const dir of this.pluginDirs) {
      if (!existsSync(dir)) continue;

      try {
        const entries = await readdir(dir);

        for (const entry of entries) {
          // Look for lucidia-plugin-* packages or plugin.js/plugin.ts files
          if (entry.startsWith('lucidia-plugin-') ||
              entry === 'plugin.js' ||
              entry === 'plugin.ts') {
            discovered.push(join(dir, entry));
          }
        }
      } catch {
        // Ignore errors reading directories
      }
    }

    return discovered;
  }

  /**
   * Load all discovered plugins
   */
  async loadAllPlugins(): Promise<void> {
    const discovered = await this.discoverPlugins();

    for (const path of discovered) {
      try {
        await this.loadPlugin(path);
      } catch (error) {
        // Log but don't fail
        console.warn(`Failed to load plugin ${path}:`, error);
      }
    }
  }

  /**
   * Get plugin info for display
   */
  getPluginInfo(): Array<{
    name: string;
    version: string;
    description?: string;
    enabled: boolean;
    tools: number;
    providers: number;
  }> {
    return Array.from(this.plugins.values()).map(({ plugin, enabled }) => ({
      name: plugin.meta.name,
      version: plugin.meta.version,
      description: plugin.meta.description,
      enabled,
      tools: plugin.tools?.length || 0,
      providers: plugin.providers?.length || 0
    }));
  }
}

// Singleton instance
export const pluginManager = new PluginManager();
