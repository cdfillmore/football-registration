/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type RuntimeEnv = {
  football_registration: D1Database;
  ASSETS: Fetcher;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  ORIGIN?: string;
  ENABLE_TEST_FIXTURE?: string;
};
type Env = RuntimeEnv;

declare namespace App {
  interface Locals {
    runtime: {
      env: RuntimeEnv;
      cf: Record<string, unknown>;
      caches: CacheStorage;
    };
  }
}
