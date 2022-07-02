var outfile = process.argv[2];

var fs = require('fs')
fs.writeFileSync(outfile, JSON.stringify(process.env), 'utf8');
