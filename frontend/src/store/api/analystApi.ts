import type {
  AnalystDecisionRequest,
  AnalystTask,
  AnalystTaskListQuery,
  ManualReviewCompletionResponse,
  ReviewTaskSummary,
} from "@/types/analyst";
import { baseApi } from "./baseApi";
import { PageResponse } from "@/types/api";

/**
 * Analyst workspace endpoints.
 */

/** Tag of the work queue list. */
export const ANALYST_TASK_LIST_TAG = "LIST";

export const analystApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** The analyst work queue. */
    getAnalystTasks: builder.query<PageResponse<ReviewTaskSummary>, AnalystTaskListQuery>({
      query: (args) => ({
        url: "v1/workflow/tasks",
        params: args ?? {},
      }),
      providesTags: [{ type: "AnalystTask", id: ANALYST_TASK_LIST_TAG }],
    }),

    /** One task. */
    getAnalystTask: builder.query<AnalystTask, string>({
      query: (taskId) => ({ url: `v1/workflow/tasks/${taskId}` }),
      providesTags: (_result, _error, taskId) => [
        { type: "AnalystTask", id: taskId },
      ],
    }),

    /** Save a reasoned decision and complete the task. */
    submitAnalystDecision: builder.mutation<
      ManualReviewCompletionResponse,
      AnalystDecisionRequest & { taskId: string }
    >({
      query: ({ taskId, disputeId, decision, rationale }) => ({
        url: `v1/workflow/tasks/${taskId}/complete`,
        method: "POST",
        body: { disputeId, decision, comment: rationale },
      }),
      invalidatesTags: [
        { type: "AnalystTask", id: ANALYST_TASK_LIST_TAG },
        "Dispute",
      ],
      async onQueryStarted({}, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          // ignore
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
