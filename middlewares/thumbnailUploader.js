import multer from 'multer';

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, '/tmp');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}`);
  },
});

const thumbnailUploader = multer({ storage });

export default thumbnailUploader;
