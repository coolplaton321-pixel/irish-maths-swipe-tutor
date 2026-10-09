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
  assert.equal(run('studentDirectoryOrder().map(s=>s.id).slice(0,4).join(",")'),'david,jay,aoife,liam');
  assert.equal(run('studentDirectoryOrder().filter(s=>s.id==="david").length'),1);
  assert.ok(run('usesCloudRatings(STUDENTS[0])'));
  assert.ok(run('usesCloudRatings(STUDENTS.find(s=>s.id==="david"))'));
});

test('David precedes Jay on fresh devices, existing saved orders and reloads',()=>{
  const {run,values}=fixture();
  assert.equal(run('studentDirectoryOrder().slice(0,2).map(s=>s.id).join(",")'),'david,jay');
  values.set('irish-maths-tutor:student-order:v1',JSON.stringify(['aoife','david','liam','david','jay','unknown','niamh']));
  const ordered=run('studentDirectoryOrder().map(s=>s.id).join(",")');
  assert.ok(ordered.startsWith('david,jay,aoife,liam,niamh,'));
  assert.equal(run('new Set(studentDirectoryOrder().map(s=>s.id)).size'),15);
  assert.equal(run('studentDirectoryOrder().length'),15);
  assert.equal(run('studentDirectoryOrder().map(s=>s.id).join(",")'),ordered);
  const reload=fixture();
  reload.values.set('irish-maths-tutor:student-order:v1',values.get('irish-maths-tutor:student-order:v1'));
  assert.equal(reload.run('studentDirectoryOrder().map(s=>s.id).join(",")'),ordered);
});

test('David keeps guest ratings separate from signed-in cloud state',()=>{
  const {run,values}=fixture();
  values.set('irish-maths-tutor:david:lc:v1','{"lc-integration":"yellow"}');
  assert.equal(run('loadStudentRatings(STUDENTS.find(s=>s.id==="david"))["lc-integration"]'),'yellow');
  run('ratingsByStudent.clear(); window.platoCloud={ownerId:"teacher-a"};');
  assert.equal(run('Object.keys(loadStudentRatings(STUDENTS.find(s=>s.id==="david"))).length'),0);
  values.set('plato-maths-school:teacher-a:david:v1','{"lc-integration":"green"}');
  run('ratingsByStudent.clear();');
  assert.equal(run('Object.keys(loadStudentRatings(STUDENTS.find(s=>s.id==="david"))).length'),0);
  assert.equal(values.get('plato-maths-school:teacher-a:david:v1'),'{"lc-integration":"green"}');
});

async function cloudFixture({rows=[],stored={},owner='teacher-test',restored=false}={}){
  const {context,run,values}=fixture();
  Object.entries(stored).forEach(([key,value])=>values.set(key,JSON.stringify(value)));
  const elements=new Map();
  const events=new Map();
  let callback;
  let queries=0;
  const inserted=[];
  const writes=[];
  const client={
    from:()=>({
      select:()=>({eq:(_column,value)=>({
        order(){return this;},
        async range(start,end){queries++;return {data:rows.filter(r=>r.owner_id===value).sort((a,b)=>a.student_id.localeCompare(b.student_id)||a.topic_id.localeCompare(b.topic_id)).slice(start,end+1),error:null};}
      })}),
      upsert:async (data,options)=>{
        assert.equal(options.onConflict,'owner_id,student_id,topic_id');
        data.forEach(row=>{
          const existing=rows.find(r=>r.owner_id===row.owner_id && r.student_id===row.student_id && r.topic_id===row.topic_id);
          if (!existing){rows.push({...row});inserted.push({...row});}
          else if (!options.ignoreDuplicates){Object.assign(existing,row);writes.push({...row});}
        });
        return {error:null};
      }
    }),
    auth:{onAuthStateChange:fn=>{callback=fn;},getSession:async()=>({data:{session:restored?{user:{id:owner}}:null},error:null})}
  };
  context.document={getElementById:id=>{
    if(!elements.has(id)) elements.set(id,{hidden:false,disabled:false,textContent:'',addEventListener(){}});
    return elements.get(id);
  },addEventListener(){}};
  Object.assign(context,{navigator:{onLine:true},setTimeout,setInterval:()=>0});
  Object.assign(context.window,{supabase:{createClient:()=>client},addEventListener:(type,fn)=>events.set(type,fn)});
  vm.runInContext('const topicDialog={open:false};function syncRatingOptions(){} function updateTopicBoard(){}',context);
  vm.runInContext(cloud,context);
  await new Promise(resolve=>setTimeout(resolve,0));
  if(!restored) callback('SIGNED_IN',{user:{id:owner}});
  for(let i=0;i<20 && !context.window.platoCloud.ownerId;i++) await new Promise(resolve=>setTimeout(resolve,5));
  for(let i=0;i<20 && context.window.platoCloud.loading;i++) await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(context.window.platoCloud.loading,false);
  return {context,run,values,rows,inserted,writes,elements,events,queries};
}

test('cloud reads more than 1000 rows, preserves legacy ratings and seeds only appropriate topics',async()=>{
  const {run:build}=fixture();
  const rows=JSON.parse(build('JSON.stringify(STUDENTS.flatMap(s=>JUNIOR_HIGHER_STRANDS.flatMap(t=>t.topics.map(([id])=>({owner_id:"teacher-test",student_id:s.id,topic_id:id,rating:"green"})))))'));
  rows.push({owner_id:'teacher-test',student_id:'vladimir',topic_id:'lc-z-tests',rating:'green'});
  const {run,inserted,elements,queries}=await cloudFixture({rows});
  assert.ok(rows.length>1000);
  assert.ok(queries>=5);
  assert.equal(run('ratingsByStudent.get("vladimir")["lc-z-tests"]'),'green');
  assert.equal(run('ratingsByStudent.get("aoife").indices'),'green');
  assert.equal(run('ratingsByStudent.get("aoife")["lc-integration"]'),'grey');
  assert.equal(run('ratingsByStudent.get("saoirse")["lc-integration"]'),undefined);
  assert.ok(inserted.every(row=>row.owner_id==='teacher-test'));
  assert.equal(inserted.filter(row=>row.student_id==='david').length,83);
  assert.ok(inserted.filter(row=>row.student_id==='david').every(row=>row.rating==='grey'));
  assert.ok(inserted.every(row=>row.topic_id.startsWith('lc-')));
  assert.equal(elements.get('cloudStatus').textContent,'Colours saved to your account.');
});

test('David imports guest and current-owner colours without overwriting cloud or other accounts',async()=>{
  const stored={
    'irish-maths-tutor:david:lc:v1':{'lc-integration':'yellow','lc-indices':'red','lc-z-tests':'yellow','lc-binomial':'green'},
    'plato-maths-school:teacher-test:david:v1':{'lc-integration':'green','lc-z-tests':'red','lc-indices':'invalid','not-a-topic':'green'},
    'plato-maths-school:another-teacher:david:v1':{'lc-log-laws':'red'}
  };
  const remote={owner_id:'teacher-test',student_id:'david',topic_id:'lc-z-tests',rating:'green'};
  const other={owner_id:'another-teacher',student_id:'david',topic_id:'lc-binomial',rating:'yellow'};
  const {run,rows,values}=await cloudFixture({stored,rows:[remote,other],restored:true});
  assert.equal(run('ratingsByStudent.get("david")["lc-integration"]'),'green');
  assert.equal(run('ratingsByStudent.get("david")["lc-indices"]'),'red');
  assert.equal(run('ratingsByStudent.get("david")["lc-binomial"]'),'green');
  assert.equal(run('ratingsByStudent.get("david")["lc-z-tests"]'),'green');
  assert.equal(run('ratingsByStudent.get("david")["lc-log-laws"]'),'grey');
  assert.equal(run('ratingsByStudent.get("david")["not-a-topic"]'),undefined);
  assert.equal(remote.rating,'green');
  assert.equal(other.rating,'yellow');
  assert.equal(values.get('plato-maths-school:teacher-test:david:v1'),JSON.stringify(stored['plato-maths-school:teacher-test:david:v1']));
  const second=await cloudFixture({rows,owner:'another-teacher',stored:{...stored,'plato-maths-school:legacy-import-owner:v1':'teacher-test'}});
  assert.equal(second.run('ratingsByStudent.get("david")["lc-integration"]'),'grey');
  assert.equal(second.run('ratingsByStudent.get("david")["lc-log-laws"]'),'red');
  assert.equal(second.run('ratingsByStudent.get("david")["lc-binomial"]'),'yellow');
});

test('David edits and grey resets survive offline queue, reload and a second device',async()=>{
  const first=await cloudFixture();
  first.context.navigator.onLine=false;
  first.run('ratingsByStudent.get("david")["lc-integration"]="green"');
  first.context.window.platoCloud.save('david','lc-integration','green');
  const pendingKey='plato-maths-school:teacher-test:pending:v1';
  assert.equal(Object.values(JSON.parse(first.values.get(pendingKey)))[0].rating,'green');
  assert.match(first.elements.get('cloudStatus').textContent,/Offline/);
  assert.equal(first.rows.find(r=>r.student_id==='david' && r.topic_id==='lc-integration').rating,'grey');
  const stored=Object.fromEntries([...first.values].map(([key,value])=>[key,JSON.parse(value)]));
  const reload=await cloudFixture({rows:first.rows,stored,restored:true});
  for(let i=0;i<20 && JSON.parse(reload.values.get(pendingKey))['david/lc-integration'];i++) await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(reload.rows.find(r=>r.student_id==='david' && r.topic_id==='lc-integration').rating,'green');
  assert.equal(reload.run('ratingsByStudent.get("david")["lc-integration"]'),'green');
  const second=await cloudFixture({rows:first.rows,restored:true});
  assert.equal(second.run('ratingsByStudent.get("david")["lc-integration"]'),'green');
  second.context.window.platoCloud.save('david','lc-integration','grey');
  for(let i=0;i<20 && JSON.parse(second.values.get(pendingKey))['david/lc-integration'];i++) await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(second.rows.find(r=>r.student_id==='david' && r.topic_id==='lc-integration').rating,'grey');
  assert.equal(second.elements.get('cloudStatus').textContent,'Colours saved to your account.');
  assert.ok([...reload.writes,...second.writes].every(row=>row.owner_id==='teacher-test' && row.student_id==='david'));
});
