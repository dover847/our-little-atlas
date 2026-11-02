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

test('wheel chooses a server-confirmed segment and renders activity slices',()=>{
 assert.ok(js.includes("const outcome=await api('spin'"),'Wheel must use server result');
 assert.ok(js.includes('ids.indexOf(outcome.selected)'),'Wheel must locate selected slice');
 assert.ok(js.includes("disc.style.background='conic-gradient"),'Wheel must draw slices');
 assert.ok(js.includes('paintWheel(wheelChoices())'),'Wheel must repaint on category change');
 assert.ok(css.includes('container-type:inline-size'),'Mobile labels must scale with frame');
});

test('weather emoji picker has input, controls, and safe output',()=>{
 assert.match(html,/id="weatherEmojiPalette"/);
 assert.match(html,/id="weatherEmoji"/);
 assert.ok(js.includes("emoji:$('#weatherEmoji').value.trim()"));
 assert.ok(js.includes('escapeHTML(w.emoji)'));
 assert.ok(css.includes('.weather-emoji-palette'));
});

test('Chinese emotional expressions are searchable and labeled',()=>{
 assert.match(html,/id="weatherEmojiSearch"/);
 assert.ok(js.includes('chineseWeatherExpressions'));
 assert.ok(js.includes('捂脸'));
 assert.ok(js.includes('偷笑'));
 assert.ok(js.includes('renderWeatherEmojiPalette()'));
 assert.ok(css.includes('.emoji-group-heading'));
});

test('emoji selection has an accessible preview and clear control',()=>{
 for(const id of ['weatherEmojiPreview','weatherEmojiPreviewIcon','weatherEmojiPreviewLabel','weatherEmojiClear'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(js.includes("$('#weatherEmojiClear').addEventListener('click'"));
 assert.ok(js.includes("$('#weatherEmojiPreviewLabel').textContent"));
 assert.ok(css.includes('.weather-emoji-preview'));
});

test('shared weather cards show safe bilingual meanings and timestamps',()=>{
 assert.ok(js.includes('weather-expression'));
 assert.ok(js.includes('weather-time'));
 assert.ok(js.includes('escapeHTML(expression[1])'));
 assert.ok(js.includes('escapeHTML(sharedAt)'));
 assert.ok(css.includes('--personal-weather'));
});

test('emoji favorites are browser-local and weather presets preserve notes',()=>{
 for(const id of ['weatherFavoriteToggle','weatherFavoritesOnly','weatherPresets'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(js.includes("localStorage.setItem(weatherFavoriteKey"));
 assert.ok(js.includes('weatherFavoritesOnly||weatherFavorites.includes(x.emoji)'));
 assert.ok(js.includes('A preset never overwrites a personal note'));
 assert.ok(css.includes('.weather-presets'));
});

test('future capsules have a sealed display and background theme controls',()=>{
 for(const id of ['capsuleForm','capsuleMode','capsuleTitle','capsuleMessage','capsuleDate','capsuleEntries','atlasTheme'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(js.includes("api('capsule'"));
 assert.ok(js.includes('renderCapsules()'));
 assert.ok(js.includes("localStorage.setItem('atlas-theme-v1'"));
 assert.ok(css.includes('.capsule-grid'));
});

test('capsule test photo picker compresses images before submission',()=>{
 assert.ok(html.includes('id="capsulePhoto"'));
 assert.ok(html.includes('id="capsulePhotoPreview"'));
 assert.ok(js.includes('createImageBitmap(file)'));
 assert.ok(js.includes('photo:capsulePhotoData'));
 assert.ok(css.includes('.capsule-photo'));
});

test('sealed capsules show countdowns without revealing contents',()=>{
 assert.ok(js.includes('days remaining'));
 assert.ok(js.includes('x.sealed'));
 assert.ok(css.includes('.capsule-countdown'));
});

test('memory gallery includes only opened capsule photos and journal memories',()=>{
 assert.ok(html.includes('id="memoryGallery"'));
 assert.ok(html.includes('id="memoryFilter"'));
 assert.ok(js.includes("filter(x=>!x.sealed&&x.photo"));
 assert.ok(js.includes("filter(x=>x.type==='Memory')"));
 assert.ok(js.includes('renderMemoryGallery()'));
 assert.ok(css.includes('.memory-gallery'));
});

test('custom background photos stay browser-local and can be removed',()=>{
 assert.ok(html.includes('id="atlasBackgroundPhoto"'));
 assert.ok(html.includes('id="atlasBackgroundClear"'));
 assert.ok(js.includes("const backgroundPhotoKey='atlas-background-photo-v1'"));
 assert.ok(js.includes('localStorage.setItem(backgroundPhotoKey,photo)'));
 assert.ok(js.includes('localStorage.removeItem(backgroundPhotoKey)'));
 assert.ok(js.includes('applyBackgroundPhoto(photo)'));
});
