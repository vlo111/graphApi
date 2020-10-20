import express from 'express';
import NotificationsController from '../controllers/NotificationsController';

const router = express.Router();

router.get('/list', NotificationsController.getList);

router.get('/update', NotificationsController.update);

export default router;
