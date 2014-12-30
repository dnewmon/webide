console.log('<pre>');

var fs = require('fs');
var files = fs.readdirSync('.');

for (var i = 0; i < files.length; i++) {
   console.log(files[i]);
}

console.log('</pre>');