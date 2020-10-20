import mime from 'mime-types';
import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import sharp from 'sharp';
import Converter from './Converter';
import { IMAGE_MIME_TYPES } from '../data/mimeTypes';
import Directories from './Directories';

class Utils {
  static uploadNodeFiles(files, nodeId) {
    const uploadedFiles = {};
    if (!_.isEmpty(files)) {
      const dir = Directories.FILES_DIR(nodeId.toString());
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      _.forEach(files, (base64, i) => {
        const fileBase = base64.replace(/^data:.+;base64,/, '');
        const ext = mime.extension(base64.match(/^data:(.+);/)[1]);
        const file = path.join(dir, `file_${i}.${ext}`);
        uploadedFiles[`file_${i}`] = Directories.dirToUri(file);
        return fs.writeFileSync(file, fileBase, 'base64');
      });
    }
    return uploadedFiles;
  }

  static async uploadIcon(icon, graphId) {
    if (!icon) return icon;
    const dir = Directories.ICONS_DIR(graphId.toString());
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let buffer;
    const fileName = uuidv4();
    let ext;
    if (icon.startsWith('data:image/')) {
      const mimeType = icon.match(/^data:(.+);/)[1];
      ext = IMAGE_MIME_TYPES[mimeType];
      if (!ext) {
        return null;
      }
      buffer = Buffer.from(icon.replace(/^data:.+;base64,/, ''), 'base64');
    } else if (!icon.startsWith(global.uri)) {
      const { data, headers } = await axios.get(icon, {
        responseType: 'arraybuffer',
      }).catch((e) => e);
      if (!data) {
        return null;
      }
      const mimeType = headers['content-type'];
      ext = IMAGE_MIME_TYPES[mimeType];
      if (!ext) {
        return null;
      }
      buffer = Buffer.from(data);
    }
    if (buffer && ext) {
      const fileLarge = path.join(dir, `${fileName}.${ext}.large`);
      const file = path.join(dir, `${fileName}.${ext}`);
      const metadata = await sharp(buffer).metadata();
      const p1 = sharp(buffer)
        .rotate()
        .resize({
          width: 250,
          height: 250,
        })
        .toFile(file);
      const p2 = sharp(buffer)
        .rotate()
        .resize({
          width: metadata.width < 1024 ? metadata.width : 1024,
        })
        .toFile(fileLarge);
      await Promise.all([p1, p2]);
      return Directories.dirToUri(file);
    }
    return icon;
  }

  static async cleanNodeIcons(nodes, graphId) {
    const dir = Directories.ICONS_DIR(graphId.toString());
    if (!fs.existsSync(dir)) {
      return dir;
    }
    const icons = nodes.map((d) => path.basename(d.icon)).flat(1);
    const fsIcons = fs.readdirSync(dir);
    fsIcons.forEach((fsIcon) => {
      if (!icons.some((i) => i === fsIcon || `${i}.large` === fsIcon)) {
        fs.unlinkSync(path.join(dir, fsIcon));
      }
    });
    return dir;
  }

  static async generateThumbnail(svg, thumbnailName, oldThumbnail) {
    if (!svg) {
      return null;
    }
    const filePath = Directories.THUMBNAILS_DIR(thumbnailName);
    const fileDir = path.dirname(filePath);
    try {
      if (oldThumbnail) {
        const name = path.basename(oldThumbnail);
        fs.unlinkSync(path.join(fileDir, name));
      }
    } catch (e) {
      //
    }

    const thumbnail = await Converter.svgToPng(svg, {
      '-quality': '50',
      '-density': '100',
    });
    if (thumbnail) {
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      fs.writeFileSync(filePath, thumbnail);
    }
    return filePath;
  }

  static formatMeta(document, metaName) {
    if (document) {
      if (_.isArray(document)) return document.map((doc) => formatMeta(doc));
      return formatMeta(document);
    }
    return document;

    function formatMeta(doc) {
      if (doc[metaName]) {
        const meta = {};
        doc[metaName].forEach((m) => {
          meta[m.key] = m.value;
        });
        doc.dataValues.meta = meta;

        doc.meta = meta;

        delete doc.dataValues[metaName];
      }

      return doc;
    }
  }

  static hexToRgb(hex, array = false) {
    const arrBuff = new ArrayBuffer(4);
    const vw = new DataView(arrBuff);
    vw.setUint32(0, parseInt(hex, 16), false);
    const arrByte = [...new Uint8Array(arrBuff)];
    arrByte.shift();
    if (array) {
      return arrByte;
    }
    return `rgb(${arrByte.join(',')})`;
  }

  static urlToPath(url) {
    return url.replace(global.uri, '');
  }
}

export default Utils;
