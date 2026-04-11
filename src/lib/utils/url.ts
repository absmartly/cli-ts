export function stripApiVersionPath(endpoint: string): string {
  return endpoint.replace(/\/v\d+\/?$/, '');
}

export function ensureApiVersionPath(endpoint: string): string {
  if (/\/v\d+\/?$/.test(endpoint)) return endpoint.replace(/\/$/, '');
  return `${endpoint.replace(/\/$/, '')}/v1`;
}
