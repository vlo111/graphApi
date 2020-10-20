import { DataTypes, Model } from 'sequelize';
import db from '../services/db';
import Users from './Users';

class CommentGraphs extends Model {
  static async getListData(graphId, page = 1) {
    const limit = 15;
    const offset = (page - 1) * limit;

    const commentGraphs = await CommentGraphs.findAll({
      where: {
        graphId,
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
      limit,
      offset,
    });

    const total = await CommentGraphs.count({
      where: {
        graphId,
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      status: 'ok',
      commentGraphs,
      page,
      total,
      totalPages,
    };
  }
}

CommentGraphs.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  graphId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  text: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  sequelize: db,
  tableName: 'comment_graphs',
  modelName: 'commentGraphs',
});

CommentGraphs.belongsTo(Users, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'userId',
  as: 'user',
});

Users.hasMany(CommentGraphs, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'userId',
  as: 'commentGraphs',
});

CommentGraphs.belongsTo(CommentGraphs, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'parentId',
  as: 'parent',
});

CommentGraphs.hasMany(CommentGraphs, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'parentId',
  as: 'commentGraphs',
});

export default CommentGraphs;
