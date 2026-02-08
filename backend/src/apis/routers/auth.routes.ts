import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import * as authController from "../controllers/auth.controller";
import * as authValidator from "../validators/auth.validator";

const router = Router();

router.get("/user", verifyAccessToken(), authController.getUserDetails);

router.patch(
  "/email/updateProfile",
  authValidator.validateUpdateAccount,
  verifyAccessToken(),
  authController.updateProfileWithEmail
);

// Email-login

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

// GOOGLE OAUTH LOGIN

router.get("/google", authController.googleLogin);
router.get("/google/callback", authController.googleCallback);

// MICROSOFT OAUTH LOGIN

router.get("/outlook", authController.outlookLogin);
router.get("/outlook/callback", authController.outlookCallback);

export default router;
