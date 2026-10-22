import { http, HttpResponse } from 'msw/http';
import { DEFAULT_DEMO_USER, findDemoUser } from '@/config/demoUsers';
import type { ApiProblem, FieldViolation, PageResponse } from '@/types/api';
import type { Dispute, DisputeStatus, DisputeTransaction, TimelineEvent } from '@/types/dispute';
import type { CreateDisputeRequest, Transaction } from '@/types/transaction';
import { demoDisputes, demoTimeline, demoTransactions, MOCK_NOW, type MockTransaction } from './fixtures';

/**
 * Request paths are regular expressions so a handler matches whatever origin
 * the API base URL points at. The dev server, the test server and a real
 * backend can all sit on a different host.
 */
export const DISPUTES_PATH = /\/api\/v1\/disputes\/?(\?.*)?$/;
export const DISPUTE_PATH = /\/api\/v1\/disputes\/([^/?#]+)\/?(\?.*)?$/;
export const TIMELINE_PATH = /\/api\/v1\/disputes\/([^/?#]+)\/timeline\/?(\?.*)?$/;
export const TRANSACTIONS_PATH = /\/api\/v1\/transactions\/?(\?.*)?$/;
export const TRANSACTION_PATH = /\/api\/v1\/transactions\/([^/?#]+)\/?(\?.*)?$/;

const DEFAULT_PAGE_SIZE = 20;

/** Same synthetic rules as the backend `application.yml`. */
const ELIGIBILITY_WINDOW_DAYS = 60;
const DESCRIPTION_MAX_LENGTH = 500;

/** Statuses that block another dispute on the same charge (`DisputeStatus.OPEN`). */
const OPEN_STATUSES: readonly DisputeStatus[] = [
  'SUBMITTED',
  'IN_REVIEW',
  'AWAITING_ANALYST',
  'TIMEOUT_REVIEW_REQUIRED',
];

const REASON_PHRASES: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
};

/**
 * In-memory state for disputes created through the mock API. Tests call
 * `resetMockDb()` after each test so nothing leaks between them.
 */
let createdDisputes: Dispute[] = [];
let createdTimeline: Record<string, TimelineEvent[]> = {};

export function resetMockDb(): void {
  createdDisputes = [];
  createdTimeline = {};
}

function allDisputes(): Dispute[] {
  return [...createdDisputes, ...demoDisputes];
}

/** Problem Details response, as described by the blueprint error policy. */
function problem(
  status: number,
  slug: string,
  title: string,
  detail: string,
  extra: Partial<ApiProblem> = {},
) {
  const body: ApiProblem = {
    type: `https://card-dispute.example/problems/${slug}`,
    title,
    status,
    detail,
    ...extra,
  };

  return HttpResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

/** Problem with an `errorCode`, shaped like the backend `GlobalExceptionHandler`. */
function businessProblem(status: number, errorCode: string, detail: string) {
  return problem(status, errorCode.toLowerCase().replaceAll('_', '-'), REASON_PHRASES[status] ?? 'Error', detail, {
    errorCode,
  });
}

/** The customer of the request, read from the HTTP Basic credentials. */
function customerOf(request: Request): string {
  const header = request.headers.get('Authorization') ?? '';
  const encoded = header.startsWith('Basic ') ? header.slice('Basic '.length) : '';
  let username = '';

  try {
    username = atob(encoded).split(':')[0] ?? '';
  } catch {
    username = '';
  }

  return (findDemoUser(username) ?? DEFAULT_DEMO_USER).mockCustomerId;
}

function idOf(url: string, path: RegExp): string | null {
  const match = path.exec(url);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function toInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function toTransaction({ customerId: _owner, ...transaction }: MockTransaction): Transaction {
  return transaction;
}

function toDisputeTransaction({ reference: _reference, ...transaction }: Transaction): DisputeTransaction {
  return transaction;
}

function findOwnedTransaction(customerId: string, transactionId: unknown): MockTransaction | undefined {
  return demoTransactions.find(
    (transaction) => transaction.transactionId === transactionId && transaction.customerId === customerId,
  );
}

const caseNotFound = () =>
  problem(404, 'case-not-found', 'Case not found', 'The case does not exist or is not accessible.');

/** Deterministic ids for created disputes, so tests can predict them. */
function nextDisputeId(): string {
  return `d4000000-0000-4000-8000-${String(createdDisputes.length + 1).padStart(12, '0')}`;
}

function validationProblem(violations: FieldViolation[]) {
  return problem(400, 'validation-failed', 'Bad Request', 'Request validation failed', {
    errorCode: 'VALIDATION_FAILED',
    violations,
  });
}

export const handlers = [
  http.get(TRANSACTIONS_PATH, ({ request }) => {
    const url = new URL(request.url);
    const customerId = customerOf(request);
    const status = url.searchParams.get('status');
    const page = toInteger(url.searchParams.get('page'), 0);
    const size = toInteger(url.searchParams.get('size'), DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;

    const owned = demoTransactions.filter((transaction) => transaction.customerId === customerId);
    const filtered = status ? owned.filter((transaction) => transaction.status === status) : owned;
    const start = page * size;

    const body: PageResponse<Transaction> = {
      content: filtered.slice(start, start + size).map(toTransaction),
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    };
    return HttpResponse.json(body);
  }),

  http.get(TRANSACTION_PATH, ({ request }) => {
    const transaction = findOwnedTransaction(customerOf(request), idOf(request.url, TRANSACTION_PATH));

    if (!transaction) {
      return businessProblem(404, 'TRANSACTION_NOT_FOUND', 'The transaction was not found');
    }

    return HttpResponse.json(toTransaction(transaction));
  }),

  http.post(DISPUTES_PATH, async ({ request }) => {
    const customerId = customerOf(request);
    const body = (await request.json().catch(() => ({}))) as Partial<CreateDisputeRequest>;

    // Bean validation (`CreateDisputeRequest.java`).
    const violations: FieldViolation[] = [];
    if (!body.transactionId) violations.push({ field: 'transactionId', message: 'must not be null' });
    if (!body.candidateTransactionId) {
      violations.push({ field: 'candidateTransactionId', message: 'must not be null' });
    }
    if (body.reasonCode !== 'POSSIBLE_DUPLICATE') violations.push({ field: 'reasonCode', message: 'must not be null' });
    if ((body.description ?? '').length > DESCRIPTION_MAX_LENGTH) {
      violations.push({ field: 'description', message: `size must be between 0 and ${DESCRIPTION_MAX_LENGTH}` });
    }
    if (violations.length > 0) {
      return validationProblem(violations);
    }

    // Business rules, in the same order as `DisputeService.submit`.
    const transaction = findOwnedTransaction(customerId, body.transactionId);
    if (!transaction) {
      return businessProblem(404, 'TRANSACTION_NOT_FOUND', `Transaction ${body.transactionId} was not found`);
    }
    if (transaction.status !== 'POSTED' || !transaction.postedAt) {
      return businessProblem(
        422,
        'TRANSACTION_NOT_POSTED',
        `Only posted transactions can be disputed (current status: ${transaction.status})`,
      );
    }
    const windowEnd = Date.parse(transaction.postedAt) + ELIGIBILITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (windowEnd < Date.parse(MOCK_NOW)) {
      return businessProblem(
        422,
        'DISPUTE_WINDOW_EXPIRED',
        `Transactions can only be disputed within ${ELIGIBILITY_WINDOW_DAYS} days of posting`,
      );
    }
    if (body.candidateTransactionId === body.transactionId) {
      return businessProblem(422, 'INVALID_CANDIDATE', 'The suspected duplicate must be a different transaction');
    }
    const candidate = findOwnedTransaction(customerId, body.candidateTransactionId);
    if (!candidate) {
      return businessProblem(422, 'INVALID_CANDIDATE', 'The suspected duplicate transaction was not found');
    }

    const involved = [transaction.transactionId, candidate.transactionId];
    const hasOpenDispute = allDisputes().some(
      (dispute) =>
        OPEN_STATUSES.includes(dispute.status) &&
        [dispute.transaction.transactionId, dispute.candidateTransaction?.transactionId].some(
          (id) => id !== undefined && involved.includes(id),
        ),
    );
    if (hasOpenDispute) {
      return businessProblem(409, 'OPEN_DISPUTE_EXISTS', 'There is already an open dispute for this transaction');
    }

    const description = body.description?.trim() || null;
    const dispute: Dispute = {
      disputeId: nextDisputeId(),
      customerId,
      reasonCode: 'POSSIBLE_DUPLICATE',
      description,
      status: 'SUBMITTED',
      assessmentOutcome: null,
      transaction: toDisputeTransaction(toTransaction(transaction)),
      candidateTransaction: toDisputeTransaction(toTransaction(candidate)),
      decision: null,
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
      resolvedAt: null,
    };

    createdDisputes = [dispute, ...createdDisputes];
    createdTimeline[dispute.disputeId] = [
      {
        eventId: `e5000000-0000-4000-8000-${String(createdDisputes.length).padStart(12, '0')}`,
        eventType: 'CREATED',
        oldStatus: null,
        newStatus: 'SUBMITTED',
        actorId: 'CUSTOMER',
        correlationId: `corr-created-${createdDisputes.length}`,
        details: 'Case submitted for a possible duplicate charge.',
        occurredAt: MOCK_NOW,
      },
    ];

    return HttpResponse.json(dispute, {
      status: 201,
      headers: { Location: `/api/v1/disputes/${dispute.disputeId}` },
    });
  }),

  http.get(DISPUTES_PATH, ({ request }) => {
    const url = new URL(request.url);
    const customerId = customerOf(request);
    const status = url.searchParams.get('status');
    const page = toInteger(url.searchParams.get('page'), 0);
    const size = toInteger(url.searchParams.get('size'), DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;

    const owned = allDisputes().filter((dispute) => dispute.customerId === customerId);
    const filtered = status
      ? owned.filter((dispute) => dispute.status === status)
      : owned;
    const start = page * size;

    return HttpResponse.json({
      items: filtered.slice(start, start + size),
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    });
  }),

  http.get(TIMELINE_PATH, ({ request }) => {
    const disputeId = idOf(request.url, TIMELINE_PATH);
    const customerId = customerOf(request);
    const dispute = allDisputes().find((candidate) => candidate.disputeId === disputeId);

    if (!dispute || dispute.customerId !== customerId) {
      return caseNotFound();
    }

    return HttpResponse.json(createdTimeline[dispute.disputeId] ?? demoTimeline[dispute.disputeId] ?? []);
  }),

  http.get(DISPUTE_PATH, ({ request }) => {
    const disputeId = idOf(request.url, DISPUTE_PATH);
    const customerId = customerOf(request);
    const dispute = allDisputes().find((candidate) => candidate.disputeId === disputeId);

    // A case that belongs to somebody else is reported as missing, so the
    // endpoint never reveals whether it exists.
    if (!dispute || dispute.customerId !== customerId) {
      return caseNotFound();
    }

    return HttpResponse.json(dispute);
  }),
];
