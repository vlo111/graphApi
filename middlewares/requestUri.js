function requestUri(req, res, next) {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    req.uri = `${protocol}://${req.headers.host}`;
    global.uri = req.uri;
    next();
  } catch (e) {
    next(e);
  }
}

export default requestUri;
