import { DEMO_USERS } from "@/config/demoUsers";
import type {
  Dispute,
  DisputeTransaction,
  TimelineEvent,
} from "@/types/dispute";
import type { Transaction } from "@/types/transaction";
import type { AnalystTask } from "@/types/analyst";

/**
 * Deterministic mock data for the local Mock Service Worker.
 *
 * Every identifier and timestamp is fixed so tests and screenshots are
 * reproducible. Never use `new Date()` or `Math.random()` here.
 */

/** customer01 in the mock API. */
export const DEMO_CUSTOMER_ID = DEMO_USERS[0]!.mockCustomerId;

/**
 * The "now" of the mock backend.
 *
 * The queues are relative to the deadline, so the mock needs a fixed clock to
 * stay reproducible. The real backend uses the server clock.
 */
export const MOCK_NOW = "2026-10-21T12:00:00Z";

/** customer02 in the mock API. */
const OTHER_CUSTOMER_ID = DEMO_USERS[1]!.mockCustomerId;

const coffeeShopCharge: DisputeTransaction = {
  transactionId: "a1000000-0000-4000-8000-000000000001",
  merchantName: "Coffee Shop",
  amount: 35000,
  currency: "COP",
  cardLast4: "4417",
  status: "POSTED",
  postedAt: "2026-10-09T13:20:00Z",
  occurredAt: "2026-10-09T13:05:00Z",
};

const coffeeShopDuplicate: DisputeTransaction = {
  transactionId: "a1000000-0000-4000-8000-000000000002",
  merchantName: "Coffee Shop",
  amount: 35000,
  currency: "COP",
  cardLast4: "4417",
  status: "POSTED",
  postedAt: "2026-10-09T13:55:00Z",
  occurredAt: "2026-10-09T13:41:00Z",
};

const fuelStopCharge: DisputeTransaction = {
  transactionId: "a1000000-0000-4000-8000-000000000003",
  merchantName: "Fuel Stop",
  amount: 78000,
  currency: "COP",
  cardLast4: "4417",
  status: "POSTED",
  postedAt: "2026-10-08T08:40:00Z",
  occurredAt: "2026-10-08T08:15:00Z",
};

const pharmacyCharge: DisputeTransaction = {
  transactionId: "a1000000-0000-4000-8000-000000000004",
  merchantName: "Farmacia Central",
  amount: 12900,
  currency: "COP",
  cardLast4: "9921",
  status: "POSTED",
  postedAt: "2026-10-07T20:05:00Z",
  occurredAt: "2026-10-07T19:40:00Z",
};

const onlineStoreCharge: DisputeTransaction = {
  transactionId: "a1000000-0000-4000-8000-000000000005",
  merchantName: "Online Store",
  amount: 89900,
  currency: "COP",
  cardLast4: "4417",
  status: "POSTED",
  postedAt: "2026-10-06T11:30:00Z",
  occurredAt: "2026-10-06T11:05:00Z",
};

const onlineStoreDuplicate: DisputeTransaction = {
  transactionId: "a1000000-0000-4000-8000-000000000006",
  merchantName: "Online Store",
  amount: 89900,
  currency: "COP",
  cardLast4: "4417",
  status: "POSTED",
  postedAt: "2026-10-06T12:20:00Z",
  occurredAt: "2026-10-06T11:52:00Z",
};

const cinemaCharge: DisputeTransaction = {
  transactionId: "a1000000-0000-4000-8000-000000000007",
  merchantName: "Cine Colombia",
  amount: 45000,
  currency: "COP",
  cardLast4: "4417",
  status: "POSTED",
  postedAt: "2026-10-02T19:35:00Z",
  occurredAt: "2026-10-02T19:10:00Z",
};

/** A transaction as stored by the mock API: the API shape plus its owner. */
export interface MockTransaction extends Transaction {
  customerId: string;
}

/** Charges no dispute uses yet. The Éxito pair is a clear duplicate to submit. */
const supermarketDuplicate: DisputeTransaction = {
  transactionId: "a1000000-0000-4000-8000-000000000009",
  merchantName: "Supermercado Éxito",
  amount: 154300,
  currency: "COP",
  cardLast4: "4417",
  status: "POSTED",
  postedAt: "2026-10-15T18:50:00Z",
  occurredAt: "2026-10-15T18:22:00Z",
};

/** Still pending: not listed as POSTED and rejected on submission. */
const taxiCharge: DisputeTransaction = {
  transactionId: "a1000000-0000-4000-8000-000000000010",
  merchantName: "Taxi Libre",
  amount: 18500,
  currency: "COP",
  cardLast4: "4417",
  status: "PENDING",
  postedAt: null,
  occurredAt: "2026-10-20T22:10:00Z",
};

/** Posted more than 60 days before MOCK_NOW: outside the dispute window. */
const bookshopCharge: DisputeTransaction = {
  transactionId: "a1000000-0000-4000-8000-000000000011",
  merchantName: "Librería Nacional",
  amount: 62000,
  currency: "COP",
  cardLast4: "9921",
  status: "POSTED",
  postedAt: "2026-07-01T16:00:00Z",
  occurredAt: "2026-07-01T15:40:00Z",
};

const bakeryCharge: DisputeTransaction = {
  transactionId: "a1000000-0000-4000-8000-000000000012",
  merchantName: "Panadería La 80",
  amount: 9800,
  currency: "COP",
  cardLast4: "7302",
  status: "POSTED",
  postedAt: "2026-10-14T07:45:00Z",
  occurredAt: "2026-10-14T07:30:00Z",
};

function owned(
  transaction: DisputeTransaction,
  customerId: string = DEMO_CUSTOMER_ID,
  reference: string | null = null,
): MockTransaction {
  return { ...transaction, reference, customerId };
}

/** Charges no dispute uses yet. The Éxito pair is a clear duplicate to submit. */
const supermarketCharge: DisputeTransaction = {
  transactionId: "a1000000-0000-4000-8000-000000000008",
  merchantName: "Supermercado Éxito",
  amount: 154300,
  currency: "COP",
  cardLast4: "4417",
  status: "POSTED",
  postedAt: "2026-10-15T18:30:00Z",
  occurredAt: "2026-10-15T18:02:00Z",
};

/** Every synthetic card transaction, newest first. */
export const demoTransactions: MockTransaction[] = [
  owned(taxiCharge),
  owned(supermarketDuplicate, DEMO_CUSTOMER_ID, "EXITO-0415-B"),
  owned(supermarketCharge, DEMO_CUSTOMER_ID, "EXITO-0415-A"),
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

/**
 * A mock case. `customerId` exists only in the mock: the backend derives the
 * owner from the authenticated principal and never returns it.
 */
export type DemoDispute = Dispute & { customerId: string };

function createDemoDisputes(): DemoDispute[] {
  return [
    {
      disputeId: "b2000000-0000-4000-8000-000000000002",
      customerId: DEMO_CUSTOMER_ID,
      reasonCode: "POSSIBLE_DUPLICATE",
      description: "I was charged twice for the same fuel purchase.",
      status: "AWAITING_ANALYST",
      assessmentOutcome: "MANUAL_REVIEW",
      transaction: fuelStopCharge,
      candidateTransaction: null,
      decision: null,
      createdAt: "2026-10-11T14:30:00Z",
      updatedAt: "2026-10-11T14:31:05Z",
      resolvedAt: null,
    },
    {
      disputeId: "b2000000-0000-4000-8000-000000000001",
      customerId: DEMO_CUSTOMER_ID,
      reasonCode: "POSSIBLE_DUPLICATE",
      description: null,
      status: "RESOLVED_DUPLICATE_SUPPORTED",
      assessmentOutcome: "SUPPORTED",
      transaction: coffeeShopCharge,
      candidateTransaction: coffeeShopDuplicate,
      decision: {
        decisionType: "DUPLICATE_SUPPORTED",
        decisionSource: "AUTOMATED",
        rationale:
          "Same merchant, same amount and same currency within one hour.",
        decidedBy: "SYSTEM",
        decidedAt: "2026-10-10T09:00:12Z",
      },
      createdAt: "2026-10-10T09:00:00Z",
      updatedAt: "2026-10-10T09:00:12Z",
      resolvedAt: "2026-10-10T09:00:12Z",
    },
    {
      disputeId: "b2000000-0000-4000-8000-000000000003",
      customerId: DEMO_CUSTOMER_ID,
      reasonCode: "POSSIBLE_DUPLICATE",
      description: "The pharmacy charged me once more than I expected.",
      status: "RESOLVED_NOT_SUPPORTED",
      assessmentOutcome: "NOT_SUPPORTED",
      transaction: pharmacyCharge,
      candidateTransaction: null,
      decision: {
        decisionType: "NOT_SUPPORTED",
        decisionSource: "ANALYST",
        rationale:
          "Only one purchase of this amount exists for this merchant in the window.",
        decidedBy: "analyst-02",
        decidedAt: "2026-10-12T16:20:00Z",
      },
      createdAt: "2026-10-08T10:00:00Z",
      updatedAt: "2026-10-12T16:20:00Z",
      resolvedAt: "2026-10-12T16:20:00Z",
    },
    {
      disputeId: "b2000000-0000-4000-8000-000000000004",
      customerId: DEMO_CUSTOMER_ID,
      reasonCode: "POSSIBLE_DUPLICATE",
      description: null,
      status: "IN_REVIEW",
      assessmentOutcome: null,
      transaction: onlineStoreCharge,
      candidateTransaction: onlineStoreDuplicate,
      decision: null,
      createdAt: "2026-10-06T17:22:00Z",
      updatedAt: "2026-10-06T17:22:10Z",
      resolvedAt: null,
    },
    {
      disputeId: "b2000000-0000-4000-8000-000000000005",
      customerId: DEMO_CUSTOMER_ID,
      reasonCode: "POSSIBLE_DUPLICATE",
      description: "Same cinema booking was billed twice.",
      status: "TIMEOUT_REVIEW_REQUIRED",
      assessmentOutcome: "MANUAL_REVIEW",
      transaction: cinemaCharge,
      candidateTransaction: null,
      decision: null,
      createdAt: "2026-10-03T08:00:00Z",
      updatedAt: "2026-10-05T08:00:00Z",
      resolvedAt: null,
    },
    {
      disputeId: "b2000000-0000-4000-8000-000000000006",
      customerId: OTHER_CUSTOMER_ID,
      reasonCode: "POSSIBLE_DUPLICATE",
      description: null,
      status: "RESOLVED_DUPLICATE_SUPPORTED",
      assessmentOutcome: "SUPPORTED",
      transaction: cinemaCharge,
      candidateTransaction: null,
      decision: {
        decisionType: "DUPLICATE_SUPPORTED",
        decisionSource: "AUTOMATED",
        rationale:
          "Same merchant, same amount and same currency within one hour.",
        decidedBy: "SYSTEM",
        decidedAt: "2026-10-04T09:00:12Z",
      },
      createdAt: "2026-10-04T09:00:00Z",
      updatedAt: "2026-10-04T09:00:12Z",
      resolvedAt: "2026-10-04T09:00:12Z",
    },
    {
      disputeId: "b2000000-0000-4000-8000-000000000007",
      customerId: OTHER_CUSTOMER_ID,
      reasonCode: "POSSIBLE_DUPLICATE",
      description: "The same order was billed twice.",
      status: "AWAITING_ANALYST",
      assessmentOutcome: "SUPPORTED",
      transaction: onlineStoreCharge,
      candidateTransaction: onlineStoreDuplicate,
      decision: null,
      createdAt: "2026-10-13T09:15:00Z",
      updatedAt: "2026-10-13T09:16:00Z",
      resolvedAt: null,
    },
    {
      disputeId: "b2000000-0000-4000-8000-000000000008",
      customerId: OTHER_CUSTOMER_ID,
      reasonCode: "POSSIBLE_DUPLICATE",
      description: "Two charges from the same pharmacy on the same day.",
      status: "AWAITING_ANALYST",
      assessmentOutcome: "MANUAL_REVIEW",
      transaction: pharmacyCharge,
      candidateTransaction: null,
      decision: null,
      createdAt: "2026-10-13T16:40:00Z",
      updatedAt: "2026-10-13T16:41:00Z",
      resolvedAt: null,
    },
  ];
}

function event(
  eventType: TimelineEvent["eventType"],
  oldStatus: TimelineEvent["oldStatus"],
  newStatus: TimelineEvent["newStatus"],
  actorId: string,
  occurredAt: string,
  details: string | null,
): TimelineEvent {
  return {
    eventType,
    oldStatus,
    newStatus,
    actorId,
    details,
    occurredAt,
  };
}

function createDemoTimeline(): Record<string, TimelineEvent[]> {
  return {
    "b2000000-0000-4000-8000-000000000001": [
      event(
        "CREATED",
        null,
        "SUBMITTED",
        "SYSTEM",
        "2026-10-10T09:00:00Z",
        "Case submitted for a possible duplicate charge.",
      ),
      event(
        "STATE_CHANGED",
        "SUBMITTED",
        "IN_REVIEW",
        "SYSTEM",
        "2026-10-10T09:00:04Z",
        "Both transactions are eligible.",
      ),
      event(
        "STATE_CHANGED",
        "IN_REVIEW",
        "RESOLVED_DUPLICATE_SUPPORTED",
        "SYSTEM",
        "2026-10-10T09:00:12Z",
        "Same merchant, amount and currency within one hour.",
      ),
      event(
        "DECIDED",
        "IN_REVIEW",
        "RESOLVED_DUPLICATE_SUPPORTED",
        "SYSTEM",
        "2026-10-10T09:00:12Z",
        "Automated rules marked the charge as a duplicate.",
      ),
    ],
    "b2000000-0000-4000-8000-000000000002": [
      event(
        "CREATED",
        null,
        "SUBMITTED",
        "CUSTOMER",
        "2026-10-11T14:30:00Z",
        "Case submitted for a possible duplicate charge.",
      ),
      event(
        "STATE_CHANGED",
        "SUBMITTED",
        "IN_REVIEW",
        "SYSTEM",
        "2026-10-11T14:30:05Z",
        "Both transactions are eligible.",
      ),
      event(
        "STATE_CHANGED",
        "IN_REVIEW",
        "AWAITING_ANALYST",
        "SYSTEM",
        "2026-10-11T14:31:00Z",
        "The merchant name did not match exactly, so the rules asked for a manual review.",
      ),
      event(
        "REVIEW_ASSIGNED",
        "AWAITING_ANALYST",
        "AWAITING_ANALYST",
        "SYSTEM",
        "2026-10-11T14:31:05Z",
        "Case assigned to the analyst queue.",
      ),
    ],
    "b2000000-0000-4000-8000-000000000003": [
      event(
        "CREATED",
        null,
        "SUBMITTED",
        "CUSTOMER",
        "2026-10-08T10:00:00Z",
        "Case submitted for a possible duplicate charge.",
      ),
      event(
        "STATE_CHANGED",
        "SUBMITTED",
        "IN_REVIEW",
        "SYSTEM",
        "2026-10-08T10:00:04Z",
        "Both transactions are eligible.",
      ),
      event(
        "STATE_CHANGED",
        "IN_REVIEW",
        "AWAITING_ANALYST",
        "SYSTEM",
        "2026-10-08T10:00:06Z",
        "Amount or currency differ, so the rules asked for a manual review.",
      ),
      event(
        "REVIEW_ASSIGNED",
        "AWAITING_ANALYST",
        "AWAITING_ANALYST",
        "SYSTEM",
        "2026-10-08T10:00:07Z",
        "Case assigned to the analyst queue.",
      ),
      event(
        "REVIEW_COMPLETED",
        "AWAITING_ANALYST",
        "AWAITING_ANALYST",
        "analyst-02",
        "2026-10-12T16:18:00Z",
        "The analyst confirmed the purchase was legitimate.",
      ),
      event(
        "STATE_CHANGED",
        "AWAITING_ANALYST",
        "RESOLVED_NOT_SUPPORTED",
        "analyst-02",
        "2026-10-12T16:20:00Z",
        null,
      ),
      event(
        "DECIDED",
        "AWAITING_ANALYST",
        "RESOLVED_NOT_SUPPORTED",
        "analyst-02",
        "2026-10-12T16:20:00Z",
        "Decision: the charge was not a duplicate.",
      ),
    ],
    "b2000000-0000-4000-8000-000000000004": [
      event(
        "CREATED",
        null,
        "SUBMITTED",
        "CUSTOMER",
        "2026-10-06T17:22:00Z",
        "Case submitted for a possible duplicate charge.",
      ),
      event(
        "STATE_CHANGED",
        "SUBMITTED",
        "IN_REVIEW",
        "SYSTEM",
        "2026-10-06T17:22:10Z",
        "Both transactions are eligible.",
      ),
    ],
    "b2000000-0000-4000-8000-000000000005": [
      event(
        "CREATED",
        null,
        "SUBMITTED",
        "CUSTOMER",
        "2026-10-03T08:00:00Z",
        "Case submitted for a possible duplicate charge.",
      ),
      event(
        "STATE_CHANGED",
        "SUBMITTED",
        "IN_REVIEW",
        "SYSTEM",
        "2026-10-03T08:00:04Z",
        "Both transactions are eligible.",
      ),
      event(
        "STATE_CHANGED",
        "IN_REVIEW",
        "AWAITING_ANALYST",
        "SYSTEM",
        "2026-10-03T08:00:06Z",
        "The merchant name did not match exactly, so the rules asked for a manual review.",
      ),
      event(
        "REVIEW_ASSIGNED",
        "AWAITING_ANALYST",
        "AWAITING_ANALYST",
        "SYSTEM",
        "2026-10-03T08:00:07Z",
        "Case assigned to the analyst queue.",
      ),
      event(
        "TIMEOUT",
        "AWAITING_ANALYST",
        "TIMEOUT_REVIEW_REQUIRED",
        "SYSTEM",
        "2026-10-05T08:00:00Z",
        "The review timer expired before an analyst completed the case.",
      ),
    ],
    "b2000000-0000-4000-8000-000000000006": [
      event(
        "CREATED",
        null,
        "SUBMITTED",
        "CUSTOMER",
        "2026-10-04T09:00:00Z",
        "Case submitted for a possible duplicate charge.",
      ),
      event(
        "DECIDED",
        "SUBMITTED",
        "RESOLVED_DUPLICATE_SUPPORTED",
        "SYSTEM",
        "2026-10-04T09:00:12Z",
        "Automated rules marked the charge as a duplicate.",
      ),
    ],
    "b2000000-0000-4000-8000-000000000007": [
      event(
        "CREATED",
        null,
        "SUBMITTED",
        "CUSTOMER",
        "2026-10-13T09:15:00Z",
        "Case submitted for a possible duplicate charge.",
      ),
      event(
        "STATE_CHANGED",
        "SUBMITTED",
        "IN_REVIEW",
        "SYSTEM",
        "2026-10-13T09:15:04Z",
        "Both transactions are eligible.",
      ),
      event(
        "REVIEW_ASSIGNED",
        "IN_REVIEW",
        "AWAITING_ANALYST",
        "SYSTEM",
        "2026-10-13T09:16:00Z",
        "Case assigned to the analyst queue.",
      ),
    ],
    "b2000000-0000-4000-8000-000000000008": [
      event(
        "CREATED",
        null,
        "SUBMITTED",
        "CUSTOMER",
        "2026-10-13T16:40:00Z",
        "Case submitted for a possible duplicate charge.",
      ),
      event(
        "STATE_CHANGED",
        "SUBMITTED",
        "IN_REVIEW",
        "SYSTEM",
        "2026-10-13T16:40:05Z",
        "Both transactions are eligible.",
      ),
      event(
        "REVIEW_ASSIGNED",
        "IN_REVIEW",
        "AWAITING_ANALYST",
        "SYSTEM",
        "2026-10-13T16:41:00Z",
        "Case assigned to the analyst queue.",
      ),
    ],
  };
}

/**
 * The analyst work queue.
 *
 * The tasks of the demo customer share their dispute with the customer view,
 * so a decision is visible on both sides. The tasks of other customers only
 * exist here.
 */
function createDemoAnalystTasks(): AnalystTask[] {
  return [
    {
      taskId: "7f3a9c21-5d84-4e62-a1b7-9c0d2f8e4316",
      disputeId: "d0020000-0000-4000-8000-000000000101",
      processInstanceId: "a4b8c2d6-91e3-4f75-b0c2-6d8a1e9f3472",
      taskDefinitionKey: "analystReview",
      taskName: "Review Dispute",
      assignee: "analyst@example.com",
      createdAt: "2026-10-28T13:15:42.000Z",
      overdue: false,
    },
    {
      taskId: "2c6e8a14-b739-4f05-92d1-58a3c7e640ab",
      disputeId: "d0020000-0000-4000-8000-000000000102",
      processInstanceId: "e91d4b63-2a87-4c10-8f56-b3d729e41c05",
      taskDefinitionKey: "analystReview",
      taskName: "Review Dispute",
      assignee: null,
      createdAt: "2026-10-27T09:42:18.000Z",
      overdue: true,
    },
    {
      taskId: "b5d1f839-4a27-46ce-8b03-17e9c5620ad4",
      disputeId: "d0020000-0000-4000-8000-000000000103",
      processInstanceId: "c73a1e95-6f42-4d08-b9c1-2e85a7f03416",
      taskDefinitionKey: "analystReview",
      taskName: "Review Dispute",
      assignee: "jane.doe@example.com",
      createdAt: "2026-10-26T16:28:51.000Z",
      overdue: false,
    },
    {
      taskId: "9e4c2b71-8f35-41a6-a0d9-63f7b2185ce4",
      disputeId: "d0020000-0000-4000-8000-000000000104",
      processInstanceId: "f16b8d42-3c97-4a25-91e0-7d6c2b5f8439",
      taskDefinitionKey: "analystReview",
      taskName: "Review Dispute",
      assignee: "john.smith@example.com",
      createdAt: "2026-10-25T11:07:33.000Z",
      overdue: true,
    },
  ];
}

export const demoDisputes: DemoDispute[] = createDemoDisputes();

export const demoTimeline: Record<string, TimelineEvent[]> =
  createDemoTimeline();

export const demoAnalystTasks: AnalystTask[] = createDemoAnalystTasks();

/**
 * Restores every mutable fixture to its initial state.
 *
 * The analyst decision changes a dispute, so tests need a clean state between
 * runs.
 */
export function resetDemoState(): void {
  demoDisputes.splice(0, demoDisputes.length, ...createDemoDisputes());

  for (const key of Object.keys(demoTimeline)) {
    delete demoTimeline[key];
  }
  Object.assign(demoTimeline, createDemoTimeline());

  demoAnalystTasks.splice(
    0,
    demoAnalystTasks.length,
    ...createDemoAnalystTasks(),
  );
}
