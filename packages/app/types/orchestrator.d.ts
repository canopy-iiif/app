import type { ChildProcess } from 'node:child_process';

export type Mode = 'build' | 'dev';

export interface LibraryApi {
  build?: () => Promise<void> | void;
  dev?: () => Promise<void> | void;
}

export type NullableChildProcess = ChildProcess | null;

export interface OrchestratorOptions {
  argv?: string[];
  env?: NodeJS.ProcessEnv;
}

export declare function orchestrate(options?: OrchestratorOptions): Promise<void>;
export declare function verifyBuildOutput(outDir?: string): void;
