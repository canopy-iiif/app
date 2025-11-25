import type { Config } from 'tailwindcss';

export interface DefineCanopyTailwindConfigOptions extends Config {
  /**
   * Override the detected project root (defaults to two directories up from the config file).
   */
  root?: string;
  includeCanopyPreset?: boolean;
  includeCanopyPlugin?: boolean;
  includeCanopySafelist?: boolean;
  includeCanopySources?: boolean;
}

export type TailwindConfigSource = string | URL;

export declare function defineCanopyTailwindConfig(
  sourceOrOptions?: TailwindConfigSource | DefineCanopyTailwindConfigOptions,
  maybeOptions?: DefineCanopyTailwindConfigOptions
): Config;

export default defineCanopyTailwindConfig;
