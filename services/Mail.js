import _ from 'lodash';
import { createTransport } from 'nodemailer';

const {
  MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_FROM,
} = process.env;

const transporter = createTransport({
  host: MAIL_HOST,
  port: MAIL_PORT,
  secure: true,
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASSWORD,
  },
});

class Mail {
  static send(to, subject, body) {
    to = _.isArray(to) ? to.join(', ') : to;
    return transporter.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      html: body,
    });
  }
}

export default Mail;
