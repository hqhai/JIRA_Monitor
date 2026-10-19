import {MEMBERS,AXES,LEVELS,ACCEPTANCE,analyze,stage,isOpen,workload,recommend,signature,workingDays} from './engine.mjs';
const $=s=>document.querySelector(s);
// Inside the extension the page is chrome-extension://…; data still comes from the local server so the Jira token never enters the browser.
const EXTENSION=location.protocol==='chrome-extension:';
const API_BASE=EXTENSION?'http://127.0.0.1:8765':'';
const MOTION=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches;
const svg=(d,extra='')=>`<svg viewBox="0 0 24 24" aria-hidden="true"${extra}>${d}</svg>`;
const ICON={
 sun:svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>'),
 moon:svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
 search:svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
 info:svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>'),
 close:svg('<path d="m7 7 10 10M17 7 7 17"/>'),
 chev:'<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
 gap:svg('<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4M12 17h.01"/>'),
 zero:svg('<ellipse cx="12" cy="12" rx="6" ry="8.5"/><path d="m8 18 8-12"/>'),
 pause:svg('<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>'),
 clock:svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
 critical:svg('<path d="M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z"/><path d="M12 8v4.5M12 15.8h.01"/>'),
 info:svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>'),
 check:svg('<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16.5 9.5"/>'),
 users:svg('<circle cx="9" cy="8" r="3.5"/><path d="M3 20c.7-3.4 3.2-5 6-5s5.3 1.6 6 5"/><path d="M16 11.5a3 3 0 1 0 0-6M18 15c1.6.6 2.7 2.2 3 5"/>'),
 trend:svg('<path d="M4 6l6 6 4-4 6 6"/><path d="M20 9v5h-5"/>'),
 flag:svg('<path d="M5 21V4"/><path d="M5 5h12l-2.5 4L17 13H5"/>'),
 sync:svg('<path d="M20 11a8 8 0 0 0-14.6-4.5M4 13a8 8 0 0 0 14.6 4.5"/><path d="M5 3v4h4M19 21v-4h-4"/>'),
 over:svg('<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 1.5M9.5 2.5h5M12 2.5v3"/>'),
 note:svg('<path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z"/><path d="M9 12h6M9 16h3"/>')
};
function applyTheme(theme){
 document.documentElement.dataset.theme=theme;const b=$('#theme-toggle');
 b.innerHTML=theme==='dark'?ICON.sun:ICON.moon;
 b.setAttribute('aria-label',theme==='dark'?'Chuyển sang Alucard (sáng)':'Chuyển sang Dracula (tối)');
 b.setAttribute('aria-pressed',String(theme==='dark'));
}
// Dracula (dark) is the default; Alucard is its light variant. A new key so the switch to Dracula applies once.
let savedTheme;
try{savedTheme=localStorage.getItem('fslp-theme-dracula');}catch{}
applyTheme(['light','dark'].includes(savedTheme)?savedTheme:'dark');
$('#theme-toggle').addEventListener('click',e=>{
 const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
 try{localStorage.setItem('fslp-theme-dracula',theme);}catch{}
 const r=e.currentTarget.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,radius=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
 const t=withTransition('theme',()=>applyTheme(theme));
 t?.ready.then(()=>document.documentElement.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${radius}px at ${x}px ${y}px)`]},{duration:650,easing:'cubic-bezier(.32,.72,0,1)',pseudoElement:'::view-transition-new(root)'}));
});
// View Transitions give macOS-like cross-fades; kind selects the CSS for that transition.
function withTransition(kind,update){
 if(!document.startViewTransition||!MOTION()){update();return null;}
 const root=document.documentElement;root.dataset.vt=kind;
 const t=document.startViewTransition(update);
 t.finished.finally(()=>{if(root.dataset.vt===kind)delete root.dataset.vt;});
 return t;
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:1});
const hours=n=>n==null?'—':num(n)+'h';
const person=n=>MEMBERS.find(m=>m.name===n);
const mvar=m=>`var(--m${MEMBERS.findIndex(x=>x.name===m.name)+1})`;
const avatar=m=>`<span class="avatar" style="--mc:${mvar(m)}">${m.initials}</span>`;
const pill=(s,c='')=>`<span class="pill ${c}">${esc(s)}</span>`;
// Statuses are shown exactly as Jira names them; grouping uses Jira's own status categories.
// Completion groups: Ready for Review / Ready for Integration are complete (awaiting acceptance); everything else open is not.
const GROUPS={todo:'Chưa hoàn thành',review:'Chờ nghiệm thu',done:'Done',canceled:'Canceled'};
const INTEGRATION='Ready for Integration';
const category=t=>stage(t)==='canceled'?'canceled':stage(t)==='done'||t.status===INTEGRATION?'done':ACCEPTANCE.includes(t.status)?'review':'todo';
// FE / Mob work a BE Ready for Integration task waits on; null when the snapshot predates this data.
const integrationOf=t=>t.integration||null;
const canClose=t=>t.status===INTEGRATION&&!!t.integration?.related.length&&t.integration.related.every(r=>r.done);
const isComplete=t=>['done','review'].includes(category(t));
// Only High and Highest matter for this team; Medium / Low / Lowest are hidden by default.
const PRIORITY_RANK={Highest:0,High:1,Medium:2,Low:3,Lowest:4};
const PRIORITY_FILTERS={high:'High & Highest',highest:'Chỉ Highest','':'Mọi priority'};
const priorityBadge=t=>t.priority==='Highest'?'<span class="prio prio-highest"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 12 5-5 5 5M7 18l5-5 5 5"/></svg>Highest</span>':t.priority==='High'?'<span class="prio prio-high"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 15 5-5 5 5"/></svg>High</span>':'';
const statusPill=t=>`<span class="pill status-${category(t)}"><span class="dot"></span>${esc(t.status)}</span>`;
const MISSING='__missing';
const DIFFICULTIES=['Cơ bản','Vừa','Khó','Chuyên sâu','Rất chuyên sâu'];
const dvar=d=>`var(--d${DIFFICULTIES.indexOf(d)+1})`;
const VIEWS={overview:'Tổng quan',progress:'Tiến độ',analytics:'Phân tích',workload:'Workload',tasks:'Task'};
let snapshot=null,settings={sprints:{},assessments:{}},sprints=[],token='',today='',detailKey=null,busy=false,chartMode='daily',overrunMode='all',taskSort={key:'',dir:0};
let view=viewFromHash();
let savedPriority='high';
try{const v=localStorage.getItem('fslp-priority');if(v!==null&&v in PRIORITY_FILTERS)savedPriority=v;}catch{}
const defaultFilters=()=>({q:'',member:'',status:'',difficulty:'',category:'',priority:savedPriority});
let filters=defaultFilters();
const scope=()=>settings.sprints?.[snapshot.sprint.id]||{capacity:{},assignments:{}};
const effective=()=>({...scope(),assessments:settings.assessments});
const assigned=t=>scope().assignments?.[t.key]||t.assignee;
const teamLoads=(tasks=snapshot.tasks)=>workload(tasks,effective(),today,snapshot.sprint.endDate,snapshot.sprint.startDate||today,sprintHoursLeft());
const analysis=t=>analyze(t,settings.assessments);
const date=s=>s?new Date(s).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric'}):'Chưa đặt ngày';
function viewFromHash(){const v=location.hash.slice(1);return VIEWS[v]?v:'overview';}
function copySettings(){return JSON.parse(JSON.stringify(settings));}
function editScope(next){const id=snapshot.sprint.id;next.sprints[id]??={capacity:{},assignments:{}};next.sprints[id].capacity??={};next.sprints[id].assignments??={};return next.sprints[id];}
function toast(message){
 const el=$('#toast');el.textContent=message;el.classList.remove('hidden');
 requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('show')));
 clearTimeout(toast.timer);toast.timer=setTimeout(()=>{el.classList.remove('show');setTimeout(()=>{if(!el.classList.contains('show'))el.classList.add('hidden');},600);},4200);
}
function notice(message){$('#notice').textContent=message;$('#notice').classList.toggle('hidden',!message);}
class Offline extends Error{}
async function api(path,body){
 let r;
 try{r=await fetch(API_BASE+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Dashboard-Token':token},body:body===undefined?undefined:JSON.stringify(body)});}
 catch{throw new Offline('Không kết nối được server local 127.0.0.1:8765.');}
 const data=await r.json();if(!r.ok)throw new Error(data.error||'Không đọc được dữ liệu.');return data;
}
async function save(next){await api('/api/settings',next);settings=next;}
// skip lists the filter dimensions a cross-filtering chart ignores so it can still show every slice.
function matches(t,skip=[]){
 const on=k=>!skip.includes(k)&&filters[k];
 if(filters.q&&!(t.key+' '+t.summary).toLowerCase().includes(filters.q.toLowerCase()))return false;
 if(on('member')&&assigned(t)!==filters.member)return false;
 if(on('status')&&(filters.status===MISSING?!(isOpen(t)&&t.remainingHours==null):t.status!==filters.status))return false;
 if(on('category')&&category(t)!==filters.category)return false;
 if(on('priority')&&!(filters.priority==='highest'?t.priority==='Highest':['Highest','High'].includes(t.priority)))return false;
 if(on('difficulty')&&analysis(t).difficulty!==filters.difficulty)return false;
 return true;
}
const selectedTasks=(skip=[])=>snapshot.tasks.filter(t=>matches(t,skip));
function selectedLogs(skip=[]){const keys=new Set(snapshot.tasks.filter(t=>matches(t,[...skip,'member'])).map(t=>t.key));return (snapshot.worklogs||[]).filter(w=>keys.has(w.key)&&(skip.includes('member')||!filters.member||w.author===filters.member));}
function selectedLoads(skip=[]){return teamLoads(selectedTasks(skip)).filter(m=>skip.includes('member')||!filters.member||m.name===filters.member);}
function sprintDays(){const start=snapshot.sprint.startDate.slice(0,10),end=snapshot.sprint.endDate.slice(0,10),days=[];for(let d=new Date(start+'T00:00:00Z');d<=new Date(end+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1))days.push(d.toISOString().slice(0,10));return days;}
const isWeekend=day=>[0,6].includes(new Date(day+'T00:00:00Z').getUTCDay());
const statusOrder=()=>{const seen=new Map();for(const t of snapshot.tasks)if(!seen.has(t.status))seen.set(t.status,category(t));const rank={todo:0,review:1,done:2,canceled:3};return [...seen].sort((a,b)=>rank[a[1]]-rank[b[1]]||a[0].localeCompare(b[0])).map(([s])=>s);};
const info=text=>`<button class="info" type="button" data-tip="${esc(text)}" aria-label="${esc(text)}">${ICON.info}</button>`;

function render(animate=false){
 if(!snapshot){$('#scope-bar').innerHTML='';$('#main').innerHTML='<div class="card empty"><h1>Backend sprint dashboard</h1><p>Đồng bộ Jira để tải công việc và từng bản ghi logwork của sprint.</p><button class="button primary" data-action="refresh">Đồng bộ Jira</button></div>';return;}
 const synced=new Date(snapshot.syncedAt);$('#connection').textContent='Đồng bộ '+synced.toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 const sprintOptions=[...sprints].sort((a,b)=>b.id-a.id);if(!sprintOptions.some(s=>s.id===snapshot.sprint.id))sprintOptions.push(snapshot.sprint);
 const stateName={active:'Đang diễn ra',closed:'Đã đóng',future:'Sắp tới'};
 $('#sprint-slot').innerHTML=`<select id="sprint-select" class="popup title" aria-label="Chọn sprint">${sprintOptions.map(s=>`<option value="${s.id}" ${s.id===snapshot.sprint.id?'selected':''}>${esc(s.name)}${s.id===snapshot.sprint.id?'':' — '+(stateName[s.state]||s.state)}</option>`).join('')}</select><small><span class="state ${esc(snapshot.sprint.state)}">${stateName[snapshot.sprint.state]||esc(snapshot.sprint.state)}</span> ${date(snapshot.sprint.startDate)} – ${date(snapshot.sprint.endDate)}</small>`;
 const chips=[filters.member&&`<button class="chip" data-filter="member" data-value="${esc(filters.member)}" aria-label="Bỏ lọc ${esc(person(filters.member)?.short)}"><i style="background:${mvar(person(filters.member))}"></i>${esc(person(filters.member)?.short)}${ICON.close}</button>`,
  filters.category&&`<button class="chip" data-filter="category" data-value="${filters.category}" aria-label="Bỏ lọc ${GROUPS[filters.category]}">${GROUPS[filters.category]}${ICON.close}</button>`].filter(Boolean).join('');
 const base=defaultFilters(),any=Object.keys(filters).some(k=>filters[k]!==base[k]);
 $('#scope-bar').innerHTML=`<label class="search">${ICON.search}<input id="search" type="search" placeholder="Tìm mã task hoặc nội dung" aria-label="Tìm task" value="${esc(filters.q)}"></label>
 <select id="filter-member" class="popup mobile-only ${filters.member?'on':''}" aria-label="Lọc thành viên"><option value="">Mọi thành viên</option>${MEMBERS.map(m=>`<option value="${esc(m.name)}" ${filters.member===m.name?'selected':''}>${m.short}</option>`).join('')}</select>
 <select id="filter-status" class="popup ${filters.status?'on':''}" aria-label="Lọc status"><option value="">Mọi status</option>${statusOrder().map(s=>`<option ${filters.status===s?'selected':''}>${esc(s)}</option>`).join('')}<optgroup label="Estimate"><option value="${MISSING}" ${filters.status===MISSING?'selected':''}>Thiếu remaining estimate</option></optgroup></select>
 <select id="filter-priority" class="popup ${filters.priority?'on':''}" aria-label="Lọc priority">${Object.entries(PRIORITY_FILTERS).map(([v,l])=>`<option value="${v}" ${filters.priority===v?'selected':''}>${l}</option>`).join('')}</select>
 <select id="filter-difficulty" class="popup ${filters.difficulty?'on':''}" aria-label="Lọc độ khó"><option value="">Mọi độ khó</option>${DIFFICULTIES.map(d=>`<option ${filters.difficulty===d?'selected':''}>${d}</option>`).join('')}</select>
 ${chips}${any?'<button class="button plain" data-action="clear-filters">Xóa lọc</button>':''}<span class="grow"></span><span class="filter-count" id="filter-count"></span>`;
 enhanceSelects($('#sprint-slot'));enhanceSelects($('#scope-bar'));
 renderContent(animate);
}
function renderContent(animate=false){
 const tasks=selectedTasks();
 $('#filter-count').textContent=tasks.length===snapshot.tasks.length?`${tasks.length} task`:`${tasks.length} / ${snapshot.tasks.length} task`;
 const counts=selectedTasks(['member']);
 $('#member-list').innerHTML=MEMBERS.map(m=>`<button class="member-row ${filters.member===m.name?'selected':''}" data-filter="member" data-value="${esc(m.name)}" aria-pressed="${filters.member===m.name}"><i style="background:${mvar(m)}"></i><span>${m.short}</span><b>${counts.filter(t=>assigned(t)===m.name).length}</b></button>`).join('');
 const main=$('#main');
 main.innerHTML={overview,progress:progressView,analytics,workload:workloadView,tasks:tasksView}[view]();
 document.title=`${VIEWS[view]} · ${snapshot.sprint.name} · FSLP Backend`;
 const alerts=warnings().filter(w=>w.level!=='info'),link=$('.source-list a[data-view="overview"]');
 let badge=link.querySelector('.nav-badge');if(!badge){badge=document.createElement('b');badge.className='nav-badge';link.append(badge);}
 badge.textContent=alerts.length;badge.hidden=!alerts.length;badge.classList.toggle('critical',alerts.some(w=>w.level==='critical'));link.setAttribute('aria-label',`Tổng quan${alerts.length?`, ${alerts.length} cảnh báo`:''}`);
 setNav();
 const entering=animate&&MOTION();
 if(entering){main.classList.remove('enter');void main.offsetWidth;main.classList.add('enter');clearTimeout(renderContent.t);renderContent.t=setTimeout(()=>main.classList.remove('enter'),1400);}
 else main.classList.remove('enter');
 countUp(main,entering);
}
// Numbers roll from their previous value (or from 0 when a view enters), like macOS counters.
const lastCounts=new Map();
function countUp(root,fromZero){
 for(const el of root.querySelectorAll('.count')){
  const to=Number(el.dataset.to),key=el.dataset.key;
  const from=fromZero?0:key&&lastCounts.has(key)?lastCounts.get(key):to;
  if(key)lastCounts.set(key,to);
  if(!MOTION()||from===to){el.textContent=num(to);continue;}
  const whole=Number.isInteger(to)&&Number.isInteger(from),fmt=v=>num(whole?Math.round(v):Math.round(v*10)/10);
  const start=performance.now(),dur=fromZero?750:480;el.textContent=fmt(from);
  const step=now=>{if(!el.isConnected)return;const p=Math.min(1,(now-start)/dur),e=1-Math.pow(1-p,3);el.textContent=p<1?fmt(from+(to-from)*e):num(to);if(p<1)requestAnimationFrame(step);};
  requestAnimationFrame(step);
 }
}
const count=(n,key='')=>`<span class="count" data-to="${n}"${key?` data-key="${key}"`:''}>${num(n)}</span>`;
// Native <select> stays the source of truth; a macOS-style pop-up button and menu drive it.
const CHECK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const UPDOWN='<svg class="updown" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9.5 4-4 4 4M8 14.5l4 4 4-4"/></svg>';
function enhanceSelects(root){
 for(const sel of root.querySelectorAll('select.popup')){
  if(sel._button)continue;
  const btn=document.createElement('button');btn.type='button';
  btn.className='popup-btn '+[...sel.classList].filter(c=>c!=='popup').join(' ');
  btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-expanded','false');
  sel._sync=()=>{btn.innerHTML=`<span>${esc(sel.selectedOptions[0]?.textContent||'')}</span>${UPDOWN}`;btn.disabled=sel.disabled;btn.setAttribute('aria-label',(sel.getAttribute('aria-label')||'')+': '+(sel.selectedOptions[0]?.textContent||''));};
  sel._sync();sel._button=btn;sel.classList.add('native-hidden');sel.tabIndex=-1;sel.setAttribute('aria-hidden','true');
  sel.after(btn);
  btn.addEventListener('click',()=>{if(Date.now()-(btn._closedAt||0)>250)openMenu(sel,btn);});
  btn.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();openMenu(sel,btn);}});
 }
}
function openMenu(sel,btn){
 if(sel.disabled)return;
 const menu=document.createElement('div');menu.className='menu';menu.popover='auto';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',sel.getAttribute('aria-label')||'');
 const item=o=>`<button type="button" role="option" class="menu-item" data-v="${esc(o.value)}" aria-selected="${o.selected}" tabindex="-1">${CHECK}<span>${esc(o.textContent)}</span></button>`;
 menu.innerHTML=[...sel.children].map(n=>n.tagName==='OPTGROUP'?`<div class="menu-sep"></div><div class="menu-label">${esc(n.label)}</div>${[...n.children].map(item).join('')}`:item(n)).join('');
 (btn.closest('dialog')||document.body).append(menu);
 const r=btn.getBoundingClientRect();menu.style.minWidth=Math.max(180,r.width)+'px';
 menu.showPopover();
 const h=menu.offsetHeight,w=menu.offsetWidth,below=r.bottom+6+h<=innerHeight-8;
 menu.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';menu.style.top=(below?r.bottom+6:Math.max(8,r.top-h-6))+'px';
 menu.style.transformOrigin=below?'top left':'bottom left';
 btn.setAttribute('aria-expanded','true');
 const items=[...menu.querySelectorAll('.menu-item')];
 (items.find(i=>i.getAttribute('aria-selected')==='true')||items[0])?.focus({preventScroll:true});
 const choose=v=>{menu.hidePopover();if(sel.value!==v){sel.value=v;sel._sync();sel.dispatchEvent(new Event('change',{bubbles:true}));}};
 menu.addEventListener('click',e=>{const it=e.target.closest('.menu-item');if(it)choose(it.dataset.v);});
 menu.addEventListener('pointermove',e=>{const it=e.target.closest('.menu-item');if(it&&document.activeElement!==it)it.focus({preventScroll:true});});
 menu.addEventListener('keydown',e=>{
  const i=items.indexOf(document.activeElement),move=n=>{e.preventDefault();items[Math.max(0,Math.min(items.length-1,n))].focus();};
  if(e.key==='ArrowDown')move(i+1);else if(e.key==='ArrowUp')move(i-1);else if(e.key==='Home')move(0);else if(e.key==='End')move(items.length-1);
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(i>=0)choose(items[i].dataset.v);}
  else if(e.key==='Tab')menu.hidePopover();
 });
 menu.addEventListener('toggle',e=>{if(e.newState!=='closed')return;btn._closedAt=Date.now();btn.setAttribute('aria-expanded','false');setTimeout(()=>menu.remove(),300);if(btn.isConnected&&(!document.activeElement||document.activeElement===document.body||menu.contains(document.activeElement)))btn.focus({preventScroll:true});});
}
function setNav(){
 const links=[...document.querySelectorAll('.source-list a')];
 links.forEach(a=>{const on=a.dataset.view===view;a.classList.toggle('active',on);on?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current');});
 moveIndicator();
}
function moveIndicator(){
 const a=$('.source-list a.active'),ind=$('.nav-indicator');if(!a)return;
 if(getComputedStyle($('.source-list')).display==='flex'){ind.style.transform=`translateX(${a.offsetLeft}px)`;ind.style.width=a.offsetWidth+'px';ind.style.height='';}
 else{ind.style.transform=`translateY(${a.offsetTop}px)`;ind.style.height=a.offsetHeight+'px';ind.style.width='';}
}
function banners(){
 const scenario=Object.entries(scope().assignments||{}).filter(([k,v])=>snapshot.tasks.some(t=>t.key===k&&t.assignee!==v)).length;
 return `${scenario?`<div class="note amber">Phân công thử: ${scenario} task đổi owner trên dashboard; Jira giữ nguyên. <button class="button plain" data-action="reset-plan">Xóa phương án thử</button></div>`:''}${snapshot.worklogErrors?.length?`<div class="note amber">Logwork chưa đầy đủ: không đọc được ${snapshot.worklogErrors.length} task (${snapshot.worklogErrors.map(esc).join(', ')}). Tổng giờ là phần đã tải.</div>`:''}`;
}
function overview(){
 const tasks=selectedTasks(),logs=selectedLogs(),team=selectedLoads(),active=tasks.filter(isOpen);
 const missing=active.filter(t=>t.remainingHours==null).length,remaining=active.reduce((s,t)=>s+(t.remainingHours??0),0);
 const original=tasks.reduce((s,t)=>s+(t.originalHours??0),0),estimated=tasks.filter(t=>t.originalHours!=null).length;
 const totalLog=logs.reduce((s,w)=>s+w.hours,0),done=tasks.filter(isComplete).length,review=tasks.filter(t=>category(t)==='review').length;
 const maxCount=Math.max(1,...team.map(x=>x.count));
 return `<header class="view-head"><div><h1>Tổng quan</h1><p>Workload, estimate và logwork của team trong sprint.</p></div></header>
 ${banners()}
 ${warningsCard()}
 <section class="card"><div class="rail-block">${sprintRail()}</div><div class="figures" aria-label="Chỉ số sprint">
  <div class="figure"><div class="figure-label">Task</div><div class="figure-value" id="metric-tasks">${count(tasks.length,'tasks')} <small>/ ${snapshot.tasks.length}</small></div><div class="figure-hint">${done} hoàn thành (${review} chờ nghiệm thu), ${active.length} chưa xong</div></div>
  <div class="figure"><div class="figure-label">Original estimate</div><div class="figure-value">${count(original,'original')} <small>giờ</small></div><div class="figure-hint">${estimated}/${tasks.length} task có estimate</div></div>
  <div class="figure"><div class="figure-label">Logwork trong sprint</div><div class="figure-value" id="metric-log">${snapshot.worklogWindowAvailable?count(totalLog,'log'):'—'} <small>giờ</small></div><div class="figure-hint">${logs.length} bản ghi</div></div>
  <div class="figure ${missing?'warning':''}"><div class="figure-label">Remaining estimate</div><div class="figure-value">${count(remaining,'remaining')} <small>giờ</small></div><div class="figure-hint">${missing?missing+' việc mở chưa có remaining':'Đủ remaining cho việc mở'}</div></div>
 </div></section>
 <div class="grid-2">
  <article class="card" id="charts"><div class="card-head"><h2>Logwork theo ngày ${info('Giờ thực ghi trong sprint theo người ghi log (giờ Việt Nam). Chỉ tính task trong phạm vi dashboard và theo bộ lọc hiện tại.')}</h2><div class="segmented" data-active="${chartMode==='daily'?0:1}" role="group" aria-label="Kiểu biểu đồ"><button data-mode="daily" aria-pressed="${chartMode==='daily'}">Theo ngày</button><button data-mode="cumulative" aria-pressed="${chartMode==='cumulative'}">Lũy kế</button></div></div>
   <div class="card-body"><div class="legend">${MEMBERS.filter(m=>!filters.member||m.name===filters.member).map(m=>`<span><i style="background:${mvar(m)}"></i>${m.short}</span>`).join('')}</div><div id="log-box">${logChart(logs)}</div></div></article>
  <article class="card"><div class="card-head"><h2>Khối lượng theo thành viên ${info('Số task theo owner. Ready for Review / Ready for Integration tính là hoàn thành, chờ nghiệm thu. Số task không phản ánh độ khó hay giờ công.')}</h2></div><div class="card-body"><div class="legend">${Object.entries(GROUPS).map(([k,v])=>`<span><i class="cat-${k}"></i>${v}</span>`).join('')}</div>
   ${team.map((m,i)=>{const by=Object.keys(GROUPS).map(k=>[k,m.tasks.filter(t=>category(t)===k)]);return `<div class="lane"><div class="lane-name">${avatar(m)}${m.short}</div><div class="lane-track" style="width:${m.count/maxCount*100}%;--i:${i}" role="img" aria-label="${esc(m.short)}: ${by.map(([k,l])=>GROUPS[k]+' '+l.length).join(', ')}">${by.filter(([,l])=>l.length).map(([k,l])=>{const detail=[...l.reduce((a,t)=>a.set(t.status,(a.get(t.status)||0)+1),new Map())].map(([s,n])=>`${s}: ${n}`).join('\n');return `<span class="lane-segment cat-${k}" style="flex:${l.length} 1 0" data-tip="${esc(m.short+' · '+GROUPS[k]+'\n'+detail)}">${l.length/m.count>.07?l.length:''}</span>`;}).join('')}</div><div class="lane-total">${m.count}</div></div>`;}).join('')}
  </div></article>
 </div>`;
}
// Working days elapsed in the sprint, counting today; used for expectations and the burndown pace.
function sprintPace(){
 if(!snapshot.worklogWindowAvailable)return {passed:0,total:0,left:0};
 const days=sprintDays(),start=days[0],end=days.at(-1),total=workingDays(start,end);
 if(snapshot.sprint.state==='closed'||today>end)return {passed:total,total,left:0};
 if(today<start)return {passed:0,total,left:total};
 const left=workingDays(today,end);return {passed:total-left+(isWeekend(today)?0:1),total,left};
}
const SEVERITY={critical:'Nghiêm trọng',warning:'Cảnh báo',info:'Lưu ý'};
function warnings(){
 const tasks=selectedTasks(),logs=selectedLogs(),team=selectedLoads(),active=tasks.filter(isOpen),pace=sprintPace(),running=snapshot.sprint.state==='active';
 const out=[],add=(level,icon,title,detail,metric,target='')=>out.push({level,icon,title,detail,metric,target});
 const names=list=>list.slice(0,3).join(', ')+(list.length>3?` và ${list.length-3} người khác`:'');
 const remaining=active.reduce((s,t)=>s+(t.remainingHours??0),0),logged=logs.reduce((s,w)=>s+w.hours,0);
 if(running&&pace.left<=2&&active.length)add(pace.left<=1?'critical':'warning','flag',pace.left?`Sprint còn ${pace.left} ngày làm việc`:'Sprint kết thúc hôm nay',`${active.length} task chưa Done, còn ${num(remaining)}h remaining`,`${active.length}`,'nav:#progress/burndown');
 if(running){const over=team.filter(m=>m.remaining>m.available);if(over.length)add(over.some(m=>m.remaining>1.5*m.available)?'critical':'warning','users','Remaining vượt capacity',over.map(m=>`${m.short} ${num(m.remaining)}h / ${num(m.available)}h`).slice(0,3).join(', '),`${over.length} người`,'nav:#workload/workload');}
 if(running&&pace.total&&pace.passed){const scope=logged+remaining,ideal=scope*(1-pace.passed/pace.total);if(scope&&remaining>ideal*1.15)add(remaining>ideal*1.5?'critical':'warning','trend','Burndown chậm hơn nhịp lý tưởng',`Còn ${num(remaining)}h, nhịp lý tưởng hôm nay ${num(ideal)}h`,`+${num(remaining-ideal)}h`,'nav:#progress/burndown');}
 const overrun=overrunRows(tasks,'all');
 if(!overrun.known)add('info','sync','Chưa tính được task vượt estimate','Bấm để đồng bộ Jira và lấy lịch sử status','','action:refresh');
 else if(overrun.rows.length){const doing=overrun.rows.filter(r=>IN_PROGRESS.includes(r.t.status)).length;add(doing?'critical':'warning','over','Task vượt estimate kể từ khi start',`${doing} đang In Progress, ${overrun.rows.length-doing} Open / Pending`,`${overrun.rows.length}`,'nav:#progress/overrun');}
 const empty=emptyLogs(logs);
 if(!empty.known)add('info','sync','Chưa kiểm tra được nội dung logwork','Bấm để đồng bộ Jira và lấy comment worklog','','action:refresh');
 else if(empty.rows.length){const who=[...new Set(empty.rows.map(w=>person(w.author)?.short||w.author))];add('warning','note','Logwork không có nội dung',`Của ${names(who)}`,`${empty.rows.length}`,'nav:#progress/empty-logs');}
 if(pace.passed){const low=team.filter(m=>{const exp=pace.passed*8*m.focus/100,got=logs.filter(w=>w.author===m.name).reduce((s,w)=>s+w.hours,0);return exp>0&&got<exp*.7;});if(low.length)add('warning','clock','Logwork thấp hơn kỳ vọng',`${names(low.map(m=>m.short))} dưới 70% mức kỳ vọng tới hôm nay`,`${low.length} người`,'nav:#progress/member-logwork');}
 const missing=active.filter(t=>t.remainingHours==null).length;if(missing)add('warning','gap','Thiếu remaining estimate','Việc mở chưa có remaining nên không tính được tải',`${missing}`,'go:status:'+MISSING);
 if(snapshot.worklogErrors?.length)add('warning','gap','Logwork chưa tải đủ',`Không đọc được worklog của ${snapshot.worklogErrors.length} task`,`${snapshot.worklogErrors.length}`,'action:refresh');
 const pend=pendingInSprint(tasks);
 if(pend.known&&pend.rows.length){const still=pend.rows.filter(r=>r.still).length;add(still?'warning':'info','pause','Task bị Pending trong sprint',`${still} vẫn đang Pending, tổng ${num(pend.rows.reduce((s,r)=>s+r.hours,0))}h làm việc bị chặn`,`${pend.rows.length}`,'nav:#progress/pending');}
 else if(!pend.known){const now=tasks.filter(t=>t.status==='Pending').length;if(now)add('info','pause','Task đang Pending','Đồng bộ Jira để xem Pending trong cả sprint',`${now}`,'go:status:Pending');}
 const highest=active.filter(t=>t.priority==='Highest');if(highest.length)add(running&&pace.left<=2?'critical':'warning','flag','Task Highest chưa hoàn thành',`${highest.filter(t=>IN_PROGRESS.includes(t.status)).length} In Progress, ${highest.filter(t=>t.status==='Open').length} Open`,`${highest.length}`,'go:priority:highest');
 const review=tasks.filter(t=>category(t)==='review');if(review.length)add('info','clock','Chờ nghiệm thu','Ready for Review',`${review.length}`,'go:category:review');
 const closable=tasks.filter(canClose);if(closable.length)add('info','check','Ready for Integration có thể chuyển Done','Task FE / Mob liên quan đã Done',`${closable.length}`,'nav:#progress/integration');
 const zero=team.reduce((s,m)=>s+m.staleZero,0);if(zero)add('info','zero','Remaining = 0 nhưng chưa xong','Cần cập nhật estimate trên Jira',`${zero}`);
 const age=Date.now()-Date.parse(snapshot.syncedAt);if(running&&age>12*3600e3)add('info','sync','Dữ liệu đã cũ',`Đồng bộ lần cuối ${Math.round(age/3600e3)} giờ trước`,'','action:refresh');
 const rank={critical:0,warning:1,info:2};return out.sort((a,b)=>rank[a.level]-rank[b.level]);
}
function warningsCard(){
 const list=warnings(),counts=Object.keys(SEVERITY).map(k=>[k,list.filter(w=>w.level===k).length]).filter(([,n])=>n);
 const attr=t=>{if(!t)return '';const [kind,...rest]=t.split(':'),v=rest.join(':');return kind==='nav'?`data-nav="${esc(v)}"`:kind==='go'?`data-go="${esc(v)}"`:`data-action="${esc(v)}"`;};
 const tile=(w,i)=>{const tag=w.target?'button':'div';return `<${tag} class="warn sev-${w.level}" style="--i:${i}" ${attr(w.target)}><span class="warn-icon">${ICON[w.icon]}</span><span class="warn-text"><span class="warn-level">${SEVERITY[w.level]}</span><strong>${esc(w.title)}</strong><small>${esc(w.detail)}</small></span>${w.metric?`<b class="warn-metric">${esc(w.metric)}</b>`:''}${w.target?ICON.chev:''}</${tag}>`;};
 return `<section class="card" id="warnings"><div class="card-head"><h2>Cảnh báo ${info('Cảnh báo tính theo bộ lọc hiện tại. Bấm vào từng mục để tới nơi cần xử lý.')}</h2><div class="sev-summary">${counts.map(([k,n])=>`<span class="sev-count sev-${k}"><i></i>${n} ${SEVERITY[k].toLowerCase()}</span>`).join('')}</div></div>
 ${list.length?`<div class="warn-grid">${list.map(tile).join('')}</div>`:`<div class="warn-clear">${ICON.check}<span><strong>Không có cảnh báo</strong><small>Sprint đang ổn với bộ lọc hiện tại.</small></span></div>`}</section>`;
}
function sprintRail(){
 if(!snapshot.worklogWindowAvailable)return '<div class="rail-caption">Sprint chưa có ngày bắt đầu / kết thúc.</div>';
 const days=sprintDays(),start=days[0],end=days.at(-1),total=workingDays(start,end);
 let caption;
 if(snapshot.sprint.state==='closed'||today>end)caption=`<span>Sprint đã kết thúc</span><span><strong>${total}</strong> ngày làm việc</span>`;
 else if(today<start)caption=`<span>Chưa bắt đầu</span><span><strong>${total}</strong> ngày làm việc</span>`;
 else{const left=workingDays(today,end);caption=`<span>Ngày làm việc <strong>${total-left+(isWeekend(today)?0:1)}</strong> / ${total}</span><span>Còn <strong>${left}</strong> ngày, tính cả hôm nay</span>`;}
 const idx=days.indexOf(today),pos=today>end?100:idx<0?0:(idx+.5)/days.length*100;
 return `<div class="rail-caption">${caption}</div><div class="rail" role="img" aria-label="Tiến độ thời gian sprint"><span class="rail-fill" style="width:${pos}%"></span>${idx>=0&&snapshot.sprint.state!=='closed'?`<span class="rail-today" style="left:${pos}%" data-tip="Hôm nay ${today.slice(8)}/${today.slice(5,7)}"></span>`:''}</div><div class="rail-ends"><span>${start.slice(8)}/${start.slice(5,7)}</span><span>${end.slice(8)}/${end.slice(5,7)}</span></div>`;
}
// Working hours are counted 08:30–17:30 Vietnam time, weekdays only, capped at 8h a day.
const VN_OFFSET=7*3600e3,DAY_START=8.5,DAY_END=17.5,IN_PROGRESS=['In Progress','In Development'];
const vnParts=ms=>{const d=new Date(ms+VN_OFFSET);return {day:d.toISOString().slice(0,10),hour:d.getUTCHours()+d.getUTCMinutes()/60};};
function workedHours(fromIso,toMs){
 const from=Date.parse(fromIso);if(!(from<toMs))return 0;
 const a=vnParts(from),b=vnParts(toMs);let total=0;
 for(let d=new Date(a.day+'T00:00:00Z');d.toISOString().slice(0,10)<=b.day;d.setUTCDate(d.getUTCDate()+1)){
  if([0,6].includes(d.getUTCDay()))continue;const day=d.toISOString().slice(0,10);
  const s=day===a.day?Math.max(a.hour,DAY_START):DAY_START,e=day===b.day?Math.min(b.hour,DAY_END):DAY_END;
  total+=Math.min(8,Math.max(0,e-s));
 }
 return total;
}
// Sprint time left = working hours from now (or sprint start) to 17:30 on the end date.
const sprintEndMs=()=>Date.parse(vnParts(Date.parse(snapshot.sprint.endDate)).day+'T17:30:00+07:00');
function sprintHoursLeft(){
 const s=snapshot.sprint;if(!s.endDate||s.state==='closed')return 0;
 return workedHours(new Date(Math.max(Date.now(),s.startDate?Date.parse(s.startDate):0)).toISOString(),sprintEndMs());
}
// Day (VN) on which h more working hours, counted from now, run out; null when it never does within a year.
function finishDay(h){
 const now=vnParts(Date.now()),d=new Date(now.day+'T00:00:00Z');
 for(let i=0;i<370;i++,d.setUTCDate(d.getUTCDate()+1)){
  if([0,6].includes(d.getUTCDay()))continue;
  const day=d.toISOString().slice(0,10),open=Math.min(8,Math.max(0,DAY_END-(day===now.day?Math.max(now.hour,DAY_START):DAY_START)));
  if(h<=open)return day;h-=open;
 }
 return null;
}
const measureEnd=()=>snapshot.sprint.state==='closed'&&snapshot.sprint.endDate?Math.min(Date.now(),Date.parse(snapshot.sprint.endDate)):Date.now();
function overrunRows(tasks,mode=overrunMode){
 const known=snapshot.tasks.some(t=>'startedAt' in t),end=measureEnd();
 const started=tasks.filter(t=>isOpen(t)&&t.startedAt&&(mode==='all'||IN_PROGRESS.includes(t.status)));
 const rows=started.filter(t=>t.originalHours>0).map(t=>{const elapsed=workedHours(t.startedAt,end);return {t,elapsed,ratio:elapsed/t.originalHours};}).filter(r=>r.elapsed>r.t.originalHours).sort((a,b)=>(PRIORITY_RANK[a.t.priority]??9)-(PRIORITY_RANK[b.t.priority]??9)||b.ratio-a.ratio);
 return {known,rows,noEstimate:started.filter(t=>!(t.originalHours>0)).length};
}
function emptyLogs(logs){
 const all=snapshot.worklogs||[],known=!all.length||all.some(w=>'comment' in w);
 return {known,rows:known?logs.filter(w=>'comment' in w&&!w.comment.trim()).sort((a,b)=>b.day.localeCompare(a.day)):[]};
}
const workedBetween=(a,b)=>workedHours(new Date(a).toISOString(),b);
// Rebuild Pending intervals from status history and clip them to the sprint window (until now).
const isPending=status=>String(status||'').trim().toLowerCase()==='pending';
function pendingInSprint(tasks){
 const known=snapshot.tasks.some(t=>'statusHistory' in t);
 if(!known||!snapshot.sprint.startDate||!snapshot.sprint.endDate)return {known,rows:[]};
 const ws=Date.parse(snapshot.sprint.startDate),end=Date.parse(snapshot.sprint.endDate),we=Math.min(Date.now(),end),rows=[];
 for(const t of tasks){
  const hist=t.statusHistory||[],iv=[];let since=isPending(hist.length?hist[0].from:t.status)?-Infinity:null;
  for(const h of hist){const at=Date.parse(h.at);if(isPending(h.to)&&since==null)since=at;else if(isPending(h.from)&&!isPending(h.to)&&since!=null){iv.push([since,at]);since=null;}}
  // Issues migrated from the old workflow can switch PENDING -> Pending without a history entry.
  if(since==null&&isPending(t.status))since=hist.length?Date.parse(hist.at(-1).at):-Infinity;
  if(since!=null)iv.push([since,Infinity]);
  // Pass-through transitions (e.g. Done -> Pending -> In Progress within seconds) are not real blocks.
  const clipped=iv.filter(([a,b])=>b-a>=5*60e3).map(([a,b])=>[Math.max(a,ws),Math.min(b,we)]).filter(([a,b])=>b>a);
  if(clipped.length)rows.push({t,iv:clipped,hours:clipped.reduce((s,[a,b])=>s+workedBetween(a,b),0),still:t.status==='Pending'});
 }
 rows.sort((a,b)=>Number(b.still)-Number(a.still)||(PRIORITY_RANK[a.t.priority]??9)-(PRIORITY_RANK[b.t.priority]??9)||b.hours-a.hours);
 return {known,rows,ws,end};
}
const stamp=ms=>{const d=new Date(ms+VN_OFFSET);return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;};
function pendingTimeline(pend){
 if(!pend.known)return '<div class="empty">Snapshot hiện tại chưa có lịch sử status. Bấm <strong>Đồng bộ Jira</strong> để xem Pending trong sprint.</div>';
 if(!pend.rows.length)return '<div class="empty">Không có task nào bị Pending trong khoảng thời gian sprint.</div>';
 const days=sprintDays(),span=pend.end-pend.ws,pos=ms=>Math.max(0,Math.min(100,(ms-pend.ws)/span*100)),now=pos(Date.now());
 const axis=`<div class="pend-row pend-axis" aria-hidden="true"><span></span><div class="pend-scale" style="--days:${days.length}">${days.map(d=>`<span class="${d===today?'today-label':isWeekend(d)?'weekend-label':''}">${d.slice(8)}/${d.slice(5,7)}</span>`).join('')}</div><span></span></div>`;
 return `<div class="pend-list">${axis}${pend.rows.map(({t,iv,hours,still},i)=>{const m=person(assigned(t));return `<div class="pend-row" data-task="${t.key}" tabindex="0"><div class="pend-task"><div><span class="task-key" style="color:var(--accent)">${esc(t.key)}</span> ${priorityBadge(t)}</div><span class="task-title">${esc(t.summary)}</span><div class="pend-meta">${m?avatar(m):''}${statusPill(t)}</div></div><div class="pend-track" style="--days:${days.length}">${iv.map(([a,b])=>`<i class="${still&&b>=Date.now()-60e3?'live':''}" style="left:${pos(a)}%;width:${Math.max(.6,pos(b)-pos(a))}%;--i:${i}" data-tip="${esc(`Pending ${stamp(a)} → ${b>=Date.now()-60e3&&still?'hiện tại':stamp(b)}\n${num(workedBetween(a,b))}h làm việc`)}"></i>`).join('')}${snapshot.sprint.state!=='closed'&&now<100?`<span class="pend-now" style="left:${now}%"></span>`:''}</div><div class="pend-dur"><b>${num(hours)}h</b><small class="${still?'warning-text':''}">${still?'Vẫn Pending':'Đã gỡ'}</small></div></div>`;}).join('')}</div>`;
}
const shortDate=iso=>{const d=vnParts(Date.parse(iso)).day;return d.slice(8)+'/'+d.slice(5,7);};
function progressView(){
 const tasks=selectedTasks(),logs=selectedLogs(),loads=selectedLoads(),active=tasks.filter(isOpen);
 const logged=logs.reduce((s,w)=>s+w.hours,0),remaining=active.reduce((s,t)=>s+(t.remainingHours??0),0),missing=active.filter(t=>t.remainingHours==null).length;
 const live=tasks.filter(t=>category(t)!=='canceled'),done=live.filter(t=>category(t)==='done').length,review=live.filter(t=>category(t)==='review').length,empty=emptyLogs(logs),pend=pendingInSprint(tasks);
 let timePct=0,timeHint='Sprint chưa có ngày';
 if(snapshot.worklogWindowAvailable){const days=sprintDays(),start=days[0],end=days.at(-1),total=workingDays(start,end);const passed=today>end||snapshot.sprint.state==='closed'?total:today<start?0:total-workingDays(today,end)+(isWeekend(today)?0:1);timePct=total?passed/total:0;timeHint=`${passed} / ${total} ngày làm việc`;}
 const meter=(label,pct,hint,cls='')=>`<div class="meter-block"><div class="figure-label">${label}</div><div class="figure-value">${count(Math.round(pct*100),'pct-'+(cls||'time'))}<small>%</small></div><div class="progress ${cls}"><i style="width:${Math.min(100,pct*100)}%"></i></div><div class="figure-hint">${hint}</div></div>`;
 return `<header class="view-head"><div><h1>Tiến độ sprint</h1><p>Thời gian đã qua so với khối lượng đã xong và giờ đã log.</p></div></header>
 ${banners()}
 <section class="card"><div class="meters">
  ${meter('Thời gian sprint',timePct,timeHint)}
  ${meter('Task hoàn thành',live.length?(done+review)/live.length:0,`${done} Done (gồm ${live.filter(t=>t.status===INTEGRATION).length} Ready for Integration) + ${review} Ready for Review / ${live.length} task`,'done')}
  ${meter('Giờ đã log / tổng giờ ước tính',logged+remaining?logged/(logged+remaining):0,`${num(logged)}h log, còn ${num(remaining)}h${missing?`, ${missing} việc thiếu estimate`:''}`,'log')}
 </div><div class="card-head" style="padding-top:6px" id="burndown"><h2>Burndown ${info('Đường liền: giờ còn lại ước tính sau mỗi ngày = tổng giờ ước tính (giờ log trong sprint + remaining hiện tại) − giờ đã log tới hết ngày đó. Jira không lưu lịch sử remaining nên đây là ước tính lùi từ logwork. Đường nét đứt: nhịp đều về 0 vào ngày cuối sprint, đi ngang vào cuối tuần.')}</h2><div class="legend" style="margin:0"><span><i style="background:var(--accent)"></i>Còn lại ước tính</span><span><i class="ideal-key"></i>Nhịp lý tưởng</span></div></div><div class="card-body">${burndown(logs,logged+remaining)}</div></section>
 <article class="card" id="member-logwork"><div class="card-head"><h2>Logwork trong sprint ${info('Kỳ vọng = ngày làm việc đã qua (tính cả hôm nay) × 8h × focus của từng người. Focus chỉnh trong Workload → Điều chỉnh capacity.')}</h2><div class="total-hours"><b>${num(logged)}h</b> tổng</div></div><div class="card-body">${memberLogwork(logs,loads,empty)}</div></article>
 <article class="card" id="overrun"><div class="card-head"><h2>Task vượt estimate kể từ khi start ${info('Start = lần đầu task chuyển sang In Progress / In Development trên Jira. Thời gian đã trôi qua tính theo giờ làm việc 08:30–17:30, bỏ cuối tuần, tối đa 8h/ngày. Chỉ xét task chưa hoàn thành; Ready for Integration được tính là Done, Ready for Review là chờ nghiệm thu.')}</h2><div class="segmented" data-active="${overrunMode==='all'?0:1}" role="group" aria-label="Phạm vi task"><button data-overrun="all" aria-pressed="${overrunMode==='all'}">Chưa hoàn thành</button><button data-overrun="doing" aria-pressed="${overrunMode==='doing'}">In Progress</button></div></div><div id="overrun-body">${overrunTable(tasks)}</div></article>
 <article class="card" id="pending"><div class="card-head"><h2>Task bị Pending trong sprint <span class="count-badge ${pend.rows.length?'hot':''}">${pend.rows.length}</span> ${info('Dựng lại từ lịch sử status trên Jira: khoảng thời gian task ở Pending giao với khoảng ngày sprint (tới hiện tại). Giờ bị chặn tính theo giờ làm việc 08:30–17:30, bỏ cuối tuần.')}</h2>${pend.rows.length?`<div class="total-hours"><b>${num(pend.rows.reduce((s,r)=>s+r.hours,0))}h</b> bị chặn</div>`:''}</div>${pendingTimeline(pend)}</article>
 <article class="card" id="empty-logs"><div class="card-head"><h2>Logwork không có nội dung <span class="count-badge ${empty.rows.length?'hot':''}">${empty.rows.length}</span></h2></div>${emptyTable(empty)}</article>
 ${integrationCard(tasks)}`;
}
// BE tasks in Ready for Integration and the FE / Mob tasks (same Story, or linked directly) they wait on.
function integrationCard(tasks){
 const list=tasks.filter(t=>t.status===INTEGRATION),ready=list.filter(canClose);
 const known=list.every(integrationOf);
 const head=`<div class="card-head"><h2>Ready for Integration <span class="count-badge">${list.length}</span> ${info('Với BE, Ready for Integration đã tính là Done. Task FE / Mob liên quan = Task / Bug có label Frontend / FE / Mobile / Mob, nối cùng Story với task BE hoặc nối thẳng vào task BE. Khi mọi task FE / Mob liên quan đã Done, có thể chuyển task BE sang Done trên Jira.')}</h2>${ready.length?`<button class="button primary" data-action="integration">${ICON.check}Chuyển Done (${ready.length})</button>`:''}</div>`;
 if(!list.length)return `<article class="card" id="integration">${head}<p class="fine-print cap-empty">Không có task Ready for Integration khớp bộ lọc.</p></article>`;
 const order=t=>canClose(t)?0:t.integration?.related.length?1:2;
 const side=r=>`<span class="rel-side">${r.sides.join(' + ')}</span>`;
 const rel=r=>`<a class="rel" href="${esc(snapshot.tasks[0]?.url.replace(/[^/]+$/,r.key)||'#')}" target="_blank" rel="noopener noreferrer" data-tip="${esc(`${r.key} ${r.type}: ${r.summary||''}\n${r.status}${r.assignee?' · '+r.assignee:''}`)}">${side(r)}<b>${r.key}</b><span class="pill status-${r.done?'done':'todo'}"><span class="dot"></span>${esc(r.status)}</span></a>`;
 const verdict=t=>!integrationOf(t)?pill('Cần đồng bộ lại'):canClose(t)?pill('Có thể chuyển Done','green'):t.integration.related.length?pill(`Chờ ${t.integration.related.filter(r=>!r.done).length} task FE / Mob`,'amber'):pill('Không có task FE / Mob');
 return `<article class="card" id="integration">${head}
 ${snapshot.integrationError?`<p class="fine-print cap-empty">${esc(snapshot.integrationError)} Đồng bộ lại để thử lần nữa.</p>`:!known?'<p class="fine-print cap-empty">Snapshot cũ chưa có task FE / Mob liên quan. Bấm Đồng bộ Jira để tải.</p>':''}
 <div class="rel-list">${[...list].sort((a,b)=>order(a)-order(b)||a.key.localeCompare(b.key,undefined,{numeric:true})).map(t=>{const m=person(assigned(t));return `<div class="rel-row"><div class="rel-task" data-task="${t.key}" tabindex="0" role="button"><span class="task-key">${t.key}</span><span class="task-title">${esc(t.summary)}</span><span class="rel-owner">${m?avatar(m)+m.short:''}${t.integration?.stories.length?`<small>Story ${t.integration.stories.join(', ')}</small>`:''}</span></div><div class="rel-links">${t.integration?.related.map(rel).join('')||'<span class="muted rel-none">—</span>'}</div><div class="rel-verdict">${verdict(t)}</div></div>`;}).join('')}</div></article>`;
}
function showIntegration(){
 detailKey=null;const ready=selectedTasks().filter(canClose);
 if(!ready.length){toast('Không còn task Ready for Integration nào đủ điều kiện.');return;}
 openDialog(dialogHead('Chuyển Done trên Jira',`<p class="muted" style="font-size:13px">Các task BE dưới đây có mọi task FE / Mob liên quan đã Done. Thao tác này đổi status trên Jira bằng tài khoản của token fsel-jira.</p>`)+
 `<form id="integration-form" class="integration-form">${ready.map(t=>`<label class="int-pick"><input type="checkbox" name="key" value="${t.key}" checked><span><b>${t.key}</b> ${esc(t.summary)}<small>${t.integration.related.map(r=>`${r.sides.join(' + ')} ${r.key}: ${r.status}`).join(', ')}</small></span></label>`).join('')}
 <div class="note">Trước khi chuyển, server kiểm tra lại trực tiếp trên Jira: task vẫn ở Ready for Integration, là task BE của team, và mọi task FE / Mob liên quan đã Done. Task nào không còn đúng sẽ được bỏ qua.</div>
 <div class="dialog-actions"><button class="button primary" type="submit">Chuyển ${ready.length} task sang Done</button><button class="button" type="button" data-action="close">Hủy</button></div></form>`);
}
function burndown(logs,scope){
 if(!snapshot.worklogWindowAvailable)return '<div class="empty">Sprint chưa có ngày bắt đầu / kết thúc.</div>';
 const days=sprintDays(),total=Math.max(1,workingDays(days[0],days.at(-1)));
 let run=0,work=0;const actual=[],ideal=[];
 days.forEach(d=>{run+=logs.filter(w=>w.day===d).reduce((s,w)=>s+w.hours,0);if(!isWeekend(d))work++;actual.push(Math.max(0,scope-run));ideal.push(scope*(1-work/total));});
 const last=snapshot.sprint.state==='closed'||today>days.at(-1)?days.length-1:days.indexOf(today);
 const ceiling=Math.ceil(Math.max(4,scope)*1.08/40)*40;
 const w=1060,h=250,left=44,pad=16,bottom=28,plotH=h-pad-bottom,slot=(w-left-8)/days.length,xEnd=i=>left+(i+1)*slot,y=v=>pad+plotH-v/ceiling*plotH;
 let out=`<svg class="burn-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Burndown: còn ${num(last>=0?actual[last]:scope)} giờ ước tính trên tổng ${num(scope)} giờ">`;
 for(let i=1;i<=4;i++)out+=`<line class="grid" x1="${left}" y1="${y(ceiling*i/4)}" x2="${w-8}" y2="${y(ceiling*i/4)}"/><text x="${left-8}" y="${y(ceiling*i/4)+4}" text-anchor="end">${num(ceiling*i/4)}</text>`;
 out+=`<text x="${left-8}" y="${y(0)+4}" text-anchor="end">0</text><line class="baseline" x1="${left}" y1="${y(0)}" x2="${w-8}" y2="${y(0)}"/>`;
 out+=`<polyline class="ideal" pathLength="1" points="${[`${left},${y(scope)}`,...ideal.map((v,i)=>`${xEnd(i)},${y(v)}`)].join(' ')}"/>`;
 if(last>=0){
  const pts=[`${left},${y(scope)}`,...actual.slice(0,last+1).map((v,i)=>`${xEnd(i)},${y(v)}`)],lx=xEnd(last),ly=y(actual[last]);
  out+=`<path class="burn-area" d="M${left},${y(0)}L${pts.join('L')}L${lx},${y(0)}Z"/><polyline class="burn-line" pathLength="1" points="${pts.join(' ')}"/><circle class="burn-dot" cx="${lx}" cy="${ly}" r="4.5"/><text class="burn-label" x="${lx+10}" y="${ly-10}">${num(actual[last])}h còn lại</text>`;
 }
 days.forEach((d,i)=>{
  if(days.length<=21||i%Math.ceil(days.length/14)===0)out+=`<text class="${d===today?'today-label':isWeekend(d)?'weekend-label':''}" x="${left+i*slot+slot/2}" y="${h-8}" text-anchor="middle">${d.slice(8)}/${d.slice(5,7)}</text>`;
  out+=`<rect class="hit" x="${left+i*slot}" y="${pad}" width="${slot}" height="${plotH}" data-tip="${esc(`Hết ngày ${d.slice(8)}/${d.slice(5,7)}${d===today?' (hôm nay)':''}\n${i<=last?`Còn lại ước tính: ${num(actual[i])}h\n`:''}Nhịp lý tưởng: ${num(ideal[i])}h`)}"/>`;
 });
 return `<div class="chart-scroll">${out}</svg></div>`;
}
function memberLogwork(logs,loads,empty){
 const days=snapshot.worklogWindowAvailable?sprintDays():[],start=days[0],end=days.at(-1);
 const passed=!days.length?0:today<start?0:workingDays(start,today>end||snapshot.sprint.state==='closed'?end:today);
 const rows=loads.map(m=>({m,logged:logs.filter(w=>w.author===m.name).reduce((s,w)=>s+w.hours,0),expected:passed*8*m.focus/100,blank:empty.rows.filter(w=>w.author===m.name).length}));
 const max=Math.max(1,...rows.map(r=>Math.max(r.logged,r.expected)));
 return rows.map((r,i)=>`<div class="log-row"><div class="lane-name">${avatar(r.m)}${r.m.short}</div><div class="log-track" data-tip="${esc(`${r.m.short}: đã log ${num(r.logged)}h\nKỳ vọng tới hôm nay: ${num(r.expected)}h (focus ${r.m.focus}%)`)}"><i style="width:${r.logged/max*100}%;background:${mvar(r.m)};--i:${i}"></i><span class="expect" style="left:${r.expected/max*100}%"></span></div><div class="log-num"><b>${num(r.logged)}h</b><small>/ ${num(r.expected)}h</small></div><div class="log-flag">${r.blank?`<span class="pill amber">${r.blank} log thiếu nội dung</span>`:''}</div></div>`).join('')+`<p class="fine-print" style="margin-top:8px">Vạch dọc là mức kỳ vọng tới hết hôm nay.</p>`;
}
function overrunTable(tasks){
 const o=overrunRows(tasks);
 if(!o.known)return '<div class="empty">Snapshot hiện tại chưa có lịch sử status. Bấm <strong>Đồng bộ Jira</strong> để tính thời gian từ khi start.</div>';
 const body=o.rows.map(({t,elapsed,ratio})=>{const m=person(assigned(t));return `<tr data-task="${t.key}" tabindex="0"><td class="task-summary"><a class="task-key" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">${esc(t.key)}</a> ${priorityBadge(t)}<span class="task-title">${esc(t.summary)}</span></td><td><div class="person-cell">${m?avatar(m):''}<strong>${m?.short||'—'}</strong></div></td><td>${statusPill(t)}</td><td>${shortDate(t.startedAt)}</td><td>${hours(t.originalHours)}</td><td>${num(elapsed)}h</td><td><span class="pill ${ratio>=2?'red':'amber'}">+${num(elapsed-t.originalHours)}h · ${num(ratio)}×</span></td><td>${hours(t.spentHours)}</td></tr>`;}).join('');
 return `<div class="table-wrap"><table><thead><tr><th>Task</th><th>Owner</th><th>Status</th><th>Start</th><th>Original</th><th>Đã trôi qua</th><th>Vượt</th><th>Đã log</th></tr></thead><tbody>${body||'<tr><td colspan="8" class="empty">Không có task nào vượt estimate kể từ khi start.</td></tr>'}</tbody></table></div>${o.noEstimate?`<p class="fine-print" style="padding:0 20px 16px">${o.noEstimate} task đã start nhưng chưa có original estimate nên không so được.</p>`:''}`;
}
function emptyTable(empty){
 if(!empty.known)return '<div class="empty">Snapshot hiện tại chưa có nội dung logwork. Bấm <strong>Đồng bộ Jira</strong> để kiểm tra.</div>';
 if(!empty.rows.length)return '<div class="empty">Mọi bản ghi logwork trong sprint đều có nội dung.</div>';
 return `<div class="table-wrap"><table><thead><tr><th>Ngày log</th><th>Người log</th><th>Task</th><th>Giờ</th></tr></thead><tbody>${empty.rows.map(w=>{const m=person(w.author),t=snapshot.tasks.find(x=>x.key===w.key);return `<tr data-task="${esc(w.key)}" tabindex="0"><td>${w.day.slice(8)}/${w.day.slice(5,7)}</td><td><div class="person-cell">${m?avatar(m):''}<strong>${m?.short||esc(w.author)}</strong></div></td><td class="task-summary"><span class="task-key" style="color:var(--accent)">${esc(w.key)}</span><span class="task-title">${esc(t?.summary||'')}</span></td><td>${hours(w.hours)}</td></tr>`;}).join('')}</tbody></table></div>`;
}
function analytics(){
 const byCat=selectedTasks(['category']),byStatus=selectedTasks(['status']),byDiff=selectedTasks(['difficulty']),logs=selectedLogs(['member']),loads=selectedLoads(['member']);
 const missing=loads.reduce((s,m)=>s+m.missing,0);
 const statuses=statusOrder().map(s=>({s,cat:snapshot.tasks.find(t=>t.status===s)&&category(snapshot.tasks.find(t=>t.status===s)),n:byStatus.filter(t=>t.status===s).length}));
 const maxN=Math.max(1,...statuses.map(x=>x.n));
 return `<header class="view-head"><div><h1>Phân tích</h1><p>Bấm vào lát cắt hoặc dòng chú thích để lọc mọi màn hình; bấm lại để bỏ lọc.</p></div></header>
 <div class="analytics-grid">
  ${donut({title:'Tình trạng hoàn thành',desc:'Ready for Review / Integration = chờ nghiệm thu.',filter:'category',unit:'task',items:Object.entries(GROUPS).map(([k,v])=>({key:k,label:v,color:`var(--c-${k})`,value:byCat.filter(t=>category(t)===k).length})),fmt:String})}
  <article class="card span-2"><div class="card-head"><h2>Status trên Jira</h2></div><div class="bars">${statuses.map((x,i)=>`<button class="bar-row ${filters.status===x.s?'selected':filters.status?'dim':''}" data-filter="status" data-value="${esc(x.s)}" aria-pressed="${filters.status===x.s}" data-tip="${esc(x.s)}: ${x.n} task (${GROUPS[x.cat]})"><span>${esc(x.s)}</span><span class="bar-track"><i class="cat-${x.cat}" style="width:${x.n/maxN*100}%;--i:${i}"></i></span><b>${x.n}</b></button>`).join('')}</div></article>
  ${donut({title:'Độ khó sơ bộ',desc:'Theo engine rule-based.',filter:'difficulty',unit:'task',items:DIFFICULTIES.map(d=>({key:d,label:d,color:dvar(d),value:byDiff.filter(t=>analysis(t).difficulty===d).length})),fmt:String})}
  ${donut({title:'Logwork theo người',desc:snapshot.worklogWindowAvailable?'Ai đang ghi giờ trong sprint.':'Sprint chưa có ngày để lọc logwork.',filter:'member',unit:'giờ',items:MEMBERS.map(m=>({key:m.name,label:m.short,color:mvar(m),value:logs.filter(w=>w.author===m.name).reduce((s,w)=>s+w.hours,0)})),fmt:num})}
  ${donut({title:'Remaining theo owner',desc:missing?`${missing} việc mở thiếu estimate, chưa tính.`:'Giờ còn lại của việc đang mở.',filter:'member',unit:'giờ',items:loads.map(m=>({key:m.name,label:m.short,color:mvar(m),value:m.remaining})),fmt:num})}
 </div>`;
}
let donutId=0;
function donut({title,desc,items,filter,unit,fmt}){
 const sum=items.reduce((s,i)=>s+i.value,0),selected=filters[filter],c=75,R=70,r=46,id='sweep'+(++donutId);
 const pct=v=>sum?Math.round(v/sum*100)+'%':'0%';
 const pt=(rad,a)=>`${(c+rad*Math.cos(a)).toFixed(2)} ${(c+rad*Math.sin(a)).toFixed(2)}`;
 const attrs=i=>`data-filter="${filter}" data-value="${esc(i.key)}" data-tip="${esc(i.label)}: ${fmt(i.value)} ${unit} (${pct(i.value)})" style="fill:${i.color}" class="${selected&&selected!==i.key?'dim':''}"`;
 let a0=-Math.PI/2,marks='';
 for(const i of items.filter(i=>i.value>0)){
  if(i.value===sum){marks+=`<path fill-rule="evenodd" d="M${c-R} ${c}A${R} ${R} 0 1 1 ${c+R} ${c}A${R} ${R} 0 1 1 ${c-R} ${c}ZM${c-r} ${c}A${r} ${r} 0 1 0 ${c+r} ${c}A${r} ${r} 0 1 0 ${c-r} ${c}Z" ${attrs(i)}/>`;break;}
  const a1=a0+i.value/sum*Math.PI*2,large=a1-a0>Math.PI?1:0;
  marks+=`<path d="M${pt(R,a0)}A${R} ${R} 0 ${large} 1 ${pt(R,a1)}L${pt(r,a1)}A${r} ${r} 0 ${large} 0 ${pt(r,a0)}Z" ${attrs(i)}/>`;a0=a1;
 }
 const body=sum?`<defs><mask id="${id}"><circle class="sweep" cx="${c}" cy="${c}" r="58" fill="none" stroke="#fff" stroke-width="40" pathLength="1" stroke-dasharray="1" transform="rotate(-90 ${c} ${c})"/></mask></defs><g mask="url(#${id})">${marks}</g>`:`<circle class="empty-ring" cx="${c}" cy="${c}" r="58"/>`;
 const label=selected&&items.find(i=>i.key===selected);
 return `<article class="card donut-card"><h2>${title}</h2><p>${desc}</p><div class="donut-wrap"><svg class="donut" viewBox="0 0 150 150" role="img" aria-label="${title}: ${items.map(i=>`${i.label} ${fmt(i.value)} ${unit}`).join(', ')}">${body}</svg><div class="donut-center">${label?`<strong>${pct(label.value)}</strong><span>${esc(label.label)}</span>`:`<strong>${sum?fmt(sum):'0'}</strong><span>${sum?unit:'Chưa có dữ liệu'}</span>`}</div></div><div class="legend-list">${items.map(i=>`<button class="legend-row ${selected===i.key?'selected':selected?'dim':''}" data-filter="${filter}" data-value="${esc(i.key)}" aria-pressed="${selected===i.key}"><i style="background:${i.color}"></i><span>${esc(i.label)}</span><b>${fmt(i.value)}</b><em>${pct(i.value)}</em></button>`).join('')}</div></article>`;
}
function logChart(logs){
 if(!snapshot.worklogWindowAvailable)return '<div class="empty">Sprint chưa có ngày bắt đầu / kết thúc để giới hạn logwork.</div>';
 const days=sprintDays(),members=MEMBERS.filter(m=>!filters.member||m.name===filters.member);
 const values=days.map(day=>members.map(m=>logs.filter(w=>w.day===day&&w.author===m.name).reduce((s,w)=>s+w.hours,0)));
 if(chartMode==='cumulative')for(let i=1;i<values.length;i++)for(let j=0;j<members.length;j++)values[i][j]+=values[i-1][j];
 const max=Math.max(4,...values.map(v=>v.reduce((a,b)=>a+b,0))),ceiling=Math.ceil(max/4)*4;
 const w=700,h=230,left=34,top=14,bottom=28,plotH=h-top-bottom,slot=(w-left-8)/Math.max(days.length,1),barW=Math.min(22,slot*.52),y=v=>top+plotH-v/ceiling*plotH;
 let out=`<svg class="log-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Biểu đồ logwork ${chartMode==='daily'?'theo ngày':'lũy kế'}; tổng ${num(logs.reduce((s,w)=>s+w.hours,0))} giờ"><title>Logwork ${esc(snapshot.sprint.name)} theo giờ Việt Nam</title>`;
 for(let i=1;i<=4;i++)out+=`<line class="grid" x1="${left}" y1="${y(ceiling*i/4)}" x2="${w-8}" y2="${y(ceiling*i/4)}"/><text x="${left-8}" y="${y(ceiling*i/4)+4}" text-anchor="end">${num(ceiling*i/4)}</text>`;
 out+=`<text x="${left-8}" y="${y(0)+4}" text-anchor="end">0</text>`;
 const todayIndex=days.indexOf(today);
 if(todayIndex>=0&&snapshot.sprint.state!=='closed'){const x=left+todayIndex*slot+slot/2;out+=`<line class="today-line" x1="${x}" y1="${top-4}" x2="${x}" y2="${top+plotH}"/>`;}
 for(let i=0;i<days.length;i++){
  const x=left+i*slot+(slot-barW)/2,stack=values[i],total=stack.reduce((a,b)=>a+b,0),topIndex=stack.findLastIndex(v=>v>0);let base=0;
  stack.forEach((v,j)=>{if(!v)return;const y0=y(base+v),hh=v/ceiling*plotH,attr=`class="seg" style="fill:${mvar(members[j])};--i:${i}"`;
   if(j===topIndex){const rr=Math.min(6,hh,barW/2);out+=`<path ${attr} d="M${x} ${y0+hh}V${y0+rr}Q${x} ${y0} ${x+rr} ${y0}H${x+barW-rr}Q${x+barW} ${y0} ${x+barW} ${y0+rr}V${y0+hh}Z"/>`;}
   else out+=`<rect ${attr} x="${x}" y="${y0}" width="${barW}" height="${hh}"/>`;base+=v;});
  if(days.length<=21||i%Math.ceil(days.length/14)===0)out+=`<text class="${i===todayIndex?'today-label':isWeekend(days[i])?'weekend-label':''}" x="${left+i*slot+slot/2}" y="${h-8}" text-anchor="middle">${days[i].slice(8)}/${days[i].slice(5,7)}</text>`;
  const tip=`${days[i].slice(8)}/${days[i].slice(5,7)}${i===todayIndex?' (hôm nay)':''}${chartMode==='cumulative'?' · lũy kế':''}\n`+(total?members.map((m,j)=>stack[j]?`${m.short}: ${num(stack[j])}h`:'').filter(Boolean).join('\n')+`\nTổng: ${num(total)}h`:'Chưa có logwork');
  out+=`<rect class="hit" x="${left+i*slot}" y="${top}" width="${slot}" height="${plotH}" rx="4" data-tip="${esc(tip)}"/>`;
 }
 out+=`<line class="baseline" x1="${left}" y1="${y(0)}" x2="${w-8}" y2="${y(0)}"/></svg>`;
 return '<div class="chart-scroll">'+out+'</div><small class="mobile-chart-hint">Vuốt ngang để xem đủ ngày.</small>'+(!logs.length?'<p class="fine-print">Chưa có bản ghi logwork khớp bộ lọc trong khoảng ngày này.</p>':'');
}
// Remaining of unfinished tasks against the working time left in the sprint, per owner and for the team.
function capacityVerdict(R,C){
 if(R>0&&!C)return {level:'red',label:'Không còn capacity'};
 if(R>C)return {level:R>C*1.5?'red':'amber',label:`Thiếu ${num(R-C)}h`};
 if(C&&R/C>=.85)return {level:'amber',label:'Sát capacity'};
 return {level:'green',label:`Dư ${num(C-R)}h`};
}
function capacityCard(team){
 const head=`<div class="card-head"><h2>Remaining so với thời gian còn lại ${info('Remaining = tổng remaining estimate của task chưa hoàn thành (Open, In Progress, Pending…), không tính Ready for Review / Ready for Integration. Thời gian còn lại = giờ làm việc từ bây giờ tới 17:30 ngày kết thúc sprint (08:30–17:30, bỏ cuối tuần). Capacity = thời gian còn lại × focus, hoặc số giờ đã lưu thủ công.')}</h2>`;
 const H=sprintHoursLeft();
 if(snapshot.sprint.state==='closed'||!snapshot.sprint.endDate||H<=0)return `<section class="card" id="capacity-left">${head}</div><p class="fine-print cap-empty">${snapshot.sprint.state==='closed'?'Sprint đã kết thúc, không còn thời gian để so sánh.':'Sprint không còn giờ làm việc nào.'}</p></section>`;
 const endDay=vnParts(sprintEndMs()).day,dm=s=>`${s.slice(8)}/${s.slice(5,7)}`;
 const rows=team.map(m=>({m,R:m.remaining,C:m.available,finish:m.remaining>0&&m.available>0?finishDay(m.remaining*H/m.available):null,...capacityVerdict(m.remaining,m.available)}));
 const R=rows.reduce((s,r)=>s+r.R,0),C=rows.reduce((s,r)=>s+r.C,0),missing=team.reduce((s,m)=>s+m.missing,0),over=rows.filter(r=>r.R>r.C).length,v=capacityVerdict(R,C);
 const max=Math.max(1,...rows.map(r=>Math.max(r.R,r.C)));
 const when=r=>!r.R?'Không còn remaining':!r.finish?'Không ước tính được':r.finish<=endDay?`Dự kiến xong ${dm(r.finish)}`:`Dự kiến ${dm(r.finish)}, trễ hạn`;
 return `<section class="card" id="capacity-left">${head}</div>
 <div class="figures cap-figures">
  <div class="figure"><div class="figure-label">Thời gian còn lại</div><div class="figure-value">${num(H)} <small>giờ</small></div><div class="figure-hint">${workingDays(today,endDay)} ngày làm việc, tới 17:30 ${dm(endDay)}</div></div>
  <div class="figure"><div class="figure-label">Remaining chưa hoàn thành</div><div class="figure-value">${num(R)} <small>giờ</small></div><div class="figure-hint">${missing?`${missing} task chưa có remaining, chưa cộng`:'Mọi task mở đều có remaining'}</div></div>
  <div class="figure"><div class="figure-label">Capacity còn lại</div><div class="figure-value">${num(C)} <small>giờ</small></div><div class="figure-hint">Thời gian còn lại × focus từng người</div></div>
  <div class="figure"><div class="figure-label">Remaining / capacity</div><div class="figure-value">${C?Math.round(R/C*100):'—'}<small>%</small></div><div class="figure-hint">${pill(v.label,v.level)}${over?` ${over} người vượt`:''}</div></div>
 </div>
 <div class="cap-list">${rows.map((r,i)=>`<div class="log-row cap-row"><div class="lane-name">${avatar(r.m)}${r.m.short}</div><div class="cap-track" data-tip="${esc(`${r.m.short}: remaining ${num(r.R)}h / capacity ${num(r.C)}h\nFocus ${r.m.focus}%${r.m.manual?', capacity lưu thủ công':''}${r.m.missing?`\n${r.m.missing} task chưa có remaining`:''}`)}"><i style="width:${Math.min(r.R,r.C)/max*100}%;background:${mvar(r.m)};--i:${i}"></i>${r.R>r.C?`<i class="cap-over" style="left:${r.C/max*100}%;width:${(r.R-r.C)/max*100}%;--i:${i}"></i>`:''}<span class="expect" style="left:${r.C/max*100}%"></span></div><div class="log-num"><b>${num(r.R)}h</b><small>/ ${num(r.C)}h</small></div><div class="log-flag cap-flag">${pill(r.label,r.level)}<small>${when(r)}${r.m.missing?`, ${r.m.missing} task thiếu remaining`:''}</small></div></div>`).join('')}
 <p class="fine-print" style="margin-top:8px">Thanh màu là remaining, vạch dọc là capacity còn lại; phần sọc đỏ là giờ vượt capacity. Ngày dự kiến xong giả định mỗi người làm đều theo focus từ bây giờ.</p></div></section>`;
}
function workloadView(){
 const logs=selectedLogs(),team=selectedLoads(),closed=snapshot.sprint.state==='closed';
 return `<header class="view-head"><div><h1>Workload</h1><p>Original / remaining theo owner, logwork theo người ghi. Đơn vị giờ.</p></div><div class="view-actions"><button class="button" data-action="capacity">Điều chỉnh capacity</button></div></header>
 ${banners()}
 ${capacityCard(team)}
 <section class="card" id="workload"><div class="table-wrap"><table><thead><tr><th>Thành viên</th><th>Task / mở</th><th>Original</th><th>Logwork sprint</th><th>Remaining đã biết</th><th>Capacity còn lại</th><th>Tín hiệu</th></tr></thead><tbody>${team.map(m=>{
  const logged=logs.filter(w=>w.author===m.name).reduce((s,w)=>s+w.hours,0),over=m.remaining>m.available;
  return `<tr><td><div class="person-cell">${avatar(m)}<strong>${m.short}</strong></div></td><td>${m.count} / ${m.active.length}</td><td>${hours(m.original)}<span class="sub">${m.originalCount}/${m.count} có estimate</span></td><td>${snapshot.worklogWindowAvailable?hours(logged):'—'}</td><td>${hours(m.remaining)}<span class="sub">${m.missing} thiếu, ${m.staleZero} cần kiểm tra số 0</span></td><td>${closed?'Đã kết thúc':hours(m.available)}${closed?'':`<div class="ratio" data-tip="Remaining ${hours(m.remaining)} / capacity ${hours(m.available)}"><span class="${over?'over':''}" style="width:${Math.min(100,m.available?m.remaining/m.available*100:100)}%"></span></div>`}</td><td>${closed?pill('Dữ liệu tham chiếu'):over?pill('Vượt capacity','amber'):m.missing||m.staleZero?pill('Cần bổ sung estimate','amber'):pill('Trong capacity','green')}</td></tr>`;}).join('')}</tbody></table></div></section>
 <p class="fine-print">Capacity mặc định = giờ làm việc còn lại của sprint (08:30–17:30, bỏ cuối tuần) × focus, chưa trừ ngày nghỉ. Logwork theo người ghi trên các task trong phạm vi; khi lọc thành viên, task lọc theo owner còn logwork lọc theo người ghi.</p>`;
}
const SORTS={
 key:t=>Number(t.key.split('-')[1])||0,
 owner:t=>person(assigned(t))?.short||null,
 status:t=>({todo:0,review:1,done:2,canceled:3})[category(t)]+'|'+t.status,
 priority:t=>PRIORITY_RANK[t.priority]??null,
 original:t=>t.originalHours,
 remaining:t=>t.remainingHours,
 difficulty:t=>analysis(t).score
};
// Missing values always sort last, whichever direction is chosen.
function sortedTasks(tasks){
 const get=SORTS[taskSort.key];if(!get||!taskSort.dir)return tasks;
 return tasks.map(t=>[t,get(t)]).sort(([,a],[,b])=>a==null&&b==null?0:a==null?1:b==null?-1:(typeof a==='string'?a.localeCompare(b,'vi'):a-b)*taskSort.dir).map(([t])=>t);
}
function sortHead(key,label){
 const on=taskSort.key===key&&taskSort.dir,state=on?(taskSort.dir>0?'ascending':'descending'):'none';
 return `<th aria-sort="${state}"><button class="sort ${on?'on':''} ${taskSort.dir<0&&on?'desc':''}" data-sort="${key}">${label}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18V6M7 11l5-5 5 5"/></svg></button></th>`;
}
function tasksView(){
 const tasks=sortedTasks(selectedTasks());
 return `<header class="view-head"><div><h1>Task</h1><p>Điểm độ khó sơ bộ 0–100. Bấm vào task để xem căn cứ và tự hiệu chỉnh.</p></div><div class="view-actions"><button class="button plain" data-action="rules">Cách tính độ khó</button><button class="button" data-action="export">Xuất CSV</button></div></header>
 ${banners()}
 <section class="card" id="tasks"><div class="table-wrap"><table><thead><tr>${sortHead('key','Task')}${sortHead('owner','Owner')}${sortHead('status','Status')}${sortHead('priority','Priority')}${sortHead('original','Original')}${sortHead('remaining','Remaining')}${sortHead('difficulty','Độ khó')}<th><span class="sr-only">Mở</span></th></tr></thead><tbody>${taskRows(tasks)||'<tr><td colspan="8" class="empty">Không có task khớp bộ lọc. Bấm “Xóa lọc” để xem toàn bộ.</td></tr>'}</tbody></table></div></section>
 <p class="fine-print">Phạm vi: FSLP / ${esc(snapshot.sprint.name)}, label Backend / BackEnd / BE; Task, Bug và Technical Story của Hải, Phương, Phúc, Khoa, Duy. Status và estimate là giá trị hiện tại trên Jira, không phải bản chụp lịch sử lúc đóng sprint.</p>`;
}
function taskRows(tasks){return tasks.map(t=>{const a=analysis(t),m=person(assigned(t));return `<tr data-task="${t.key}" tabindex="0"><td class="task-summary"><a class="task-key" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">${esc(t.key)}</a><span class="task-title">${esc(t.summary)}</span></td><td><div class="person-cell">${m?avatar(m):''}<div><strong>${m?.short||'—'}</strong>${assigned(t)!==t.assignee?'<span class="sub">Phân công thử</span>':''}</div></div></td><td>${statusPill(t)}</td><td>${priorityBadge(t)||`<span class="muted">${esc(t.priority||'—')}</span>`}</td><td>${hours(t.originalHours)}</td><td>${hours(t.remainingHours)}</td><td><div class="score"><span class="score-num" style="--dc:${dvar(a.difficulty)}">${a.score}</span><div>${a.difficulty}<small>${a.confidence}${a.stale?' · cần duyệt lại':''}</small></div></div></td><td><button class="row-open" data-task="${t.key}" aria-label="Phân tích ${t.key}">${ICON.chev}</button></td></tr>`;}).join('');}
function openDialog(html){const d=$('#detail');d.classList.remove('closing');$('#detail-content').innerHTML=html;enhanceSelects(d);if(!d.open)d.showModal();}
function closeDialog(){
 const d=$('#detail');if(!d.open)return;
 if(!MOTION()){d.close();return;}
 d.classList.add('closing');
 const done=e=>{if(e.target!==d)return;d.removeEventListener('animationend',done);d.classList.remove('closing');d.close();};
 d.addEventListener('animationend',done);
}
function dialogHead(title,subtitle=''){return `<div class="detail-head"><div><h2>${title}</h2>${subtitle}</div><button class="icon-button" data-action="close" aria-label="Đóng">${ICON.close}</button></div>`;}
function showDetail(key){
 const t=snapshot.tasks.find(t=>t.key===key);if(!t)return;detailKey=key;
 const a=analysis(t),r=recommend(t,a,teamLoads(),effective()),m=person(r.owner);
 openDialog(dialogHead(esc(t.summary),`<div class="detail-summary" style="margin:0"><a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">${t.key} ↗</a>${statusPill(t)}${pill('Owner Jira: '+person(t.assignee)?.short)}</div>`)+
 `<div class="detail-grid"><div><div class="detail-summary">${pill(a.score+'/100 · '+a.difficulty,'blue')}${pill(a.confidence,a.reviewed?'green':'amber')}${a.gate?pill('Cần Senior / Lead','purple'):''}</div>
 ${a.stale?'<div class="note amber">Nội dung Jira đã thay đổi sau lần hiệu chỉnh trước. Vui lòng duyệt lại.</div>':''}
 <h3>Căn cứ từ nội dung Jira</h3><ul class="evidence-list">${a.evidence.map(e=>`<li><strong>${AXES.find(x=>x.id===e.axis).name}:</strong> ${e.label} (${e.score}/4), từ khóa “${esc(e.match)}”.</li>`).join('')||'<li>Chưa thấy tín hiệu đặc thù; điểm mặc định không chứng minh task dễ.</li>'}</ul>
 ${a.missingDescription?'<div class="note amber" style="margin-top:10px">Mô tả còn thiếu / ngắn. Cần xác nhận scope, acceptance criteria và dependency.</div>':''}
 <h3>Tự hiệu chỉnh độ khó</h3><form id="assessment-form">${AXES.map(x=>`<label class="axis-input"><span>${x.name} <small class="muted">${x.weight}%</small></span><select class="popup" name="${x.id}" aria-label="${x.name}">${LEVELS.map((l,i)=>`<option value="${i}" ${a.axes[x.id]===i?'selected':''}>${i} · ${l}</option>`).join('')}</select></label>`).join('')}<label for="review-note" class="muted" style="font-size:12px;display:block;margin:10px 0 4px">Căn cứ / giả định đã xác nhận</label><textarea id="review-note" name="note" required maxlength="3000" placeholder="Ghi scope, rule, rủi ro hoặc dependency đã xác nhận…">${esc(a.note||'')}</textarea><div class="dialog-actions"><button class="button primary" type="submit">Lưu đánh giá local</button>${settings.assessments[t.key]?'<button class="button" type="button" data-action="reset-assessment">Bỏ hiệu chỉnh</button>':''}</div></form>
 <h3>Mô tả gốc</h3><div class="description">${esc(t.description||'Chưa có mô tả trên Jira.')}</div></div>
 <div><h3>Estimate trên Jira</h3><div class="detail-summary">${pill('Original '+hours(t.originalHours))}${pill('Remaining '+hours(t.remainingHours))}${pill('Đã log toàn issue '+hours(t.spentHours))}</div><p class="muted" style="font-size:12px">Không quy đổi điểm độ khó thành giờ.</p>
 <h3>${r.locked?'Owner được giữ nguyên':'Gợi ý người phụ trách'}</h3><div class="person-cell">${m?avatar(m):''}<strong>${m?.short||'Cần lead quyết định'}</strong></div><p style="font-size:13px;margin-top:10px">${r.reason}</p>${r.mentor?`<p style="font-size:13px;margin-top:6px"><strong>Reviewer:</strong> ${person(r.mentor).short}</p>`:''}${r.provisional?'<div class="note amber" style="margin-top:10px">Đề xuất sơ bộ; bạn tự quyết định sau khi xác nhận scope và estimate.</div>':''}
 ${r.candidates.length?`<h3>Điều kiện phân công</h3>${r.candidates.map(c=>`<div class="candidate"><div class="candidate-title"><strong>${c.short}</strong>${pill(c.eligible?'Có thể cân nhắc':'Chưa đạt điều kiện',c.eligible?'green':'amber')}</div><p>${esc(c.reason)}</p></div>`).join('')}`:''}
 ${!r.locked&&isOpen(t)&&snapshot.sprint.state!=='closed'?`<h3>Thử phân công trên dashboard</h3><select id="assign-owner" class="popup assign-field" aria-label="Người phụ trách thử">${MEMBERS.map(x=>`<option value="${esc(x.name)}" ${x.name===r.owner?'selected':''}>${x.short}</option>`).join('')}</select><p class="muted" style="font-size:12px">Bạn có thể chọn khác gợi ý. Jira không thay đổi.</p><div class="dialog-actions"><button class="button primary" data-action="assign">Áp dụng vào phương án thử</button>${scope().assignments?.[t.key]?'<button class="button" data-action="reset-assignment">Giữ owner Jira</button>':''}</div>`:''}
 </div></div>`);
}
function showCapacity(){detailKey=null;const team=teamLoads();openDialog(dialogHead('Capacity phần sprint còn lại',`<p class="muted" style="font-size:13px">${num(team[0].hoursLeft??0)} giờ làm việc còn lại của sprint (từ bây giờ tới 17:30 ngày kết thúc, bỏ cuối tuần) × focus. Chưa trừ ngày nghỉ cá nhân. Khi lưu, số giờ được giữ cố định, không tự giảm theo thời gian.</p>`)+
 `<form id="capacity-form" class="capacity-form">${team.map((m,i)=>`<div class="capacity-row"><div class="person-cell">${avatar(m)}<strong>${m.short}</strong></div><label>Focus cho task (%)<input name="focus-${i}" type="number" min="0" max="100" step="1" value="${m.focus}" required></label><label>Capacity còn lại (giờ)<input name="hours-${i}" type="number" min="0" max="500" step="0.5" value="${m.available}" required></label></div>`).join('')}<div class="note">Các tỷ lệ focus là giả định khởi tạo, không phải lịch đã xác nhận. Khi lưu, capacity là số giờ cố định của riêng sprint này.</div><div class="dialog-actions"><button class="button primary" type="submit">Lưu capacity</button><button class="button" type="button" data-action="reset-capacity">Dùng công thức theo ngày</button></div></form>`);}
function showRules(){detailKey=null;openDialog(dialogHead('Engine độ khó · rule-based v1')+`<div style="padding:18px 22px 22px"><p style="margin-bottom:8px">Điểm = Σ (mức 0–4 ÷ 4 × trọng số). Engine tìm tín hiệu trong tiêu đề và mô tả Jira; không đọc tài liệu ngoài được liên kết.</p>${AXES.map(a=>`<div class="axis-rule"><div><strong>${a.name}</strong><p>${a.description}</p></div><span>${a.weight}%</span></div>`).join('')}<ul class="rule-list"><li>Mỗi chiều mặc định 1 khi thiếu căn cứ. Thiếu mô tả được đánh dấu độ tin cậy thấp; điểm thấp không chứng minh việc dễ.</li><li>Core, dữ liệu hoặc rủi ro mức 4: nâng điểm tối thiểu lên 65 và cần Senior / Lead.</li><li>Ngưỡng: 0–25 cơ bản; 26–45 vừa; 46–65 khó; 66–80 chuyên sâu; trên 80 rất chuyên sâu.</li><li>Gợi ý người dựa trên domain và capacity; thiếu remaining estimate làm giảm độ tin cậy. Task đã bắt đầu / đang chờ giữ owner.</li><li>Hiệu chỉnh thủ công cần ghi căn cứ. Khi nội dung Jira thay đổi, đánh giá cũ cần duyệt lại.</li></ul><div class="note amber">Quy tắc khởi tạo, chưa hiệu chuẩn theo lịch sử delivery. Không dùng điểm này làm chỉ số năng lực cá nhân.</div></div>`);}
function showOffline(message){
 $('#live-dot').classList.add('off');$('#connection').textContent='Chưa kết nối';$('#scope-bar').innerHTML='';
 $('#main').innerHTML=`<div class="card offline"><h2>Chưa kết nối được server dashboard</h2><p class="muted">${esc(message)} Dashboard đọc Jira qua server local để token không nằm trong trình duyệt.</p><ol><li>Chạy <code>Open Dashboard.cmd</code> trong thư mục <code>backend-dashboard</code>${EXTENSION?' (hoặc <code>start.ps1 -NoBrowser</code> nếu chỉ dùng extension)':''}.</li><li>Đợi vài giây cho server khởi động ở <code>127.0.0.1:8765</code>.</li><li>Bấm <strong>Kết nối lại</strong>.</li></ol><button class="button primary" data-action="retry">Kết nối lại</button></div>`;
}
function setBusy(on){busy=on;const b=$('#refresh');b.disabled=on;b.classList.toggle('busy',on);b.querySelector('span').textContent=on?'Đang đồng bộ…':'Đồng bộ Jira';const sel=$('#sprint-select');if(sel){sel.disabled=on;sel._sync?.();}}
async function sync(sprintId=snapshot?.sprint.id||251){
 if(busy)return;setBusy(true);notice('');
 try{const data=await api('/api/refresh',{sprintId:Number(sprintId)});snapshot=data.snapshot;sprints=data.sprints;today=data.today;
  const next=copySettings(),sc=editScope(next);for(const key of Object.keys(sc.assignments)){const t=snapshot.tasks.find(x=>x.key===key);if(!t||stage(t)!=='todo')delete sc.assignments[key];}
  if(JSON.stringify(next)!==JSON.stringify(settings))await save(next);
  setBusy(false);render(true);if(detailKey&&$('#detail').open)showDetail(detailKey);toast(`Đã tải ${snapshot.tasks.length} task và ${(snapshot.worklogs||[]).length} bản ghi logwork.`);
 }catch(e){setBusy(false);notice(e.message);render();}
}
function exportCsv(){const head=['Sprint','Task','Summary','Owner Jira','Owner phuong an','Status','Priority','Original hours','Remaining hours','Log hours in sprint (all 5 authors)','Difficulty','Confidence'];
 const rows=sortedTasks(selectedTasks()).map(t=>{const a=analysis(t);return [snapshot.sprint.name,t.key,t.summary,t.assignee,assigned(t),t.status,t.priority??'',t.originalHours??'',t.remainingHours??'',(snapshot.worklogs||[]).filter(w=>w.key===t.key).reduce((s,w)=>s+w.hours,0),a.score,a.confidence];});
 const csv='﻿'+[head,...rows].map(row=>row.map(v=>'"'+String(v).replace(/^(\s*[=+@-])/,"'$1").replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`FSLP-${snapshot.sprint.name}-backend.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function showTip(el,x,y){
 const tip=$('#tip'),fresh=tip.classList.contains('hidden');
 if(tip.textContent!==el.dataset.tip)tip.textContent=el.dataset.tip;tip.classList.remove('hidden');
 const w=tip.offsetWidth,h=tip.offsetHeight;let left=x+14,top=y+16;
 if(left+w>innerWidth-8)left=x-w-14;if(top+h>innerHeight-8)top=y-h-14;
 const pos=`translate(${Math.max(8,left)}px,${Math.max(8,top)}px)`;
 if(fresh){tip.style.transition='none';tip.style.transform=pos;void tip.offsetWidth;tip.style.transition='';}
 else tip.style.transform=pos;
}
addEventListener('scroll',()=>{$('#toolbar').classList.toggle('scrolled',scrollY>4);$('#tip').classList.add('hidden');},{passive:true});
addEventListener('resize',moveIndicator);
addEventListener('hashchange',()=>{const v=viewFromHash();if(!snapshot){view=v;setNav();return;}if(v!==view)withTransition('view',()=>{view=v;scrollTo({top:0,behavior:'instant'});renderContent(true);});});
document.addEventListener('pointermove',e=>{const el=e.target.closest?.('[data-tip]');if(!el){$('#tip').classList.add('hidden');return;}showTip(el,e.clientX,e.clientY);});
document.addEventListener('focusin',e=>{const el=e.target.closest?.('[data-tip]');if(el&&e.target.matches(':focus-visible')){const r=el.getBoundingClientRect();showTip(el,r.left,r.bottom);}else $('#tip').classList.add('hidden');});
document.addEventListener('click',async e=>{
 if(e.target.closest('a[href^="http"]'))return;
 const task=e.target.closest('[data-task]');if(task){showDetail(task.dataset.task);return;}
 const mode=e.target.closest('[data-mode]');
 if(mode){chartMode=mode.dataset.mode;const seg=mode.parentElement;seg.dataset.active=chartMode==='daily'?0:1;seg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===mode)));
  const box=$('#log-box');box.innerHTML=logChart(selectedLogs());if(MOTION()){box.classList.remove('enter');void box.offsetWidth;box.classList.add('enter');}return;}
 const nav=e.target.closest('[data-nav]');
 if(nav){const [v,anchor]=nav.dataset.nav.slice(1).split('/');history.pushState(null,'','#'+v);const t=withTransition('view',()=>{view=v;scrollTo({top:0,behavior:'instant'});render(true);});const jump=()=>document.getElementById(anchor)?.scrollIntoView({behavior:MOTION()?'smooth':'auto',block:'start'});t?t.finished.then(jump):requestAnimationFrame(jump);return;}
 const sorter=e.target.closest('[data-sort]');
 if(sorter){const k=sorter.dataset.sort;taskSort=taskSort.key!==k?{key:k,dir:1}:taskSort.dir===1?{key:k,dir:-1}:{key:'',dir:0};withTransition('filter',()=>renderContent());return;}
 const om=e.target.closest('[data-overrun]');
 if(om){overrunMode=om.dataset.overrun;const seg=om.parentElement;seg.dataset.active=overrunMode==='all'?0:1;seg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===om)));$('#overrun-body').innerHTML=overrunTable(selectedTasks());return;}
 const go=e.target.closest('[data-go]');
 if(go){const [k,v]=go.dataset.go.split(/:(.*)/);if(view!=='tasks')history.pushState(null,'','#tasks');withTransition('view',()=>{filters[k]=v;view='tasks';scrollTo({top:0,behavior:'instant'});render(true);});return;}
 const slice=e.target.closest('[data-filter]');if(slice){const k=slice.dataset.filter,v=slice.dataset.value;$('#tip').classList.add('hidden');withTransition('filter',()=>{filters[k]=filters[k]===v?'':v;render();});return;}
 const button=e.target.closest('[data-action]');if(!button)return;
 try{switch(button.dataset.action){
  case'refresh':await sync();break;
  case'retry':await boot();break;
  case'close':closeDialog();break;
  case'clear-filters':withTransition('filter',()=>{filters=defaultFilters();render();});break;
  case'export':exportCsv();break;
  case'capacity':showCapacity();break;
  case'integration':showIntegration();break;
  case'rules':showRules();break;
  case'reset-plan':{const n=copySettings();editScope(n).assignments={};await save(n);renderContent();toast('Đã trở về owner Jira.');break;}
  case'reset-capacity':{const n=copySettings();editScope(n).capacity={};await save(n);renderContent();showCapacity();break;}
  case'reset-assessment':{const n=copySettings();delete n.assessments[detailKey];await save(n);renderContent();showDetail(detailKey);break;}
  case'assign':{const n=copySettings();editScope(n).assignments[detailKey]=$('#assign-owner').value;await save(n);renderContent();showDetail(detailKey);toast('Đã lưu phương án thử. Jira không thay đổi.');break;}
  case'reset-assignment':{const n=copySettings();delete editScope(n).assignments[detailKey];await save(n);renderContent();showDetail(detailKey);break;}
 }}catch(error){toast(error.message);}
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('tr[data-task]')){e.preventDefault();showDetail(e.target.dataset.task);}});
document.addEventListener('input',e=>{
 if(e.target.closest('#integration-form')){const f=e.target.form,n=new FormData(f).getAll('key').length,b=f.querySelector('[type=submit]');b.textContent=`Chuyển ${n} task sang Done`;b.disabled=!n;}
 if(e.target.id==='search'){filters.q=e.target.value;renderContent();}
 if(e.target.name?.startsWith('focus-')){const idx=Number(e.target.name.split('-')[1]);e.target.form.elements['hours-'+idx].value=Math.round(sprintHoursLeft()*Number(e.target.value)/50)/2;}
});
document.addEventListener('change',async e=>{const map={'filter-member':'member','filter-status':'status','filter-difficulty':'difficulty','filter-priority':'priority'};if(map[e.target.id]){const k=map[e.target.id],v=e.target.value;if(k==='priority'){savedPriority=v;try{localStorage.setItem('fslp-priority',v);}catch{}}withTransition('filter',()=>{filters[k]=v;render();});}if(e.target.id==='sprint-select')await sync(e.target.value);});
document.addEventListener('submit',async e=>{
 if(e.target.id==='integration-form'){e.preventDefault();await submitIntegration(e.target);return;}
 if(!['capacity-form','assessment-form'].includes(e.target.id))return;e.preventDefault();const n=copySettings(),data=new FormData(e.target),button=e.target.querySelector('[type=submit]');button.disabled=true;
 try{if(e.target.id==='capacity-form'){const sc=editScope(n);MEMBERS.forEach((m,i)=>{sc.capacity[m.name]={focus:Number(data.get('focus-'+i)),hours:Number(data.get('hours-'+i))};});await save(n);closeDialog();renderContent();toast('Đã lưu capacity cho sprint.');}
 else{const t=snapshot.tasks.find(x=>x.key===detailKey);n.assessments[detailKey]={axes:Object.fromEntries(AXES.map(a=>[a.id,Number(data.get(a.id))])),note:data.get('note'),signature:signature(t)};await save(n);renderContent();showDetail(detailKey);toast('Đã lưu đánh giá local.');}
 }catch(error){toast(error.message);button.disabled=false;}
});
async function submitIntegration(form){
 const keys=new FormData(form).getAll('key'),button=form.querySelector('[type=submit]');
 if(!keys.length){toast('Chọn ít nhất một task.');return;}
 button.disabled=true;button.textContent='Đang chuyển…';
 try{
  const {results}=await api('/api/integration-done',{keys}),ok=results.filter(r=>r.ok);
  openDialog(dialogHead('Kết quả chuyển Done',`<p class="muted" style="font-size:13px">${ok.length} / ${results.length} task đã chuyển Done trên Jira.</p>`)+
   `<div class="int-results">${results.map(r=>`<div class="int-result">${pill(r.ok?'Đã chuyển':'Bỏ qua',r.ok?'green':'amber')}<b>${esc(r.key)}</b><span class="muted">${esc(r.message)}</span></div>`).join('')}</div><div class="dialog-actions" style="padding:0 22px 22px"><button class="button" data-action="close">Đóng</button></div>`);
  if(ok.length)await sync();
 }catch(error){toast(error.message);button.disabled=false;button.textContent=`Chuyển ${keys.length} task sang Done`;}
}
$('#refresh').addEventListener('click',()=>sync());
$('#detail').addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
$('#detail').addEventListener('close',()=>{detailKey=null;});
$('#detail').addEventListener('click',e=>{if(e.target===$('#detail'))closeDialog();});
async function boot(){
 setNav();
 try{const state=await api('/api/state');snapshot=state.snapshot;sprints=state.sprints;settings={sprints:{},assessments:{},...state.settings};token=state.token;today=state.today;$('#live-dot').classList.remove('off');render(true);if(!snapshot||!snapshot.worklogs)await sync();}
 catch(e){if(e instanceof Offline)showOffline(e.message);else{notice(e.message);$('#connection').textContent='Chưa kết nối';}}
}
await boot();
