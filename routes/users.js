import express from 'express';
import UsersController from '../controllers/UsersController';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post('/sign-in', UsersController.signIn);

router.post('/sign-up', UsersController.signUp);

router.get('/oauth/v2/redirect/google', UsersController.redirectGoogle);

router.get('/oauth/v2/redirect/facebook', UsersController.redirectFacebook);

router.get('/oauth/v2/redirect/linkedin', UsersController.redirectLinkedin);

router.get('/oauth/v1/redirect/twitter', UsersController.redirectTwitter);

router.get('/oauth/v1/token/twitter', UsersController.getTwitterToken);

router.post('/forgot-password', UsersController.forgotPassword);

router.post('/reset-password', UsersController.resetPassword);

router.get('/get-by-text', UsersController.getUsersByText);

router.get('/me', UsersController.me);

router.post('/update', upload.single('avatar'), UsersController.update);

router.post('/update-password', UsersController.updatePassword);

export default router;
