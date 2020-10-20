import { DataTypes, Model, Op } from 'sequelize';
import db from '../services/db';
import Users from './Users';
import Graphs from './Graphs';

class ShareGraphs extends Model {
  static async getListData(graphId, page = 1) {
    const limit = 15;
    const offset = (page - 1) * limit;

    const shareGraphs = await ShareGraphs.findAll({
      where: {
        graphId,
        [Op.not]: {status: "deleted"},
      },
      include: [
        {
          model: Users,
          as: 'user',
        },
        {
          model: Graphs,
          as: 'graph',
        },
      ],
      order: [
        ['updatedAt', 'DESC'],
      ],
      limit,
      offset,
    });

    const total = await ShareGraphs.count({
      where: {
        graphId,
        status: 'shared',
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      status: 'ok',
      shareGraphs,
      page,
      total,
      totalPages,
    };
  }
}

ShareGraphs.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  role: {
    type: DataTypes.ENUM('view', 'edit', 'owner', 'admin'),
    allowNull: false,
    defaultValue: 'view',
  },
  status: {
    type: DataTypes.ENUM('new', 'shared', 'deleted'),
    allowNull: false,
    defaultValue: 'new',
  },
}, {
  sequelize: db,
  tableName: 'share_graphs',
  modelName: 'shareGraphs',
});

ShareGraphs.belongsTo(Users, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'userId',
  as: 'user',
});

Users.hasMany(ShareGraphs, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'userId',
  as: 'shareGraphs',
});

ShareGraphs.belongsTo(Graphs, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'graphId',
  as: 'graph',
});

Graphs.hasMany(ShareGraphs, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'graphId',
  as: 'shareUsers',
});

export default ShareGraphs;
