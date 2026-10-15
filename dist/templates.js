'use strict';
// Each record is stored atomically under a stable ID. No image is uploaded.
const TemplateStore=(()=>{
 const clone=value=>structuredClone(value);
 function validate(record){
  if(!record||typeof record.id!=='string'||!record.id||record.id.length>100||typeof record.name!=='string'||!record.name.trim()||record.name.length>60)throw Error('템플릿 이름을 1~60자로 입력해 주세요.');
  if(typeof record.createdAt!=='string'||!Number.isFinite(Date.parse(record.createdAt))||typeof record.updatedAt!=='string'||!Number.isFinite(Date.parse(record.updatedAt)))throw Error('템플릿 생성·수정 시각이 올바르지 않습니다.');
  const s=record.scene;
  if(!s||!['1:1','4:5','9:16'].includes(s.ratio)||!['sample','blank','image'].includes(s.backgroundMode)||!Array.isArray(s.texts)||s.texts.length>20)throw Error('템플릿 형식이 올바르지 않습니다.');
  const ids=new Set();for(const t of s.texts){if(!t||typeof t.id!=='string'||!t.id||t.id.length>100||ids.has(t.id)||typeof t.caption!=='string'||t.caption.length>1500||!['sans','gulim','serif','gungsuh','mono'].includes(t.font)||!/^#[\da-f]{6}$/i.test(t.color)||!/^#[\da-f]{6}$/i.test(t.outlineColor)||typeof t.fit!=='boolean'||typeof t.outline!=='boolean'||!Number.isFinite(t.x)||t.x<0||t.x>100||!Number.isFinite(t.y)||t.y<0||t.y>100||!Number.isFinite(t.size)||t.size<16||t.size>120)throw Error('문구 설정이 올바르지 않습니다.');ids.add(t.id)}
  if(s.backgroundMode==='image'&&(!(s.imageBlob instanceof Blob)||s.imageBlob.type!=='image/png'))throw Error('저장할 배경 이미지를 읽을 수 없습니다.');if(s.backgroundMode!=='image'&&s.imageBlob!=null)throw Error('배경 설정과 이미지가 일치하지 않습니다.');return record;
 }
 function recordFor(scene,name,previous){const now=new Date().toISOString();return validate({id:previous?.id||crypto.randomUUID(),name:name.trim(),createdAt:previous?.createdAt||now,updatedAt:now,scene:clone(scene)})}
 let connection;
 function open(){if(!connection)connection=new Promise((resolve,reject)=>{const r=indexedDB.open('card-studio-templates',1);r.onupgradeneeded=()=>r.result.createObjectStore('templates',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('다른 탭을 닫고 다시 시도해 주세요.'))}).catch(e=>{connection=null;throw e});return connection}
 async function transact(mode,action){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('templates',mode);let result;const r=action(tx.objectStore('templates'));r.onsuccess=()=>{result=r.result};tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error||Error('저장 작업이 취소됐습니다.'));tx.onerror=()=>{};})}
 async function putMany(records){
  records.forEach(validate);const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('templates','readwrite');tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('복원을 저장하지 못했습니다.'));tx.onerror=()=>{};try{const target=tx.objectStore('templates');for(const r of records)target.add(r)}catch(error){tx.abort();reject(error)}});
 }
 return {validate,recordFor,putMany,all:()=>transact('readonly',s=>s.getAll()),put:r=>transact('readwrite',s=>s.put(validate(r))),remove:id=>transact('readwrite',s=>s.delete(id))};
})();
if(typeof module!=='undefined')module.exports=TemplateStore;
