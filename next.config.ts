import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tldraw ships both CJS and ESM builds. Without this, Next can end up
  // resolving the same package through two different paths (one bundled,
  // one not), loading it twice - two copies of a package that relies on
  // module-level singleton state (signals, the shape schema registry) means
  // the two copies disagree with each other at runtime. Forcing everything
  // through Next's own transpilation keeps it to one copy.
  transpilePackages: [
    'tldraw',
    '@tldraw/editor',
    '@tldraw/sync',
    '@tldraw/sync-core',
    '@tldraw/state',
    '@tldraw/state-react',
    '@tldraw/store',
    '@tldraw/utils',
    '@tldraw/validate',
    '@tldraw/tlschema',
  ],
};

export default nextConfig;
