const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/style.css'),'utf8');
test('all new forms and output containers exist in the page',()=>{
 for(const id of ['mirrorForm','mirrorExpression','mirrorEntries','clarityForm','clarityMessage','clarityEntries','assumptionForm','assumptionObservation','assumptionInterpretation','assumptionAlternatives','assumptionUnknowns','assumptionIntensity','assumptionQuestion','assumptionEntries','intensityValue','weatherForm','weatherCards','journalForm','journalFilter']){
  assert.match(html,new RegExp('id="'+id+'"'),id+' missing');
 }
});
test('all panel tabs point to existing panels',()=>{
 const tabs=[...html.matchAll(/data-tab="([^"]+)"/g)].map(x=>x[1]);
 assert.ok(tabs.includes('understanding'));
 for(const tab of tabs)assert.ok(html.includes('id="'+tab+'"'),'Missing panel '+tab);
});
test('frontend handlers cover all new forms',()=>{
 for(const name of ['mirrorForm','clarityForm','assumptionForm','mirrorEntries','clarityEntries']){
  assert.ok(js.includes("$('#"+name+"').onsubmit"),name+' submit handler missing');
 }
 assert.ok(js.includes('renderUnderstanding();'),'Understanding render not in refresh');
});
test('all dynamic user text is escaped before HTML rendering',()=>{
 assert.ok(js.includes('const escapeHTML='));
 assert.ok(js.includes('esc(x.expression)'));
 assert.ok(js.includes('esc(x.message)'));
 assert.ok(js.includes('esc(x.observation)'));
 assert.ok(js.includes('esc(x.interpretation)'));
});
test('mobile understanding layout is provided',()=>{
 assert.match(css,/understanding-grid/);
 assert.match(css,/@media\(max-width:760px\)/);
});
