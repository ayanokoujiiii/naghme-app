import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeChanges } from '../db';

/** Load async data, refresh automatically after any archive change. */
export function useData<T>(fetcher: () => Promise<T>, deps: any[] = []): { data: T | undefined; loading: boolean; reload: () => void; error: string | null } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const seq = useRef(0);

  const load = useCallback(() => {
    const my = ++seq.current;
    fetcher()
      .then((d) => {
        if (alive.current && my === seq.current) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => alive.current && setError(e?.message ?? 'خطا'))
      .finally(() => alive.current && my === seq.current && setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    alive.current = true;
    load();
    const unsub = subscribeChanges(() => load());
    return () => {
      alive.current = false;
      unsub();
    };
  }, [load]);

  return { data, loading, reload: load, error };
}
