export enum EnterpriseRole {
  Admin = 'admin',
  Operator = 'operator',
  Reviewer = 'reviewer',
  Sales = 'sales',
}

export enum KnowledgeStatus {
  Draft = 'draft',
  Approved = 'approved',
  Withdrawn = 'withdrawn',
}

export enum ContentReviewStatus {
  Draft = 'draft',
  Pending = 'pending_review',
  Approved = 'approved',
  Rejected = 'rejected',
}

export enum EnterprisePublishStatus {
  Scheduled = 'scheduled',
  WaitingExecutor = 'waiting_executor',
  AwaitingConfirmation = 'awaiting_confirmation',
  Submitting = 'submitting',
  Submitted = 'submitted',
  Published = 'published',
  Unknown = 'unknown',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Blocked = 'blocked',
}

export enum ServiceChannel {
  Manual = 'manual',
  Comment = 'rednote_comment',
  DirectMessage = 'rednote_dm',
  Miniapp = 'rednote_miniapp_service',
}

export enum KnowledgeCategory {
  Product = 'product',
  Price = 'price',
  Case = 'case',
  Faq = 'faq',
  Brand = 'brand',
}

export enum TopicSourceType {
  Manual = 'manual',
  Evergreen = 'evergreen',
}

export enum PublishExecutionMode {
  Manual = 'manual',
  Browser = 'browser',
}

export enum EnterpriseResourceKind {
  Account = 'account',
  Asset = 'asset',
}

export enum EnterpriseNotificationKind {
  Intent = 'intent',
  ResponseOverdue = 'response_overdue',
  FollowUp = 'followup',
}
