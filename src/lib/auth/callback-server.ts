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

export async function startCallbackServer(
  preferredPorts: number[] = [8787, 8080]
): Promise<CallbackServer> {
  const portsToTry = [...preferredPorts, 0];
  const errors: string[] = [];

  for (const port of portsToTry) {
    try {
      return await tryBindServer(port);
    } catch (e) {
      errors.push(`port ${port}: ${e instanceof Error ? e.message : e}`);
    }
  }

  throw new Error(
    `Could not bind callback server on any port:\n${errors.map((e) => `  - ${e}`).join('\n')}`
  );
}

function tryBindServer(port: number): Promise<CallbackServer> {
  return new Promise((resolve, reject) => {
    let codeResolve: ((code: string) => void) | undefined;
    let codeReject: ((err: Error) => void) | undefined;

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
        codeResolve?.(code);
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(ERROR_HTML);
        codeReject?.(new Error('No authorization code received in callback'));
      }
    });

    server.on('error', reject);

    server.listen(port, 'localhost', () => {
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
          let settled = false;
          let outerResolve: ((code: string) => void) | undefined;
          let outerReject: ((err: Error) => void) | undefined;

          const innerPromise = new Promise<string>((res, rej) => {
            outerResolve = res;
            outerReject = rej;
          });

          const outerPromise = innerPromise.then(
            (code) => code,
            (err: Error) => {
              throw err;
            }
          );
          outerPromise.catch(() => {});

          const timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              server.close();
              outerReject!(
                new Error(
                  `Authentication timed out after ${Math.round(timeoutMs / 1000)}s — please try again`
                )
              );
            }
          }, timeoutMs);

          codeResolve = (code: string) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              server.close();
              outerResolve!(code);
            }
          };

          codeReject = (err: Error) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              server.close();
              outerReject!(err);
            }
          };

          return outerPromise;
        },
        close() {
          server.close();
        },
      });
    });
  });
}
