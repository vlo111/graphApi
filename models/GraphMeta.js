import { DataTypes, Model } from 'sequelize';

import db from '../services/db';
import Graphs from './Graphs';
import Utils from '../services/Utils';

class GraphMeta extends Model {
}

GraphMeta.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('value');
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    },
    set(value) {
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      this.setDataValue('value', value);
    },
  },
}, {
  sequelize: db,
  tableName: 'graph-meta',
  modelName: 'graphMeta',
  timestamps: false,
});

Graphs.hasMany(GraphMeta, {
  as: 'graphMeta',
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'graphId',
});

GraphMeta.belongsTo(Graphs, {
  as: 'graph',
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'graphId',
});

// format meta table values
Graphs.addHook('afterFind', (res) => Utils.formatMeta(res, 'graphMeta'));

export default GraphMeta;
