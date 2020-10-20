import moment from 'moment';
import { DataTypes, Model } from 'sequelize';

import db from '../services/db';

class UserMeta extends Model {
  static async get(userId, key, defaultValue) {
    if (!key) return defaultValue;

    const data = await UserMeta.findOne({
      where: {
        userId,
        key,
      },
    });

    if (!data) return defaultValue;

    try {
      return JSON.parse(data.value);
    } catch (e) {
      return data.value;
    }
  }

  static async findExternalId(key, target, defaultValue) {
    if (!key || !target) return {};
    const data = await UserMeta.findOne({
      where: {
        key,
        value: {
          $like: `%${target}%`,
        },
      },
    });

    if (!data) return defaultValue;

    try {
      data.value = JSON.parse(data.value);
    } catch (e) {
      //
    }

    return data;
  }

  static async updateOrCreate(userId, key, value) {
    const findMeta = await UserMeta.findOne(
      {
        where: {
          userId,
          key,
        },
      },
    );

    if (findMeta) {
      return UserMeta.update(
        {
          value: value,
        },
        {
          returning: true,
          where: {
            userId,
            key,
          },
        },
      );
    }

    return UserMeta.create(
      {
        userId,
        key,
        value,
      },
      {
        returning: true,
      },
    );
  }

  static loginTime(userId) {
    return UserMeta.createOrUpdate({
      where: {
        userId,
        key: 'lastLogin',
      },
      defaults: {
        userId,
        key: 'lastLogin',
        value: `${moment.utc()
          .format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`,
      },
    });
  }
}

UserMeta.init({
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
    allowNull: false,
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
  tableName: 'user-meta',
  modelName: 'userMeta',
  timestamps: true,
});

export default UserMeta;
