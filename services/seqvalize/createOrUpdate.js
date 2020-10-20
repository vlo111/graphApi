import { Model } from 'sequelize';

Model.createOrUpdate = async function (
  options = {
    defaults: {},
    where: {},
  },
) {
  const rows = await this.findOrCreate(options);

  if (rows && rows.length) {
    const { defaults, ...opt } = options;

    opt.returning = true;

    const res = await this.update(defaults, opt);

    return res[1];
  }
  return rows;
};
