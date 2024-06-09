# Remix and Hono on Vite at Workers

In this project, I'm trying to mount the Remix application on Hono and run it on Vite!
Hono has a [custom Vite dev server](https://github.com/honojs/vite-plugins/tree/main/packages/dev-server), so if you run your Hono application on it and import the Remix Virtual Module, it should work.
And you can deploy this project to Cloudflare Workers!!!

## demo to develop

![demo.gif](./demo.gif)

## commands

- `npm run dev` : Setting up a development environment where hot reloading is effective.
- `npm run start` : Setting up a development environment in `wrangler` command.
- `npm run build` : Build this project.
- `npm run deploy` : Deploy this project.

## Minimal codes

The following codes are the minimal codes that prove it.

### `server.ts`

```ts
import type { AppLoadContext } from '@remix-run/cloudflare'
import { createRequestHandler } from '@remix-run/cloudflare'
import { Hono } from 'hono'

const app = new Hono()

app.all('*', async (c) => {
  // @ts-expect-error it's not typed
  const build = await import('virtual:remix/server-build')
  const handler = createRequestHandler(build, 'development')
  const remixContext = {
    cloudflare: {
      env: c.env
    }
  } as unknown as AppLoadContext
  return handler(c.req.raw, remixContext)
})

export default app
```

### `vite.config.ts`

```ts
import devServer, { defaultOptions } from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { vitePlugin as remix } from '@remix-run/dev'
import { defineConfig } from 'vite'

export default defineConfig({
  ssr: {
    resolve: {
      externalConditions: ['workerd', 'worker']
    }
  },
  plugins: [
    remix(),
    devServer({
      adapter,
      entry: 'server.ts',
      exclude: [...defaultOptions.exclude, '/assets/**', '/app/**'],
      injectClientScript: false
    }),
  ],
  build: {
    outDir: 'build',
  },
})
```

## Note

This is like a PoC, can still be improved.

## Author

Forked From https://github.com/yusukebe/hono-and-remix-on-vite
Yusuke Wada <https://github.com/yusukebe>

Edited by
ogadra <https://github.com/ogadra>

## License

MIT
