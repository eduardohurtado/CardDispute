
package com.techmahindra.carddispute.workflow.service;

import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.workflow.dto.ReviewTaskResponse;

import java.util.Optional;

public interface ReviewTaskQueryService {

    PageResponse<ReviewTaskResponse> findPendingTasks(
            int page,
            int size
    );

    Optional<ReviewTaskResponse> findPendingTaskById(
            String taskId
    );
}
