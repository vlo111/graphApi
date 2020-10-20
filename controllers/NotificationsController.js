import { Op } from 'sequelize';
import {
  Notifications,
} from '../models';

class NotificationsController {
  static update = async (req, res, next) => {
    try {
      const { userId } = req;

      await Notifications.update({
        status: 'read',
      }, {
        where: {
          userId,
          status: 'new',
        },
      });


      res.json({status: 'ok'});
    } catch (e) {
      console.log(e, 'error is here');
      next(e);
    }
  };

  static getList = async (req, res, next) => {
    try {
      const { userId } = req;
      const data = await Notifications.findAll({
        where: {
          userId,
          status: 'new',
          createdAt: {
            [Op.lt]: new Date(),
            [Op.gt]: new Date(new Date() - 24 * 60 * 60 * 5000),
          },
        },
      });

      res.json(data);
    } catch (e) {
      next(e);
    }
  };
}

export default NotificationsController;
