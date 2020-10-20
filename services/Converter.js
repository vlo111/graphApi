import _ from 'lodash';
import PDFDocument from 'pdfkit';
import Promise from 'bluebird';
import SVGtoPDF from 'svg-to-pdfkit';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PDFImage } from 'pdf-image';
import xlsx from 'xlsx';
import replaceAsync from 'string-replace-async';
import Csv from './Csv';
import Utils from './Utils';
import Directories from './Directories';
import LinkedinPdfParser from './LinkedinPdfParser';

class Converter {
  static async svgToPdf(svg, params) {
    const configs = {
      margin: 0,
      ...params,
    };
    const width = +(svg.match(/\swidth="(\d+)"/)[1]) || 1500;
    const height = +(svg.match(/\sheight="(\d+)"/)[1]) || 800;

    const w = width + (configs.margin * 2);
    const h = height + (configs.margin * 2);

    const doc = new PDFDocument({
      bufferPages: true,
      size: [w, h],
      align: 'center',
      valign: 'center',
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    const promise = new Promise((resolve) => {
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
    });

    doc.rect(0, 0, w, h).fill('#f0f2fb');

    const tempId = uuidv4();
    svg = await replaceAsync(svg, /(<image[^>]+(xlink:|)href=)(["'])(.*?)\3/g, async (...matches) => {
      const icon = await Utils.uploadIcon(matches[4], tempId);
      return matches[1] + matches[3] + icon + matches[3];
    });

    SVGtoPDF(doc, svg, configs.margin, configs.margin, {
      warningCallback: () => {
      },
      assumePt: true,
      useCSS: true,
      fontCallback: () => path.join(__dirname, '../public/fonts/OpenSans-Regular1.ttf'),
      imageCallback: (url) => {
        const imgPath = url.replace(global.uri, '');
        return path.join(__dirname, '..', imgPath);
      },
    });
    doc.end();

    const pdf = await promise;

    fs.rmdirSync(Directories.ICONS_DIR(tempId), { recursive: true });

    return pdf;
  }

  static async svgToPng(svg, options = {}) {
    const pdfPath = path.join(__dirname, `/../temp/${uuidv4()}.pdf`);
    try {
      const pdf = await this.svgToPdf(svg, { margin: 0 });
      fs.writeFileSync(pdfPath, pdf);
      const pdfImage = new PDFImage(pdfPath, {
        convertOptions: {
          '-flatten': '',
          '-quality': '75',
          '-density': '200',
          ...options,
        },
      });
      const imagePath = await pdfImage.convertPage(0);

      const image = fs.readFileSync(imagePath);

      fs.unlinkSync(imagePath);
      fs.unlinkSync(pdfPath);

      return image;
    } catch (e) {
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
      e.message = `${e.message} ( ${e.stderr} ) `;
      throw e;
    }
  }

  static async pdfToNode(file) {
    const { filename } = file;

    const pdfFile = path.join(__dirname, `/../temp/${filename}`);

    const node = await LinkedinPdfParser.run(pdfFile);

    return {
      type: 'person',
      name: _.get(node, 'basics.name'),
      location: _.get(node, 'basics.location'),
      address: _.get(node, 'basics.location.address'),
      website: null,
      photo: null,
      phone: null,
      summary: (_.get(node, 'summary')),
      work: (_.get(node, 'work')),
      skills: (_.get(node, 'skills')),
      education: (_.get(node, 'education')),
    };
  }

  static xlsxToGraph(buffer) {
    const workBook = xlsx.read(buffer);
    const { Nodes: nodesSheet, Links: linksSheet, Edges: linksSheetAlt } = workBook.Sheets;
    let nodes = xlsx.utils.sheet_to_json(nodesSheet, { defval: '' });
    console.log(nodes);
    nodes = nodes
      .map((d) => ({
        type: d.Type,
        name: d.Name,
        description: d.Description,
        nodeType: d['Node Type'] || d.NodeType,
        icon: d.Icon || d.Image,
        link: d.Link || d.Reference,
        keywords: (d.Keywords || '').split(', ').map((k) => k.trim()).filter((k) => k),
        location: d.Location || undefined,
        fx: d.Fx,
        fy: d.Fy,
      }))
      .filter((d) => d.name);

    let links = xlsx.utils.sheet_to_json(linksSheet);
    if (_.isEmpty(links)) {
      links = xlsx.utils.sheet_to_json(linksSheetAlt);
    }
    links = links.map((d) => ({
      type: d.Type || d.Edge,
      source: d.Source || d['From Name'],
      target: d.Target || d['To Name'],
      value: d.Value || d.Weight,
      linkType: d['Link Type'] || d.LinkType,
      direction: d.direction ? 1 : 0,
    }))
      .filter((d) => d.source && d.target);

    const warnings = [];
    links = links.filter((l, i) => {
      if (!nodes.some((n) => n.name === l.source)) {
        warnings.push({
          name: l.source,
          message: 'Source is missing',
          line: i,
          fileLine: i + 2,
        });
        return false;
      }
      if (!nodes.some((n) => n.name === l.target)) {
        warnings.push({
          name: l.target,
          message: 'Target is missing',
          line: i,
          fileLine: i + 2,
        });
        return false;
      }
      return true;
    });
    return {
      nodes,
      links,
      warnings,
    };
  }

  static graphToXlsx(nodes, links) {
    const workBook = xlsx.utils.book_new();

    const nodesArr = nodes.map((d) => Csv.nodesObjToArray(d));
    nodesArr.unshift(Csv.nodesHeader());

    const nodesWorkSheet = xlsx.utils.aoa_to_sheet(nodesArr);
    xlsx.utils.book_append_sheet(workBook, nodesWorkSheet, 'Nodes');

    const linksArr = links.map((d) => Csv.linksObjToArray(d));
    linksArr.unshift(Csv.linksHeader());

    const linksWorkSheet = xlsx.utils.aoa_to_sheet(linksArr);
    xlsx.utils.book_append_sheet(workBook, linksWorkSheet, 'Links');

    const data = xlsx.write(workBook, {
      bookType: 'xlsx',
      type: 'buffer',
    });
    return data;
  }
}

export default Converter;
