import md5 from 'md5';
import { DataTypes, Model } from 'sequelize';

import db from '../services/db';
import Utils from '../services/Utils';

import UserMeta from './UserMeta';

const { USER_PASSWORD_SECRET } = process.env;

class Users extends Model {
  static passHash(pass) {
    return md5(md5(pass) + USER_PASSWORD_SECRET);
  }
}

Users.init({
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
    set(val) {
      if (val) this.setDataValue('password', Users.passHash(val));
    },
    get() {
      return undefined;
    },
  },
  avatar: {
    type: DataTypes.STRING,
    get() {
      const avatar = this.getDataValue('avatar');
      if (avatar) {
        return global.uri + avatar;
      }
      if (this.getDataValue('email')) {
        const email = md5(this.getDataValue('email'));
        return `https://www.gravatar.com/avatar/${email}?s=256&d=identicon`;
      }
      return '';
    },
  },
  token: {
    type: DataTypes.STRING,
    allowNull: true,
    get() {
      return undefined;
    },
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  sequelize: db,
  tableName: 'users',
  modelName: 'users',
});

Users.hasMany(UserMeta, {
  as: 'userMeta',
  onUpdate: 'cascade',
  onDelete: 'cascade',
  foreignKey: 'userId',
});

// format meta table values
Users.addHook('afterFind', (res) => Utils.formatMeta(res, 'userMeta'));

export default Users;
