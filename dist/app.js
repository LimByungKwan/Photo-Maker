'use strict';
const $=id=>document.getElementById(id), canvas=$('canvas'),ctx=canvas.getContext('2d');
let image=null,ratio='1:1',request=0,backgroundMode='sample',imageDetails=null;
let texts=[{id:crypto.randomUUID(),caption:'작은 시작도\n멋진 시작이야.',x:50,y:69,size:58,color:'#ffffff',fit:true,outline:true,outlineColor:'#153529',font:'sans'}],selectedId=texts[0].id;
let exportGeneration=0,exportBlobs={},downloadUrl=null,selectedExport=null;
const fontFamilies={sans:'"Malgun Gothic", "Apple SD Gothic Neo", sans-serif',gulim:'Gulim, "Apple SD Gothic Neo", sans-serif',serif:'Batang, "AppleMyungjo", serif',gungsuh:'Gungsuh, "궁서", "AppleMyungjo", serif',mono:'Dotum, "Apple SD Gothic Neo", sans-serif'};
const controls=['caption','x','y','size','color','outline','font','outlineColor','fit'];
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error)}
function imageStatus(message,error=false){$('imageStatus').hidden=false;$('imageStatus').textContent=message;$('imageStatus').classList.toggle('error',error)}
function background(){const w=canvas.width,h=canvas.height;const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#123d3a');g.addColorStop(.6,'#306951');g.addColorStop(1,'#65906a');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.fillStyle='#d7f29c';ctx.beginPath();ctx.arc(w*.72,h*.25,w*.12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#204c40';ctx.beginPath();ctx.moveTo(0,h*.59);ctx.bezierCurveTo(w*.27,h*.25,w*.43,h*.73,w,h*.45);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();ctx.fillStyle='#32634e';ctx.beginPath();ctx.moveTo(0,h*.75);ctx.bezierCurveTo(w*.34,h*.47,w*.55,h*.86,w,h*.68);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();}
function wrap(text,width){const lines=[];for(const paragraph of text.split('\n')){let line='';const chars=typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(paragraph),v=>v.segment):Array.from(paragraph);for(const c of chars){if(line&&ctx.measureText(line+c).width>width){lines.push(line);line=c}else line+=c;}lines.push(line)}return lines}
function layoutText(t,w,h){
 const padding=54,availableWidth=w-padding*2,availableHeight=h-padding*2;
 function at(size){ctx.font=`700 ${size}px ${fontFamilies[t.font]||fontFamilies.sans}`;const lines=wrap(t.caption,availableWidth),lineHeight=size*1.4;return {size,lines,lineHeight,height:lines.length*lineHeight,width:Math.max(0,...lines.map(line=>ctx.measureText(line).width))+(t.outline?Math.max(2,size*.07):0)}}
 let layout=at(t.size);
 if(t.fit){if(layout.height>availableHeight||layout.width>availableWidth){let low=.01,high=t.size;for(let i=0;i<20;i++){const mid=(low+high)/2,test=at(mid);if(test.height<=availableHeight&&test.width<=availableWidth)low=mid;else high=mid}layout=at(low)}
 layout.x=Math.max(padding+layout.width/2,Math.min(w-padding-layout.width/2,w*t.x/100));layout.y=Math.max(padding+layout.height/2,Math.min(h-padding-layout.height/2,h*t.y/100));
 }else{layout.x=w*t.x/100;layout.y=h*t.y/100}
 ctx.font=`700 ${layout.size}px ${fontFamilies[t.font]||fontFamilies.sans}`;return layout;
}
function active(){return texts.find(t=>t.id===selectedId)}
function listTexts(){const list=$('textList');list.replaceChildren();texts.forEach((t,i)=>{const b=document.createElement('button');b.type='button';b.textContent=`${i+1}. ${t.caption.slice(0,16)||'(빈 문구)'}`;b.setAttribute('aria-pressed',String(t.id===selectedId));b.onclick=()=>{selectedId=t.id;syncControls();listTexts();draw()};list.append(b)});$('deleteText').disabled=!texts.length;controls.forEach(id=>$(id).disabled=!texts.length)}
function syncControls(){const t=active();controls.forEach(id=>{if(id==='outline'||id==='fit')$(id).checked=t?.[id]??false;else $(id).value=t?.[id]??(id==='caption'?'':'50')});updateOutputs()}
function updateOutputs(){$('xo').value=$('x').value+'%';$('yo').value=$('y').value+'%';$('so').value=$('size').value+'px'}
function prepareExports(){
 const generation=++exportGeneration;exportBlobs={};
 for(const type of ['image/png','image/jpeg']){
  const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;
  const cx=c.getContext('2d');
  if(type==='image/jpeg'){cx.fillStyle='#ffffff';cx.fillRect(0,0,c.width,c.height)}
  cx.drawImage(canvas,0,0);
  c.toBlob(blob=>{if(generation===exportGeneration&&blob)exportBlobs[type]=blob},type,.95);
 }
}
function draw(){const h={'1:1':1080,'4:5':1350,'9:16':1920}[ratio];canvas.height=h;ctx.clearRect(0,0,1080,h);if(image){const scale=Math.max(1080/image.width,h/image.height);ctx.drawImage(image,(1080-image.width*scale)/2,(h-image.height*scale)/2,image.width*scale,image.height*scale)}else if(backgroundMode==='sample')background();else{ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1080,h)}
for(const t of texts){const layout=layoutText(t,1080,h),{size,lines,lineHeight,x,y}=layout;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=t.color;ctx.strokeStyle=t.outlineColor||'#153529';ctx.lineWidth=Math.max(2,size*.07);ctx.lineJoin='round';lines.forEach((line,i)=>{const yy=y+(i-(lines.length-1)/2)*lineHeight;if(t.outline)ctx.strokeText(line,x,yy);ctx.fillText(line,x,yy)});if(t.id===selectedId)$('fitInfo').textContent=t.fit?`설정 ${t.size}px → 실제 ${Number(size.toFixed(1))}px · 넘치면 크기와 위치를 조정합니다.`:'자동 맞춤 꺼짐 · 가장자리 문구가 잘릴 수 있습니다.';}updateOutputs();$('dimensions').textContent=`1080 × ${h} px`;prepareExports();$('downloadResult').hidden=true;}
controls.forEach(id=>$(id).addEventListener('input',()=>{const t=active();if(!t)return;t[id]=(id==='outline'||id==='fit')?$(id).checked:['x','y','size'].includes(id)?Number($(id).value):$(id).value;draw();if(id==='caption')listTexts()}));
$('addText').onclick=()=>{if(texts.length>=20){status('문구는 최대 20개까지 추가할 수 있습니다.',true);return}const t={id:crypto.randomUUID(),caption:'새 문구',x:50,y:Math.min(85,25+texts.length*12),size:58,color:'#ffffff',fit:true,outline:true,outlineColor:'#153529',font:'sans'};texts.push(t);selectedId=t.id;syncControls();listTexts();draw();status('새 문구를 추가했습니다. 문구 목록에서 편집할 문구를 선택하세요.')};
$('deleteText').onclick=()=>{texts=texts.filter(t=>t.id!==selectedId);selectedId=texts[0]?.id??null;syncControls();listTexts();draw();status('선택한 문구를 삭제했습니다. 다른 문구는 유지됩니다.')};
function clearImage(mode){request++;image=null;imageDetails=null;backgroundMode=mode;$('imageInfo').textContent=mode==='sample'?'기본 합성 그림 사용 중':'불러온 이미지 없음 · 흰색 배경';$('removeImage').disabled=true;draw();imageStatus('이미지를 변경했습니다. 모든 문구 설정은 유지됩니다.')}
$('removeImage').onclick=()=>clearImage('blank');
document.querySelectorAll('[data-ratio]').forEach(button=>button.addEventListener('click',()=>{ratio=button.dataset.ratio;document.querySelectorAll('[data-ratio]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));draw()}));
$('sample').onclick=()=>clearImage('sample');
$('imageInput').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;const current=++request;try{if(!/\.(png|jpe?g)$/i.test(file.name)||!['image/png','image/jpeg'].includes(file.type))throw new Error('PNG·JPEG 파일만 지원합니다. 기존 작업은 유지됩니다.');if(file.size>10*1024*1024)throw new Error('10MB 이하의 이미지를 선택해 주세요. 기존 작업은 유지됩니다.');const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v),jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;if(!(file.type==='image/png'?png:jpeg))throw new Error('파일 내용이 PNG·JPEG 형식과 일치하지 않습니다. 기존 작업은 유지됩니다.');const url=URL.createObjectURL(file);let next;try{next=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('손상되었거나 읽을 수 없는 이미지입니다. 기존 작업은 유지됩니다.'));im.src=url})}finally{URL.revokeObjectURL(url)}if(next.width*next.height>20000000)throw new Error('이미지가 너무 큽니다. 2,000만 픽셀 이하를 사용해 주세요. 기존 작업은 유지됩니다.');if(current!==request)return;image=next;imageDetails={name:file.name,type:file.type,size:file.size,width:next.width,height:next.height};backgroundMode='image';$('removeImage').disabled=false;const info=$('imageInfo'),dl=document.createElement('dl');for(const [label,value] of [['파일명',file.name],['형식',file.type==='image/png'?'PNG':'JPEG'],['용량',(file.size/1024).toFixed(1)+' KB'],['해상도',`${next.width} × ${next.height}px`]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd)}info.replaceChildren(dl);draw();imageStatus(`${file.name} 불러오기 완료 · ${next.width} × ${next.height}px`)}catch(error){if(current===request)imageStatus(error.message,true)}});
function download(type){try{const blob=exportBlobs[type];if(!blob){status('이미지를 준비 중입니다. 잠시 후 내려받기를 다시 눌러 주세요.',true);return}if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=URL.createObjectURL(blob);const filename=`card-${ratio.replace(':','x')}.${type==='image/png'?'png':'jpg'}`,a=$('saveLink');selectedExport={blob,filename,type};const reader=new FileReader();reader.onload=()=>{if(selectedExport?.blob===blob)$('exportImage').src=reader.result};reader.readAsDataURL(blob);a.href=downloadUrl;a.download=filename;a.textContent=filename+' 저장';$('openLink').href=downloadUrl;$('downloadMessage').textContent='파일 준비 완료 · '+(type==='image/png'?'PNG':'JPEG');$('downloadResult').hidden=false;$('saveHelp').textContent='저장 방식을 선택하세요. GPT 내부에서 저장이 되지 않으면 공개 주소를 외부 브라우저에서 열어 저장해 주세요.';status('파일 형식을 선택했습니다. 바로 저장 또는 다른 이름으로 저장을 눌러 주세요.');}catch{status('이미지 저장에 실패했습니다. 기존 작업은 유지됩니다.',true)}}
$('saveDirect').onclick=()=>{if(!selectedExport)return;const trigger=document.createElement('a');trigger.href=downloadUrl;trigger.download=selectedExport.filename;document.body.append(trigger);trigger.click();trigger.remove();$('saveHelp').textContent='다운로드를 요청했습니다. 기본 파일명: '+selectedExport.filename+' · 저장 위치나 확인 창 표시는 브라우저 설정에 따릅니다.'};
$('saveAs').onclick=async()=>{
 const file=selectedExport;if(!file)return;
 if(typeof window.showSaveFilePicker!=='function'){$('saveHelp').textContent='이 화면은 저장 창을 지원하지 않습니다. 아래 이미지를 마우스 오른쪽 버튼으로 눌러 이미지 저장을 선택하세요.';return}
 try{const handle=await window.showSaveFilePicker({suggestedName:file.filename,types:[{description:file.type==='image/png'?'PNG 이미지':'JPEG 이미지',accept:{[file.type]:[file.type==='image/png'?'.png':'.jpg']}}]});const writable=await handle.createWritable();await writable.write(file.blob);await writable.close();$('saveHelp').textContent='파일 저장이 완료되었습니다.'}catch(error){$('saveHelp').textContent=error.name==='AbortError'?'저장을 취소했습니다. 편집 내용은 유지됩니다.':'이 화면에서 저장 창을 열지 못했습니다. 아래 이미지를 마우스 오른쪽 버튼으로 눌러 이미지 저장을 선택하세요.'}
};
$('png').onclick=()=>download('image/png');$('jpeg').onclick=()=>download('image/jpeg');syncControls();listTexts();draw();document.fonts.ready.then(draw);

let templateRecords=[],loadedTemplateId=null,templateBusy=false;
function templateStatus(message,error=false){$('templateStatus').textContent=message;$('templateStatus').classList.toggle('error',error)}
function renderTemplates(){
 $('templateCount').textContent=templateRecords.length+'개';const selected=templateRecords.find(t=>t.id===loadedTemplateId);
 $('selectedTemplate').textContent=selected?'불러온 템플릿: '+selected.name:'불러온 템플릿 없음';$('updateTemplate').disabled=templateBusy||!selected;$('createTemplate').disabled=templateBusy;$('exportJson').disabled=templateBusy;$('jsonInput').disabled=templateBusy;
 const list=$('templateList');list.replaceChildren();
 if(!templateRecords.length){const p=document.createElement('p');p.className='hint';p.textContent='아직 템플릿이 없습니다. 현재 작업을 저장해 보세요.';list.append(p)}
 for(const record of templateRecords){const card=document.createElement('article');card.className='templatecard'+(record.id===loadedTemplateId?' selected':'');const title=document.createElement('h3');title.textContent=record.name;const detail=document.createElement('p');detail.textContent=`${record.scene.ratio} · 문구 ${record.scene.texts.length}개 · ${new Date(record.updatedAt).toLocaleString('ko-KR')}`;const actions=document.createElement('div');actions.className='actions';for(const [label,handler] of [['불러오기',()=>loadTemplate(record.id)],['삭제',()=>askDeleteTemplate(record.id)]]){const b=document.createElement('button');b.textContent=label;b.disabled=templateBusy;b.onclick=handler;actions.append(b)}card.append(title,detail,actions);list.append(card)}
}
async function templateAction(action){if(templateBusy)return;templateBusy=true;renderTemplates();try{await action()}catch(error){templateStatus(error.name==='QuotaExceededError'?'브라우저 저장 공간이 부족합니다. 저장하지 못했으며 기존 템플릿과 작업은 유지됩니다.':(error.message||'템플릿 작업을 완료하지 못했습니다.')+' 기존 작업은 유지됩니다.',true)}finally{templateBusy=false;renderTemplates()}}
async function snapshotScene(){
 const scene={ratio,backgroundMode,texts:structuredClone(texts),imageBlob:null,imageDetails:structuredClone(imageDetails)};
 if(image){const source=image;const c=document.createElement('canvas');c.width=source.width;c.height=source.height;c.getContext('2d').drawImage(source,0,0);scene.imageBlob=await new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(Error('이미지 저장 준비에 실패했습니다.')),'image/png'))}
 return scene;
}
async function refreshTemplates(){templateRecords=(await TemplateStore.all()).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));renderTemplates()}
async function saveTemplate(overwrite){
 const name=$('templateName').value.trim();if(!name||name.length>60){templateStatus('템플릿 이름을 1~60자로 입력해 주세요.',true);return}
 await templateAction(async()=>{const previous=overwrite?templateRecords.find(t=>t.id===loadedTemplateId):null;if(overwrite&&!previous)throw Error('수정할 템플릿을 먼저 불러오세요.');const record=TemplateStore.recordFor(await snapshotScene(),name,previous);await TemplateStore.put(record);loadedTemplateId=record.id;await refreshTemplates();templateStatus(overwrite?'템플릿을 수정했습니다. 같은 ID에 저장되었습니다.':'새 템플릿을 저장했습니다.');});
}
async function loadTemplate(id){await templateAction(async()=>{
 const record=templateRecords.find(r=>r.id===id);TemplateStore.validate(record);const s=record.scene;let nextImage=null;const current=++request;
 if(s.imageBlob){const url=URL.createObjectURL(s.imageBlob);try{nextImage=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('템플릿 이미지를 읽을 수 없습니다.'));im.src=url})}finally{URL.revokeObjectURL(url)}}
 if(current!==request){templateStatus('다른 이미지 작업이 있어 템플릿 불러오기를 취소했습니다.');return}
 image=nextImage;imageDetails=structuredClone(s.imageDetails);backgroundMode=s.backgroundMode;ratio=s.ratio;texts=structuredClone(s.texts);selectedId=texts[0]?.id??null;loadedTemplateId=id;$('templateName').value=record.name;
 $('imageInfo').textContent=image?`${imageDetails?.name||'저장된 이미지'} · PNG 복원 · ${image.width} × ${image.height}px`:backgroundMode==='sample'?'기본 합성 그림 사용 중':'불러온 이미지 없음 · 흰색 배경';$('removeImage').disabled=!image;document.querySelectorAll('[data-ratio]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ratio===ratio)));syncControls();listTexts();draw();imageStatus('템플릿 배경을 불러왔습니다.');templateStatus('이미지·화면비·모든 문구 설정을 불러왔습니다.');
 })}
const deleteDialog=document.createElement('dialog');const deleteMessage=document.createElement('p'),deleteActions=document.createElement('div');deleteActions.className='actions';const cancelDelete=document.createElement('button'),confirmDelete=document.createElement('button');cancelDelete.textContent='취소';confirmDelete.textContent='삭제';deleteActions.append(cancelDelete,confirmDelete);deleteDialog.append(deleteMessage,deleteActions);document.body.append(deleteDialog);let deleteTarget=null;
cancelDelete.onclick=()=>deleteDialog.close();
function askDeleteTemplate(id){const record=templateRecords.find(t=>t.id===id);if(!record)return;deleteTarget=id;deleteMessage.textContent=`“${record.name}” 템플릿을 삭제할까요? 현재 편집 화면은 유지됩니다.`;deleteDialog.showModal()}
confirmDelete.onclick=()=>{const id=deleteTarget;deleteDialog.close();templateAction(async()=>{await TemplateStore.remove(id);if(loadedTemplateId===id)loadedTemplateId=null;await refreshTemplates();templateStatus('템플릿을 삭제했습니다. 현재 편집 화면은 유지됩니다.');})};
$('createTemplate').onclick=()=>saveTemplate(false);$('updateTemplate').onclick=()=>saveTemplate(true);
templateAction(async()=>{await refreshTemplates();templateStatus(templateRecords.length?'저장된 템플릿을 불러왔습니다.':'템플릿 이름을 입력하고 현재 작업을 저장해 보세요.');});

// Navigation changes only the visible tool groups, never the editor data.
document.querySelectorAll('[data-tool]').forEach(button=>button.addEventListener('click',()=>{const groups=Array.from(document.querySelectorAll('.editor .toolgroup'));groups.forEach((group,i)=>group.open=i===Number(button.dataset.tool));$('templateName').blur();document.querySelector('.editorscroll').scrollTop=0;}));

let jsonUrl=null;
function jsonStatus(message,error=false){$('jsonStatus').textContent=message;$('jsonStatus').classList.toggle('error',error)}
async function cleanBackupImage(blob){const url=URL.createObjectURL(blob);try{const im=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('손상된 배경 이미지가 포함되어 있습니다.'));i.src=url});if(!im.width||!im.height||im.width*im.height>20000000)throw Error('배경 이미지가 2,000만 픽셀을 초과하거나 크기가 올바르지 않습니다.');const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);const clean=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('배경 이미지 변환에 실패했습니다.')),'image/png'));return {blob:clean,width:im.width,height:im.height}}finally{URL.revokeObjectURL(url)}}
$('exportJson').onclick=async()=>{if(templateBusy)return;await templateAction(async()=>{try{const raw=await CardBackup.encode(await TemplateStore.all());if(jsonUrl)URL.revokeObjectURL(jsonUrl);jsonUrl=URL.createObjectURL(new Blob([raw],{type:'application/json'}));$('jsonDownload').href=jsonUrl;$('jsonDownload').hidden=false;jsonStatus('백업 준비 완료. 아래 JSON 내려받기를 눌러 저장하세요.')}catch(e){jsonStatus(e.message,true)}})};
$('jsonInput').onchange=async event=>{const file=event.target.files[0];event.target.value='';if(!file||templateBusy)return;await templateAction(async()=>{const before=templateRecords.length;try{if(!/\.json$/i.test(file.name))throw Error('JSON 파일만 가져올 수 있습니다.');if(file.size>30*1024*1024)throw Error('JSON은 30MB 이하만 가져올 수 있습니다.');jsonStatus('전체 JSON과 배경 이미지를 검사 중입니다.');const records=await CardBackup.prepare(await file.text(),cleanBackupImage);await TemplateStore.putMany(records);await refreshTemplates();jsonStatus(`${records.length}개 복원 완료 · ${before}개 → ${templateRecords.length}개. 기존 템플릿과 편집 화면은 유지됩니다.`)}catch(e){jsonStatus(`${e.name==='QuotaExceededError'?'브라우저 저장 공간이 부족합니다.':e.message} 가져오기를 거부했습니다. 기존 ${before}개 템플릿과 편집 화면은 유지됩니다.`,true)}})};
