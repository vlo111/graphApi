import express from 'express';
import users from './users';
import graphs from './graphs';
import shareGraphs from './shareGraphs';
import commentGraphs from './commentGraphs';
import notifications from './notifications';
import convert from './convert';
import publicRoute from './public';
import helpers from './helpers';

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    res.json({
      status: 'ok',
    });
  } catch (e) {
    next(e);
  }
});

router.use('/users', users);

router.use('/graphs', graphs);

router.use('/convert', convert);

router.use('/public', publicRoute);

router.use('/helpers', helpers);

router.use('/share-graphs', shareGraphs);

router.use('/comment-graphs', commentGraphs);

router.use('/notifications', notifications);

export default router;
