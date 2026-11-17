const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
test('does not silently overwrite malformed persisted data',()=>{
 assert.match(server,/Invalid Atlas data format/);
 assert.match(server,/refusing to start to protect existing memories/);
 assert.match(server,/err\.code!=='ENOENT'/);
});
test('keeps a previous snapshot before replacing the data file',()=>{
 assert.match(server,/fs\.copyFileSync\(DATA,DATA\+'\.previous'\)/);
 assert.match(server,/fs\.renameSync\(temp,DATA\)/);
});
