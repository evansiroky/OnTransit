var fs = require('fs');

try {
  fs.mkdirSync('dist');
} catch(e) {
  if ( e.code != 'EEXIST' ) throw e;
}