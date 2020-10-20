import fs from 'fs';
import path from 'path';
import axios from 'axios';
import md5 from 'md5';
import Utils from '../services/Utils';

class PublicController {
  static marker = async (req, res, next) => {
    try {
      const { name } = req.params;
      const colorHex = name.replace('.svg', '');
      const color = Utils.hexToRgb(colorHex);
      const colorDark = `rgb(${Utils.hexToRgb(colorHex, true).map((c) => c - (c * 0.2))
        .join(',')})`;
      const svgDir = path.join(__dirname, '../public/marker.svg');
      let svg = fs.readFileSync(svgDir, 'utf-8');
      svg = svg.replace('#fe5857', color);
      svg = svg.replace('#db0253', colorDark);
      res.setHeader('Content-Disposition', `attachment; filename=${colorHex}.svg`);
      res.setHeader('Content-type', 'image/svg+xml');
      res.send(svg);
    } catch (e) {
      next(e);
    }
  };

  static gravatar = async (req, res, next) => {
    try {
      const { name } = req.params;
      const email = decodeURIComponent(name).replace(/\.png$/, '');
      const { data } = await axios.get(`https://www.gravatar.com/avatar/${md5(email)}?s=256&d=identicon`, {
        responseType: 'arraybuffer',
      });
      res.setHeader('Content-type', 'image/png');
      res.send(data);
    } catch (e) {
      next(e);
    }
  };
}

export default PublicController;
