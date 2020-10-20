import axios from 'axios';
import _ from 'lodash';
import captureWebsite from 'capture-website';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import HttpErrors from 'http-errors';
import { PDFImage } from 'pdf-image';
import validate from '../services/validate';

class HelpersController {
  static contentType = async (req, res, next) => {
    try {
      await validate(req.query, {
        url: 'required|string',
      });
      const { url } = req.query;

      let contentType = 'unknown';
      if (/https?:\/\//.test(url)) {
        const { headers } = await axios.head(url).catch((e) => e);
        contentType = _.get(headers, 'content-type', '').split(';')[0] || 'unknown';
      }

      res.json({
        status: 'ok',
        contentType,
      });
    } catch (e) {
      next(e);
    }
  };

  static wikipediaSearch = async (req, res, next) => {
    try {
      await validate(req.query, {
        search: 'required|string',
      });
      const { search } = req.query;

      const params = {
        action: 'query',
        list: 'search',
        format: 'json',
        origin: '*',
        srsearch: search,
      };
      const { data } = await axios.get('https://en.wikipedia.org/w/api.php', {
        params,
      }).catch((e) => e);
      const result = _.get(data, 'query.search[0]', null);

      res.json({
        status: 'ok',
        result,
      });
    } catch (e) {
      next(e);
    }
  };

  static contentThumbnail = async (req, res, next) => {
    try {
      await validate(req.query, {
        url: 'required',
      });
      const { url } = req.query;

      let contentType = 'unknown';
      if (/https?:\/\//.test(url)) {
        const { headers } = await axios.head(url).catch((e) => e);
        contentType = _.get(headers, 'content-type', '').split(';')[0] || 'unknown';
      }
      let file;
      if (contentType === 'text/html') {
        file = path.join(__dirname, `../temp/${uuidv4()}.jpg`);
        await captureWebsite.file(url, file, {
          quality: 0.9,
          type: 'jpeg',
          scaleFactor: 0.5,
          // userAgent: req.headers['user-agent'],
          launchOptions: {
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
            ],
          },
        });
      }
      if (contentType === 'application/pdf') {
        const { data } = await axios.get(url, {
          responseType: 'arraybuffer',
        });
        const pdfFile = path.join(__dirname, `../temp/${uuidv4()}.pdf`);
        fs.writeFileSync(pdfFile, Buffer.from(data));
        const pdfImage = new PDFImage(pdfFile, {
          convertOptions: {
            '-flatten': '',
            '-quality': '75',
            '-density': '200',
            '-resize': '640x',
          },
        });
        file = await pdfImage.convertPage(0);
        fs.unlinkSync(pdfFile);
      }
      if (!file) {
        throw HttpErrors(404);
      }

      res.setHeader('Cache-Control', 'public, max-age=7200');
      res.sendFile(file, () => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    } catch (e) {
      next(e);
    }
  };
}

export default HelpersController;
