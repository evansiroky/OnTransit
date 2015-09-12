var fs = require('js');

try {
  fs.mkdirSync('dist');
} catch(e) {
  if ( e.code != 'EEXIST' ) throw e;
}