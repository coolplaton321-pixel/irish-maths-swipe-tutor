/* Private, account-scoped student colours. Only the public publishable key is shipped. */
(() => {
  'use strict';
  const PROJECT_URL = 'https://iljziesnhngxpbcrjvww.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_65bqQ6CDWHdJcRps4yy-ag_fBqnGg0H';
  const TABLE = 'student_topic_ratings';
  const topicIds = [...JUNIOR_HIGHER_STRANDS,...LEAVING_CERT_STRANDS].flatMap(strand => strand.topics.map(([id]) => id));
  const cloudStudents = STUDENTS.filter(usesCloudRatings);
  const studentIds = new Set(cloudStudents.map(student => student.id));
  const validRatings = new Set(KNOWLEDGE_LEVELS.map(([rating]) => rating));
  const el = id => document.getElementById(id);
  const state = {ownerId:null,loading:false,ready:false,pending:{},epoch:0,busy:false,error:'',user:null};
  let client;
  let guestSnapshot = null;
  let sequence = 0;
  let authBusy = false;
  let refreshBusy = false;

  function read(key,fallback){
    try {return JSON.parse(localStorage.getItem(key)) || fallback;} catch (_) {return fallback;}
  }
  function write(key,value){
    try {localStorage.setItem(key,JSON.stringify(value));return true;} catch (_) {return false;}
  }
  function queueKey(){return `plato-maths-school:${state.ownerId}:pending:v1`;}
  function cacheKey(){return `plato-maths-school:${state.ownerId}:cache:v1`;}
  function validRow(row){
    return studentIds.has(row.student_id) && topicIds.includes(row.topic_id) && validRatings.has(row.rating);
  }
  function pendingCount(){return Object.keys(state.pending).length;}
  function currentMessage(){
    if (!usesCloudRatings(activeStudent)) return 'David’s colours are saved on this device. Cloud setup is pending.';
    if (!state.ownerId) return 'Choose a colour. Sign in to sync between devices.';
    if (state.error) return `${state.error} Your changes are waiting to sync.`;
    if (state.loading) return 'Loading your cloud colours…';
    if (pendingCount()) return navigator.onLine ? 'Saving colours to your account…' : 'Offline — colours will sync when you reconnect.';
    return 'Colours saved to your account.';
  }
  function updateStatus(){
    el('cloudStatus').textContent = !usesCloudRatings(activeStudent) || state.ownerId ? currentMessage() : 'Colours are saved on this device. Sign in to sync.';
    el('accountButton').textContent = state.ownerId ? 'Teacher account' : 'Teacher sign in';
    el('cloudRetry').hidden = !state.ownerId || (!state.error && !pendingCount());
    el('cloudRetry').disabled = state.busy || state.loading && !state.error;
    if (topicDialog.open) el('ratingMessage').textContent = currentMessage();
    syncRatingOptions();
  }
  function refreshBoard(){
    studentRatings = loadStudentRatings(activeStudent);
    updateTopicBoard();
    syncRatingOptions();
  }
  function cache(){
    const values = Object.fromEntries(cloudStudents.map(student => [student.id,{...ratingsByStudent.get(student.id)}]));
    write(cacheKey(),values);
    write(queueKey(),state.pending);
  }
  function installRows(rows){
    ratingsByStudent.clear();
    cloudStudents.forEach(student => ratingsByStudent.set(student.id,{}));
    rows.filter(validRow).forEach(row => {ratingsByStudent.get(row.student_id)[row.topic_id] = row.rating;});
    Object.values(state.pending).filter(validRow).forEach(row => {ratingsByStudent.get(row.student_id)[row.topic_id] = row.rating;});
    refreshBoard();
    cache();
  }
  function defaultRatings(student){
    const ratings = {};
    topicsForStudent(student).forEach(([id]) => {
      ratings[id] = student.id === 'jay' || curriculumFor(student) === 'leaving' ? 'grey' : KNOWLEDGE_LEVELS[Math.floor(Math.random()*4)][0];
    });
    return ratings;
  }
  function snapshotGuest(){
    // Preserve original browser keys, including Jay's and Vladimir's one-time preset.
    return Object.fromEntries(cloudStudents.map(student => [student.id,{...loadStudentRatings(student)}]));
  }
  async function fetchRows(owner){
    const rows = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize){
      const {data,error} = await client.from(TABLE).select('student_id,topic_id,rating')
        .eq('owner_id',owner).order('student_id').order('topic_id').range(offset,offset + pageSize - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) return rows;
    }
  }
  async function initialiseOwner(epoch){
    const owner = state.ownerId;
    try {
      const remote = await fetchRows(owner);
      if (epoch !== state.epoch) return;
      const existing = new Set(remote.filter(validRow).map(row => `${row.student_id}/${row.topic_id}`));
      const claimedBy = read('plato-maths-school:legacy-import-owner:v1',null);
      const canImportGuest = !claimedBy || claimedBy === owner;
      const missing = [];
      cloudStudents.forEach(student => {
        const seed = canImportGuest && guestSnapshot ? guestSnapshot[student.id] : defaultRatings(student);
        topicsForStudent(student).forEach(([topic]) => {
          if (!existing.has(`${student.id}/${topic}`)) missing.push({owner_id:owner,student_id:student.id,topic_id:topic,rating:validRatings.has(seed?.[topic]) ? seed[topic] : 'grey'});
        });
      });
      if (missing.length){
        // Ignore duplicates so a second device's import never overwrites saved cloud colours.
        const {error} = await client.from(TABLE).upsert(missing,{onConflict:'owner_id,student_id,topic_id',ignoreDuplicates:true});
        if (error) throw error;
      }
      const all = missing.length ? await fetchRows(owner) : remote;
      if (epoch !== state.epoch) return;
      if (!claimedBy) write('plato-maths-school:legacy-import-owner:v1',owner);
      installRows(all);
      state.ready = true;
      state.loading = false;
      state.error = '';
      updateStatus();
      void flush();
    } catch (error){
      if (epoch !== state.epoch) return;
      state.error = 'Could not load cloud colours. Retry sync.';
      // Don't let old guest grades be written into an account before its cloud state loads.
      state.loading = true;
      updateStatus();
    }
  }
  function acceptSession(session){
    const owner = session?.user?.id || null;
    if (owner === state.ownerId){state.user=session?.user || null;return;}
    if (!state.ownerId) guestSnapshot = snapshotGuest();
    state.epoch++;
    state.ownerId = owner;
    state.user = session?.user || null;
    state.ready = false;
    state.busy = false;
    state.error = '';
    state.pending = {};
    ratingsByStudent.clear();
    if (!owner){
      state.loading = false;
      guestSnapshot = null;
      refreshBoard();
    } else {
      state.loading = true;
      const savedQueue = read(queueKey(),{});
      Object.values(savedQueue).filter(validRow).forEach(row => {
        const item = {...row,owner_id:owner,sequence:++sequence};
        state.pending[`${item.student_id}/${item.topic_id}`] = item;
      });
      const savedCache = read(cacheKey(),{});
      cloudStudents.forEach(student => {
        const ratings = {};
        topicIds.forEach(id => {if(validRatings.has(savedCache[student.id]?.[id])) ratings[id]=savedCache[student.id][id];});
        ratingsByStudent.set(student.id,ratings);
      });
      refreshBoard();
      void initialiseOwner(state.epoch);
    }
    updateAccount();
    updateStatus();
  }
  async function flush(){
    if (state.busy || !state.ready || !state.ownerId || !navigator.onLine || !pendingCount()) {updateStatus();return;}
    const epoch = state.epoch;
    state.busy = true;
    state.error = '';
    updateStatus();
    try {
      while (epoch === state.epoch && pendingCount()){
        const batch = Object.values(state.pending).slice(0,100);
        const rows = batch.map(({sequence,...row}) => row);
        const {error} = await client.from(TABLE).upsert(rows,{onConflict:'owner_id,student_id,topic_id'});
        if (error) throw error;
        if (epoch !== state.epoch) return;
        batch.forEach(row => {
          const key = `${row.student_id}/${row.topic_id}`;
          if (state.pending[key]?.sequence === row.sequence) delete state.pending[key];
        });
        cache();
      }
    } catch (error){
      if (epoch === state.epoch) state.error = 'Not synced yet. Retry sync.';
    } finally {
      if (epoch === state.epoch){state.busy=false;updateStatus();}
    }
  }
  async function refreshCloud(){
    if (!state.ownerId || !state.ready || refreshBusy || state.busy || pendingCount() || !navigator.onLine) return;
    const epoch = state.epoch;
    const revision = sequence;
    refreshBusy = true;
    try {
      const rows = await fetchRows(state.ownerId);
      if (epoch === state.epoch && revision === sequence && !state.busy && !pendingCount()){installRows(rows);state.error='';updateStatus();}
    } catch (_) {
      if (epoch === state.epoch){state.error='Could not refresh cloud colours. Retry sync.';updateStatus();}
    } finally {refreshBusy=false;}
  }
  function save(studentId,topicId,rating){
    if (!state.ownerId || !state.ready || !validRow({student_id:studentId,topic_id:topicId,rating})) return;
    const row = {owner_id:state.ownerId,student_id:studentId,topic_id:topicId,rating,sequence:++sequence};
    state.pending[`${studentId}/${topicId}`] = row;
    const durable = write(queueKey(),state.pending);
    cache();
    updateStatus();
    if (!durable) el('ratingMessage').textContent = 'Browser storage unavailable. Keep this page open until colours finish syncing.';
    void flush();
  }
  window.platoCloud = {
    get ownerId(){return state.ownerId;},
    get loading(){return state.loading;},
    save,
    updateStatus,
    topicMessage:currentMessage
  };

  function updateAccount(){
    el('accountForm').hidden = Boolean(state.ownerId);
    el('signOutButton').hidden = !state.ownerId;
    el('confirmAccount').hidden = true;
    el('accountMessage').textContent = state.ownerId ? `Signed in as ${state.user?.email || 'teacher'}.` : '';
  }
  function authControls(busy){
    authBusy = busy;
    ['signInButton','signUpButton','verifyAccountButton','signOutButton'].forEach(id => {el(id).disabled=busy;});
  }
  function authError(error){
    const message = error?.message || 'Could not sign in. Please try again.';
    if (/email.*not.*authorized|email.*not.*allowed|email.*address.*invalid/i.test(message)) return 'Supabase’s free email service only sends to your organisation’s verified email. Use that address, or configure a mail provider for this separate project.';
    return message;
  }
  el('accountButton').onclick = () => {updateAccount();el('accountPassword').value='';el('accountDialog').showModal();};
  el('closeAccount').onclick = () => el('accountDialog').close();
  el('accountDialog').addEventListener('close',() => {el('accountPassword').value='';el('confirmationLink').value='';});
  el('accountForm').onsubmit = async event => {
    event.preventDefault();
    if (authBusy || !client) return;
    authControls(true);
    el('accountMessage').textContent='Signing in…';
    try {
      const {data,error} = await client.auth.signInWithPassword({email:el('accountEmail').value.trim(),password:el('accountPassword').value});
      if (error) throw error;
      acceptSession(data.session);
      el('accountDialog').close();
    } catch (error){el('accountMessage').textContent=authError(error);}
    finally {authControls(false);}
  };
  el('signUpButton').onclick = async () => {
    if (authBusy || !client || !el('accountForm').reportValidity()) return;
    if (el('accountPassword').value.length < 10){el('accountMessage').textContent='Use a password of at least 10 characters.';return;}
    authControls(true);
    el('accountMessage').textContent='Creating your account…';
    try {
      const {data,error} = await client.auth.signUp({email:el('accountEmail').value.trim(),password:el('accountPassword').value,options:{emailRedirectTo:'https://coolplaton321-pixel.github.io/plato-maths-school/'}});
      if (error) throw error;
      el('accountPassword').value='';
      if (data.session){acceptSession(data.session);el('accountDialog').close();}
      else {el('accountMessage').textContent='Check your email. Paste the unopened confirmation link below, or confirm it and return here to sign in.';el('confirmAccount').hidden=false;}
    } catch (error){el('accountMessage').textContent=authError(error);}
    finally {authControls(false);}
  };
  el('verifyAccountButton').onclick = async () => {
    if (authBusy || !client) return;
    authControls(true);
    try {
      const link = new URL(el('confirmationLink').value.trim());
      const type = link.searchParams.get('type');
      const token = link.searchParams.get('token');
      if (link.origin !== PROJECT_URL || link.pathname !== '/auth/v1/verify' || !['email','signup'].includes(type) || !token) throw new Error('Paste the confirmation link from this project’s email.');
      const {data,error} = await client.auth.verifyOtp({token_hash:token,type});
      if (error) throw error;
      acceptSession(data.session);
      el('accountDialog').close();
    } catch (error){el('accountMessage').textContent=authError(error);}
    finally {authControls(false);}
  };
  el('signOutButton').onclick = async () => {
    if (authBusy || !client) return;
    if (pendingCount()){el('accountMessage').textContent='Some colours are not synced. Retry sync before signing out.';return;}
    authControls(true);
    try {
      const {error} = await client.auth.signOut({scope:'local'});
      if (error) throw error;
      acceptSession(null);
      el('accountDialog').close();
    } catch (error){el('accountMessage').textContent=authError(error);}
    finally {authControls(false);}
  };
  el('cloudRetry').onclick = () => {
    if (!state.ready) {state.error='';updateStatus();void initialiseOwner(state.epoch);}
    else {state.error='';void flush();void refreshCloud();}
  };
  window.addEventListener('online',() => {if(!state.ready && state.ownerId) void initialiseOwner(state.epoch);else {void flush();void refreshCloud();}});
  document.addEventListener('visibilitychange',() => {if(document.visibilityState==='visible') void refreshCloud();});
  window.addEventListener('focus',() => {void refreshCloud();});
  window.addEventListener('beforeunload',event => {if(pendingCount()){event.preventDefault();event.returnValue='';}});
  setInterval(() => {void refreshCloud();},30000);
  updateStatus();
  try {
    if (!window.supabase) throw new Error('The sign-in service could not load. Refresh the page.');
    client = window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY,{db:{timeout:15000,retry:false},auth:{storageKey:'plato-maths-school:auth:v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    client.auth.onAuthStateChange((_event,session) => {
      // Never await Supabase calls inside the auth callback (client lock re-entry).
      setTimeout(() => {acceptSession(session);},0);
    });
    void client.auth.getSession().then(({data,error}) => {if(error) throw error;acceptSession(data.session);}).catch(() => {el('cloudStatus').textContent='Could not restore sign-in. Your device colours are still available.';});
  } catch (error){el('accountMessage').textContent=error.message;el('cloudStatus').textContent='Cloud sign-in unavailable. Colours are still saved on this device.';}
})();
