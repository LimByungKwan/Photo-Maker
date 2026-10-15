const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=readFileSync('dist/app.js','utf8');
const ctx={font:'',measureText(text){const size=Number(this.font.match(/([\d.]+)px/)[1]);return {width:Array.from(text).length*size}}};
const scope={ctx,fontFamilies:{sans:'sans-serif'},Intl};
vm.createContext(scope);
vm.runInContext(source.slice(source.indexOf('function wrap('),source.indexOf('function active(')),scope);
const text='작은 시작이 모여 큰 변화를 만든다. 오늘도 나만의 속도로 한 걸음씩 나아간다. '.repeat(5).trim();
const base={caption:text,size:80,font:'sans',outline:true,fit:true,x:50,y:50};
const before=scope.layoutText({...base,fit:false},1080,1080);
assert(before.height>1080,'the original 80px layout reproduces vertical overflow');
for(const height of [1080,1350,1920]){
 for(const position of [0,50,100]){
 const result=scope.layoutText({...base,x:position,y:position},1080,height);
 assert(result.x-result.width/2>=54-1e-6);
 assert(result.x+result.width/2<=1026+1e-6);
 assert(result.y-result.height/2>=54-1e-6);
 assert(result.y+result.height/2<=height-54+1e-6);
 assert.equal(result.lines.join(''),text,'all input characters survive fitting');
 }
}
const short=scope.layoutText({...base,caption:'짧은 문구',size:58},1080,1080);
assert.equal(short.size,58,'short text keeps its requested size');
console.log('PASS: overflow reproduced; all text preserved inside 3 ratios at center and edges; short text size preserved. Canvas measurement is approximated here; actual browser rendering still requires visual confirmation.');
