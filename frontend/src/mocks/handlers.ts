import { http, HttpResponse } from 'msw/http';
import { DEMO_CUSTOMER_HEADER, DEMO_CUSTOMER_ID } from '@/config/demoSession';
import type { Dispute, ProblemDetails } from '@/types/dispute';
import { demoDisputes, demoTimeline } from './fixtures';

/**
 * Request paths are regular expressions so a handler matches whatever origin
 * the API base URL points at. The dev server, the test server and a real
 * backend can all sit on a different host.
 */
export const DISPUTES_PATH = /\/api\/v1\/disputes\/?(\?.*)?$/;
export const DISPUTE_PATH = /\/api\/v1\/disputes\/([^/?#]+)\/?(\?.*)?$/;
export const TIMELINE_PATH = /\/api\/v1\/disputes\/([^/?#]+)\/timeline\/?(\?.*)?$/;

const DEFAULT_PAGE_SIZE = 20;

/** Problem Details response, as described by the blueprint error policy. */
function problem(status: number, slug: string, title: string, detail: string) {
  const body: ProblemDetails = {
    type: `https://card-dispute.example/problems/${slug}`,
    title,
    status,
    detail,
  };

  return HttpResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

function customerOf(request: Request): string {
  return request.headers.get(DEMO_CUSTOMER_HEADER) ?? DEMO_CUSTOMER_ID;
}

function disputeIdOf(url: string, path: RegExp): string | null {
  const match = path.exec(url);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function toInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export const handlers = [
  http.get(DISPUTES_PATH, ({ request }) => {
    const url = new URL(request.url);
    const customerId = customerOf(request);
    const status = url.searchParams.get('status');
    const page = toInteger(url.searchParams.get('page'), 0);
    const size = toInteger(url.searchParams.get('size'), DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;

    const owned = demoDisputes.filter((dispute) => dispute.customerId === customerId);
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
    const disputeId = disputeIdOf(request.url, TIMELINE_PATH);
    const customerId = customerOf(request);
    const dispute = demoDisputes.find((candidate) => candidate.disputeId === disputeId);

    if (!dispute || dispute.customerId !== customerId) {
      return problem(
        404,
        'case-not-found',
        'Case not found',
        'The case does not exist or is not accessible.',
      );
    }

    return HttpResponse.json(demoTimeline[dispute.disputeId] ?? []);
  }),

  http.get(DISPUTE_PATH, ({ request }) => {
    const disputeId = disputeIdOf(request.url, DISPUTE_PATH);
    const customerId = customerOf(request);
    const dispute: Dispute | undefined = demoDisputes.find(
      (candidate) => candidate.disputeId === disputeId,
    );

    // A case that belongs to somebody else is reported as missing, so the
    // endpoint never reveals whether it exists.
    if (!dispute || dispute.customerId !== customerId) {
      return problem(
        404,
        'case-not-found',
        'Case not found',
        'The case does not exist or is not accessible.',
      );
    }

    return HttpResponse.json(dispute);
  }),
];
