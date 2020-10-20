import _ from 'lodash';
import Priomise from 'bluebird';
import HttpErrors from 'http-errors';

const $ = (...args) => {
  let values = {};

  if (_.isObject(args[0]) && args[0].constructor.name === 'IncomingMessage') {
    values = { ...args[0].params, ...args[0].query, ...args[0].body };
  } else {
    _.forEach(args, (arg) => {
      values = { ...values, ...arg };
    });
  }

  async function getAsync(callBacks) {
    const errors = {};

    await Priomise.map(callBacks, async (cb, key) => {
      try {
        let v = values[key] || '';

        if (typeof values[key] === 'boolean') v = values[key];

        const val = await cb(v, values);

        if (_.isError(val)) {
          errors[key] = val.message;
          return;
        }

        values[key] = val;
      } catch (e) {
        console.log(e);
        errors[key] = e.message;
      }
    });

    if (!_.isEmpty(errors)) {
      const error = new HttpErrors(422, 'Validation Error');
      error.validationError = true;
      error.errors = errors;
      throw error;
    }

    return values;
  }

  function get(callBacks) {
    const errors = {};

    _.forEach(callBacks, async (cb, key) => {
      try {
        let val;

        if (values[key] === 0) {
          val = cb(0, values);
        } else if (typeof values[key] === 'boolean') {
          val = cb(values[key], values);
        } else {
          val = cb(values[key] || '', values);
        }

        if (_.isError(val)) {
          errors[key] = val.message;
          return;
        }

        values[key] = val;
      } catch (e) {
        console.log(e);
        errors[key] = e.message;
      }
    });

    if (!_.isEmpty(errors)) throw new ValidationError(errors);
    return values;
  }

  return {
    get,
    getAsync
  };
};

function ValidationError(errors) {
  const error = new HttpErrors(422, 'Validation Error');
  error.validationError = true;
  error.errors = errors;
  return error;
}

$.ValidationError = ValidationError;

export default $;
