import { DEMO_ANALYST_HEADER, DEMO_ANALYST_ID } from "@/config/demoSession";
import type { Dispute } from "@/types/dispute";
import type {
  AnalystDecisionRequest,
  AnalystTask,
  AnalystTaskListQuery,
  AnalystTaskPage,
} from "@/types/analyst";
import { baseApi } from "./baseApi";

/**
 * Analyst workspace endpoints (FE-2, POC-11).
 *
 * The paths carry the `v1/` prefix because the base URL stays `/api`, which
 * keeps the frontend independent of how the backend is mounted. The contract
 * these endpoints follow is proposed in `docs/api/analyst-contract.md`.
 */

/** Tag of the work queue list. Every queue shares one cache entry. */
export const ANALYST_TASK_LIST_TAG = "LIST";

/**
 * Analyst identity header.
 *
 * It is attached per endpoint instead of in `baseApi.prepareHeaders`, because
 * the customer endpoints must not claim an analyst identity.
 */
function analystHeaders(): Record<string, string> {
  return { [DEMO_ANALYST_HEADER]: DEMO_ANALYST_ID };
}

export const analystApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** The analyst work queue, with the size of both queues. */
    getAnalystTasks: builder.query<AnalystTaskPage, AnalystTaskListQuery>({
      query: (args) => ({
        url: "v1/disputes",
        params: args ?? {},
        headers: analystHeaders(),
      }),
      providesTags: [{ type: "AnalystTask", id: ANALYST_TASK_LIST_TAG }],
    }),

    /** One task with its evidence, assessment and short history. */
    getAnalystTask: builder.query<AnalystTask, string>({
      query: (disputeId) => ({ url: `v1/disputes/${disputeId}` }),
      providesTags: (_result, _error, disputeId) => [
        { type: "AnalystTask", id: disputeId },
      ],
    }),

    /** Save a reasoned decision and complete the task. */
    submitAnalystDecision: builder.mutation<
      Dispute,
      AnalystDecisionRequest & { taskId: string }
    >({
      query: ({ taskId, decision, rationale }) => ({
        url: `v1/analyst/tasks/${taskId}/decision`,
        method: "POST",
        body: { decision, rationale },
        headers: analystHeaders(),
      }),
      // The queue loses the task and the customer views gain the new status.
      // The task detail is left alone, so the page keeps showing the outcome
      // of the decision the analyst just made.
      invalidatesTags: [
        { type: "AnalystTask", id: ANALYST_TASK_LIST_TAG },
        "Dispute",
      ],
      async onQueryStarted({ taskId }, { dispatch, queryFulfilled }) {
        try {
          const { data: decided } = await queryFulfilled;

          // The task detail is not refetched, so the cached copy is patched
          // with the decision instead of asking for it again.
          dispatch(
            analystApi.util.updateQueryData(
              "getAnalystTask",
              taskId,
              (task) => {
                task.status = decided.status;
                task.decision = decided.decision;
              },
            ),
          );
        } catch {
          // The decision failed, the cached task keeps its previous state.
        }
      },
    }),
  }),
});

export const {
  useGetAnalystTasksQuery,
  useGetAnalystTaskQuery,
  useSubmitAnalystDecisionMutation,
} = analystApi;
