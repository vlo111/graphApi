import path from 'path';

class Directories {
  static dirToUri(dir) {
    return dir.replace(path.join(__dirname, '..'), global.uri);
  }

  static ICONS_DIR(...params) {
    return path.join(__dirname, '../public/uploads/icons', ...params);
  }

  static THUMBNAILS_DIR(...params) {
    return path.join(__dirname, '../public/uploads/thumbnails', ...params);
  }

  static FILES_DIR(...params) {
    return path.join(__dirname, '../public/uploads/files', ...params);
  }
}

export default Directories;
