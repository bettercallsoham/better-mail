import { Router } from "express";
import { verifyAccessToken } from "../../middleware/auth";
import * as authValidator from "../../validators/auth-validator" ;

const router = Router();


router.get('/signup/email' , authValidator.validateSignupUser, )
router.get('/login/email' , authValidator.validateLoginUser, )
router.get('/update/email' , authValidator.validateUpdateAccount , )

export default router;
