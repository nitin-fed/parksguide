import { useCallback, useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
}

type Result<T> = { key: string; data?: T; error?: Error };

// Runs `fn` whenever `deps` (plain serializable values) change, cancelling the
// previous request. `loading` is true until the result for the current deps lands.
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T>>();
  const key = JSON.stringify([...deps, nonce]);

  useEffect(() => {
    const controller = new AbortController();
    fn(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ key, error: err instanceof Error ? err : new Error(String(err)) });
        }
      });
    return () => controller.abort();
    // `fn` is recreated every render; `key` captures everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const current = result?.key === key;
  return {
    data: result?.data,
    error: current ? result?.error : undefined,
    loading: !current,
    reload,
  };
}
