import logger from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import http from 'http';
import express from 'express';
import socketIo from 'socket.io';
import createError from 'http-errors';
import mysqlAdmin from 'node-mysql-admin';
import indexRouter from './routes/index';
import formatSeqvalizeErrors from './services/seqvalize/formatSeqvalizeErrors';
import headers from './middlewares/headers';
import authorize from './middlewares/authorize';
import requestUri from './middlewares/requestUri';
import './services/promiseObject';

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// add socket.io to res in event loop
app.use((req, res, next) => {
  res.io = io;
  next();
});

Error.stackTraceLimit = 20;

app.use(headers);

app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(mysqlAdmin(app));

app.use(requestUri);
app.use(authorize);

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  err = formatSeqvalizeErrors(err);
  res.json({
    status: 'error',
    message: err.message,
    errors: err.errors,
    dbErrors: err.dbErrors,
    stack: err.stack,
  });
});

export { app, server };
