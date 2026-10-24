import type { Repositories } from '@/db/repositories';
import { ApiRequestError, NetworkError, type ApiClient } from '@/services/api/client';
import type { Book, Loan } from '@/types';

export const MAX_ATTEMPTS = 5;
const CURSOR_OVERLAP_MS = 1000;
const KEYS = { booksCursor: 'books.cursor', lastSyncAt: 'sync.lastSyncAt' } as const;

export interface SyncResult {
  pushed: number;
  conflicts: number;
  booksPulled: number;
  loansPulled: number;
}

export interface SyncDeps {
  api: Pick<ApiClient, 'get' | 'post'>;
  repos: Pick<Repositories, 'books' | 'loans' | 'outbox' | 'meta' | 'activity'>;
  now?: () => Date;
}

export function conflictMessage(err: ApiRequestError): string {
  switch (err.code) {
    case 'ALREADY_ACTIVE':
      return 'Ya tenías una solicitud o un préstamo activo de este libro.';
    case 'NO_COPIES':
      return 'Cuando se envió tu solicitud ya no quedaban ejemplares disponibles.';
    case 'NOT_FOUND':
      return 'El libro ya no existe en el catálogo.';
    case 'FORBIDDEN':
      return 'Tu cuenta no tiene permiso para solicitar libros.';
    default:
      return err.message;
  }
}

export function createSyncService({ api, repos, now = () => new Date() }: SyncDeps) {
  const { books, loans, outbox, meta, activity } = repos;

  async function pushOutbox(): Promise<{ pushed: number; conflicts: number }> {
    let pushed = 0;
    let conflicts = 0;

    for (const item of await outbox.pending()) {
      try {
        const { loan } = await api.post<{ loan: Loan }>('/api/loans', item.payload);
        await loans.upsertFromServer(loan);
        await outbox.remove(item.id);
        pushed++;
        await activity.log('sync.push', `Solicitud de "${loan.bookTitle}" enviada`);
      } catch (err) {
        if (err instanceof NetworkError) throw err;
        if (err instanceof ApiRequestError) {
          if (err.status === 401) throw err;
          const retryable = err.status >= 500 || err.status === 429;
          if (retryable && item.attempts + 1 < MAX_ATTEMPTS) {
            await outbox.recordFailure(item.id, err.message);
            throw err;
          }
          const message = retryable
            ? 'El servidor no pudo procesar la solicitud. Inténtalo de nuevo.'
            : conflictMessage(err);
          await loans.markConflict(item.payload.clientRequestId, message);
          await outbox.remove(item.id);
          conflicts++;
          await activity.log('sync.conflict', `${err.code}: ${message}`);
          continue;
        }
        throw err;
      }
    }
    return { pushed, conflicts };
  }

  async function pullBooks(): Promise<number> {
    const cursor = await meta.get(KEYS.booksCursor);
    const query = cursor ? `?updatedSince=${encodeURIComponent(cursor)}` : '';
    const res = await api.get<{ books: Book[]; serverTime: string }>(`/api/books${query}`);

    await books.upsertMany(res.books);
    const next = new Date(new Date(res.serverTime).getTime() - CURSOR_OVERLAP_MS).toISOString();
    await meta.set(KEYS.booksCursor, next);
    return res.books.length;
  }

  async function pullLoans(): Promise<number> {
    const res = await api.get<{ loans: Loan[] }>('/api/loans');
    await loans.upsertManyFromServer(res.loans);
    return res.loans.length;
  }

  return {
    async run(): Promise<SyncResult> {
      const { pushed, conflicts } = await pushOutbox();
      const booksPulled = await pullBooks();
      const loansPulled = await pullLoans();
      await meta.set(KEYS.lastSyncAt, now().toISOString());
      return { pushed, conflicts, booksPulled, loansPulled };
    },

    async lastSyncAt(): Promise<string | null> {
      return meta.get(KEYS.lastSyncAt);
    },
  };
}

export type SyncService = ReturnType<typeof createSyncService>;
