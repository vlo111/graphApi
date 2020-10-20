class Csv {
  static parse(strData) {
    const strDelimiter = ',';
    // Create a regular expression to parse the CSV values.
    const objPattern = new RegExp(
      `(\\${strDelimiter}|\\r?\\n|\\r|^)(?:"([^"]*(?:""[^"]*)*)"|([^"\\\\${strDelimiter}\\\\r\\\\n]*))`,
      'gi',
    );

    const arrData = [[]];

    let arrMatches = null;

    // eslint-disable-next-line no-cond-assign
    while (arrMatches = objPattern.exec(strData)) {
      const strMatchedDelimiter = arrMatches[1];
      if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
        arrData.push([]);
      }

      let strMatchedValue;

      if (arrMatches[2]) {
        strMatchedValue = arrMatches[2].replace(
          new RegExp('""', 'g'),
          '"',
        );
      } else {
        // eslint-disable-next-line prefer-destructuring
        strMatchedValue = arrMatches[3];
      }

      arrData[arrData.length - 1].push(strMatchedValue);
    }
    const header = arrData.shift();
    const data = [];
    arrData.forEach((row) => {
      data.push({});
      row.forEach((val, i) => {
        const key = header[i].toLowerCase();
        data[data.length - 1][key] = val;
      });
    });
    return data;
  }

  static stringify(arr) {
    return arr.map((v) => v.map((d) => (
      `"${d.toString().replace(/"/g, '\\"')}"`
    )).join(',')).join('\n');
  }

  static nodesObjToArray(d) {
    return [
      d.type, d.name, d.description, d.nodeType, d.icon, d.link, d.keywords.join(', '), d.location, d.fx, d.fy,
    ];
  }

  static linksObjToArray(d) {
    return [
      d.type, d.source, d.target, d.value, d.linkType, (d.direction ? 1 : 0),
    ];
  }

  static nodesHeader() {
    return ['Type', 'Name', 'Description', 'Node Type', 'Icon', 'Link', 'Keywords', 'Location', 'Fx', 'Fy'];
  }

  static linksHeader() {
    return ['Type', 'Source', 'Target', 'Value', 'Link Type', 'Direction'];
  }
}

export default Csv;
