const FEATURE_ALIASES = new Set(['features', 'feature']);

export function getDefaultType(): string {
  const invoked = process.argv.find(arg =>
    FEATURE_ALIASES.has(arg) || arg === 'experiments' || arg === 'experiment' || arg === 'exp'
  );
  return invoked && FEATURE_ALIASES.has(invoked) ? 'feature' : 'test';
}
