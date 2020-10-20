import _ from 'lodash';
import fs from 'fs';
import util from 'util';
import moment from 'moment';
import Pdf3Json from 'pdf3json';
import HttpError from 'http-errors';

util._logN = () => {
};

class LinkedinPdfParser {
  static MONTHS = {
    EN: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    FR: [
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ],
  };

  static SECTIONS = {
    EN: {
      contact: 'Contact',
      languages: 'Languages',
      honors_awards: 'Honors-Awards',
      certifications: 'Certifications',
      publications: 'Publications',
      patents: 'Patents',
      summary: 'Summary',
      skills: 'Top Skills',
      experience: 'Experience',
      education: 'Education',
    },
    FR: {
      contact: 'Coordonnées',
      languages: 'Languages',
      honors_awards: 'Honors-Awards',
      certifications: 'Certifications',
      publications: 'Publications',
      patents: 'Brevets',
      summary: 'sommaire',
      skills: 'Principales compétences',
      experience: 'Expérience',
      education: 'Formation',
    },
  };

  static run = async (path) => {
    const def = this.defer();

    this.pdfText(path, def.chain);

    const data = await def;

    fs.unlinkSync(path);

    return this.parse(data);
  };

  static defer = () => {
    let thisResolve;
    let thisReject;

    const _defer = new Promise((resolve, reject) => {
      thisResolve = resolve;
      thisReject = reject;
    });

    _defer.resolve = (body) => {
      thisResolve(body);
    };

    _defer.reject = (err) => {
      thisReject(err);
    };

    _defer.chain = (err, body) => {
      if (err) return _defer.reject(err);
      return _defer.resolve(body);
    };

    return _defer;
  };

  static parse = (chunks) => {
    const cleanChunks = this.cleanup(chunks);
    const { left, right } = this.leftRight(cleanChunks);

    const sections = { ...this.detectSection(left), ...this.detectSection(right) };

    const json = {};
    const email = ((sections.contact || [])[0] || {}).text;
    const name = `${sections.Root[0].fontSize}` === '29' ? sections.Root[0].text : '';
    const address = (sections.Root.find((v) => v.color === '#b0b0b0' && v.fontSize === 15) || {}).text;

    json.basics = {
      email,
      name,
      location: { address },
    };
    json.summary = (sections.summary || []).map((v) => v.text).join(' ');
    json.skills = (sections.skills || []).map((v) => ({ name: v.text }));
    json.awards = (sections.honors_awards || []).map((v) => ({ title: v.text }));
    json.certifications = (sections.certifications || []).map((v) => ({ title: v.text }));
    json.languages = (sections.languages || []).map((v) => ({ language: v.text }));
    json.publications = (sections.publications || []).map((v) => ({ name: v.text }));
    json.patents = (sections.patents || []).map((v) => ({ name: v.text }));
    json.work = this.experience(sections.experience || []);
    json.education = this.education(sections.education || []);

    return json;
  };

  static pdfText = (path, cb) => {
    const parser = new Pdf3Json();

    parser.on('pdfParser_dataReady', (result) => {
      const text = [];

      if (_.get(result, ['PDFJS', 'metadata', 'metadata', 'dc:language']) !== 'en') {
        fs.unlinkSync(path);
        cb(HttpError(422, 'not supported language'), null);
      }

      result.data.Pages.forEach((page) => {
        for (let i = 0; i < page.Texts.length; i++) {
          const chunk = {};

          chunk.y = page.Texts[i].y;
          chunk.color = page.Texts[i].oc;
          const content = page.Texts[i].R[0];
          // eslint-disable-next-line prefer-destructuring
          chunk.fontSize = content.TS[1];
          chunk.text = decodeURIComponent(content.T);

          text.push(chunk);
        }
      });

      parser.destroy();

      setImmediate(() => {
        cb(null, text);
      });
    });

    parser.on('pdfParser_dataError', (err) => {
      parser.destroy();
      cb(err);
    });

    if (path instanceof Buffer) {
      return parser.parseBuffer(path);
    }

    return parser.loadPDF(path);
  };

  static cleanup = (chunks) => {
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].text.trim() === 'Page') chunks.splice(i, 4);
    }

    return chunks;
  };

  static leftRight = (chunks) => {
    let y = 0;
    let base = 'left';
    const result = {};

    chunks.forEach((c) => {
      if (c.y < y) base = 'right';
      y = c.y;
      result[base] = result[base] || [];
      result[base] = [...result[base], c];
    });

    return result;
  };

  static isSection = (line) => {
    let section;

    // eslint-disable-next-line guard-for-in
    for (const key in this.SECTIONS.EN) {
      const _section = this.SECTIONS.EN[key];

      if (line.trim() === _section) {
        section = key;
        break;
      }
    }

    // eslint-disable-next-line guard-for-in
    for (const key in this.SECTIONS.FR) {
      const _section = this.SECTIONS.FR[key];

      if (line.trim() === _section) {
        section = key;
        break;
      }
    }

    return section;
  };

  static education = (chunks) => {
    const edu = this.sectionFromSize(chunks);

    let institutions = [];

    edu.forEach((v) => {
      if (v[0].fontSize === 15) {
        institutions.push([v]);
      } else {
        institutions[institutions.length - 1] = [...institutions[institutions.length - 1], v];
      }
    });

    institutions = institutions.map((w) => {
      let [startDate, endDate] = w[1][0].text.split('-');
      startDate = this.linkedInDateParse(String(startDate).trim().replace('· (', ''));
      endDate = this.linkedInDateParse(String(endDate).trim().replace(')', ''));

      const studyType = (startDate ? w[2] : w[1]).map((v) => v.text).join(' ');

      return {
        institution: w[0].map((v) => v.text).join(' '),
        studyType,
        startDate,
        endDate,
      };
    });
    return institutions;
  };

  static experience = (chunks) => {
    const exp = this.sectionFromSize(chunks);

    let workes = [];
    let last;
    let last15;

    exp.forEach((v) => {
      if (v[0].fontSize === 15) {
        workes.push([v]);
        last15 = v;
        last = v;
      } else if (v[0].fontSize === 14.5) {
        if (last15 === last) {
          workes[workes.length - 1] = [...workes[workes.length - 1], v];
        } else {
          workes.push([last15]);
          workes[workes.length - 1] = [...workes[workes.length - 1], v];
        }
        last = v;
      } else if (JSON.stringify(last) !== JSON.stringify(last15)) {
        workes[workes.length - 1] = [...workes[workes.length - 1], v];
        last = v;
      }
    });

    workes = workes.map((w) => {
      const [date, duration, ...summary] = w[2];
      const [startDate, endDate] = date.text.split('-');

      return {
        company: w[0].map((v) => v.text).join(' '),
        position: `${w[1][0].fontSize}` === '14.5' ? w[1].map((v) => v.text).join(' ') : null,
        startDate: startDate ? this.linkedInDateParse(startDate.trim()) : null,
        endDate: endDate ? this.linkedInDateParse(endDate.trim()) : null,
        summary: summary.map((v) => v.text).join(' '),
        location: (w[3] && w[3][0] && w[3][0].color === '#b0b0b0') ? w[3][0].text : null,
        duration: duration ? duration.text : null,
      };
    });

    return workes;
  };

  static detectSection = (chunks) => {
    const data = {};
    let section = 'Root';

    chunks.forEach((c) => {
      if (this.isSection(c.text)) {
        section = this.isSection(c.text);

        return;
      }
      if (section) {
        data[section] = data[section] || [];
        data[section] = [...data[section], c];
      }
    });

    return data;
  };

  static sectionFromSize = (chunks) => {
    const d = [...chunks];
    let last = d.shift();
    const result = [[last]];

    d.forEach((value) => {
      if (+last.fontSize === +value.fontSize && last.color === value.color) {
        result[result.length - 1] = [...result[result.length - 1], value];
      } else {
        result.push([value]);
      }

      last = value;
    });

    return result;
  };

  static linkedInDateParse = (_date = '') => {
    const date = _date.trim();
    if (!date) {
      return '';
    }

    if (date === 'Present') return moment().format('YYYY-MM-DD');

    const monthYear = date.split(' ');

    const year = monthYear.pop();
    let month = monthYear.pop();

    if (this.MONTHS.EN.indexOf(month) > -1) {
      month = this.MONTHS.EN.indexOf(month);
    } else if (this.MONTHS.FR.indexOf(month) > -1) {
      month = this.MONTHS.FR.indexOf(month);
    } else {
      month = 0;
    }

    const d = new Date();

    d.setDate(1);
    d.setMonth(month);
    d.setYear(year);

    const m = moment(d);
    if (!m.isValid()) {
      return '';
    }
    return m.format('YYYY-MM-DD');
  };
}

export default LinkedinPdfParser;
