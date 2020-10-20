import express from 'express';
import HelpersController from '../controllers/HelpersController';

const router = express.Router();

router.get('/content-type', HelpersController.contentType);

router.get('/wikipedia', HelpersController.wikipediaSearch);

router.get('/content-thumbnail', HelpersController.contentThumbnail);

export default router;
