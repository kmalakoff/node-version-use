var outfile = process.argv[2];

console.log('v' + process.versions.node);

var fs = require('fs');
fs.writeFileSync(outfile, JSON.stringify(process.env), 'utf8');
