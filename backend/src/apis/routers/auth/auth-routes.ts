import { Router } from "express";
import { verifyAccessToken } from "../../middleware/auth";
import * as authController from "../../controllers/auth-controller";
import * as authValidator from "../../validators/auth-validator";

const router = Router();

router.get("/user", verifyAccessToken(), authController.getUserDetails);

router.post(
  "/email/signup",
  authValidator.validateSignupUser,
  authController.signUpWithEmail
);

router.post(
  "/email/login",
  authValidator.validateLoginUser,
  authController.loginWithEmail
);
router.patch(
  "/email/updateProfile",
  authValidator.validateUpdateAccount,
  verifyAccessToken(),
  authController.updateProfileWithEmail
);

export default router;
