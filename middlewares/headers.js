function header(req, res, next) {
  try {
    const { origin = '*' } = req.headers;
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type');

    next();
  } catch (e) {
    next(e);
  }
}

export default header;
