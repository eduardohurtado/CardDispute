import { DEMO_USERS } from '@/config/demoUsers';
import type { Dispute, DisputeTransaction, TimelineEvent } from '@/types/dispute';
import type { Transaction } from '@/types/transaction';

/**
 * Deterministic mock data for the local Mock Service Worker.
 *
 * Every identifier and timestamp is fixed so tests and screenshots are
 * reproducible. Never use `new Date()` or `Math.random()` here.
 */

/** customer01 in the mock API. */
export const DEMO_CUSTOMER_ID = DEMO_USERS[0]!.mockCustomerId;
/** customer02 in the mock API. */
const OTHER_CUSTOMER_ID = DEMO_USERS[1]!.mockCustomerId;

/**
 * Fixed "current time" of the mock API. The 60-day eligibility window is
 * measured from it, so results never depend on the real clock.
 */
export const MOCK_NOW = '2026-10-21T12:00:00Z';

const coffeeShopCharge: DisputeTransaction = {
  transactionId: 'a1000000-0000-4000-8000-000000000001',
  merchantName: 'Coffee Shop',
  amount: 35000,
  currency: 'COP',
  cardLast4: '4417',
  status: 'POSTED',
  postedAt: '2026-10-09T13:20:00Z',
  occurredAt: '2026-10-09T13:05:00Z',
};

const coffeeShopDuplicate: DisputeTransaction = {
  transactionId: 'a1000000-0000-4000-8000-000000000002',
  merchantName: 'Coffee Shop',
  amount: 35000,
  currency: 'COP',
  cardLast4: '4417',
  status: 'POSTED',
  postedAt: '2026-10-09T13:55:00Z',
  occurredAt: '2026-10-09T13:41:00Z',
};

const fuelStopCharge: DisputeTransaction = {
  transactionId: 'a1000000-0000-4000-8000-000000000003',
  merchantName: 'Fuel Stop',
  amount: 78000,
  currency: 'COP',
  cardLast4: '4417',
  status: 'POSTED',
  postedAt: '2026-10-08T08:40:00Z',
  occurredAt: '2026-10-08T08:15:00Z',
};

const pharmacyCharge: DisputeTransaction = {
  transactionId: 'a1000000-0000-4000-8000-000000000004',
  merchantName: 'Farmacia Central',
  amount: 12900,
  currency: 'COP',
  cardLast4: '9921',
  status: 'POSTED',
  postedAt: '2026-10-07T20:05:00Z',
  occurredAt: '2026-10-07T19:40:00Z',
};

const onlineStoreCharge: DisputeTransaction = {
  transactionId: 'a1000000-0000-4000-8000-000000000005',
  merchantName: 'Online Store',
  amount: 89900,
  currency: 'COP',
  cardLast4: '4417',
  status: 'POSTED',
  postedAt: '2026-10-06T11:30:00Z',
  occurredAt: '2026-10-06T11:05:00Z',
};

const onlineStoreDuplicate: DisputeTransaction = {
  transactionId: 'a1000000-0000-4000-8000-000000000006',
  merchantName: 'Online Store',
  amount: 89900,
  currency: 'COP',
  cardLast4: '4417',
  status: 'POSTED',
  postedAt: '2026-10-06T12:20:00Z',
  occurredAt: '2026-10-06T11:52:00Z',
};

const cinemaCharge: DisputeTransaction = {
  transactionId: 'a1000000-0000-4000-8000-000000000007',
  merchantName: 'Cine Colombia',
  amount: 45000,
  currency: 'COP',
  cardLast4: '4417',
  status: 'POSTED',
  postedAt: '2026-10-02T19:35:00Z',
  occurredAt: '2026-10-02T19:10:00Z',
};

/** A transaction as stored by the mock API: the API shape plus its owner. */
export interface MockTransaction extends Transaction {
  customerId: string;
}

function owned(
  transaction: DisputeTransaction,
  customerId: string = DEMO_CUSTOMER_ID,
  reference: string | null = null,
): MockTransaction {
  return { ...transaction, reference, customerId };
}

/** Charges no dispute uses yet. The Éxito pair is a clear duplicate to submit. */
const supermarketCharge: DisputeTransaction = {
  transactionId: 'a1000000-0000-4000-8000-000000000008',
  merchantName: 'Supermercado Éxito',
  amount: 154300,
  currency: 'COP',
  cardLast4: '4417',
  status: 'POSTED',
  postedAt: '2026-10-15T18:30:00Z',
  occurredAt: '2026-10-15T18:02:00Z',
};

const supermarketDuplicate: DisputeTransaction = {
  transactionId: 'a1000000-0000-4000-8000-000000000009',
  merchantName: 'Supermercado Éxito',
  amount: 154300,
  currency: 'COP',
  cardLast4: '4417',
  status: 'POSTED',
  postedAt: '2026-10-15T18:50:00Z',
  occurredAt: '2026-10-15T18:22:00Z',
};

/** Still pending: not listed as POSTED and rejected on submission. */
const taxiCharge: DisputeTransaction = {
  transactionId: 'a1000000-0000-4000-8000-000000000010',
  merchantName: 'Taxi Libre',
  amount: 18500,
  currency: 'COP',
  cardLast4: '4417',
  status: 'PENDING',
  postedAt: null,
  occurredAt: '2026-10-20T22:10:00Z',
};

/** Posted more than 60 days before MOCK_NOW: outside the dispute window. */
const bookshopCharge: DisputeTransaction = {
  transactionId: 'a1000000-0000-4000-8000-000000000011',
  merchantName: 'Librería Nacional',
  amount: 62000,
  currency: 'COP',
  cardLast4: '9921',
  status: 'POSTED',
  postedAt: '2026-07-01T16:00:00Z',
  occurredAt: '2026-07-01T15:40:00Z',
};

const bakeryCharge: DisputeTransaction = {
  transactionId: 'a1000000-0000-4000-8000-000000000012',
  merchantName: 'Panadería La 80',
  amount: 9800,
  currency: 'COP',
  cardLast4: '7302',
  status: 'POSTED',
  postedAt: '2026-10-14T07:45:00Z',
  occurredAt: '2026-10-14T07:30:00Z',
};

/** Every synthetic card transaction, newest first. */
export const demoTransactions: MockTransaction[] = [
  owned(taxiCharge),
  owned(supermarketDuplicate, DEMO_CUSTOMER_ID, 'EXITO-0415-B'),
  owned(supermarketCharge, DEMO_CUSTOMER_ID, 'EXITO-0415-A'),
  owned(bakeryCharge, OTHER_CUSTOMER_ID),
  owned(coffeeShopDuplicate),
  owned(coffeeShopCharge),
  owned(fuelStopCharge),
  owned(pharmacyCharge),
  owned(onlineStoreDuplicate),
  owned(onlineStoreCharge),
  owned(cinemaCharge),
  owned(bookshopCharge),
];

export const demoDisputes: Dispute[] = [
  {
    disputeId: 'b2000000-0000-4000-8000-000000000002',
    customerId: DEMO_CUSTOMER_ID,
    reasonCode: 'POSSIBLE_DUPLICATE',
    description: 'I was charged twice for the same fuel purchase.',
    status: 'AWAITING_ANALYST',
    assessmentOutcome: 'MANUAL_REVIEW',
    transaction: fuelStopCharge,
    candidateTransaction: null,
    decision: null,
    createdAt: '2026-10-11T14:30:00Z',
    updatedAt: '2026-10-11T14:31:05Z',
    resolvedAt: null,
  },
  {
    disputeId: 'b2000000-0000-4000-8000-000000000001',
    customerId: DEMO_CUSTOMER_ID,
    reasonCode: 'POSSIBLE_DUPLICATE',
    description: null,
    status: 'RESOLVED_DUPLICATE_SUPPORTED',
    assessmentOutcome: 'SUPPORTED',
    transaction: coffeeShopCharge,
    candidateTransaction: coffeeShopDuplicate,
    decision: {
      decisionType: 'DUPLICATE_SUPPORTED',
      decisionSource: 'AUTOMATED',
      rationale: 'Same merchant, same amount and same currency within one hour.',
      decidedBy: 'SYSTEM',
      decidedAt: '2026-10-10T09:00:12Z',
    },
    createdAt: '2026-10-10T09:00:00Z',
    updatedAt: '2026-10-10T09:00:12Z',
    resolvedAt: '2026-10-10T09:00:12Z',
  },
  {
    disputeId: 'b2000000-0000-4000-8000-000000000003',
    customerId: DEMO_CUSTOMER_ID,
    reasonCode: 'POSSIBLE_DUPLICATE',
    description: 'The pharmacy charged me once more than I expected.',
    status: 'RESOLVED_NOT_SUPPORTED',
    assessmentOutcome: 'NOT_SUPPORTED',
    transaction: pharmacyCharge,
    candidateTransaction: null,
    decision: {
      decisionType: 'NOT_SUPPORTED',
      decisionSource: 'ANALYST',
      rationale: 'Only one purchase of this amount exists for this merchant in the window.',
      decidedBy: 'analyst-02',
      decidedAt: '2026-10-12T16:20:00Z',
    },
    createdAt: '2026-10-08T10:00:00Z',
    updatedAt: '2026-10-12T16:20:00Z',
    resolvedAt: '2026-10-12T16:20:00Z',
  },
  {
    disputeId: 'b2000000-0000-4000-8000-000000000004',
    customerId: DEMO_CUSTOMER_ID,
    reasonCode: 'POSSIBLE_DUPLICATE',
    description: null,
    status: 'IN_REVIEW',
    assessmentOutcome: null,
    transaction: onlineStoreCharge,
    candidateTransaction: onlineStoreDuplicate,
    decision: null,
    createdAt: '2026-10-06T17:22:00Z',
    updatedAt: '2026-10-06T17:22:10Z',
    resolvedAt: null,
  },
  {
    disputeId: 'b2000000-0000-4000-8000-000000000005',
    customerId: DEMO_CUSTOMER_ID,
    reasonCode: 'POSSIBLE_DUPLICATE',
    description: 'Same cinema booking was billed twice.',
    status: 'TIMEOUT_REVIEW_REQUIRED',
    assessmentOutcome: 'MANUAL_REVIEW',
    transaction: cinemaCharge,
    candidateTransaction: null,
    decision: null,
    createdAt: '2026-10-03T08:00:00Z',
    updatedAt: '2026-10-05T08:00:00Z',
    resolvedAt: null,
  },
  {
    disputeId: 'b2000000-0000-4000-8000-000000000006',
    customerId: OTHER_CUSTOMER_ID,
    reasonCode: 'POSSIBLE_DUPLICATE',
    description: null,
    status: 'RESOLVED_DUPLICATE_SUPPORTED',
    assessmentOutcome: 'SUPPORTED',
    transaction: cinemaCharge,
    candidateTransaction: null,
    decision: {
      decisionType: 'DUPLICATE_SUPPORTED',
      decisionSource: 'AUTOMATED',
      rationale: 'Same merchant, same amount and same currency within one hour.',
      decidedBy: 'SYSTEM',
      decidedAt: '2026-10-04T09:00:12Z',
    },
    createdAt: '2026-10-04T09:00:00Z',
    updatedAt: '2026-10-04T09:00:12Z',
    resolvedAt: '2026-10-04T09:00:12Z',
  },
];

function event(
  suffix: string,
  eventType: TimelineEvent['eventType'],
  oldStatus: TimelineEvent['oldStatus'],
  newStatus: TimelineEvent['newStatus'],
  actorId: string,
  occurredAt: string,
  details: string | null,
): TimelineEvent {
  return {
    eventId: `c3000000-0000-4000-8000-0000000000${suffix}`,
    eventType,
    oldStatus,
    newStatus,
    actorId,
    correlationId: `corr-${suffix}`,
    details,
    occurredAt,
  };
}

export const demoTimeline: Record<string, TimelineEvent[]> = {
  'b2000000-0000-4000-8000-000000000001': [
    event('01', 'CREATED', null, 'SUBMITTED', 'SYSTEM', '2026-10-10T09:00:00Z', 'Case submitted for a possible duplicate charge.'),
    event('02', 'STATE_CHANGED', 'SUBMITTED', 'IN_REVIEW', 'SYSTEM', '2026-10-10T09:00:04Z', 'Both transactions are eligible.'),
    event('03', 'STATE_CHANGED', 'IN_REVIEW', 'RESOLVED_DUPLICATE_SUPPORTED', 'SYSTEM', '2026-10-10T09:00:12Z', 'Same merchant, amount and currency within one hour.'),
    event('04', 'DECIDED', 'IN_REVIEW', 'RESOLVED_DUPLICATE_SUPPORTED', 'SYSTEM', '2026-10-10T09:00:12Z', 'Automated rules marked the charge as a duplicate.'),
  ],
  'b2000000-0000-4000-8000-000000000002': [
    event('11', 'CREATED', null, 'SUBMITTED', 'CUSTOMER', '2026-10-11T14:30:00Z', 'Case submitted for a possible duplicate charge.'),
    event('12', 'STATE_CHANGED', 'SUBMITTED', 'IN_REVIEW', 'SYSTEM', '2026-10-11T14:30:05Z', 'Both transactions are eligible.'),
    event('13', 'STATE_CHANGED', 'IN_REVIEW', 'AWAITING_ANALYST', 'SYSTEM', '2026-10-11T14:31:00Z', 'The merchant name did not match exactly, so the rules asked for a manual review.'),
    event('14', 'REVIEW_ASSIGNED', 'AWAITING_ANALYST', 'AWAITING_ANALYST', 'SYSTEM', '2026-10-11T14:31:05Z', 'Case assigned to the analyst queue.'),
  ],
  'b2000000-0000-4000-8000-000000000003': [
    event('21', 'CREATED', null, 'SUBMITTED', 'CUSTOMER', '2026-10-08T10:00:00Z', 'Case submitted for a possible duplicate charge.'),
    event('22', 'STATE_CHANGED', 'SUBMITTED', 'IN_REVIEW', 'SYSTEM', '2026-10-08T10:00:04Z', 'Both transactions are eligible.'),
    event('23', 'STATE_CHANGED', 'IN_REVIEW', 'AWAITING_ANALYST', 'SYSTEM', '2026-10-08T10:00:06Z', 'Amount or currency differ, so the rules asked for a manual review.'),
    event('24', 'REVIEW_ASSIGNED', 'AWAITING_ANALYST', 'AWAITING_ANALYST', 'SYSTEM', '2026-10-08T10:00:07Z', 'Case assigned to the analyst queue.'),
    event('25', 'REVIEW_COMPLETED', 'AWAITING_ANALYST', 'AWAITING_ANALYST', 'analyst-02', '2026-10-12T16:18:00Z', 'The analyst confirmed the purchase was legitimate.'),
    event('26', 'STATE_CHANGED', 'AWAITING_ANALYST', 'RESOLVED_NOT_SUPPORTED', 'analyst-02', '2026-10-12T16:20:00Z', null),
    event('27', 'DECIDED', 'AWAITING_ANALYST', 'RESOLVED_NOT_SUPPORTED', 'analyst-02', '2026-10-12T16:20:00Z', 'Decision: the charge was not a duplicate.'),
  ],
  'b2000000-0000-4000-8000-000000000004': [
    event('31', 'CREATED', null, 'SUBMITTED', 'CUSTOMER', '2026-10-06T17:22:00Z', 'Case submitted for a possible duplicate charge.'),
    event('32', 'STATE_CHANGED', 'SUBMITTED', 'IN_REVIEW', 'SYSTEM', '2026-10-06T17:22:10Z', 'Both transactions are eligible.'),
  ],
  'b2000000-0000-4000-8000-000000000005': [
    event('41', 'CREATED', null, 'SUBMITTED', 'CUSTOMER', '2026-10-03T08:00:00Z', 'Case submitted for a possible duplicate charge.'),
    event('42', 'STATE_CHANGED', 'SUBMITTED', 'IN_REVIEW', 'SYSTEM', '2026-10-03T08:00:04Z', 'Both transactions are eligible.'),
    event('43', 'STATE_CHANGED', 'IN_REVIEW', 'AWAITING_ANALYST', 'SYSTEM', '2026-10-03T08:00:06Z', 'The merchant name did not match exactly, so the rules asked for a manual review.'),
    event('44', 'REVIEW_ASSIGNED', 'AWAITING_ANALYST', 'AWAITING_ANALYST', 'SYSTEM', '2026-10-03T08:00:07Z', 'Case assigned to the analyst queue.'),
    event('45', 'TIMEOUT', 'AWAITING_ANALYST', 'TIMEOUT_REVIEW_REQUIRED', 'SYSTEM', '2026-10-05T08:00:00Z', 'The review timer expired before an analyst completed the case.'),
  ],
  'b2000000-0000-4000-8000-000000000006': [
    event('51', 'CREATED', null, 'SUBMITTED', 'CUSTOMER', '2026-10-04T09:00:00Z', 'Case submitted for a possible duplicate charge.'),
    event('52', 'DECIDED', 'SUBMITTED', 'RESOLVED_DUPLICATE_SUPPORTED', 'SYSTEM', '2026-10-04T09:00:12Z', 'Automated rules marked the charge as a duplicate.'),
  ],
};
