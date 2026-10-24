import type { Repositories } from '@/db/repositories';
import type { ApiClient } from '@/services/api/client';
import type { Book, Loan, LoanAction, LocalLoan, User } from '@/types';

export class LoanRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoanRuleError';
  }
}

interface Deps {
  api: Pick<ApiClient, 'patch'>;
  repos: Pick<Repositories, 'loans' | 'outbox' | 'activity'>;
  newId: () => string;
  now?: () => Date;
}

export function createLoanService({ api, repos, newId, now = () => new Date() }: Deps) {
  return {
    async requestLoan(user: User, book: Book): Promise<LocalLoan> {
      if (await repos.loans.hasActiveForBook(user.uid, book.id)) {
        throw new LoanRuleError('Ya tienes una solicitud o un préstamo activo de este libro.');
      }
      if (book.availableCopies <= 0) {
        throw new LoanRuleError('No hay ejemplares disponibles de este libro.');
      }

      const clientRequestId = newId();
      const timestamp = now().toISOString();

      const loan: Loan = {
        id: `local-${clientRequestId}`,
        bookId: book.id,
        bookTitle: book.title,
        userId: user.uid,
        userEmail: user.email,
        userName: user.name,
        status: 'requested',
        clientRequestId,
        requestedAt: timestamp,
        resolvedAt: null,
        dueDate: null,
        returnedAt: null,
        updatedAt: timestamp,
      };

      await repos.outbox.enqueue('request_loan', { bookId: book.id, clientRequestId });
      await repos.loans.insertPending(loan);
      await repos.activity.log('loan.request', `Solicitud local de "${book.title}"`);

      return { ...loan, syncState: 'pending', syncError: null };
    },

    async transition(loanId: string, action: LoanAction): Promise<Loan> {
      const { loan } = await api.patch<{ loan: Loan }>(`/api/loans/${loanId}`, { action });
      await repos.loans.upsertFromServer(loan);
      await repos.activity.log('loan.' + action, `Préstamo de "${loan.bookTitle}" ${loan.status}`);
      return loan;
    },

    dismiss(loanId: string): Promise<void> {
      return repos.loans.remove(loanId);
    },
  };
}

export type LoanService = ReturnType<typeof createLoanService>;
