const assert=require('node:assert/strict'),fs=require('node:fs');
global.TemplateStore=require('../dist/templates.js');
const Backup=require('../dist/backup.js');
const valid=fs.readFileSync('dist/fixtures/valid.json','utf8');
(async()=>{
 const existing=TemplateStore.recordFor(Backup.parse(valid)[0].scene,'기존 작업');const before=structuredClone(existing);
 for(const fixture of ['broken','missing'])assert.throws(()=>Backup.parse(fs.readFileSync(`dist/fixtures/${fixture}.json`,'utf8')));
 const document=JSON.parse(valid);delete document.templates[0].scene.texts[0].outlineColor;assert.throws(()=>Backup.parse(JSON.stringify(document)));
 const two=JSON.parse(valid);two.templates.push({...two.templates[0],id:'second',scene:{...two.templates[0].scene,ratio:'wrong'}});assert.throws(()=>Backup.parse(JSON.stringify(two)));
 const parsed=Backup.parse(valid),raw=await Backup.encode(parsed),restored=await Backup.prepare(raw,()=>assert.fail('No image decoding for sample background'));
 assert.equal(restored[0].name,'JSON 복원 검사');assert.deepEqual(restored[0].scene.texts[0].caption,parsed[0].scene.texts[0].caption);assert.notEqual(restored[0].id,parsed[0].id);assert.notEqual(restored[0].scene.texts[0].id,parsed[0].scene.texts[0].id);assert.deepEqual(existing,before);
 const pngHeader=new Uint8Array(24);pngHeader.set([137,80,78,71,13,10,26,10]);pngHeader.set([73,72,68,82],12);const headerView=new DataView(pngHeader.buffer);headerView.setUint32(16,1);headerView.setUint32(20,1);const r=structuredClone(parsed[0]);r.scene.backgroundMode='image';r.scene.imageBlob=new Blob([pngHeader],{type:'image/png'});
 const imageJSON=await Backup.encode([r]);let decodes=0;await assert.rejects(Backup.prepare(imageJSON,async()=>{decodes++;throw Error('damaged image')}),/damaged image/);assert.equal(decodes,1);
 assert.deepEqual(existing,before);
 assert.throws(()=>Backup.parse(JSON.stringify({app:'card-studio',version:2,templates:[]})));
 console.log('PASS: normal backup/restore, fresh IDs, malformed/missing/later invalid record rejection, failed image decode rejects preparation, existing state unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
