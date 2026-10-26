
package com.techmahindra.carddispute.workflow.controller.impl;

import com.techmahindra.carddispute.common.exception.ResourceNotFoundException;
import com.techmahindra.carddispute.common.web.CorrelationId;
import com.techmahindra.carddispute.common.web.PageResponse;
import com.techmahindra.carddispute.security.AuthenticatedUser;
import com.techmahindra.carddispute.workflow.controller.ReviewTaskController;
import com.techmahindra.carddispute.workflow.dto.CompleteManualReviewRequest;
import com.techmahindra.carddispute.workflow.dto.ManualReviewCompletionResponse;
import com.techmahindra.carddispute.workflow.dto.ReviewTaskResponse;
import com.techmahindra.carddispute.workflow.service.ReviewTaskCompletionService;
import com.techmahindra.carddispute.workflow.service.ReviewTaskQueryService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
public class ReviewTaskControllerImpl
        implements ReviewTaskController {

    private final ReviewTaskQueryService reviewTaskQueryService;
    private final ReviewTaskCompletionService reviewTaskCompletionService;

    @Override
    public PageResponse<ReviewTaskResponse> listPendingTasks(
            int page,
            int size) {

        if (page < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "page must be greater than or equal to zero"
            );
        }

        if (size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "size must be between 1 and 100"
            );
        }

        if ((long) page * size > Integer.MAX_VALUE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Requested page offset exceeds supported range"
            );
        }

        return reviewTaskQueryService.findPendingTasks(page, size);
    }

    @Override
    public ReviewTaskResponse getPendingTask(String taskId) {

        return reviewTaskQueryService
                .findPendingTaskById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "REVIEW_TASK_NOT_FOUND",
                        "Pending review task not found"
                ));
    }


    @Override
    public ResponseEntity<ManualReviewCompletionResponse> completeManualReview(
            String taskId,
            CompleteManualReviewRequest request,
            AuthenticatedUser analyst) {

        ManualReviewCompletionResponse response =
                reviewTaskCompletionService.complete(
                        taskId,
                        request,
                        analyst,
                        CorrelationId.current()
                );

        return ResponseEntity
                .accepted()
                .body(response);
    }

}
