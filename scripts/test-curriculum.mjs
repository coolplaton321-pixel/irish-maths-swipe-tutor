import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const html = readFileSync(new URL('../index.html',import.meta.url),'utf8');
const curriculum = readFileSync(new URL('../leaving-curriculum.js',import.meta.url),'utf8');
const cloud = readFileSync(new URL('../cloud.js',import.meta.url),'utf8');
const inline = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const studentCode = inline.slice(inline.indexOf('const JUNIOR_HIGHER_STRANDS'),inline.indexOf('const menuToggle'));

function fixture(){
  const values = new Map();
  const context = vm.createContext({
    window:{},Math,localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}
  });
  vm.runInContext(curriculum+'\n'+studentCode,context);
  return {context,values,run:code=>vm.runInContext(code,context)};
}

test('all application scripts parse',()=>{
  [curriculum,inline,cloud].forEach(code=>new vm.Script(code));
  assert.ok(html.indexOf('src="leaving-curriculum.js"') < html.indexOf('<script>'));
});

test('five complete LC strands and stable, disjoint topic IDs',()=>{
  const {run} = fixture();
  assert.equal(run('LEAVING_CERT_STRANDS.length'),5);
  assert.equal(run('LEAVING_CERT_STRANDS.flatMap(s=>s.topics).length'),83);
  assert.equal(run('new Set(LEAVING_CERT_STRANDS.flatMap(s=>s.topics.map(t=>t[0]))).size'),83);
  assert.ok(run('LEAVING_CERT_STRANDS.every(s=>s.topics.every(t=>/^lc-[a-z0-9-]+$/.test(t[0]) && t[1] && t[2] && t[4]))'));
  assert.ok(run('!JUNIOR_HIGHER_STRANDS.flatMap(s=>s.topics).some(t=>t[0].startsWith("lc-"))'));
  assert.equal(run('JUNIOR_HIGHER_STRANDS.flatMap(s=>s.topics).length'),48);
});

test('OL/HL boundaries do not mistake shared material for HL-only topics',()=>{
  const {run}=fixture();
  assert.equal(run('LEAVING_HIGHER_CONTENT["lc-indices"]'),undefined);
  assert.equal(run('LEAVING_HIGHER_CONTENT["lc-counting"]'),undefined);
  assert.equal(run('LEAVING_HIGHER_CONTENT["lc-derivatives"]'),undefined);
  assert.equal(run('LEAVING_HIGHER_CONTENT["lc-margin"]'),undefined);
  assert.equal(run('LEAVING_HIGHER_CONTENT["lc-complex"].only'),undefined);
  for(const id of ['lc-binomial','lc-log-laws','lc-induction','lc-present-value','lc-integration','lc-z-tests']){
    assert.equal(run(`LEAVING_HIGHER_CONTENT[${JSON.stringify(id)}].only`),true);
  }
  assert.ok(run('topicsForStudent(STUDENTS.find(s=>s.id==="saoirse")).every(t=>!t[3]?.only)'));
  assert.equal(run('topicsForStudent(STUDENTS.find(s=>s.id==="david")).length'),83);
});

test('David starts unassessed; old JC colours and order are preserved',()=>{
  const {run,values}=fixture();
  values.set('irish-maths-tutor:jay:jc-higher:v1',JSON.stringify({indices:'green',surds:'red'}));
  values.set('irish-maths-tutor:aoife:jc-higher:v1',JSON.stringify({indices:'green'}));
  values.set('irish-maths-tutor:student-order:v1',JSON.stringify(['aoife','liam']));
  assert.equal(run('loadStudentRatings(STUDENTS[0]).indices'),'green');
  assert.equal(run('Object.keys(loadStudentRatings(STUDENTS.find(s=>s.id==="david"))).length'),0);
  assert.equal(run('Object.keys(loadStudentRatings(STUDENTS.find(s=>s.id==="aoife"))).length'),0);
  assert.equal(values.get('irish-maths-tutor:aoife:jc-higher:v1'),'{"indices":"green"}');
  assert.equal(run('studentDirectoryOrder().map(s=>s.id).slice(0,3).join(",")'),'jay,aoife,liam');
  assert.equal(run('studentDirectoryOrder().filter(s=>s.id==="david").length'),1);
  assert.ok(run('usesCloudRatings(STUDENTS[0])'));
  assert.equal(run('usesCloudRatings(STUDENTS.find(s=>s.id==="david"))'),false);
});

test('David retains local ratings across a reload and separate teacher accounts',()=>{
  const {run,values}=fixture();
  values.set('irish-maths-tutor:david:lc:v1','{"lc-integration":"yellow"}');
  assert.equal(run('loadStudentRatings(STUDENTS.find(s=>s.id==="david"))["lc-integration"]'),'yellow');
  run('ratingsByStudent.clear(); window.platoCloud={ownerId:"teacher-a"};');
  assert.equal(run('Object.keys(loadStudentRatings(STUDENTS.find(s=>s.id==="david"))).length'),0);
  values.set('plato-maths-school:teacher-a:david:v1','{"lc-integration":"green"}');
  run('ratingsByStudent.clear();');
  assert.equal(run('loadStudentRatings(STUDENTS.find(s=>s.id==="david"))["lc-integration"]'),'green');
});

test('cloud reads more than 1000 rows, preserves legacy ratings and seeds only appropriate topics',async()=>{
  const {context,run}=fixture();
  const elements=new Map();
  const rows=JSON.parse(run('JSON.stringify(STUDENTS.filter(usesCloudRatings).flatMap(s=>JUNIOR_HIGHER_STRANDS.flatMap(t=>t.topics.map(([id])=>({student_id:s.id,topic_id:id,rating:"green"})))))'));
  rows.push({student_id:'vladimir',topic_id:'lc-z-tests',rating:'green'});
  let callback;
  let queries=0;
  const inserted=[];
  const owner='teacher-test';
  const client={
    from:()=>({
      select:()=>({eq:(_column,value)=>{assert.equal(value,owner);return {
        order(){return this;},
        async range(start,end){queries++;return {data:[...rows].sort((a,b)=>a.student_id.localeCompare(b.student_id)||a.topic_id.localeCompare(b.topic_id)).slice(start,end+1),error:null};}
      };}}),
      upsert:async data=>{inserted.push(...data);rows.push(...data);return {error:null};}
    }),
    auth:{onAuthStateChange:fn=>{callback=fn;},getSession:async()=>({data:{session:null},error:null})}
  };
  context.document={getElementById:id=>{
    if(!elements.has(id)) elements.set(id,{hidden:false,disabled:false,textContent:'',addEventListener(){}});
    return elements.get(id);
  },addEventListener(){}};
  Object.assign(context,{navigator:{onLine:true},setTimeout,setInterval:()=>0});
  Object.assign(context.window,{supabase:{createClient:()=>client},addEventListener(){}});
  vm.runInContext('const topicDialog={open:false};function syncRatingOptions(){} function updateTopicBoard(){}',context);
  vm.runInContext(cloud,context);
  await new Promise(resolve=>setTimeout(resolve,0));
  callback('SIGNED_IN',{user:{id:owner}});
  for(let i=0;i<20 && !context.window.platoCloud.ownerId;i++) await new Promise(resolve=>setTimeout(resolve,5));
  for(let i=0;i<20 && context.window.platoCloud.loading;i++) await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(context.window.platoCloud.loading,false);
  assert.ok(rows.length>1000);
  assert.ok(queries>=5);
  assert.equal(run('ratingsByStudent.get("vladimir")["lc-z-tests"]'),'green');
  assert.equal(run('ratingsByStudent.get("aoife").indices'),'green');
  assert.equal(run('ratingsByStudent.get("aoife")["lc-integration"]'),'grey');
  assert.equal(run('ratingsByStudent.get("saoirse")["lc-integration"]'),undefined);
  assert.ok(inserted.every(row=>row.student_id!=='david' && row.owner_id===owner));
  assert.ok(inserted.every(row=>row.topic_id.startsWith('lc-')));
  assert.equal(elements.get('cloudStatus').textContent,'Colours saved to your account.');
});
