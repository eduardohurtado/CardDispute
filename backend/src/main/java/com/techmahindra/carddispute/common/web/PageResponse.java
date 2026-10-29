package com.techmahindra.carddispute.common.web;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "PageResponse", description = "Standard paginated response used by list endpoints.")
public record PageResponse<T>(
        @Schema(description = "Records included in the current page.") List<T> content,
        @Schema(description = "Zero-based current page index.", example = "0") int page,
        @Schema(description = "Requested page size.", example = "20") int size,
        @Schema(description = "Total number of matching records.", example = "42")
                long totalElements,
        @Schema(description = "Total number of available pages.", example = "3") int totalPages) {

    public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {

        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }
}
