export interface CommandResult<T> {
  data: T;
  rows?: Record<string, unknown>[] | undefined;
  detail?: Record<string, unknown> | undefined;
  warnings?: string[] | undefined;
  pagination?:
    | {
        page: number;
        items: number;
        hasMore: boolean;
        total?: number;
        metric?: { id: number; name: string };
      }
    | undefined;
}
