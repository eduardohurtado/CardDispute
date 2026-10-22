import { http, HttpResponse } from 'msw/http';
import { DEFAULT_DEMO_USER, findDemoUser } from '@/config/demoUsers';
import type { ApiProblem, FieldViolation, PageResponse } from '@/types/api';
import type { CreateDisputeRequest, Transaction } from '@/types/transaction';
import { DEMO_ANALYST_HEADER, DEMO_ANALYST_ID, DEMO_CUSTOMER_HEADER, DEMO_CUSTOMER_ID } from '@/config/demoSession';
import type {
  Dispute,
  DisputeDecisionType,
  DisputeListItem,
  DisputeStatus,
  DisputeTransaction,
  TimelineEvent,
} from '@/types/dispute';
import type { AnalystQueue, AnalystTask, AnalystTaskSummary } from '@/types/analyst';
import {
  demoAnalystTasks,
  demoDisputes,
  demoTimeline,
  demoTransactions, MOCK_NOW, MockTransaction,
  type DemoDispute,
} from './fixtures';

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
export const ANALYST_TASKS_PATH = /\/api\/v1\/analyst\/tasks\/?(\?.*)?$/;
export const ANALYST_TASK_PATH = /\/api\/v1\/analyst\/tasks\/([^/?#]+)\/?(\?.*)?$/;
export const ANALYST_DECISION_PATH = /\/api\/v1\/analyst\/tasks\/([^/?#]+)\/decision\/?(\?.*)?$/;

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

/** A task is due soon when its deadline is less than a day away. */
const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

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

/** True when the request carries an analyst identity. */
function hasAnalyst(request: Request): boolean {
  return request.headers.get(DEMO_ANALYST_HEADER) !== null;
}

function disputeIdOf(url: string, path: RegExp): string | null {
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

/** The decision of a request body, or `null` when it is not a known one. */
function parseDecision(value: unknown): DisputeDecisionType | null {
  return value === 'DUPLICATE_SUPPORTED' || value === 'NOT_SUPPORTED' ? value : null;
}

/** The queue a task belongs to, relative to the fixed mock clock. */
export function queueOf(task: AnalystTask): AnalystQueue {
  const dueIn = new Date(task.dueAt).getTime() - new Date(MOCK_NOW).getTime();
  return dueIn <= DUE_SOON_WINDOW_MS ? 'DUE_SOON' : 'PENDING';
}

/** The row projection of the customer dispute list. */
function toListItem(dispute: DemoDispute): DisputeListItem {
  return {
    disputeId: dispute.disputeId,
    transactionId: dispute.transaction.transactionId,
    merchantName: dispute.transaction.merchantName,
    amount: dispute.transaction.amount,
    currency: dispute.transaction.currency,
    status: dispute.status,
    createdAt: dispute.createdAt,
    resolvedAt: dispute.resolvedAt,
  };
}

/** Drops the mock-only owner, like the backend does. */
function toPublicDispute(dispute: DemoDispute): Dispute {
  return dispute;
}

/** The projection the work queue returns. */
function toSummary(task: AnalystTask): AnalystTaskSummary {
  return {
    taskId: task.taskId,
    disputeId: task.disputeId,
    customerId: task.customerId,
    status: task.status,
    merchantName: task.merchantName,
    amount: task.amount,
    currency: task.currency,
    assessmentOutcome: task.assessmentOutcome,
    matchKind: task.matchKind,
    submittedAt: task.submittedAt,
    dueAt: task.dueAt,
  };
};

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
      content: filtered.slice(start, start + size).map(toListItem),
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
    const dispute: DemoDispute | undefined = demoDisputes.find(
      (candidate) => candidate.disputeId === disputeId,
    );

    // A case that belongs to somebody else is reported as missing, so the
    // endpoint never reveals whether it exists.
    if (!dispute || dispute.customerId !== customerId) {
      return caseNotFound();
    }

    return HttpResponse.json(toPublicDispute(dispute));
  }),

  http.get(ANALYST_TASKS_PATH, ({ request }) => {
    if (!hasAnalyst(request)) {
      return problem(
        403,
        'analyst-role-required',
        'Analyst role required',
        'This endpoint requires the dispute analyst role.',
      );
    }

    const url = new URL(request.url);
    const queue = url.searchParams.get('queue');
    const page = toInteger(url.searchParams.get('page'), 0);
    const size = toInteger(url.searchParams.get('size'), DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;

    const open = demoAnalystTasks.filter((task) => task.decision === null);
    const counts = open.reduce<Record<AnalystQueue, number>>(
      (accumulator, task) => {
        accumulator[queueOf(task)] += 1;
        return accumulator;
      },
      { PENDING: 0, DUE_SOON: 0 },
    );

    const filtered =
      queue === 'PENDING' || queue === 'DUE_SOON'
        ? open.filter((task) => queueOf(task) === queue)
        : open;
    const sorted = [...filtered].sort((left, right) => left.dueAt.localeCompare(right.dueAt));
    const start = page * size;

    return HttpResponse.json({
      items: sorted.slice(start, start + size).map(toSummary),
      page,
      size,
      totalElements: sorted.length,
      totalPages: Math.ceil(sorted.length / size),
      queueCounts: counts,
    });
  }),

  http.get(ANALYST_TASK_PATH, ({ request }) => {
    if (!hasAnalyst(request)) {
      return problem(
        403,
        'analyst-role-required',
        'Analyst role required',
        'This endpoint requires the dispute analyst role.',
      );
    }

    const taskId = disputeIdOf(request.url, ANALYST_TASK_PATH);
    const task = demoAnalystTasks.find((candidate) => candidate.taskId === taskId);

    if (!task) {
      return problem(404, 'task-not-found', 'Task not found', 'The task does not exist.');
    }

    return HttpResponse.json(task);
  }),

  http.post(ANALYST_DECISION_PATH, async ({ request }) => {
    if (!hasAnalyst(request)) {
      return problem(
        403,
        'analyst-role-required',
        'Analyst role required',
        'This endpoint requires the dispute analyst role.',
      );
    }

    const taskId = disputeIdOf(request.url, ANALYST_DECISION_PATH);
    const task = demoAnalystTasks.find((candidate) => candidate.taskId === taskId);

    if (!task) {
      return problem(404, 'task-not-found', 'Task not found', 'The task does not exist.');
    }

    if (task.decision) {
      return problem(
        409,
        'task-already-completed',
        'Task already completed',
        'Another analyst completed this task.',
      );
    }

    const body = (await request.json()) as { decision?: unknown; rationale?: unknown };
    const requestedDecision = parseDecision(body?.decision);

    if (!requestedDecision) {
      return problem(
        422,
        'invalid-decision',
        'Invalid decision',
        'The decision must be DUPLICATE_SUPPORTED or NOT_SUPPORTED.',
      );
    }

    if (typeof body.rationale !== 'string' || body.rationale.trim().length === 0) {
      return problem(
        422,
        'rationale-required',
        'Rationale required',
        'An analyst decision requires a rationale.',
      );
    }

    const newStatus =
      requestedDecision === 'DUPLICATE_SUPPORTED'
        ? ('RESOLVED_DUPLICATE_SUPPORTED' as const)
        : ('RESOLVED_NOT_SUPPORTED' as const);

    const decision = {
      decisionType: requestedDecision,
      decisionSource: 'ANALYST' as const,
      rationale: body.rationale.trim(),
      decidedBy: DEMO_ANALYST_ID,
      decidedAt: MOCK_NOW,
    };

    const dispute = demoDisputes.find((candidate) => candidate.disputeId === task.disputeId);
    if (!dispute) {
      return problem(404, 'case-not-found', 'Case not found', 'The case does not exist.');
    }

    dispute.status = newStatus;
    dispute.decision = decision;
    dispute.updatedAt = MOCK_NOW;
    dispute.resolvedAt = MOCK_NOW;

    task.status = newStatus;
    task.decision = decision;

    const events: TimelineEvent[] = [
      {
        eventId: 'c3000000-0000-4000-8000-000000000071',
        eventType: 'REVIEW_COMPLETED',
        oldStatus: 'AWAITING_ANALYST',
        newStatus: 'AWAITING_ANALYST',
        actorId: DEMO_ANALYST_ID,
        correlationId: 'corr-71',
        details: 'The analyst completed the review.',
        occurredAt: MOCK_NOW,
      },
      {
        eventId: 'c3000000-0000-4000-8000-000000000072',
        eventType: 'STATE_CHANGED',
        oldStatus: 'AWAITING_ANALYST',
        newStatus: newStatus,
        actorId: DEMO_ANALYST_ID,
        correlationId: 'corr-72',
        details: null,
        occurredAt: MOCK_NOW,
      },
      {
        eventId: 'c3000000-0000-4000-8000-000000000073',
        eventType: 'DECIDED',
        oldStatus: 'AWAITING_ANALYST',
        newStatus: newStatus,
        actorId: DEMO_ANALYST_ID,
        correlationId: 'corr-73',
        details: `Decision: ${requestedDecision === 'DUPLICATE_SUPPORTED' ? 'the charge was a duplicate.' : 'the charge was not a duplicate.'}`,
        occurredAt: MOCK_NOW,
      },
    ];

    demoTimeline[task.disputeId] = [...(demoTimeline[task.disputeId] ?? []), ...events];
    task.timeline = [...task.timeline, ...events];

    return HttpResponse.json(dispute);
  }),

  http.get(ANALYST_TASKS_PATH, ({ request }) => {
    if (!hasAnalyst(request)) {
      return problem(
        403,
        'analyst-role-required',
        'Analyst role required',
        'This endpoint requires the dispute analyst role.',
      );
    }

    const url = new URL(request.url);
    const queue = url.searchParams.get('queue');
    const page = toInteger(url.searchParams.get('page'), 0);
    const size = toInteger(url.searchParams.get('size'), DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;

    const open = demoAnalystTasks.filter((task) => task.decision === null);
    const counts = open.reduce<Record<AnalystQueue, number>>(
      (accumulator, task) => {
        accumulator[queueOf(task)] += 1;
        return accumulator;
      },
      { PENDING: 0, DUE_SOON: 0 },
    );

    const filtered =
      queue === 'PENDING' || queue === 'DUE_SOON'
        ? open.filter((task) => queueOf(task) === queue)
        : open;
    const sorted = [...filtered].sort((left, right) => left.dueAt.localeCompare(right.dueAt));
    const start = page * size;

    return HttpResponse.json({
      content: sorted.slice(start, start + size).map(toSummary),
      page,
      size,
      totalElements: sorted.length,
      totalPages: Math.ceil(sorted.length / size),
      queueCounts: counts,
    });
  }),

  http.get(ANALYST_TASK_PATH, ({ request }) => {
    if (!hasAnalyst(request)) {
      return problem(
        403,
        'analyst-role-required',
        'Analyst role required',
        'This endpoint requires the dispute analyst role.',
      );
    }

    const taskId = disputeIdOf(request.url, ANALYST_TASK_PATH);
    const task = demoAnalystTasks.find((candidate) => candidate.taskId === taskId);

    if (!task) {
      return problem(404, 'task-not-found', 'Task not found', 'The task does not exist.');
    }

    return HttpResponse.json(task);
  }),

  http.post(ANALYST_DECISION_PATH, async ({ request }) => {
    if (!hasAnalyst(request)) {
      return problem(
        403,
        'analyst-role-required',
        'Analyst role required',
        'This endpoint requires the dispute analyst role.',
      );
    }

    const taskId = disputeIdOf(request.url, ANALYST_DECISION_PATH);
    const task = demoAnalystTasks.find((candidate) => candidate.taskId === taskId);

    if (!task) {
      return problem(404, 'task-not-found', 'Task not found', 'The task does not exist.');
    }

    if (task.decision) {
      return problem(
        409,
        'task-already-completed',
        'Task already completed',
        'Another analyst completed this task.',
      );
    }

    const body = (await request.json()) as { decision?: unknown; rationale?: unknown };
    const requestedDecision = parseDecision(body?.decision);

    if (!requestedDecision) {
      return problem(
        422,
        'invalid-decision',
        'Invalid decision',
        'The decision must be DUPLICATE_SUPPORTED or NOT_SUPPORTED.',
      );
    }

    if (typeof body.rationale !== 'string' || body.rationale.trim().length === 0) {
      return problem(
        422,
        'rationale-required',
        'Rationale required',
        'An analyst decision requires a rationale.',
      );
    }

    const newStatus =
      requestedDecision === 'DUPLICATE_SUPPORTED'
        ? ('RESOLVED_DUPLICATE_SUPPORTED' as const)
        : ('RESOLVED_NOT_SUPPORTED' as const);

    const decision = {
      decisionType: requestedDecision,
      decisionSource: 'ANALYST' as const,
      rationale: body.rationale.trim(),
      decidedBy: DEMO_ANALYST_ID,
      decidedAt: MOCK_NOW,
    };

    const dispute = demoDisputes.find((candidate) => candidate.disputeId === task.disputeId);
    if (!dispute) {
      return problem(404, 'case-not-found', 'Case not found', 'The case does not exist.');
    }

    dispute.status = newStatus;
    dispute.decision = decision;
    dispute.updatedAt = MOCK_NOW;
    dispute.resolvedAt = MOCK_NOW;

    task.status = newStatus;
    task.decision = decision;

    const events: TimelineEvent[] = [
      {
        eventId: 'c3000000-0000-4000-8000-000000000071',
        eventType: 'REVIEW_COMPLETED',
        oldStatus: 'AWAITING_ANALYST',
        newStatus: 'AWAITING_ANALYST',
        actorId: DEMO_ANALYST_ID,
        correlationId: 'corr-71',
        details: 'The analyst completed the review.',
        occurredAt: MOCK_NOW,
      },
      {
        eventId: 'c3000000-0000-4000-8000-000000000072',
        eventType: 'STATE_CHANGED',
        oldStatus: 'AWAITING_ANALYST',
        newStatus: newStatus,
        actorId: DEMO_ANALYST_ID,
        correlationId: 'corr-72',
        details: null,
        occurredAt: MOCK_NOW,
      },
      {
        eventId: 'c3000000-0000-4000-8000-000000000073',
        eventType: 'DECIDED',
        oldStatus: 'AWAITING_ANALYST',
        newStatus: newStatus,
        actorId: DEMO_ANALYST_ID,
        correlationId: 'corr-73',
        details: `Decision: ${requestedDecision === 'DUPLICATE_SUPPORTED' ? 'the charge was a duplicate.' : 'the charge was not a duplicate.'}`,
        occurredAt: MOCK_NOW,
      },
    ];

    demoTimeline[task.disputeId] = [...(demoTimeline[task.disputeId] ?? []), ...events];
    task.timeline = [...task.timeline, ...events];

    return HttpResponse.json(toPublicDispute(dispute));
  }),

  http.get(ANALYST_TASKS_PATH, ({ request }) => {
    if (!hasAnalyst(request)) {
      return problem(
        403,
        'analyst-role-required',
        'Analyst role required',
        'This endpoint requires the dispute analyst role.',
      );
    }

    const url = new URL(request.url);
    const queue = url.searchParams.get('queue');
    const page = toInteger(url.searchParams.get('page'), 0);
    const size = toInteger(url.searchParams.get('size'), DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;

    const open = demoAnalystTasks.filter((task) => task.decision === null);
    const counts = open.reduce<Record<AnalystQueue, number>>(
      (accumulator, task) => {
        accumulator[queueOf(task)] += 1;
        return accumulator;
      },
      { PENDING: 0, DUE_SOON: 0 },
    );

    const filtered =
      queue === 'PENDING' || queue === 'DUE_SOON'
        ? open.filter((task) => queueOf(task) === queue)
        : open;
    const sorted = [...filtered].sort((left, right) => left.dueAt.localeCompare(right.dueAt));
    const start = page * size;

    return HttpResponse.json({
      content: sorted.slice(start, start + size).map(toSummary),
      page,
      size,
      totalElements: sorted.length,
      totalPages: Math.ceil(sorted.length / size),
      queueCounts: counts,
    });
  }),

  http.get(ANALYST_TASK_PATH, ({ request }) => {
    if (!hasAnalyst(request)) {
      return problem(
        403,
        'analyst-role-required',
        'Analyst role required',
        'This endpoint requires the dispute analyst role.',
      );
    }

    const taskId = disputeIdOf(request.url, ANALYST_TASK_PATH);
    const task = demoAnalystTasks.find((candidate) => candidate.taskId === taskId);

    if (!task) {
      return problem(404, 'task-not-found', 'Task not found', 'The task does not exist.');
    }

    return HttpResponse.json(task);
  }),

  http.post(ANALYST_DECISION_PATH, async ({ request }) => {
    if (!hasAnalyst(request)) {
      return problem(
        403,
        'analyst-role-required',
        'Analyst role required',
        'This endpoint requires the dispute analyst role.',
      );
    }

    const taskId = disputeIdOf(request.url, ANALYST_DECISION_PATH);
    const task = demoAnalystTasks.find((candidate) => candidate.taskId === taskId);

    if (!task) {
      return problem(404, 'task-not-found', 'Task not found', 'The task does not exist.');
    }

    if (task.decision) {
      return problem(
        409,
        'task-already-completed',
        'Task already completed',
        'Another analyst completed this task.',
      );
    }

    const body = (await request.json()) as { decision?: unknown; rationale?: unknown };
    const requestedDecision = parseDecision(body?.decision);

    if (!requestedDecision) {
      return problem(
        422,
        'invalid-decision',
        'Invalid decision',
        'The decision must be DUPLICATE_SUPPORTED or NOT_SUPPORTED.',
      );
    }

    if (typeof body.rationale !== 'string' || body.rationale.trim().length === 0) {
      return problem(
        422,
        'rationale-required',
        'Rationale required',
        'An analyst decision requires a rationale.',
      );
    }

    const newStatus =
      requestedDecision === 'DUPLICATE_SUPPORTED'
        ? ('RESOLVED_DUPLICATE_SUPPORTED' as const)
        : ('RESOLVED_NOT_SUPPORTED' as const);

    const decision = {
      decisionType: requestedDecision,
      decisionSource: 'ANALYST' as const,
      rationale: body.rationale.trim(),
      decidedBy: DEMO_ANALYST_ID,
      decidedAt: MOCK_NOW,
    };

    const dispute = demoDisputes.find((candidate) => candidate.disputeId === task.disputeId);
    if (!dispute) {
      return problem(404, 'case-not-found', 'Case not found', 'The case does not exist.');
    }

    dispute.status = newStatus;
    dispute.decision = decision;
    dispute.updatedAt = MOCK_NOW;
    dispute.resolvedAt = MOCK_NOW;

    task.status = newStatus;
    task.decision = decision;

    const events: TimelineEvent[] = [
      {
        eventId: 'c3000000-0000-4000-8000-000000000071',
        eventType: 'REVIEW_COMPLETED',
        oldStatus: 'AWAITING_ANALYST',
        newStatus: 'AWAITING_ANALYST',
        actorId: DEMO_ANALYST_ID,
        correlationId: 'corr-71',
        details: 'The analyst completed the review.',
        occurredAt: MOCK_NOW,
      },
      {
        eventId: 'c3000000-0000-4000-8000-000000000072',
        eventType: 'STATE_CHANGED',
        oldStatus: 'AWAITING_ANALYST',
        newStatus: newStatus,
        actorId: DEMO_ANALYST_ID,
        correlationId: 'corr-72',
        details: null,
        occurredAt: MOCK_NOW,
      },
      {
        eventId: 'c3000000-0000-4000-8000-000000000073',
        eventType: 'DECIDED',
        oldStatus: 'AWAITING_ANALYST',
        newStatus: newStatus,
        actorId: DEMO_ANALYST_ID,
        correlationId: 'corr-73',
        details: `Decision: ${requestedDecision === 'DUPLICATE_SUPPORTED' ? 'the charge was a duplicate.' : 'the charge was not a duplicate.'}`,
        occurredAt: MOCK_NOW,
      },
    ];

    demoTimeline[task.disputeId] = [...(demoTimeline[task.disputeId] ?? []), ...events];
    task.timeline = [...task.timeline, ...events];

    return HttpResponse.json(toPublicDispute(dispute));
  }),
];
