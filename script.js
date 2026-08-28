(function(){
  "use strict";

  var TASK_KEY = "open-shift:tasks:v1";
  var CHECK_KEY = "open-shift:checks:v1";
  var MEMO_KEY = "open-shift:memo:v1";
  var NOTICE_KEY = "open-shift:notices:v1";
  var NOTICE_CHECK_KEY = "open-shift:notice-checks:v1";

  var DEFAULT_TASKS = [
    "센싱하기",
    "출근해서 메모장에 데일리레코즈북 적기 시작",
    "매니저페이지",
    "신세계상품권",
    "익일스케줄 및 발주결과현황 뽑기",
    "원부재료 재고보충",
    "원부재료 재고실사",
    "우유사용량 입력",
    "20:30 이후 포스 한쪽 마감",
    "중간중간 재고 채워주기(그랩앤고,푸드 등등)",
    "21:00 폐기할 거 미리 빼면서 재고실사 시작(정리하면서 깔끔하게)",
    "21:30분 포스에서 폐기 찍기(폐기 전/후, 영수증 사진 필수)",
    "음쓰 내놓기",
    "재고실사 누락 없는지 확인(재고차이 확인)",
    "오븐 45-50분 off 후 청소",
    "22:00 포스 끄기",
    "빵박스,p-box,우유박스 내놓기(사진 찍기)",
    "캐셔 정산(돈통 두개 다 6만원 맞추기)",
    "일별 점포정산(사진 찍기)",
    "쇼케이스 청소(물통 비우고 소독하기)",
    "명표세팅(발주결과현황 뽑아둔 거 참고)",
    "마지막 둘러보며 매장정리(에어컨,불 확인)",
    "사진찍은 거 확인(빵박스,p-box,우유박스,점포정산)"
  ];

  var WEEKDAYS = ["일","월","화","수","목","금","토"];
  var selectedDay = new Date().getDay();
  var search = "";

  function $(id){ return document.getElementById(id); }
  function uid(prefix){ return prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7); }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  function dateKey(d){
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function load(key,fallback){
    try{ var v=localStorage.getItem(key); return v?JSON.parse(v):fallback; }catch(e){ return fallback; }
  }
  function save(key,val){ try{ localStorage.setItem(key,JSON.stringify(val)); }catch(e){} }

  function loadTasks(){
    var tasks=load(TASK_KEY,null);
    if(!Array.isArray(tasks) || !tasks.length){
      tasks=DEFAULT_TASKS.map(function(text,i){return {id:"seed-"+(i+1),text:text,seed:true};});
      save(TASK_KEY,tasks);
    }
    return tasks;
  }
  function loadChecks(){ return load(CHECK_KEY,{}); }
  function saveChecks(v){ save(CHECK_KEY,v); }

  function loadNotices(){
    var base={"0":[],"1":[],"2":[],"3":[],"4":[],"5":[],"6":[]};
    var raw=load(NOTICE_KEY,null);
    if(!raw || typeof raw!=="object") return base;
    Object.keys(base).forEach(function(k){ if(Array.isArray(raw[k])) base[k]=raw[k]; });
    return base;
  }

  function todayCheckMap(){
    var all=loadChecks();
    var k=dateKey(new Date());
    if(!all[k]) all[k]={};
    return {all:all,key:k,map:all[k]};
  }

  function renderDate(){
    var d=new Date();
    $("todayDate").textContent=d.getFullYear()+"년 "+(d.getMonth()+1)+"월 "+d.getDate()+"일 ("+WEEKDAYS[d.getDay()]+")";
  }

  function renderTasks(){
    var tasks=loadTasks();
    var ck=todayCheckMap();
    var visible=tasks.filter(function(t){ return !search || t.text.toLowerCase().indexOf(search.toLowerCase())!==-1; });
    $("taskList").innerHTML=visible.map(function(t){
      var idx=tasks.findIndex(function(x){return x.id===t.id;});
      var done=!!ck.map[t.id];
      return '<div class="task-item '+(done?'done':'')+'" data-id="'+esc(t.id)+'">'+
        '<span class="task-num">'+String(idx+1).padStart(2,"0")+'</span>'+
        '<button class="task-check" data-act="check">'+(done?'✓':'')+'</button>'+
        '<button class="task-text" data-act="edit">'+esc(t.text)+'</button>'+
        '<div class="task-actions">'+
          '<button class="mini-btn" data-act="up">↑</button>'+
          '<button class="mini-btn" data-act="down">↓</button>'+
          '<button class="mini-btn" data-act="edit">✎</button>'+
          '<button class="mini-btn danger" data-act="delete">×</button>'+
        '</div>'+
      '</div>';
    }).join("");

    var done=tasks.filter(function(t){return !!ck.map[t.id];}).length;
    var total=tasks.length;
    var remain=Math.max(0,total-done);
    var pct=total?Math.round(done/total*100):0;

    $("doneCount").textContent=done;
    $("totalCount").textContent=total;
    $("remainCount").textContent=remain;
    $("progressText").textContent=pct+"%";
    $("listBadge").textContent="총 "+total+"개";
    $("progressBar").style.width=pct+"%";
  }

  function toggleTask(id){
    var ck=todayCheckMap();
    ck.map[id]=!ck.map[id];
    ck.all[ck.key]=ck.map;
    saveChecks(ck.all);
    renderTasks();
  }

  function addTask(){
    var input=$("newTaskInput");
    var text=input.value.trim();
    if(!text) return input.focus();
    var tasks=loadTasks();
    tasks.push({id:uid("task"),text:text,seed:false});
    save(TASK_KEY,tasks);
    input.value="";
    renderTasks();
    input.focus();
  }

  function editTask(id){
    var tasks=loadTasks();
    var item=tasks.find(function(t){return t.id===id;});
    if(!item) return;
    var next=prompt("업무 내용을 수정하세요.",item.text);
    if(next===null) return;
    next=next.trim();
    if(!next) return;
    item.text=next;
    save(TASK_KEY,tasks);
    renderTasks();
  }

  function moveTask(id,delta){
    var tasks=loadTasks();
    var i=tasks.findIndex(function(t){return t.id===id;});
    if(i<0) return;
    var to=Math.max(0,Math.min(tasks.length-1,i+delta));
    if(to===i) return;
    var moved=tasks.splice(i,1)[0];
    tasks.splice(to,0,moved);
    save(TASK_KEY,tasks);
    renderTasks();
  }

  function deleteTask(id){
    var tasks=loadTasks();
    var item=tasks.find(function(t){return t.id===id;});
    if(!item) return;
    if(!confirm("이 업무를 삭제할까요?\n\n"+item.text)) return;
    tasks=tasks.filter(function(t){return t.id!==id;});
    save(TASK_KEY,tasks);
    renderTasks();
  }

  function renderMemo(){
    var memos=load(MEMO_KEY,{});
    var k=dateKey(new Date());
    var text=memos[k]||"";
    $("memoInput").value=text;
    $("memoCount").textContent=text.length+" / 500";
  }

  function saveMemo(){
    var memos=load(MEMO_KEY,{});
    var k=dateKey(new Date());
    memos[k]=$("memoInput").value;
    save(MEMO_KEY,memos);
    $("memoCount").textContent=$("memoInput").value.length+" / 500";
    $("memoSaveLabel").textContent="저장됨";
    setTimeout(function(){$("memoSaveLabel").textContent="자동 저장";},700);
  }

  function renderNotices(){
    var notices=loadNotices();
    var day=String(new Date().getDay());
    var list=notices[day]||[];
    var allChecks=load(NOTICE_CHECK_KEY,{});
    var k=dateKey(new Date());
    if(!allChecks[k]) allChecks[k]={};
    var ck=allChecks[k];

    $("noticeList").innerHTML=list.map(function(n){
      var done=!!ck[n.id];
      return '<div class="notice-item '+(done?'done':'')+'" data-notice-id="'+esc(n.id)+'">'+
        '<button class="notice-check">'+(done?'✓':'')+'</button>'+
        '<span>'+esc(n.text)+'</span>'+
      '</div>';
    }).join("");
    $("noticeEmpty").hidden=list.length>0;
    $("noticeCount").textContent=list.length;
  }

  function toggleNotice(id){
    var all=load(NOTICE_CHECK_KEY,{});
    var k=dateKey(new Date());
    if(!all[k]) all[k]={};
    all[k][id]=!all[k][id];
    save(NOTICE_CHECK_KEY,all);
    renderNotices();
  }

  function renderSettings(){
    var notices=loadNotices();
    document.querySelectorAll("[data-day]").forEach(function(btn){
      btn.classList.toggle("active",Number(btn.dataset.day)===selectedDay);
    });
    var list=notices[String(selectedDay)]||[];
    $("settingsDayTitle").textContent=WEEKDAYS[selectedDay]+"요일 반복 업무";
    $("settingsDayCount").textContent=list.length+"개";
    $("settingsList").innerHTML=list.map(function(n,i){
      return '<div class="settings-row" data-setting-id="'+esc(n.id)+'">'+
        '<span>'+esc(n.text)+'</span>'+
        '<div class="settings-actions">'+
          '<button class="mini-btn" data-set-act="up" '+(i===0?'disabled':'')+'>↑</button>'+
          '<button class="mini-btn" data-set-act="down" '+(i===list.length-1?'disabled':'')+'>↓</button>'+
          '<button class="mini-btn danger" data-set-act="delete">×</button>'+
        '</div>'+
      '</div>';
    }).join("");
  }

  function addNotice(){
    var input=$("noticeInput");
    var text=input.value.trim();
    if(!text) return input.focus();
    var notices=loadNotices();
    notices[String(selectedDay)].push({id:uid("notice"),text:text});
    save(NOTICE_KEY,notices);
    input.value="";
    renderSettings();
    renderNotices();
  }

  function modifyNotice(id,act){
    var notices=loadNotices();
    var list=notices[String(selectedDay)];
    var i=list.findIndex(function(n){return n.id===id;});
    if(i<0) return;
    if(act==="delete") list.splice(i,1);
    if(act==="up" && i>0){ var m=list.splice(i,1)[0]; list.splice(i-1,0,m); }
    if(act==="down" && i<list.length-1){ var m2=list.splice(i,1)[0]; list.splice(i+1,0,m2); }
    save(NOTICE_KEY,notices);
    renderSettings();
    renderNotices();
  }

  function openSettings(){
    selectedDay=new Date().getDay();
    renderSettings();
    $("settingsModal").hidden=false;
  }
  function closeSettings(){ $("settingsModal").hidden=true; }

  function bindScrollButtons(){
    document.querySelectorAll("[data-scroll]").forEach(function(btn){
      btn.addEventListener("click",function(){
        var id=btn.dataset.scroll;
        var target=document.getElementById(id);
        if(target) target.scrollIntoView({behavior:"smooth",block:"start"});
        $("sidebar").classList.remove("open");
        $("scrim").hidden=true;
      });
    });
  }

  function init(){
    renderDate();
    renderTasks();
    renderMemo();
    renderNotices();
    bindScrollButtons();

    $("taskList").addEventListener("click",function(e){
      var row=e.target.closest(".task-item");
      if(!row) return;
      var id=row.dataset.id;
      var act=e.target.closest("[data-act]");
      if(!act) return;
      if(act.dataset.act==="check") toggleTask(id);
      if(act.dataset.act==="edit") editTask(id);
      if(act.dataset.act==="up") moveTask(id,-1);
      if(act.dataset.act==="down") moveTask(id,1);
      if(act.dataset.act==="delete") deleteTask(id);
    });

    $("addTaskBtn").addEventListener("click",addTask);
    $("newTaskInput").addEventListener("keydown",function(e){ if(e.key==="Enter"){e.preventDefault();addTask();} });

    $("searchToggle").addEventListener("click",function(){
      $("searchRow").hidden=!$("searchRow").hidden;
      if(!$("searchRow").hidden) $("searchInput").focus();
    });
    $("searchInput").addEventListener("input",function(){search=$("searchInput").value;renderTasks();});
    $("searchClear").addEventListener("click",function(){search="";$("searchInput").value="";renderTasks();});

    $("memoInput").addEventListener("input",saveMemo);
    $("memoClearBtn").addEventListener("click",function(){$("memoInput").value="";saveMemo();});

    $("noticeList").addEventListener("click",function(e){
      var item=e.target.closest("[data-notice-id]");
      if(item) toggleNotice(item.dataset.noticeId);
    });

    $("noticeSettingsBtn").addEventListener("click",openSettings);
    $("openSettings").addEventListener("click",openSettings);
    $("mobileSettingsBtn").addEventListener("click",openSettings);
    $("closeSettings").addEventListener("click",closeSettings);
    $("settingsModal").addEventListener("click",function(e){if(e.target===$("settingsModal")) closeSettings();});

    $("weekdayTabs").addEventListener("click",function(e){
      var b=e.target.closest("[data-day]");
      if(!b) return;
      selectedDay=Number(b.dataset.day);
      renderSettings();
    });

    $("settingsList").addEventListener("click",function(e){
      var act=e.target.closest("[data-set-act]");
      var row=e.target.closest("[data-setting-id]");
      if(act && row) modifyNotice(row.dataset.settingId,act.dataset.setAct);
    });

    $("addNoticeBtn").addEventListener("click",addNotice);
    $("noticeInput").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();addNotice();}});

    $("menuBtn").addEventListener("click",function(){
      $("sidebar").classList.add("open");
      $("scrim").hidden=false;
    });
    $("scrim").addEventListener("click",function(){
      $("sidebar").classList.remove("open");
      $("scrim").hidden=true;
    });

    $("resetTodayBtn").addEventListener("click",function(){
      if(!confirm("오늘 체크 표시를 모두 초기화할까요?")) return;
      var all=loadChecks();
      all[dateKey(new Date())]={};
      saveChecks(all);
      var nc=load(NOTICE_CHECK_KEY,{});
      nc[dateKey(new Date())]={};
      save(NOTICE_CHECK_KEY,nc);
      renderTasks();
      renderNotices();
    });

    $("quickAddBtn").addEventListener("click",function(){
      $("checklist").scrollIntoView({behavior:"smooth",block:"start"});
      setTimeout(function(){$("newTaskInput").focus();},350);
    });
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();