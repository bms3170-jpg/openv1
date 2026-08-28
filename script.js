(function(){
  "use strict";

  var TASK_KEY="open-shift:v2:tasks", CHECK_KEY="open-shift:v2:checks", MEMO_KEY="open-shift:v2:memos";
  var NOTICE_KEY="open-shift:v2:notices", NOTICE_CHECK_KEY="open-shift:v2:notice-checks";
  var SHIFT_KEY="open-shift:v2:shifts", FINAL_KEY="open-shift:v2:final-checks";
  var WEEKDAYS=["일","월","화","수","목","금","토"];
  var FINAL_ITEMS=[
    {id:"final-photo",text:"사진 확인",desc:"빵박스 · p-box · 우유박스 · 점포정산"},
    {id:"final-cash",text:"정산 확인",desc:"캐셔 및 일별 점포정산"},
    {id:"final-stock",text:"재고 확인",desc:"재고실사 누락 및 재고차이"},
    {id:"final-power",text:"전원 확인",desc:"포스 · 오븐 · 에어컨 · 조명"},
    {id:"final-store",text:"매장 상태",desc:"정리 · 청소 · 퇴근 전 마지막 확인"}
  ];
  var DEFAULT_TASKS=[
    {text:"센싱하기",required:true},
    {text:"출근해서 메모장에 데일리레코즈북 적기 시작",required:true},
    {text:"매니저페이지",required:true},
    {text:"신세계상품권"},
    {text:"익일스케줄 및 발주결과현황 뽑기",required:true},
    {text:"원부재료 재고보충"},
    {text:"원부재료 재고실사",required:true},
    {text:"우유사용량 입력"},
    {text:"20:30 이후 포스 한쪽 마감",time:"20:30",required:true},
    {text:"중간중간 재고 채워주기(그랩앤고,푸드 등등)"},
    {text:"21:00 폐기할 거 미리 빼면서 재고실사 시작(정리하면서 깔끔하게)",time:"21:00",required:true},
    {text:"21:30분 포스에서 폐기 찍기(폐기 전/후, 영수증 사진 필수)",time:"21:30",required:true,photo:true,memo:"폐기 전/후 사진과 영수증 사진 확인"},
    {text:"음쓰 내놓기"},
    {text:"재고실사 누락 없는지 확인(재고차이 확인)",required:true},
    {text:"오븐 45-50분 off 후 청소"},
    {text:"22:00 포스 끄기",time:"22:00",required:true},
    {text:"빵박스,p-box,우유박스 내놓기(사진 찍기)",photo:true},
    {text:"캐셔 정산(돈통 두개 다 6만원 맞추기)",required:true},
    {text:"일별 점포정산(사진 찍기)",required:true,photo:true},
    {text:"쇼케이스 청소(물통 비우고 소독하기)"},
    {text:"명표세팅(발주결과현황 뽑아둔 거 참고)"},
    {text:"마지막 둘러보며 매장정리(에어컨,불 확인)",required:true},
    {text:"사진찍은 거 확인(빵박스,p-box,우유박스,점포정산)",required:true,photo:true}
  ];

  var selectedDay=new Date().getDay(), search="", filter="all";
  function $(id){return document.getElementById(id)}
  function uid(p){return p+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)}
  function esc(s){return String(s||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function dateKey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
  function nowTime(){var d=new Date();return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")}
  function load(k,f){try{var v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(e){return f}}
  function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function normalizeTask(t,i){return {id:typeof t.id==="string"?t.id:"seed-"+(i+1),text:typeof t.text==="string"?t.text:"",memo:typeof t.memo==="string"?t.memo:"",time:typeof t.time==="string"?t.time:"",required:!!t.required,photo:!!t.photo,seed:t.seed!==false,todayHidden:t.todayHidden&&typeof t.todayHidden==="object"?t.todayHidden:{}}}
  function loadTasks(){var t=load(TASK_KEY,null);if(!Array.isArray(t)||!t.length){t=DEFAULT_TASKS.map(function(x,i){return normalizeTask(Object.assign({},x,{id:"seed-"+(i+1),seed:true,todayHidden:{}}),i)});save(TASK_KEY,t)}return t.map(normalizeTask)}
  function loadChecks(){return load(CHECK_KEY,{})}
  function todayCheckMap(){var a=loadChecks(),k=dateKey(new Date());if(!a[k])a[k]={};return {all:a,key:k,map:a[k]}}
  function loadNotices(){var b={"0":[],"1":[],"2":[],"3":[],"4":[],"5":[],"6":[]},r=load(NOTICE_KEY,null);if(!r||typeof r!=="object")return b;Object.keys(b).forEach(function(k){if(Array.isArray(r[k]))b[k]=r[k]});return b}
  function isHiddenToday(t){return !!(t.todayHidden&&t.todayHidden[dateKey(new Date())])}
  function minutesOf(t){if(!t||!/^\d{2}:\d{2}$/.test(t))return null;var p=t.split(":");return Number(p[0])*60+Number(p[1])}
  function currentMinutes(){var d=new Date();return d.getHours()*60+d.getMinutes()}
  function isUrgent(t,done){if(done||!t.time)return false;var diff=minutesOf(t.time)-currentMinutes();return diff>=0&&diff<=30}

  function renderDate(){
    var d=new Date();
    $("todayDate").textContent=d.getFullYear()+"년 "+(d.getMonth()+1)+"월 "+d.getDate()+"일 ("+WEEKDAYS[d.getDay()]+")";
    $("noticeTopDate").textContent=(d.getMonth()+1)+"월 "+d.getDate()+"일 "+WEEKDAYS[d.getDay()]+"요일 반복 업무";
  }

  function taskPassesFilter(t,done){
    if(filter==="pending"&&done)return false;
    if(filter==="required"&&!t.required)return false;
    if(filter==="photo"&&!t.photo)return false;
    if(filter==="timed"&&!t.time)return false;
    return true;
  }

  function renderTasks(){
    var tasks=loadTasks(),ck=todayCheckMap(),visible=tasks.filter(function(t){
      if(isHiddenToday(t))return false;
      var done=!!(ck.map[t.id]&&ck.map[t.id].done);
      if(!taskPassesFilter(t,done))return false;
      return !search||t.text.toLowerCase().indexOf(search.toLowerCase())!==-1||t.memo.toLowerCase().indexOf(search.toLowerCase())!==-1;
    });
    $("taskList").innerHTML=visible.map(function(t){
      var idx=tasks.findIndex(function(x){return x.id===t.id}),state=ck.map[t.id]||{},done=!!state.done,tags="";
      if(t.required)tags+='<span class="task-tag req">★ 필수</span>';
      if(t.photo)tags+='<span class="task-tag photo">📷 사진</span>';
      if(t.time)tags+='<span class="task-tag time">⏰ '+esc(t.time)+'</span>';
      return '<div class="task-item '+(done?'done ':'')+(isUrgent(t,done)?'urgent ':'')+'" data-id="'+esc(t.id)+'">'+
        '<span class="task-num">'+String(idx+1).padStart(2,"0")+'</span>'+
        '<button class="task-check" data-act="check">'+(done?'✓':'')+'</button>'+
        '<div class="task-main"><button class="task-text" data-act="edit">'+esc(t.text)+'</button>'+
        (tags?'<div class="task-meta">'+tags+'</div>':'')+
        (t.memo?'<div class="task-note">'+esc(t.memo)+'</div>':'')+
        (done&&state.time?'<div class="completed-time">'+esc(state.time)+' 완료</div>':'')+
        '</div><div class="task-actions"><button class="mini-btn" data-act="up">↑</button><button class="mini-btn" data-act="down">↓</button><button class="mini-btn" data-act="edit">✎</button><button class="mini-btn danger" data-act="delete">×</button></div></div>';
    }).join("");
    var active=tasks.filter(function(t){return !isHiddenToday(t)}),doneCount=active.filter(function(t){return !!(ck.map[t.id]&&ck.map[t.id].done)}).length,total=active.length,pct=total?Math.round(doneCount/total*100):0;
    var req=active.filter(function(t){return t.required&&!(ck.map[t.id]&&ck.map[t.id].done)}).length;
    var photo=active.filter(function(t){return t.photo&&!(ck.map[t.id]&&ck.map[t.id].done)}).length;
    $("doneCount").textContent=doneCount;$("totalCount").textContent=total;$("progressText").textContent=pct+"%";$("requiredRemainCount").textContent=req;$("photoRemainCount").textContent=photo;$("listBadge").textContent="총 "+total+"개";$("progressBar").style.width=pct+"%";$("summaryDone").textContent=doneCount+" / "+total;
    renderNextTask(tasks,ck.map);renderPhotoCheck(tasks,ck.map);renderTimeGuide(tasks,ck.map);renderSummary();
  }

  function toggleTask(id){
    var ck=todayCheckMap(),cur=ck.map[id]||{};
    ck.map[id]=cur.done?{done:false,time:""}:{done:true,time:nowTime()};ck.all[ck.key]=ck.map;save(CHECK_KEY,ck.all);renderTasks();
    toast(cur.done?"완료를 취소했습니다.":"업무를 완료했습니다.",cur.done?"체크를 되돌렸습니다.":"완료 시간 "+nowTime());
  }

  function addTask(){var i=$("newTaskInput"),text=i.value.trim();if(!text)return i.focus();var t=loadTasks();t.push(normalizeTask({id:uid("task"),text:text,seed:false,todayHidden:{}},t.length));save(TASK_KEY,t);i.value="";renderTasks();i.focus()}
  function openTaskModal(id){var t=loadTasks().find(function(x){return x.id===id});if(!t)return;$("taskEditId").value=id;$("taskEditText").value=t.text;$("taskEditMemo").value=t.memo||"";$("taskEditTime").value=t.time||"";$("taskEditRequired").checked=!!t.required;$("taskEditPhoto").checked=!!t.photo;$("taskEditTodayHidden").checked=isHiddenToday(t);$("taskModal").hidden=false}
  function saveTaskModal(){var id=$("taskEditId").value,tasks=loadTasks(),t=tasks.find(function(x){return x.id===id});if(!t)return;var text=$("taskEditText").value.trim();if(!text)return $("taskEditText").focus();t.text=text;t.memo=$("taskEditMemo").value.trim();t.time=$("taskEditTime").value||"";t.required=$("taskEditRequired").checked;t.photo=$("taskEditPhoto").checked;if(!t.todayHidden)t.todayHidden={};if($("taskEditTodayHidden").checked)t.todayHidden[dateKey(new Date())]=true;else delete t.todayHidden[dateKey(new Date())];save(TASK_KEY,tasks);$("taskModal").hidden=true;renderTasks()}
  function moveTask(id,d){var t=loadTasks(),i=t.findIndex(function(x){return x.id===id});if(i<0)return;var to=Math.max(0,Math.min(t.length-1,i+d));if(to===i)return;var m=t.splice(i,1)[0];t.splice(to,0,m);save(TASK_KEY,t);renderTasks()}
  function deleteTask(id){var t=loadTasks(),item=t.find(function(x){return x.id===id});if(!item||!confirm("이 업무를 삭제할까요?\n\n"+item.text))return;var i=t.findIndex(function(x){return x.id===id});t.splice(i,1);save(TASK_KEY,t);renderTasks();toast("업무를 삭제했습니다.",item.text,"되돌리기",function(){var n=loadTasks();n.splice(Math.min(i,n.length),0,item);save(TASK_KEY,n);renderTasks()})}

  function renderNextTask(tasks,checks){
    var p=tasks.filter(function(t){return !isHiddenToday(t)&&!(checks[t.id]&&checks[t.id].done)});if(!p.length){$("nextTaskCard").hidden=true;return}
    var timed=p.filter(function(t){return !!t.time}).sort(function(a,b){return minutesOf(a.time)-minutesOf(b.time)}),now=currentMinutes(),c=null;
    for(var i=0;i<timed.length;i++){if(minutesOf(timed[i].time)>=now-15){c=timed[i];break}}
    if(!c)c=p[0];$("nextTaskCard").hidden=false;$("nextTaskTitle").textContent=c.text;$("nextTaskDesc").textContent=c.memo||(c.required?"필수 업무입니다.":"다음으로 처리하면 좋은 업무입니다.");$("nextTaskTime").textContent=c.time||"NEXT";$("nextTaskCard").classList.toggle("urgent",isUrgent(c,false));
  }

  function renderPhotoCheck(tasks,checks){var l=tasks.filter(function(t){return t.photo&&!isHiddenToday(t)}),r=l.filter(function(t){return !(checks[t.id]&&checks[t.id].done)}).length;$("photoCheckBadge").textContent=r+"개 남음";$("photoCheckList").innerHTML=l.length?l.map(function(t){var d=!!(checks[t.id]&&checks[t.id].done);return '<div class="compact-row '+(d?'done':'')+'"><span>📷</span><span>'+esc(t.text)+'</span></div>'}).join(""):'<p class="empty-text">사진 업무가 없습니다.</p>'}
  function renderTimeGuide(tasks,checks){var l=tasks.filter(function(t){return !!t.time&&!isHiddenToday(t)}).sort(function(a,b){return minutesOf(a.time)-minutesOf(b.time)});$("timeGuideList").innerHTML=l.length?l.map(function(t){var d=!!(checks[t.id]&&checks[t.id].done);return '<div class="'+(d?'time-done':'')+'"><span>'+esc(t.time)+'</span><p>'+esc(t.text)+'</p><em>'+(d?'완료':'예정')+'</em></div>'}).join(""):'<p class="empty-text">시간 지정 업무가 없습니다.</p>'}

  function renderMemo(){var m=load(MEMO_KEY,{}),k=dateKey(new Date()),text=m[k]||"";$("memoInput").value=text;$("memoCount").textContent=text.length+" / 500"}
  function saveMemo(){var m=load(MEMO_KEY,{}),k=dateKey(new Date());m[k]=$("memoInput").value;save(MEMO_KEY,m);$("memoCount").textContent=$("memoInput").value.length+" / 500";$("memoSaveLabel").textContent="저장됨";setTimeout(function(){$("memoSaveLabel").textContent="자동 저장"},700)}

  function renderNotices(){var n=loadNotices(),day=String(new Date().getDay()),l=n[day]||[],all=load(NOTICE_CHECK_KEY,{}),k=dateKey(new Date());if(!all[k])all[k]={};var ck=all[k],done=0;$("noticeList").innerHTML=l.map(function(x){var d=!!ck[x.id];if(d)done++;return '<div class="notice-item '+(d?'done':'')+'" data-notice-id="'+esc(x.id)+'"><button class="notice-check">'+(d?'✓':'')+'</button><span>'+esc(x.text)+'</span></div>'}).join("");$("noticeEmpty").hidden=l.length>0;$("noticeProgressBadge").textContent=done+" / "+l.length}
  function toggleNotice(id){var a=load(NOTICE_CHECK_KEY,{}),k=dateKey(new Date());if(!a[k])a[k]={};a[k][id]=!a[k][id];save(NOTICE_CHECK_KEY,a);renderNotices()}
  function renderSettings(){var n=loadNotices();document.querySelectorAll("[data-day]").forEach(function(b){b.classList.toggle("active",Number(b.dataset.day)===selectedDay)});var l=n[String(selectedDay)]||[];$("settingsDayTitle").textContent=WEEKDAYS[selectedDay]+"요일 반복 업무";$("settingsDayCount").textContent=l.length+"개";$("settingsList").innerHTML=l.map(function(x,i){return '<div class="settings-row" data-setting-id="'+esc(x.id)+'"><span>'+esc(x.text)+'</span><div class="settings-actions"><button class="mini-btn" data-set-act="up" '+(i===0?'disabled':'')+'>↑</button><button class="mini-btn" data-set-act="down" '+(i===l.length-1?'disabled':'')+'>↓</button><button class="mini-btn danger" data-set-act="delete">×</button></div></div>'}).join("")}
  function addNotice(){var i=$("noticeInput"),text=i.value.trim();if(!text)return i.focus();var n=loadNotices();n[String(selectedDay)].push({id:uid("notice"),text:text});save(NOTICE_KEY,n);i.value="";renderSettings();renderNotices()}
  function modifyNotice(id,a){var n=loadNotices(),l=n[String(selectedDay)],i=l.findIndex(function(x){return x.id===id});if(i<0)return;if(a==="delete")l.splice(i,1);if(a==="up"&&i>0){var m=l.splice(i,1)[0];l.splice(i-1,0,m)}if(a==="down"&&i<l.length-1){var m2=l.splice(i,1)[0];l.splice(i+1,0,m2)}save(NOTICE_KEY,n);renderSettings();renderNotices()}

  function renderFinal(){var a=load(FINAL_KEY,{}),k=dateKey(new Date());if(!a[k])a[k]={};var done=FINAL_ITEMS.filter(function(x){return !!a[k][x.id]}).length;$("finalCheckBadge").textContent=done+" / "+FINAL_ITEMS.length;$("finalCheckList").innerHTML=FINAL_ITEMS.map(function(x){var c=!!a[k][x.id];return '<button class="final-check-item '+(c?'done':'')+'" data-final-id="'+x.id+'">'+(c?'✓ ':'')+esc(x.text)+'<strong>'+esc(x.desc)+'</strong></button>'}).join("")}
  function toggleFinal(id){var a=load(FINAL_KEY,{}),k=dateKey(new Date());if(!a[k])a[k]={};a[k][id]=!a[k][id];save(FINAL_KEY,a);renderFinal()}

  function formatStamp(ts){if(!ts)return "-";var d=new Date(ts);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")}
  function durationText(s,e){if(!s)return "-";var mins=Math.max(0,Math.round(((e||Date.now())-s)/60000)),h=Math.floor(mins/60),m=mins%60;return h?h+"시간 "+m+"분":m+"분"}
  function renderShift(){var sh=load(SHIFT_KEY,{}),k=dateKey(new Date()),s=sh[k]||{};$("shiftStartText").textContent=formatStamp(s.start);$("shiftEndText").textContent=formatStamp(s.end);$("shiftDuration").textContent=durationText(s.start,s.end);if(!s.start){$("shiftBtn").textContent="근무 시작";$("shiftStatusBadge").textContent="근무 전"}else if(!s.end){$("shiftBtn").textContent="근무 종료";$("shiftStatusBadge").textContent="근무 중"}else{$("shiftBtn").textContent="근무 다시 시작";$("shiftStatusBadge").textContent="근무 종료"}}
  function toggleShift(){var sh=load(SHIFT_KEY,{}),k=dateKey(new Date()),s=sh[k]||{};if(!s.start||s.end)s={start:Date.now(),end:null};else s.end=Date.now();sh[k]=s;save(SHIFT_KEY,sh);renderShift();renderSummary()}
  function renderSummary(){renderShift();var t=loadTasks(),ck=todayCheckMap().map,active=t.filter(function(x){return !isHiddenToday(x)}),remain=active.filter(function(x){return !(ck[x.id]&&ck[x.id].done)}),req=remain.filter(function(x){return x.required}),fa=load(FINAL_KEY,{}),fk=fa[dateKey(new Date())]||{},fr=FINAL_ITEMS.filter(function(x){return !fk[x.id]}),w=$("summaryWarning");if(remain.length===0&&fr.length===0){w.textContent="모든 업무와 FINAL CHECK를 완료했습니다.";w.classList.add("complete")}else{w.classList.remove("complete");w.textContent="미완료 업무 "+remain.length+"개 · 필수 "+req.length+"개 · FINAL CHECK "+fr.length+"개 남음"}}

  function bindScrollButtons(){document.querySelectorAll("[data-scroll]").forEach(function(b){b.addEventListener("click",function(){var t=document.getElementById(b.dataset.scroll);if(t)t.scrollIntoView({behavior:"smooth",block:"start"});$("sidebar").classList.remove("open");$("scrim").hidden=true})})}
  function toast(title,desc,action,onAction){var box=document.createElement("div");box.className="toast";box.innerHTML='<div><strong>'+esc(title)+'</strong><span>'+esc(desc||"")+'</span></div>';if(action&&onAction){var b=document.createElement("button");b.textContent=action;b.onclick=function(){onAction();box.remove()};box.appendChild(b)}$("toastWrap").appendChild(box);setTimeout(function(){if(box.parentNode)box.remove()},action?6000:3000)}

  function exportBackup(){
    var payload={version:2,exportedAt:new Date().toISOString(),data:{tasks:load(TASK_KEY,[]),checks:load(CHECK_KEY,{}),memos:load(MEMO_KEY,{}),notices:load(NOTICE_KEY,{}),noticeChecks:load(NOTICE_CHECK_KEY,{}),shifts:load(SHIFT_KEY,{}),finalChecks:load(FINAL_KEY,{})}};
    var blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="open-shift-backup-"+dateKey(new Date())+".json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)
  }
  function importBackup(file){if(!file)return;var r=new FileReader();r.onload=function(){try{var p=JSON.parse(r.result);if(!p||!p.data)throw new Error("invalid");var d=p.data;if(Array.isArray(d.tasks))save(TASK_KEY,d.tasks);if(d.checks)save(CHECK_KEY,d.checks);if(d.memos)save(MEMO_KEY,d.memos);if(d.notices)save(NOTICE_KEY,d.notices);if(d.noticeChecks)save(NOTICE_CHECK_KEY,d.noticeChecks);if(d.shifts)save(SHIFT_KEY,d.shifts);if(d.finalChecks)save(FINAL_KEY,d.finalChecks);renderAll();toast("백업을 복원했습니다.","저장된 데이터를 불러왔습니다.")}catch(e){alert("올바른 Open Shift 백업 파일이 아닙니다.")}$("importInput").value=""};r.readAsText(file)}
  function resetToday(){if(!confirm("오늘 체크와 완료 시간, FINAL CHECK를 초기화할까요?\n요일 설정과 업무 목록은 유지됩니다."))return;var k=dateKey(new Date()),c=load(CHECK_KEY,{}),n=load(NOTICE_CHECK_KEY,{}),f=load(FINAL_KEY,{});c[k]={};n[k]={};f[k]={};save(CHECK_KEY,c);save(NOTICE_CHECK_KEY,n);save(FINAL_KEY,f);renderAll()}
  function renderAll(){renderDate();renderTasks();renderMemo();renderNotices();renderFinal();renderShift();renderSummary()}

  function init(){
    renderAll();bindScrollButtons();
    $("taskList").addEventListener("click",function(e){var row=e.target.closest(".task-item"),a=e.target.closest("[data-act]");if(!row||!a)return;var id=row.dataset.id;if(a.dataset.act==="check")toggleTask(id);if(a.dataset.act==="edit")openTaskModal(id);if(a.dataset.act==="up")moveTask(id,-1);if(a.dataset.act==="down")moveTask(id,1);if(a.dataset.act==="delete")deleteTask(id)});
    $("addTaskBtn").addEventListener("click",addTask);$("newTaskInput").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();addTask()}});
    document.querySelectorAll(".filter-btn").forEach(function(b){b.addEventListener("click",function(){filter=b.dataset.filter;document.querySelectorAll(".filter-btn").forEach(function(x){x.classList.toggle("active",x===b)});renderTasks()})});
    $("searchToggle").addEventListener("click",function(){$("searchRow").hidden=!$("searchRow").hidden;if(!$("searchRow").hidden)$("searchInput").focus()});$("searchInput").addEventListener("input",function(){search=$("searchInput").value;renderTasks()});$("searchClear").addEventListener("click",function(){search="";$("searchInput").value="";renderTasks()});
    $("memoInput").addEventListener("input",saveMemo);$("memoClearBtn").addEventListener("click",function(){$("memoInput").value="";saveMemo()});
    $("noticeList").addEventListener("click",function(e){var i=e.target.closest("[data-notice-id]");if(i)toggleNotice(i.dataset.noticeId)});
    function openSettings(){selectedDay=new Date().getDay();renderSettings();$("settingsModal").hidden=false}
    $("noticeSettingsBtn").addEventListener("click",openSettings);$("openSettings").addEventListener("click",openSettings);$("mobileSettingsBtn").addEventListener("click",openSettings);$("closeSettings").addEventListener("click",function(){$("settingsModal").hidden=true});$("settingsModal").addEventListener("click",function(e){if(e.target===$("settingsModal"))$("settingsModal").hidden=true});
    $("weekdayTabs").addEventListener("click",function(e){var b=e.target.closest("[data-day]");if(!b)return;selectedDay=Number(b.dataset.day);renderSettings()});$("settingsList").addEventListener("click",function(e){var a=e.target.closest("[data-set-act]"),r=e.target.closest("[data-setting-id]");if(a&&r)modifyNotice(r.dataset.settingId,a.dataset.setAct)});$("addNoticeBtn").addEventListener("click",addNotice);$("noticeInput").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();addNotice()}});
    $("taskModalSave").addEventListener("click",saveTaskModal);$("taskModalCancel").addEventListener("click",function(){$("taskModal").hidden=true});$("closeTaskModal").addEventListener("click",function(){$("taskModal").hidden=true});$("taskModal").addEventListener("click",function(e){if(e.target===$("taskModal"))$("taskModal").hidden=true});
    $("finalCheckList").addEventListener("click",function(e){var b=e.target.closest("[data-final-id]");if(b){toggleFinal(b.dataset.finalId);renderSummary()}});
    $("shiftBtn").addEventListener("click",toggleShift);$("resetTodayBtn").addEventListener("click",resetToday);$("quickAddBtn").addEventListener("click",function(){$("checklist").scrollIntoView({behavior:"smooth",block:"start"});setTimeout(function(){$("newTaskInput").focus()},350)});
    $("exportBtn").addEventListener("click",exportBackup);$("importInput").addEventListener("change",function(){importBackup($("importInput").files[0])});
    $("menuBtn").addEventListener("click",function(){$("sidebar").classList.add("open");$("scrim").hidden=false});$("scrim").addEventListener("click",function(){$("sidebar").classList.remove("open");$("scrim").hidden=true});
    setInterval(function(){renderTasks();renderShift()},60000);window.addEventListener("focus",renderAll);window.addEventListener("storage",renderAll);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();