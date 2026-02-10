import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import * as templateController from "../controllers/template.controller";
import * as templateValidator from "../validators/template.validator";

const router = Router();

// All routes require authentication
router.use(verifyAccessToken());

// CRUD operations
router.post(
  "/",
  templateValidator.validateCreateTemplate,
  templateController.createTemplate,
);

router.get(
  "/",
  templateValidator.validateListTemplates,
  templateController.getTemplates,
);

router.get(
  "/:id",
  templateValidator.validateGetTemplateById,
  templateController.getTemplateById,
);

router.patch(
  "/:id",
  templateValidator.validateUpdateTemplate,
  templateController.updateTemplate,
);

router.delete(
  "/:id",
  templateValidator.validateDeleteTemplate,
  templateController.deleteTemplate,
);

// Template operations
router.post(
  "/:id/duplicate",
  templateValidator.validateDuplicateTemplate,
  templateController.duplicateTemplate,
);

export default router;
