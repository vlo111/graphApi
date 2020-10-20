import _ from 'lodash';
import Promise from 'bluebird';

Promise.object = async (arr, key, chunk) => {
  if (chunk) {
    let arrChunk = _.chunk(arr, chunk);
    arrChunk = await Promise.map(arrChunk, async (a, b) => {
      const res = await Promise.all(a.map((n) => n[key]));
      return a.map((n, i) => {
        n[key] = res[i];
        return n;
      });
    });
    return arrChunk.flat(1);
  }
  const res = await Promise.all(arr.map((n) => n[key]));
  return arr.map((n, i) => {
    n[key] = res[i];
    return n;
  });
};
