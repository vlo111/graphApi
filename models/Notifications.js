import { DataTypes, Model } from 'sequelize';
import db from '../services/db';
import ShareGraphs from './ShareGraphs';
import User from './Users';
import Graphs from './Graphs';

class Notifications extends Model {
}

Notifications.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  actionType: {
    type: DataTypes.ENUM('create', 'update', 'delete', 'share-add', 'share-update', 'share-delete'),
    allowNull: false,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('new', 'read'),
    allowNull: false,
    defaultValue: 'new',
  },
}, {
  sequelize: db,
  tableName: 'notifications',
  modelName: 'Notifications',
});

Notifications.belongsTo(ShareGraphs, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'shareGraphId',
  as: 'shareGraph',
});

ShareGraphs.hasMany(Notifications, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'shareGraphId',
  as: 'shareGraphNotifys',
});

Notifications.belongsTo(User, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'userId',
  as: 'user',
});

User.hasMany(Notifications, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'userId',
  as: 'notifications',
});

Notifications.belongsTo(Graphs, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'graphId',
  as: 'graph',
});

Graphs.hasMany(Notifications, {
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'graphId',
  as: 'notifications',
});

export default Notifications;
