import express from 'express';
import CommentGraphsController from '../controllers/CommentGraphsController';

const router = express.Router();

router.post('/create', CommentGraphsController.create);

router.get('/comments', CommentGraphsController.graphComents);

export default router;
