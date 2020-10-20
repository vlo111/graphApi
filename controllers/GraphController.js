import HttpErrors from 'http-errors';
import _ from 'lodash';
import { literal } from 'sequelize';
import SqlString from 'sequelize/lib/sql-string';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Promise from 'bluebird';
import validate from '../services/validate';
import {
  Graphs, Users, ShareGraphs, CommentGraphs, GraphMeta,
} from '../models';
import Utils from '../services/Utils';

class GraphController {
  static getList = async (req, res, next) => {
    try {
      await validate(req.query, {
        page: 'integer',
        search: 'string',
        files: 'in:active,draft,template',
      });
      const { userId } = req;
      const { page = 1, status = 'active', s } = req.query;
      const limit = 15;
      const offset = (page - 1) * limit;

      const where = {
        userId,
        status,
      };

      if (s) {
        delete where.status;
        const search = SqlString.escape(`%${s}%`);
        where.$and = [{
          $or: [
            { title: { $like: `%${s}%` } },
            { description: { $like: `%${s}%` } },
            { $or: literal(`nodes->"$[*].name" COLLATE utf8mb4_GENERAL_CI like  ${search}`) },
            { $or: literal(`nodes->"$[*].type" COLLATE utf8mb4_GENERAL_CI like  ${search}`) },
            { $or: literal(`links->"$[*].type" COLLATE utf8mb4_GENERAL_CI like  ${search}`) },
          ],
        }];
      }

      let graphs = await Graphs.findAll({
        where,
        include: [{
          model: Users,
          as: 'user',
        }, {
          model: GraphMeta,
          as: 'graphMeta',
          required: false,
          where: {
            key: 'usersView',
          },
        }],
        order: [
          ['updatedAt', 'DESC'],
        ],
        attributes: {
          exclude: ['nodes', 'links', 'labels', 'customFields'],
          include: [
            [literal('JSON_LENGTH(nodes)'), 'nodesCount'],
            [literal('JSON_LENGTH(links)'), 'linksCount'],
            [literal('JSON_LENGTH(labels)'), 'labelsCount'],
          ],
        },
        limit,
        offset,
      });

      graphs = graphs.map((d) => {
        d.dataValues.views = d.meta && d.meta.usersView ? d.meta.usersView.length : 0;
        delete d.dataValues.meta;
        return d;
      });

      const total = await Graphs.count({ where });

      const totalPages = Math.ceil(total / limit);

      res.json({
        status: 'ok',
        graphs,
        page,
        total,
        totalPages,
      });
    } catch (e) {
      next(e);
    }
  };

  static getSingle = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { userId } = req;
      let graph = await Graphs.findOne({
        where: {
          id,
          userId,
        },
        include: [{
          model: Users,
          as: 'user',
        }],
      });

      const usersView = await GraphMeta.findOne({
        where: {
          graphId: id,
          key: 'usersView',
        },
      });

      if (!graph) {
        const shareGraphs = await ShareGraphs.findOne({
          where: {
            graphId: id,
            userId,
          },
          include: [
            {
              model: Graphs,
              as: 'graph',
              include: [{
                model: Users,
                as: 'user',
              }],
            },
          ],
        });
        if (!shareGraphs) {
          throw HttpErrors(404);
        }
        graph = shareGraphs.graph;
      }

      const views = usersView ? usersView.value || [] : [];
      if (!views.includes(userId)) {
        views.push(userId);
        await GraphMeta.createOrUpdate({
          defaults: {
            graphId: id,
            key: 'usersView',
            value: views,
          },
          where: {
            graphId: id,
            key: 'usersView',
          },
        });
      }
      graph.dataValues.views = views.length;
      res.json({
        status: 'ok',
        graph,
      });
    } catch (e) {
      next(e);
    }
  };

  static getEmbed = async (req, res, next) => {
    try {
      const { id, token } = req.params;

      const graph = await Graphs.findOne({
        where: {
          id,
          token,
        },
        include: [{
          model: Users,
          as: 'user',
        }],
      });

      if (!graph) {
        throw HttpErrors(404);
      }

      res.json({
        status: 'ok',
        graph,
      });
    } catch (e) {
      next(e);
    }
  };

  static create = async (req, res, next) => {
    try {
      await validate(req.body, {
        nodes: 'required|array',
        'nodes.*.fx': 'required|numeric',
        'nodes.*.fy': 'required|numeric',
        'nodes.*.name': 'required|string',
        'nodes.*.labels': 'array',
        'nodes.*.labels.*': 'string',
        links: 'array',
        'links.*.source': 'required|string',
        'links.*.target': 'required|string',
        'links.*.value': 'required|numeric',
        labels: 'array',
        'labels.*.d': 'required|array',
        'labels.*.color': 'required|string',
        files: 'object',
        status: 'in:active,draft,template',
        tags: 'array',
        'tags.*': 'string',
        customFields: 'object',
      });
      const {
        links, title, description, files, status, tags, customFields, labels,
      } = req.body;
      let { nodes, svg } = req.body;
      const { userId } = req;
      const thumbnail = `${userId}/${uuidv4()}.png`;

      const graph = await Graphs.create({
        userId,
        title: title || 'untitled',
        nodes,
        links,
        labels,
        description,
        status: status || 'active',
        thumbnail,
        tags,
        customFields,
      });

      const uploadedFiles = Utils.uploadNodeFiles(files, graph.id);

      const $icon = Symbol('icon');
      nodes = nodes.map((n) => {
        n.description = _.template(n.description)(uploadedFiles);
        n[$icon] = n.icon;
        n.icon = Utils.uploadIcon(n.icon, graph.id);
        return n;
      });

      nodes = await Promise.object(nodes, 'icon', 20);

      await Graphs.update({ nodes }, {
        where: {
          id: graph.id,
          userId,
        },
      });

      if (svg) {
        nodes.filter((n) => n.icon).forEach((n) => {
          svg = svg.replace(` href="${n[$icon]}"`, ` href="${n.icon}"`)
            .replace(` xlink:href="${n[$icon]}"`, ` xlink:href="${n.icon}"`);
        });
        await Utils.generateThumbnail(svg, thumbnail);
      }

      res.json({
        status: 'ok',
        graphId: graph.id,
      });
    } catch (e) {
      next(e);
    }
  };

  static update = async (req, res, next) => {
    try {
      await validate(req.body, {
        nodes: 'required|array',
        'nodes.*.fx': 'required|numeric',
        'nodes.*.fy': 'required|numeric',
        'nodes.*.name': 'required|string',
        'nodes.*.labels': 'array',
        'nodes.*.labels.*': 'string',
        links: 'array',
        'links.*.source': 'required|string',
        'links.*.target': 'required|string',
        'links.*.value': 'required|numeric',
        labels: 'array',
        'labels.*.d': 'required|array',
        'labels.*.color': 'required|string',
        files: 'object',
        status: 'in:active,draft,template',
        tags: 'array',
        'tags.*': 'string',
        customFields: 'object',
      });
      // const {
      //   emailTexts: { graphUpdatedSubject, graphUpdatedText },
      //   common: { getUserFullName },
      // } = helpers;

      const {
        links, title, description, files, status, tags, customFields, labels,
      } = req.body;
      let { nodes, svg } = req.body;
      const { id } = req.params;
      const { userId } = req;
      const thumbnail = `${userId}/${uuidv4()}.png`;

      const graph = await Graphs.findUserAssociatedGraph(id, userId);
      if (!graph) {
        throw HttpErrors(404);
      }

      const uploadedFiles = Utils.uploadNodeFiles(files, graph.id);

      const $icon = Symbol('icon');
      nodes = nodes.map((n) => {
        n.description = _.template(n.description)(uploadedFiles);
        n[$icon] = n.icon;
        n.icon = Utils.uploadIcon(n.icon, graph.id);
        return n;
      });

      nodes = await Promise.object(nodes, 'icon', 20);

      await Utils.cleanNodeIcons(nodes, graph.id);

      await Graphs.update({
        title: title || 'untitled',
        description,
        nodes,
        links,
        labels,
        status: status || 'active',
        thumbnail,
        tags,
        customFields,
      }, {
        where: {
          id,
        },
      });

      res.io.sockets.emit('graphUpdate', {
        title: title || 'untitled',
        description,
        nodes,
        links,
        status: status || 'active',
        thumbnail,
        tags,
        customFields,
        id,
      });

      // const graphAllShares = await ShareGraphs.findAll({
      //   where: {
      //     graphId: id,
      //   },
      //   include: [
      //     {
      //       model: Users,
      //       as: 'user',
      //       attributes: ['email'],
      //     },
      //   ],
      // });
      // if (!_.isEmpty(graphAllShares)) {
      //   const emailsToSend = graphAllShares.map((shareGraph) => shareGraph.user.email);
      //   const sharer = await Users.findByPk(userId);
      //
      //   await Mail.send(
      //     emailsToSend,
      //     graphUpdatedSubject(getUserFullName(sharer)),
      //     graphUpdatedText(getUserFullName(sharer), id, `${req.protocol}://${req.get('host')}`),
      //   );
      // }

      if (svg) {
        nodes.filter((n) => n.icon).forEach((n) => {
          svg = svg.replace(` href="${n[$icon]}"`, ` href="${n.icon}"`)
            .replace(` xlink:href="${n[$icon]}"`, ` xlink:href="${n.icon}"`);
        });
        await Utils.generateThumbnail(svg, thumbnail, graph.thumbnail);
      }

      res.json({
        status: 'ok',
        graphId: graph.id,
      });
    } catch (e) {
      next(e);
    }
  };

  static setThumbnail = async (req, res, next) => {
    try {
      await validate(req.body, {
        svg: 'required|string',
      });
      const { userId } = req;
      const { svg } = req.body;
      const { id } = req.params;

      const graph = await Graphs.findOne({
        where: {
          id,
          userId,
        },
        attributes: ['thumbnail'],
      });

      if (!graph) {
        throw HttpErrors(404);
      }
      const thumbnail = `${userId}/${path.basename(graph.thumbnail)}`;
      await Utils.generateThumbnail(svg, thumbnail);

      res.json({
        status: 'ok',
        graphId: graph.id,
      });
    } catch (e) {
      next(e);
    }
  };

  static delete = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { userId } = req;

      const graph = await Graphs.findUserAssociatedGraph(id, userId);
      if (!graph) {
        throw HttpErrors(404);
      }

      await graph.destroy();

      res.json({
        status: 'ok',
      });
    } catch (e) {
      next(e);
    }
  };

  static actionsCount = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { userId } = req;

      const graph = await Graphs.findOne({
        where: {
          id,
        },
      });

      if (!graph) {
        throw HttpErrors(404);
      }
      const shareGraphsCount = await ShareGraphs.count({
        where: {
          graphId: id,
          status: 'shared',
        },
      });

      const commentsCount = await CommentGraphs.count({
        where: {
          graphId: id,
        },
      });

      res.json({
        status: 'ok',
        result: {
          [id]: {
            shares: shareGraphsCount,
            comments: commentsCount,
            views: 0,
            likes: 0,
          },
        },
      });
    } catch (e) {
      next(e);
    }
  };
}

export default GraphController;
