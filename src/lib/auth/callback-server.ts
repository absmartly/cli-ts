import http from 'http';

export interface CallbackServer {
  port: number;
  redirectUri: string;
  waitForCode(timeoutMs: number): Promise<string>;
  close(): void;
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html><body style="font-family:system-ui;text-align:center;padding:40px">
<h2>Authentication successful!</h2>
<p>You can close this tab and return to the CLI.</p>
</body></html>`;

const ERROR_HTML = `<!DOCTYPE html>
<html><body style="font-family:system-ui;text-align:center;padding:40px">
<h2>Authentication failed</h2>
<p>No authorization code received. Please try again.</p>
</body></html>`;

export async function startCallbackServer(preferredPorts: number[] = [8787, 8080]): Promise<CallbackServer> {
  const portsToTry = [...preferredPorts, 0];

  for (const port of portsToTry) {
    try {
      return await tryBindServer(port);
    } catch {
      continue;
    }
  }

  throw new Error('Could not bind callback server on any port');
}

type CallbackResult = { code: string } | { error: Error };

function tryBindServer(port: number): Promise<CallbackServer> {
  return new Promise((resolve, reject) => {
    let result: CallbackResult | undefined;
    let settle: ((result: CallbackResult) => void) | undefined;

    function dispatch(r: CallbackResult) {
      if (settle) {
        settle(r);
      } else {
        result = r;
      }
    }

    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost`);
      if (url.pathname !== '/oauth/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(SUCCESS_HTML);
        dispatch({ code });
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML);
        dispatch({ error: new Error('No authorization code received in callback') });
      }
    });

    server.on('error', reject);

    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to get server address'));
        return;
      }

      const boundPort = address.port;
      resolve({
        port: boundPort,
        redirectUri: `http://localhost:${boundPort}/oauth/callback`,
        waitForCode(timeoutMs: number): Promise<string> {
          let timeoutId: ReturnType<typeof setTimeout>;

          const codePromise = new Promise<string>((res, rej) => {
            settle = (r: CallbackResult) => {
              clearTimeout(timeoutId);
              server.close();
              if ('code' in r) {
                res(r.code);
              } else {
                queueMicrotask(() => rej(r.error));
              }
            };

            timeoutId = setTimeout(() => {
              settle = undefined;
              server.close();
              rej(new Error(`Authentication timed out after ${Math.round(timeoutMs / 1000)}s — please try again`));
            }, timeoutMs);
          });

          if (result !== undefined) {
            clearTimeout(timeoutId!);
            settle!(result);
          }

          codePromise.catch(() => {});
          return codePromise;
        },
        close() {
          server.close();
        },
      });
    });
  });
}
