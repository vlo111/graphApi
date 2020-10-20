import HttpErrors from 'http-errors';
import { Op } from 'sequelize';
import validate from '../services/validate';
import {
  Graphs, ShareGraphs, Notifications, Users,
} from '../models';
import Mail from '../services/Mail';
import helpers from '../helpers';

class ShareGraphsController {
  static create = async (req, res, next) => {
    try {
      const { graphId, userId } = req.body;

      const graph = await Graphs.findByPk(graphId);

      if (!graph) {
        throw HttpErrors(404);
      }

      let shareGraph = await ShareGraphs.findOne({ where: { graphId, userId } });

      if (shareGraph) {
        shareGraph.status = 'shared';
        shareGraph.role = 'view';
        await shareGraph.save();
      } else {
        shareGraph = await ShareGraphs.create({
          userId,
          graphId,
        });
      }

      const data = await ShareGraphs.getListData(graphId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  };

  static update = async (req, res, next) => {
    try {
      await validate(req.body, {
        role: 'required|string',
      });
      const {
        emailTexts: { permissionUpdateSubject, permissionUpdateText },
        common: { getUserFullName },
      } = helpers;
      const {
        role,
      } = req.body;
      const { id } = req.params;
      const { userId: sharerId } = req;

      const shareGraph = await ShareGraphs.findByPk(id, {
        include: [
          {
            model: Graphs,
            as: 'graph',
          },
          {
            model: Users,
            as: 'user',
          },
        ],
      });

      if (!shareGraph) {
        throw HttpErrors(404);
      }

      await ShareGraphs.update({
        role,
      }, {
        where: {
          id,
        },
      });

      if (shareGraph.status !== 'new') {
        await Notifications.create({
          graphId: shareGraph.graphId,
          shareGraphId: shareGraph.id,
          actionType: 'share-update',
          userId: shareGraph.userId,
          text: `You role has changed to ${shareGraph.role}, for graph ${shareGraph.graph.title}`,
        });

        res.io.sockets.emit(
          `notificationsListGraphShared-${shareGraph.userId}`,
          {
            graphId: shareGraph.graphId,
            shareGraphId: shareGraph.id,
            actionType: 'share-update',
            userId: shareGraph.userId,
            text: `You role has changed to ${role}, for graph ${shareGraph.graph.title}`,
          },
        );

        const data = await ShareGraphs.getListData(shareGraph.graphId);

        const { user } = shareGraph;
        const sharer = await Users.findByPk(sharerId);

        await Mail.send(
          user.email,
          permissionUpdateSubject(getUserFullName(sharer)),
          permissionUpdateText(
            getUserFullName(sharer), getUserFullName(user), data.shareGraphs[0].graphId, `${req.protocol}://${req.get('host')}`,
          ),
        );
      }

      const data = await ShareGraphs.getListData(id);
      res.json(data);
    } catch (e) {
      next(e);
    }
  };

  static updateStatus = async (req, res, next) => {
    try {
      await validate(req.body, {
        graphId: 'required|integer',
      });
      const {
        emailTexts: { permissionCreateSubject, permissionCreateText },
        common: { getUserFullName },
      } = helpers;

      const {
        graphId,
      } = req.body;
      const { userId: sharerId } = req;

      const shareGraphsList = await ShareGraphs.findAll({
        where: {
          status: 'new',
          graphId,
        },
        include: [
          {
            model: Graphs,
            as: 'graph',
          },
          {
            model: Users,
            as: 'user',
          },
        ],
      });

      await ShareGraphs.update({
        status: 'shared',
      }, {
        where: {
          status: 'new',
          graphId,
        },
      });

      if (shareGraphsList) {
        shareGraphsList.forEach(async (item) => {
          await Notifications.create({
            graphId,
            shareGraphId: item.id,
            actionType: 'share-add',
            userId: item.userId,
            text: `You have ${item.role} access for graph ${item.graph.title}`,
          });

          res.io.sockets.emit(
            `notificationsListGraphShared-${item.userId}`,
            {
              graphId,
              shareGraphId: item.id,
              actionType: 'share-add',
              userId: item.userId,
              text: `You have ${item.role} access for graph ${item.graph.title}`,
            },
          );

          const { user } = item;
          const sharer = await Users.findByPk(sharerId);

          await Mail.send(
            user.email,
            permissionCreateSubject(getUserFullName(sharer)),
            permissionCreateText(getUserFullName(sharer), getUserFullName(user), graphId),
          );
        });
      }
      const data = await ShareGraphs.getListData(graphId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  };

  static delete = async (req, res, next) => {
    try {
      const {
        emailTexts: { permissionDeleteSubject, permissionDeleteText },
        common: { getUserFullName },
      } = helpers;
      const { id } = req.params;
      const { page = 1 } = req.body;
      const { userId: sharerId } = req;

      const shareGraph = await ShareGraphs.findByPk(id, {
        include: [{
          model: Graphs,
          as: 'graph',
        }],
      });

      if (!shareGraph) {
        throw HttpErrors(404);
      }
      const { graphId, userId, graph: { title } } = shareGraph;

      if (shareGraph.status === 'new') {
        await shareGraph.destroy();
      } else {
        await shareGraph.update({
          status: 'deleted',
        }, {
          where: {
            id,
          },
        });

        await Notifications.create({
          graphId,
          actionType: 'share-delete',
          userId,
          text: `Your permissions were removed from graph ${title}`,
        });

        res.io.sockets.emit(
          `notificationsListGraphShared-${userId}`,
          {
            graphId,
            actionType: 'share-delete',
            userId,
            text: `Your permissions were removed from graph ${title}`,
          },
        );

        const user = await Users.findByPk(userId);
        const sharer = await Users.findByPk(sharerId);

        await Mail.send(
          user.email,
          permissionDeleteSubject(getUserFullName(sharer)),
          permissionDeleteText(getUserFullName(sharer), getUserFullName(user), graphId),
        );
      }

      const data = await ShareGraphs.getListData(graphId, page);
      res.json(data);
    } catch (e) {
      next(e);
    }
  };

  static getList = async (req, res, next) => {
    try {
      await validate(req.body, {
        page: 'integer',
        graphId: 'required|integer',
      });
      const { page = 1, graphId } = req.body;
      const data = await ShareGraphs.getListData(graphId, page);
      res.json(data);
    } catch (e) {
      next(e);
    }
  };

  static userGraphs = async (req, res, next) => {
    try {
      const { userId } = req;

      const userGraphs = await ShareGraphs.findAll({
        where: {
          userId,
          status: 'shared',
        },
        include: [
          {
            model: Users,
            as: 'user',
          },
          {
            model: Graphs,
            as: 'graph',
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

      res.json({
        status: 'ok',
        userGraphs,
      });
    } catch (e) {
      next(e);
    }
  }

  static graphUsers = async (req, res, next) => {
    try {
      const {
        common: { getUserFullName },
      } = helpers;
      const { graphId } = req.body;

      const sharedGraphs = await ShareGraphs.findAll({
        where: {
          graphId,
          status: 'shared',
        },
        include: [
          {
            model: Users,
            as: 'user',
          },
        ],
        order: [
          ['updatedAt', 'DESC'],
        ],
      });
      const graphUsers = sharedGraphs.map((item) => getUserFullName(item.user));

      res.json({
        status: 'ok',
        result: {
          [graphId]: graphUsers,
        },
      });
    } catch (e) {
      next(e);
    }
  }
}

export default ShareGraphsController;
