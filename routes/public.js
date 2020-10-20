import express from 'express';
import PublicController from '../controllers/PublicController';

const router = express.Router();

router.get('/markers/:name', PublicController.marker);

router.get('/gravatar/:name', PublicController.gravatar);

export default router;
