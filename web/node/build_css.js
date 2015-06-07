var concat = require('concat'),
  fs = require('fs-extra'),
  pjson = require('../package.json'),
  files = pjson.css_build.in_files,
  dest = pjson.css_build.out_file,
  opCallback = function(success_message) {
	return function(error) {
      if(error) {
		console.error(error);
		process.exit(2);
		return;
	  }
      console.log(success_message);
	}
  }

concat(files, dest, opCallback('files concatenated'));

fs.copy('node_modules/jquery-mobile/dist/images', 
		'dist/images', 
		opCallback('jqm images moved'));
