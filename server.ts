import { getAssetFromKV } from '@cloudflare/kv-asset-handler'
import type { RequestHandler } from '@remix-run/cloudflare'
import { type AppLoadContext, createRequestHandler } from '@remix-run/cloudflare'
import { Hono } from 'hono'
import { poweredBy } from 'hono/powered-by'
import { remix } from 'remix-hono/handler'
import * as build from './build/server'

const app = new Hono<{
  Bindings: {
    MY_VAR: string,
    __STATIC_CONTENT: KVNamespace,
  }
}>()

let handler: RequestHandler | undefined

app.use(poweredBy())
app.get('/hono', (c) => c.text('Hono, ' + c.env.MY_VAR))

app.on(
  'GET',
  ['/assets/*', '/favicon.ico'],
  async (c) => {
    if (process.env.NODE_ENV !== 'development' || import.meta.env.PROD) {
      const manifest = await import('__STATIC_CONTENT_MANIFEST')
      try {
        return await getAssetFromKV({
          request: c.req.raw,
          waitUntil: c.executionCtx.waitUntil.bind(c.executionCtx)
        }, {
          ASSET_NAMESPACE: c.env.__STATIC_CONTENT,
          ASSET_MANIFEST: JSON.parse(manifest.default),
        })
      } catch (e) {
        return c.notFound()
      }
    }
  }
)

app.use(
  async (c, next) => {
    if (process.env.NODE_ENV !== 'development' || import.meta.env.PROD) {
      // wrangler
      // production
      const handleRemixRequest = createRequestHandler(build, 'production')
      const remixContext = {
          cloudflare: {
            env: c.env
          }
        } as unknown as AppLoadContext
      return await handleRemixRequest(c.req.raw, remixContext)
    }
    await next()
  },
  async (c, next) => {
    if (process.env.NODE_ENV !== 'development' || import.meta.env.PROD) {
      // not development
      const serverBuild = await import('./build/server')
      return remix({
        build: serverBuild,
        mode: 'production',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        getLoadContext(c) {
          return {
            cloudflare: {
              env: c.env
            }
          }
        }
      })(c, next)
    } else {
      // development
      if (!handler) {
        // @ts-expect-error it's not typed
        const build = await import('virtual:remix/server-build')
        const { createRequestHandler } = await import('@remix-run/cloudflare')
        handler = createRequestHandler(build, 'development')
      }
      const remixContext = {
        cloudflare: {
          env: c.env
        }
      } as unknown as AppLoadContext
      return handler(c.req.raw, remixContext)
    }
  }
)

export default app
