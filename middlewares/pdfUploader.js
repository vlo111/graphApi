import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'temp');
  },
  filename(req, file, cb) {
    cb(null, `${uuidv4()}.pdf`);
  },
});

export default multer({ storage });
