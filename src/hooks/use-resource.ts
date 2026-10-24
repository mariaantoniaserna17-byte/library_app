import { useCallback, useEffect, useState } from 'react';
import { describeError } from '@/services/api/client';

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; data: T };

/**
 * Carga un recurso remoto y expone sus cuatro estados (semana 9).
 * requestKey identifica la petición (incluye el texto de búsqueda): cuando cambia, se vuelve a cargar.
 */
export function useResource<T>(
  requestKey: string,
  load: () => Promise<T>,
  isEmpty: (data: T) => boolean,
) {
  const [attempt, setAttempt] = useState(0);
  const key = `${requestKey}#${attempt}`;
  const [result, setResult] = useState<{ key: string; state: ResourceState<T> } | null>(null);

  useEffect(() => {
    let active = true; // evita actualizar el estado si la pantalla ya se cerró o la petición quedó obsoleta
    load()
      .then((data) => {
        if (active) {
          setResult({
            key,
            state: isEmpty(data) ? { status: 'empty' } : { status: 'ready', data },
          });
        }
      })
      .catch((err) => {
        if (active) setResult({ key, state: { status: 'error', message: describeError(err) } });
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Mientras no haya resultado para ESTA petición, el estado es "cargando": no hace falta un setState síncrono.
  const state: ResourceState<T> = result?.key === key ? result.state : { status: 'loading' };
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, retry };
}
