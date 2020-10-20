import express from 'express';
import GraphController from '../controllers/GraphController';

const router = express.Router();

router.get('/', GraphController.getList);

router.get('/single/:id', GraphController.getSingle);

router.get('/embed/:id/:token', GraphController.getEmbed);

router.get('/actions-count/:id', GraphController.actionsCount);

router.post('/create', GraphController.create);

router.put('/update/:id', GraphController.update);

router.patch('/thumbnail/:id', GraphController.setThumbnail);

router.delete('/delete/:id', GraphController.delete);

export default router;
