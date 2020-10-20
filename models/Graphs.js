import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import Promise from 'bluebird';
import db from '../services/db';
import Users from './Users';
import { ShareGraphs } from './index';

class Graphs extends Model {
  static async findUserAssociatedGraph(id, userId) {
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

    if (!graph) {
      const shareGraphs = await ShareGraphs.findOne({
        where: {
          graphId: id,
          userId,
          $or: [
            {
              role:
                {
                  $eq: 'edit',
                },
            },
            {
              role:
                {
                  $eq: 'admin',
                },
            },
          ],
        },
        include: [
          {
            model: Users,
            as: 'user',
          }, {
            model: Graphs,
            as: 'graph',
          },
        ],
      });
      if (!shareGraphs) {
        return null;
      }
      graph = shareGraphs.graph;
    }

    return graph;
  }
}

Graphs.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nodes: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  links: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  labels: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  customFields: {
    type: DataTypes.JSON,
    allowNull: true, // todo change to false
    defaultValue: {},
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '',
  },
  status: {
    type: DataTypes.ENUM('active', 'draft', 'template'),
    allowNull: false,
    defaultValue: 'active',
  },
  thumbnail: {
    type: DataTypes.STRING,
    allowNull: true, // todo change to false
    get() {
      const thumbnail = this.getDataValue('thumbnail');
      if (!thumbnail) return thumbnail;
      return `${global.uri}/public/uploads/thumbnails/${thumbnail}`;
    },
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  token: {
    type: DataTypes.STRING(36),
    allowNull: false,
    defaultValue: () => uuidv4(),
  },
}, {
  sequelize: db,
  tableName: 'graphs',
  modelName: 'graphs',
});

Graphs.belongsTo(Users, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'userId',
  as: 'user',
});

Users.hasMany(Graphs, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'userId',
  as: 'graphs',
});

export default Graphs;
