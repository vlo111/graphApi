import jwt from 'jsonwebtoken';
import HttpErrors from 'http-errors';

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Op } from 'sequelize';
import Mail from '../services/Mail';
import OAuth from '../services/OAuth';
import validate from '../services/validate';

import { Users, UserMeta } from '../models';
import { IMAGE_MIME_TYPES } from '../data/mimeTypes';
import Utils from '../services/Utils';

const { JWT_SECRET } = process.env;

class UsersController {
  static me = async (req, res, next) => {
    try {
      const user = await Users.findByPk(req.userId);

      if (!user) throw HttpErrors(404);

      res.json({
        status: 'ok',
        user,
      });
    } catch (e) {
      next(e);
    }
  };

  static update = async (req, res, next) => {
    try {
      await validate(req.body, {
        firstName: 'required|alpha',
        lastName: 'required|alpha',
        bio: 'string',
        website: 'url',
        oldPassword: 'minLength:5',
        password: 'minLength:5|same:confirmPassword',
      }, null, {
        same: 'The password and Repeat Password must match.',
      });
      const { userId, file } = req;
      const {
        firstName, lastName, bio, website, oldPassword, password, avatar,
      } = req.body;

      const user = await Users.findByPk(userId);

      if (oldPassword) {
        const passCheck = await Users.count({
          where: {
            id: userId,
            password: Users.passHash(oldPassword),
          },
        });
        if (!passCheck) {
          throw HttpErrors(422, { errors: { oldPassword: 'Wrong password' } });
        }
        user.password = password;
      }

      if (file) {
        const ext = IMAGE_MIME_TYPES[file.mimetype];
        if (ext) {
          const dir = path.join(__dirname, '../public/uploads/users');
          const avatarPath = `/public/uploads/users/${userId}.png`;
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
          }
          await sharp(file.buffer)
            .rotate()
            .toFormat('png')
            .resize({
              width: 512,
              height: 512,
            })
            .toFile(path.join(__dirname, '..', avatarPath));
          user.avatar = avatarPath;
        }
      } else if (!avatar) {
        if (user.avatar) {
          try {
            fs.unlinkSync(path.join(__dirname, '..', Utils.urlToPath(user.avatar)));
          } catch (e) {
            //
          }
        }
        user.avatar = '';
      }

      user.firstName = firstName;
      user.lastName = lastName;
      user.bio = bio;
      user.website = website;

      await user.save();

      res.json({
        status: 'ok',
        user,
      });
    } catch (e) {
      next(e);
    }
  };

  static updatePassword = async (req, res, next) => {
    try {
      await validate(req.body, {
        oldPassword: 'required|minLength:5',
        password: 'required|minLength:5|same:confirmPassword',
      }, null, {
        same: 'The password and Repeat Password must match.',
      });
      const { userId } = req;
      const { oldPassword, password } = req.body;

      const user = await Users.findOne({
        where: {
          id: userId,
          password: Users.passHash(oldPassword),
        },
      });
      if (!user) {
        throw HttpErrors(422, { errors: { oldPassword: 'Wrong password' } });
      }
      user.password = password;
      await user.save();
      res.json({
        status: 'ok',
        user,
      });
    } catch (e) {
      next(e);
    }
  };

  static signIn = async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await Users.findOne({
        where: {
          email,
          password: Users.passHash(password),
        },
      });

      if (!user) throw HttpErrors(403, 'wrong email or password');

      await UserMeta.loginTime(user.id);

      const token = jwt.sign({
        userId: user.id,
        userIP: req.ip,
        loginService: 'native',
      }, JWT_SECRET);

      res.json({
        status: 'ok',
        token,
        user,
      });
    } catch (e) {
      next(e);
    }
  };

  static signUp = async (req, res, next) => {
    try {
      await validate(req.body, {
        email: 'required|email',
        firstName: 'required|alpha',
        lastName: 'required|alpha',
        password: 'required|minLength:5',
      });
      const {
        firstName, lastName, email, password,
      } = req.body;

      const userExists = await Users.findOne({
        where: {
          email,
        },
      });
      if (userExists) throw HttpErrors(403, 'Account already exists');

      const user = await Users.create({
        firstName,
        lastName,
        email,
        password,
      });

      res.json({
        status: 'ok',
        user,
      });
    } catch (e) {
      next(e);
    }
  };

  static redirectGoogle = async (req, res, next) => {
    try {
      await validate(req.query, {
        accessToken: 'required',
      });

      const { accessToken } = req.query;

      const profileData = await OAuth.v2.Google.getProfile(accessToken);

      if (profileData.verified_email === false) {
        throw new HttpErrors(403, 'Your google account email not verified!');
      }

      let user = await Users.findOne({
        where: {
          email: profileData.email,
        },
      });

      if (!user) {
        user = await Users.create({
          firstName: profileData.given_name,
          lastName: profileData.family_name,
          email: profileData.email,
        });
      }

      await UserMeta.updateOrCreate(user.id, 'googleExternalData', profileData);

      await UserMeta.loginTime(user.id);

      const token = jwt.sign({
        userId: user.id,
        userIP: req.ip,
        loginService: 'google',
      }, JWT_SECRET);

      if (!token) throw new HttpErrors(403, 'Login fail!');

      res.json({
        status: 'ok',
        token,
        user,
      });
    } catch (e) {
      next(e);
    }
  };

  static redirectFacebook = async (req, res, next) => {
    try {
      await validate(req.query, {
        accessToken: 'required',
      });

      const { accessToken } = req.query;

      const profileData = await OAuth.v2.Facebook.getProfile(accessToken);

      let user;
      if (!profileData.email) {
        const ifExist = await UserMeta.findExternalId('facebookExternalData', profileData.id, null);

        if (ifExist) {
          user = await Users.findByPk(ifExist.userId);
        } else {
          user = await Users.create({
            firstName: profileData.first_name,
            lastName: profileData.last_name,
            email: null,
          });
        }
      } else {
        user = await Users.findOne({
          where: {
            email: profileData.email,
          },
        });

        if (!user) {
          user = await Users.create({
            firstName: profileData.first_name,
            lastName: profileData.last_name,
            email: profileData.email,
          });
        }
      }

      await UserMeta.updateOrCreate(user.id, 'facebookExternalData', profileData);

      await UserMeta.loginTime(user.id);

      const token = jwt.sign({
        userId: user.id,
        userIP: req.ip,
        loginService: 'facebook',
      }, JWT_SECRET);

      if (!token) throw new HttpErrors(403, 'Login fail!');

      res.json({
        status: 'ok',
        token,
        user,
      });
    } catch (e) {
      next(e);
    }
  };

  static redirectLinkedin = async (req, res, next) => {
    try {
      await validate(req.query, {
        code: 'required',
        redirectUri: 'required',
      });

      const { code, redirectUri } = req.query;
      const profileData = await OAuth.v2.Linkedin.getProfile(code, redirectUri);

      let user;

      if (!profileData.email) {
        const ifExist = await UserMeta.findExternalId('linkedinExternalData', profileData.id, null);

        if (ifExist) {
          user = await Users.findByPk(ifExist.userId);
        } else {
          user = await Users.create({
            firstName: profileData.localizedFirstName,
            lastName: profileData.localizedLastName,
            email: null,
          });
        }
      } else {
        user = await Users.findOne({
          where: {
            email: profileData.email,
          },
        });

        if (!user) {
          user = await Users.create({
            firstName: profileData.localizedFirstName,
            lastName: profileData.localizedLastName,
            email: profileData.email,
          });
        }
      }

      await UserMeta.updateOrCreate(user.id, 'linkedinExternalData', profileData);

      await UserMeta.loginTime(user.id);

      const token = jwt.sign({
        userId: user.id,
        userIP: req.ip,
        loginService: 'linkedin',
      }, JWT_SECRET);

      if (!token) throw new HttpErrors(403, 'Login fail!');

      res.json({
        status: 'ok',
        token,
        user,
      });
    } catch (e) {
      next(e);
    }
  };

  static redirectTwitter = async (req, res, next) => {
    try {
      await validate(req.query, {
        redirectUri: 'required',
        oauthToken: 'required',
        oauthVerifier: 'required',
      });
      const { redirectUri, oauthToken, oauthVerifier } = req.query;

      const profileData = await OAuth.v1.Twitter.getProfile(
        oauthToken, oauthVerifier, redirectUri,
      );

      let user;

      if (!profileData.email) {
        const ifExist = await UserMeta.findExternalId('twitterExternalData', profileData.id, null);

        if (ifExist) {
          user = await Users.findByPk(ifExist.userId);
        } else {
          user = await Users.create({
            firstName: profileData.name,
            lastName: profileData.screen_name,
            email: null,
          });
        }
      } else {
        user = await Users.findOne({
          where: {
            email: profileData.email,
          },
        });

        if (!user) {
          user = await Users.create({
            firstName: profileData.name,
            lastName: profileData.screen_name,
            email: profileData.email,
          });
        }
      }

      await UserMeta.updateOrCreate(user.id, 'twitterExternalData', profileData);

      await UserMeta.loginTime(user.id);

      const token = jwt.sign({
        userId: user.id,
        userIP: req.ip,
        loginService: 'twitter',
      }, JWT_SECRET);

      if (!token) throw new HttpErrors(403, 'Login fail!');

      res.json({
        status: 'ok',
        token,
        user,
      });
    } catch (e) {
      next(e);
    }
  };

  static getTwitterToken = async (req, res, next) => {
    try {
      await validate(req.query, {
        redirectUri: 'required',
      });
      const { redirectUri } = req.query;

      const data = await OAuth.v1.Twitter.getToken(redirectUri);

      res.json({
        data,
        status: 'ok',
      });
    } catch (e) {
      next(e);
    }
  };

  static forgotPassword = async (req, res, next) => {
    try {
      await validate(req.body, {
        email: 'required|email',
        callback: 'required',
      });

      const { email, callback } = req.body;

      const user = await Users.findOne({
        where: {
          email,
        },
      });

      if (!user) {
        throw HttpErrors(422, 'wrong email');
      }

      const token = jwt.sign({
        userIP: req.ip,
        loginService: 'native',
      }, JWT_SECRET, {
        expiresIn: '1h',
      });

      const cbUrl = new URL(callback);
      cbUrl.searchParams.append('token', token);

      await Mail.send(email, 'Password Reset', `<a href="${cbUrl.href}">${cbUrl.href}</a>`);

      user.token = token;
      await user.save();

      res.json({
        status: 'ok',
      });
    } catch (e) {
      next(e);
    }
  };

  static resetPassword = async (req, res, next) => {
    try {
      await validate(req.body, {
        token: 'required',
        password: 'required|minLength:5',
      });
      const { ip } = req;
      const { token, password } = req.body;

      const user = await Users.findOne({
        where: {
          token,
        },
      });

      if (!user) {
        throw HttpErrors(403, 'Invalid token');
      }
      let userIP;
      try {
        const data = jwt.verify(token, JWT_SECRET);
        userIP = data.userIP;
      } catch (e) {
        //
      }
      if (!userIP) {
        throw HttpErrors(403, 'Expired token');
      }

      if (userIP !== ip) {
        throw HttpErrors(403, 'Invalid token');
      }
      user.token = null;
      user.password = password;
      await user.save();
      res.json({
        status: 'ok',
      });
    } catch (e) {
      next(e);
    }
  };

  static getUsersByText = async (req, res, next) => {
    try {
      await validate(req.query, {
        text: 'required|string|minLength:3',
      });
      const { text } = req.query;

      const users = await Users.findAll({
        where: {
          $or: [
            {
              email: {
                [Op.like]: `%${text}%`,
              },
            },
            {
              firstName: {
                [Op.like]: `%${text}%`,
              },
            },
            {
              lastName: {
                [Op.like]: `%${text}%`,
              },
            },
          ],
        },
        limit: 10,
      });

      res.json({
        status: 'ok',
        data: users,
      });
    } catch (e) {
      next(e);
    }
  };
}

export default UsersController;
