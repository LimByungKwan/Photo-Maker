'use strict';
const CardBackup=(()=>{
 const LIMIT=30*1024*1024;
 const textKeys=['id','caption','x','y','size','color','font','fit','outline','outlineColor'];
 const pickText=t=>Object.fromEntries(textKeys.map(k=>[k,t?.[k]]));
 function parse(raw){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>LIMIT)throw Error('JSON은 30MB 이하만 가져올 수 있습니다.');
  let input;try{input=JSON.parse(raw)}catch{throw Error('JSON 문법이 손상되었습니다. 괄호·쉼표·따옴표를 확인해 주세요.')}
  if(!input||input.app!=='card-studio'||input.version!==1||!Array.isArray(input.templates)||input.templates.length<1||input.templates.length>50)throw Error('필수 항목 app·version·templates 또는 템플릿 개수(1~50개)를 확인해 주세요.');
  const ids=new Set();
  // Whitelist fields; imported strings are never interpreted as HTML or code.
  return input.templates.map((r,i)=>{try{
   if(!r||typeof r.id!=='string'||ids.has(r.id))throw Error('템플릿 ID가 없거나 중복되었습니다.');ids.add(r.id);
   const s=r.scene;if(!s||!Array.isArray(s.texts)||!Object.hasOwn(s,'imageData'))throw Error('필수 항목 scene·texts·imageData가 없습니다.');
   let blob=null;
   if(s.backgroundMode==='image'){
    if(typeof s.imageData!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(s.imageData))throw Error('배경 이미지는 내장된 PNG만 지원합니다.');
    let binary;try{binary=atob(s.imageData.split(',')[1])}catch{throw Error('이미지 인코딩이 올바르지 않습니다.')}
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));if(![137,80,78,71,13,10,26,10].every((n,j)=>bytes[j]===n))throw Error('PNG 내용이 올바르지 않습니다.');if(bytes.length<24||String.fromCharCode(...bytes.slice(12,16))!=='IHDR')throw Error('PNG 헤더가 손상되었습니다.');const view=new DataView(bytes.buffer),w=view.getUint32(16),h=view.getUint32(20);if(!w||!h||w*h>20000000)throw Error('PNG 크기는 2,000만 픽셀 이하여야 합니다.');blob=new Blob([bytes],{type:'image/png'});
   }else if(s.imageData!==null)throw Error('배경 설정과 이미지가 일치하지 않습니다.');
   const record={id:r.id,name:r.name,createdAt:r.createdAt,updatedAt:r.updatedAt,scene:{ratio:s.ratio,backgroundMode:s.backgroundMode,texts:s.texts.map(pickText),imageBlob:blob,imageDetails:null}};
   TemplateStore.validate(record);return record;
  }catch(e){throw Error(`${i+1}번째 템플릿: ${e.message}`)}});
 }
 async function encode(records){
  if(!records.length||records.length>50)throw Error('백업할 템플릿은 1~50개여야 합니다.');const result=[];
  for(const r of records){TemplateStore.validate(r);let imageData=null;if(r.scene.imageBlob){const bytes=new Uint8Array(await r.scene.imageBlob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));imageData='data:image/png;base64,'+btoa(binary)}
   result.push({id:r.id,name:r.name,createdAt:r.createdAt,updatedAt:r.updatedAt,scene:{ratio:r.scene.ratio,backgroundMode:r.scene.backgroundMode,texts:r.scene.texts.map(pickText),imageData}});
  }
  const raw=JSON.stringify({app:'card-studio',version:1,templates:result},null,2);if(new TextEncoder().encode(raw).length>LIMIT)throw Error('백업이 30MB를 넘습니다. 템플릿 수를 줄여 주세요.');return raw;
 }
 // Decode every image before any database transaction. Regenerate IDs to preserve existing records.
 async function prepare(raw,cleanImage){const records=parse(raw);for(const r of records){if(r.scene.imageBlob){const cleaned=await cleanImage(r.scene.imageBlob);r.scene.imageBlob=cleaned.blob;r.scene.imageDetails={name:'JSON에서 복원한 배경.png',type:'image/png',size:cleaned.blob.size,width:cleaned.width,height:cleaned.height}}r.id=crypto.randomUUID();r.scene.texts=r.scene.texts.map(t=>({...t,id:crypto.randomUUID()}));TemplateStore.validate(r)}return records}
 return {parse,encode,prepare};
})();
if(typeof module!=='undefined')module.exports=CardBackup;
