/**
 * [파일 목적] VELOMAX 풀스택 Express 서버 + Vite 개발 미들웨어
 * [책임]
 *   - 개발 환경에서는 Vite 개발 미들웨어를 마운트하고, 운영 빌드에서는 dist 정적 파일을 제공합니다.
 *   - 포트 3000에서 안정적으로 요청을 수신합니다.
 */

import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveServerPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1) {
    const cliPort = Number(process.argv[portArgIndex + 1]);
    if (Number.isFinite(cliPort) && cliPort > 0) {
      return cliPort;
    }
  }
  const envPort = Number(process.env.PORT);
  const nginxPort = Number(process.env.NGINX_PORT);
  if (
    process.env.NODE_ENV !== 'production' &&
    Number.isFinite(envPort) &&
    Number.isFinite(nginxPort) &&
    envPort === nginxPort
  ) {
    return Number(process.env.DEFAULT_APP_PORT) || 3000;
  }
  return Number.isFinite(envPort) && envPort > 0 ? envPort : 3000;
}

const PORT = resolveServerPort();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  if (process.env.NODE_ENV !== 'production') {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: {
          middlewareMode: true,
          allowedHosts: true,
          hmr: !disableHmr,
          ws: disableHmr ? false : undefined,
        },
        appType: 'spa',
      })
    );

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`VELOMAX server running on http://0.0.0.0:${PORT}`);
    });
    await vitePromise;
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`VELOMAX server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error('Failed to start VELOMAX server:', err);
  process.exit(1);
});
