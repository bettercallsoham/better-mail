import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import * as mailController from "../controllers/mail.controller";
import * as mailValidator from "../validators/mail.validator";

const router = Router();

// --------------------
// MAILBOX
// --------------------

router.get(
  "/connected-accounts",
  verifyAccessToken(),
  mailController.getConnectedMailboxes,
);

// --------------------
// THREAD LIST & METADATA
// --------------------

router.get(
  "/thread-emails",
  verifyAccessToken(),
  mailValidator.validateGetThreadEmails,
  mailController.getThreadEmails,
);

// Returns metadata only — no body content stored in ES
router.get(
  "/thread/:threadId",
  verifyAccessToken(),
  mailValidator.validateGetThreadById,
  mailController.getEmailsByThreadId,
);

router.post(
  "/batch-bodies",
  verifyAccessToken(),
  mailValidator.validateBatchBodies,
  mailController.batchGetEmailBodies,
);

// --------------------
// FOLDERS & SEARCH
// --------------------

router.get(
  "/folders",
  verifyAccessToken(),
  mailValidator.validateGetFolders,
  mailController.getFolders,
);

router.get(
  "/search",
  verifyAccessToken(),
  mailValidator.validateSearch,
  mailController.searchEmails,
);

router.get(
  "/inbox-zero",
  verifyAccessToken(),
  mailValidator.validateGetInboxZero,
  mailController.getInboxZero,
);

// --------------------
// SAVED SEARCHES
// --------------------

router.get(
  "/saved-searches",
  verifyAccessToken(),
  mailController.getSavedSearches,
);

router.get(
  "/saved-searches/:id/execute",
  verifyAccessToken(),
  mailController.executeSavedSearch,
);

router.post(
  "/saved-searches",
  verifyAccessToken(),
  mailValidator.validateCreateSavedSearch,
  mailController.createSavedSearch,
);

router.put(
  "/saved-searches/:id",
  verifyAccessToken(),
  mailValidator.validateUpdateSavedSearch,
  mailController.updateSavedSearch,
);

router.delete(
  "/saved-searches/:id",
  verifyAccessToken(),
  mailController.deleteSavedSearch,
);

// --------------------
// SEARCH HISTORY
// --------------------

router.get(
  "/recent-searches",
  verifyAccessToken(),
  mailController.getRecentSearches,
);

// --------------------
// SEND / REPLY / ACTIONS
// --------------------

router.post(
  "/send-new-email",
  verifyAccessToken(),
  mailValidator.validateSendEmail,
  mailController.sendEmail,
);

router.post(
  "/reply-email",
  verifyAccessToken(),
  mailValidator.validateReplyEmail,
  mailController.replyEmail,
);

router.post(
  "/email-action",
  verifyAccessToken(),
  mailValidator.validateEmailAction,
  mailController.emailAction,
);

router.post(
  "/inbox-state",
  verifyAccessToken(),
  mailValidator.validateUpdateInboxState,
  mailController.updateInboxState,
);

// --------------------
// DRAFTS
// --------------------

router.post(
  "/drafts",
  verifyAccessToken(),
  mailValidator.validateCreateDraft,
  mailController.createDraft,
);

router.post(
  "/drafts/:id/send",
  verifyAccessToken(),
  mailController.sendDraft,
);

// Metadata only — body fetched via /batch-bodies
router.get(
  "/drafts/:id",
  verifyAccessToken(),
  mailController.getEmailById,
);

router.patch(
  "/drafts/:id",
  verifyAccessToken(),
  mailValidator.validateUpdateDraft,
  mailController.updateEmail,
);

router.delete(
  "/drafts/:id",
  verifyAccessToken(),
  mailController.deleteEmail,
);

// --------------------
// THREAD NOTES
// --------------------

router.put(
  "/threads/:threadId/note",
  verifyAccessToken(),
  mailValidator.validateUpsertThreadNote,
  mailController.upsertThreadNote,
);

router.get(
  "/threads/:threadId/:emailAddress/note",
  verifyAccessToken(),
  mailValidator.validateGetThreadNote,
  mailController.getThreadNote,
);

router.delete(
  "/threads/:threadId/note",
  verifyAccessToken(),
  mailValidator.validateDeleteThreadNote,
  mailController.deleteThreadNote,
);

router.get(
  "/notes",
  verifyAccessToken(),
  mailValidator.validateListThreadNotes,
  mailController.listThreadNotes,
);

// --------------------
// SUGGESTIONS & SENDER
// --------------------

router.get(
  "/suggestions",
  verifyAccessToken(),
  mailValidator.validateGetEmailSuggestions,
  mailController.getEmailSuggestions,
);

router.get(
  "/from/:senderEmail",
  verifyAccessToken(),
  mailValidator.validateGetEmailsFromUser,
  mailController.getEmailsFromUser,
);

export default router;