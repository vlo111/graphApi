import _ from 'lodash';

function formatSeqvalizeErrors(err) {
  if (_.isArray(err.errors) && err.errors[0].origin) {
    err.dbErrors = err.errors;
    const errors = {};
    err.errors.forEach((e) => {
      errors[e.path.replace(/^[^.]+\./, '')] = e.message.replace(/^[^.]+\./, '');
    });

    err.errors = errors;
  }

  return err;
}

export default formatSeqvalizeErrors;
