export const PROJECT_DETAIL_CACHE_INVALIDATOR = Symbol(
  'PROJECT_DETAIL_CACHE_INVALIDATOR',
);

export interface ProjectDetailCacheInvalidator {
  invalidate(userId: string, projectId: string): Promise<void>;
}

export class NoopProjectDetailCacheInvalidator implements ProjectDetailCacheInvalidator {
  async invalidate(userId: string, projectId: string): Promise<void> {
    void userId;
    void projectId;
    await Promise.resolve();
  }
}
