import express from 'express';
import ShareGraphsController from '../controllers/ShareGraphsController';

const router = express.Router();

router.post('/create', ShareGraphsController.create);

router.post('/list', ShareGraphsController.getList);

router.post('/update-status', ShareGraphsController.updateStatus);

router.get('/user-graphs', ShareGraphsController.userGraphs);

router.post('/graph-users', ShareGraphsController.graphUsers);

router.put('/update/:id', ShareGraphsController.update);

router.delete('/delete/:id', ShareGraphsController.delete);

export default router;
