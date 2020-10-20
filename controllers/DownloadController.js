import moment from 'moment';
import _ from 'lodash';
import axios from 'axios';
import Zip from 'node-zip';
import HttpError from 'http-errors';
import validate from '../services/validate';
import Csv from '../services/Csv';
import Converter from '../services/Converter';

class DownloadController {
  // deprecated
  static nodesToCsv = async (req, res, next) => {
    try {
      const now = moment()
        .format('YY-MM-DDThh-mm-ss');
      await validate(req.body, {
        nodes: 'required|array',
        'nodes.*.fx': 'required|numeric',
        'nodes.*.fy': 'required|numeric',
        'nodes.*.name': 'required',
        'nodes.*.type': 'required',
      });
      const { nodes } = req.body;

      const nodesArr = nodes.map((d) => Csv.nodesObjToArray(d));
      nodesArr.unshift(Csv.nodesHeader());

      const csv = Csv.stringify(nodesArr);
      if (req.return) {
        return csv;
      }

      res.setHeader('Access-Control-Expose-Headers', 'content-disposition');
      res.setHeader('Content-Disposition', `attachment; filename=nodes-${now}.csv`);
      res.setHeader('Content-type', 'text/csv');
      res.send(csv);
    } catch (e) {
      next(e);
    }
  };

  // deprecated
  static linksToCsv = async (req, res, next) => {
    try {
      const now = moment()
        .format('YY-MM-DDThh-mm-ss');
      await validate(req.body, {
        links: 'required|array',
        'links.*.source': 'required',
        'links.*.target': 'required',
        'links.*.value': 'required|numeric',
      });
      const { links } = req.body;
      const linksArr = links.map((d) => Csv.linksObjToArray(d));
      linksArr.unshift(Csv.linksHeader());
      const csv = Csv.stringify(linksArr);
      if (req.return) {
        return csv;
      }
      res.setHeader('Access-Control-Expose-Headers', 'content-disposition');
      res.setHeader('Content-Disposition', `attachment; filename=links-${now}.csv`);
      res.setHeader('Content-type', 'text/csv');
      res.send(csv);
    } catch (e) {
      next(e);
    }
  };

  // deprecated
  static graphToZip = async (req, res, next) => {
    try {
      req.return = true;
      const now = moment()
        .format('YY-MM-DDThh-mm-ss');
      const nodes = await this.nodesToCsv(req, res, next);
      const links = await this.linksToCsv(req, res, next)
        .catch(() => '');

      const zip = new Zip();
      zip.file('nodes.csv', nodes);
      if (links) {
        zip.file('links.csv', links);
      }
      const data = zip.generate({
        base64: false,
        compression: 'DEFLATE',
      });

      res.setHeader('Access-Control-Expose-Headers', 'content-disposition');
      res.setHeader('Content-Disposition', `attachment; filename=graph-${now}.zip`);
      res.setHeader('Content-type', 'application/zip');
      res.send(Buffer.from(data, 'binary'));
    } catch (e) {
      next(e);
    }
  };

  // deprecated
  static csvToGraph = async (req, res, next) => {
    try {
      const { files } = req;
      if (_.isEmpty(files)) {
        throw HttpError(422);
      }
      const data = [];
      files.forEach((file) => {
        data.push(Csv.parse(file.buffer.toString()));
      });
      let nodes;
      let links;
      if ('name' in data[0][0]) {
        [nodes, links] = data;
      } else {
        [links, nodes] = data;
      }

      res.json({
        status: 'ok',
        nodes,
        links,
      });
    } catch (e) {
      next(e);
    }
  };

  // deprecated
  static zipToGraph = async (req, res, next) => {
    try {
      const { file } = req;
      if (!file) {
        throw HttpError(422);
      }
      const zip = new Zip(file.buffer, { base64: false });

      let nodesCsv = zip.files['nodes.csv'];
      nodesCsv = new TextDecoder('utf-8').decode(nodesCsv._data.getContent());
      const nodes = Csv.parse(nodesCsv);

      let linksCsv = zip.files['links.csv'];
      let links = [];
      if (linksCsv) {
        linksCsv = new TextDecoder('utf-8').decode(linksCsv._data.getContent());
        links = Csv.parse(linksCsv);
      }

      res.json({
        status: 'ok',
        nodes,
        links,
      });
    } catch (e) {
      next(e);
    }
  };

  static graphToXlsx = async (req, res, next) => {
    try {
      const now = moment()
        .format('YY-MM-DDThh-mm-ss');
      await validate(req.body, {
        nodes: 'required|array',
        'nodes.*.fx': 'required|numeric',
        'nodes.*.fy': 'required|numeric',
        'nodes.*.name': 'required',
        'nodes.*.type': 'required',
        links: 'array',
        'links.*.source': 'required',
        'links.*.target': 'required',
        'links.*.value': 'required|numeric',
      });
      const { nodes, links } = req.body;

      const data = Converter.graphToXlsx(nodes, links);

      res.setHeader('Access-Control-Expose-Headers', 'content-disposition');
      res.setHeader('Content-Disposition', `attachment; filename=graph-${now}.xlsx`);
      res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(data);
    } catch (e) {
      next(e);
    }
  };

  static xlsxToGraph = async (req, res, next) => {
    try {
      const { file } = req;
      if (!file) {
        throw HttpError(422);
      }
      const {
        nodes,
        links,
        warnings,
      } = Converter.xlsxToGraph(req.file.buffer);

      res.json({
        status: 'ok',
        nodes,
        links,
        warnings,
      });
    } catch (e) {
      next(e);
    }
  };

  static svgToPing = async (req, res, next) => {
    try {
      const { svg } = req.body;
      if (!svg) {
        throw HttpError(422);
      }
      const now = moment().format('YY-MM-DDThh-mm-ss');
      const png = await Converter.svgToPng(svg);

      res.setHeader('Access-Control-Expose-Headers', 'content-disposition');
      res.setHeader('Content-Disposition', `attachment; filename=graph-${now}.png`);
      res.setHeader('Content-type', 'image/png');
      res.send(png);
    } catch (e) {
      console.log(e);
      next(e);
    }
  };

  static svgToPdf = async (req, res, next) => {
    try {
      const { svg } = req.body;
      if (!svg) {
        throw HttpError(422);
      }
      const now = moment().format('YY-MM-DDThh-mm-ss');
      const pdf = await Converter.svgToPdf(svg);

      res.setHeader('Access-Control-Expose-Headers', 'content-disposition');
      res.setHeader('Content-Disposition', `attachment; filename=graph-${now}.pdf`);
      res.setHeader('Content-type', 'application/pdf');
      res.send(pdf);
    } catch (e) {
      next(e);
    }
  };

  static pdfToNode = async (req, res, next) => {
    try {
      const { file } = req;
      if (!file) throw HttpError(422);

      const node = await Converter.pdfToNode(file);

      res.json({
        status: 'ok',
        node,
      });
    } catch (e) {
      console.log(e)
      next(e);
    }
  };

  static googleSheetsToGraph = async (req, res, next) => {
    try {
      await validate(req.body, {
        url: 'required|url',
      });
      const { url } = req.body;
      const [, key] = /spreadsheets\/d\/([^/]+)/.exec(url) || [];
      if (!key) {
        throw HttpError(422, { errors: { url: 'Invalid url' } });
      }

      const downloadUrl = `https://docs.google.com/feeds/download/spreadsheets/Export?key=${key}&exportFormat=xlsx`;
      const { data: buffer } = await axios(downloadUrl, {
        responseType: 'arraybuffer',
      }).catch((e) => e);

      if (!buffer) {
        throw HttpError(422, { errors: { url: 'something went wrong' } });
      }

      const {
        nodes,
        links,
        warnings,
      } = Converter.xlsxToGraph(buffer);

      res.json({
        status: 'ok',
        nodes,
        links,
        warnings,
      });
    } catch (e) {
      next(e);
    }
  };
}

export default DownloadController;
