import HttpErrors from 'http-errors';
import {
  Graphs, CommentGraphs, Users,
} from '../models';
import helpers from '../helpers';

class ShareGraphsController {
  static create = async (req, res, next) => {
    try {
      const { graphId, text, parentId } = req.body;
      const { userId } = req;
      const graph = await Graphs.findByPk(graphId);

      if (!graph) {
        throw HttpErrors(404);
      }

      const comment = await CommentGraphs.create({
        userId,
        graphId: +graphId,
        text,
        parentId,
      });

      const graphComments = await CommentGraphs.findByPk(comment.id, {
        include: [
          {
            model: Users,
            as: 'user',
          },
          {
            model: CommentGraphs,
            as: 'parent',
          },
        ],
      });

      res.json({
        status: 'ok',
        graphComments,
      });
    } catch (e) {
      next(e);
    }
  };

  static graphComents = async (req, res, next) => {
    try {
      const {
        common: { listToTree },
      } = helpers;
      const { graphId } = req.query;
      const graphComments = await CommentGraphs.findAll({
        where: {
          graphId,
        },
        include: [
          {
            model: Users,
            as: 'user',
          },
          {
            model: CommentGraphs,
            as: 'parent',
            include: [
              {
                model: Users,
                as: 'user',
              },
            ],
          },
        ],
        order: [
          ['updatedAt', 'DESC'],
        ],
      });

      const comments = graphComments.map((comment) => comment.toJSON()).reverse();

      res.json({
        status: 'ok',
        graphComments: listToTree(comments),
      });
    } catch (e) {
      next(e);
    }
  }
}

export default ShareGraphsController;
