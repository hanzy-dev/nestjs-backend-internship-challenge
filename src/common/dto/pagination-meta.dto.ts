export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export function createPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMeta {
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
  };
}
