/**
 * Moderation feature — barrel exports
 */

// Content filter
export {
  checkMessageContent,
  MEDICAL_DISCLAIMERS,
  COMMUNITY_GUIDELINES_TR,
  type ContentFlag,
  type ContentCheckResult,
} from './content-filter';

// Hooks
export {
  useReportUser,
  useBlockUser,
  useUnblockUser,
  useBlockedUsers,
  useChatConsent,
} from './use-moderation';

// Components
export { BadgeRow, BadgeChip, MemberSinceLabel, MateCountLabel } from './components/badge-row';
export {
  DisclaimerBanner,
  ChatConsentModal,
  ContentWarningToast,
  DiscoverDisclaimerBanner,
} from './components/medical-disclaimer';
export { ReportModal, showBlockConfirm } from './components/report-modal';
