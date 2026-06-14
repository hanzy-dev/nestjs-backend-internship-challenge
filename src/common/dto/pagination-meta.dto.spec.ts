import { createPaginationMeta } from './pagination-meta.dto';

describe('createPaginationMeta', () => {
  it('calculates pages using the requested page size', () => {
    expect(createPaginationMeta(2, 10, 21)).toEqual({
      page: 2,
      limit: 10,
      totalItems: 21,
      totalPages: 3,
    });
  });
});
