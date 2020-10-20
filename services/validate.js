import { Validator } from 'node-input-validator';
import { strNotations } from 'node-input-validator/lib/util/obj';
import httpErrors from 'http-errors';
import _ from 'lodash';

class ValidatorModified extends Validator {
  async applyOnDeep(attrs) {
    const notations = strNotations(this.inputs, {
      repetition: 10000,
    });

    const validations = [];

    Object.keys(notations).forEach((notation) => {
      attrs.forEach((attr) => {
        const pttren = attr.replace(/\*/g, '[0-9]+');

        const results = notation.match(RegExp(`^${pttren}$`));
        if (results) {
          this.validationRules[notation] = Object.create(this.validationRules[attr]);
          this.validationRules[notation].value = notations[notation];
          this.validationRules[notation].name = notation;

          validations.push(this.apply(notation));
        }
      });
    });

    await Promise.all(validations);
  }
}

async function validate(inputs, rules, customError, messages) {
  let v = new ValidatorModified(inputs, rules, messages);
  if (!await v.check()) {
    const errors = {};
    _.forEach(v.errors, (e, k) => {
      errors[k] = e.message || e;
    });
    v.errors = errors;
    if (customError) {
      v = customError(v);
    }
    if (v) {
      throw httpErrors(422, v);
    }
  }
}

export default validate;
