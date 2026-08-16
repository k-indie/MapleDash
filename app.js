(() => {
  const cfg = window.APP_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_PUBLISHABLE_KEY &&
    !cfg.SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
    cfg.SUPABASE_PUBLISHABLE_KEY !== "YOUR_PUBLISHABLE_KEY";

  const $ = id => document.getElementById(id);
  const fmt = new Intl.NumberFormat("ko-KR");
  let sb = null;
  let user = null;
  let checklist = [];
  let characters = [];
  let characterCheckStates=[];
  let checklistEditingCharacter=null;
  let bossSelections = [];
  let bossEditingCharacter = null;
  let bossDraft = new Map();
  const BOSS_CATALOG = [
    ["시그너스","이지",4550000,"시"],["힐라","하드",1280000,"힐"],["핑크빈","카오스",1320000,"핑"],["시그너스","노멀",1360000,"시"],
    ["자쿰","카오스",8080000,"자"],["블러디 퀸","카오스",8140000,"퀸"],["반반","카오스",8150000,"반"],["피에르","카오스",8170000,"피"],["매그너스","하드",8560000,"매"],["벨룸","카오스",9280000,"벨"],
    ["파풀라투스","카오스",13100000,"파"],["스우","노멀",16700000,"스"],["데미안","노멀",17500000,"데"],["가디언 엔젤 슬라임","노멀",25500000,"가"],["루시드","이지",29800000,"루"],["윌","이지",32300000,"윌"],
    ["루시드","노멀",35600000,"루"],["윌","노멀",41100000,"윌"],["더스크","노멀",44000000,"더"],["듄켈","노멀",47500000,"듄"],["데미안","하드",48900000,"데"],["스우","하드",51500000,"스"],
    ["루시드","하드",62900000,"루"],["더스크","카오스",69800000,"더"],["진 힐라","노멀",71200000,"진"],["가디언 엔젤 슬라임","카오스",75100000,"가"],["윌","하드",77100000,"윌"],["듄켈","하드",94400000,"듄"],["진 힐라","하드",106000000,"진"],
    ["선택받은 세렌","노멀",239000000,"세"],["감시자 칼로스","이지",280000000,"칼"],["최초의 대적자","이지",308000000,"대"],["선택받은 세렌","하드",356000000,"세"],["카링","이지",377000000,"카"],["감시자 칼로스","노멀",505000000,"칼"],
    ["최초의 대적자","노멀",560000000,"대"],["스우","익스트림",574000000,"스"],["찬란한 흉성","노멀",625000000,"흉"],["검은 마법사","하드(월간)",665000000,"검"],["카링","노멀",678000000,"카"],["림보","노멀",1026000000,"림"],
    ["감시자 칼로스","카오스",1273000000,"칼"],["발드릭스","노멀",1368000000,"발"],["최초의 대적자","하드",1435000000,"대"],["유피테르","노멀",1615000000,"유"],["카링","하드",1739000000,"카"],["림보","하드",2385000000,"림"],
    ["찬란한 흉성","하드",2678000000,"흉"],["선택받은 세렌","익스트림",2835000000,"세"],["발드릭스","하드",3078000000,"발"],["감시자 칼로스","익스트림",4104000000,"칼"],["최초의 대적자","익스트림",4712000000,"대"],["유피테르","하드",4845000000,"유"],["카링","익스트림",5387000000,"카"],["검은 마법사","익스트림(월간)",8740000000,"검"]
  ].map(([name,difficulty,price,short])=>({name,difficulty,price,short,key:`${name}-${difficulty}`}));

  let isLoading = false;

  const shortMoney = value => {
    let n = Math.floor(Number(value || 0));
    const sign = n < 0 ? "-" : "";
    n = Math.abs(n);

    const eok = Math.floor(n / 100000000);
    const man = Math.floor((n % 100000000) / 10000);
    const rest = n % 10000;

    const parts = [];
    if (eok > 0) parts.push(`${fmt.format(eok)}억`);
    if (man > 0) parts.push(`${fmt.format(man)}만`);

    if (parts.length === 0) {
      return `${sign}${fmt.format(rest)}`;
    }

    return `${sign}${parts.join(" ")}`;
  };

  const setSync = text => {
    const el = $("syncStatus");
    if (el) el.textContent = text;
  };

  function showView(viewId) {
    document.querySelectorAll(".app-view-section").forEach(section => section.classList.add("hidden"));
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    $(viewId).classList.remove("hidden");
    document.querySelector(`.nav-btn[data-view="${viewId}"]`)?.classList.add("active");
  }

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  if (!configured) {
    $("authMessage").textContent = "config.js에 Supabase URL과 Publishable Key를 입력해주세요.";
    $("authMessage").style.color = "#ff727c";
    document.querySelectorAll("input,button,select,textarea").forEach(el => el.disabled = true);
    return;
  }

  sb = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    }
  );

  function showAuth() {
    $("appView").classList.add("hidden");
    $("authView").classList.remove("hidden");
  }

  function showApp() {
    $("authView").classList.add("hidden");
    $("appView").classList.remove("hidden");
  }

  async function loadAll() {
    if (!user || isLoading) return;
    isLoading = true;
    setSync("불러오는 중…");

    try {
      const [c, ch, bs, cs] = await Promise.all([
        sb.from("maple_checklist").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
        sb.from("maple_characters").select("*").eq("user_id", user.id).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
        sb.from("character_boss_selections").select("*").eq("user_id", user.id),
        sb.from("character_check_states").select("*").eq("user_id", user.id)
      ]);

      if (c.error) throw c.error;
      if (ch.error) throw ch.error;
      if (bs.error) throw bs.error;
      if (cs.error) throw cs.error;

      checklist = c.data || [];
      characters = ch.data || [];
      bossSelections = bs.data || [];
      characterCheckStates = cs.data || [];
      renderAll();
      setSync("동기화됨");
    } catch (err) {
      console.error(err);
      setSync("불러오기 실패");
      alert(`데이터를 불러오지 못했습니다.\n${err.message || err}`);
    } finally {
      isLoading = false;
    }
  }

  async function setUser(nextUser) {
    user = nextUser || null;

    if (!user) {
      showAuth();
      return;
    }

    showApp();
    await loadAll();
  }

  $("authForm").addEventListener("submit", async e => {
    e.preventDefault();

    $("authMessage").textContent = "로그인 중…";

    const { data, error } = await sb.auth.signInWithPassword({
      email: $("emailInput").value.trim(),
      password: $("passwordInput").value
    });

    if (error) {
      $("authMessage").textContent = `로그인 실패: ${error.message}`;
      return;
    }

    $("authMessage").textContent = "";
    await setUser(data.user);
  });

  $("signupBtn").addEventListener("click", async () => {
    const email = $("emailInput").value.trim();
    const password = $("passwordInput").value;

    if (!email || password.length < 6) {
      $("authMessage").textContent = "이메일과 6자 이상의 비밀번호를 입력해주세요.";
      return;
    }

    const { data, error } = await sb.auth.signUp({ email, password });

    if (error) {
      $("authMessage").textContent = `회원가입 실패: ${error.message}`;
      return;
    }

    if (data.session && data.user) {
      await setUser(data.user);
    } else {
      $("authMessage").textContent =
        "회원가입 완료. 이메일 인증이 켜져 있다면 인증 메일을 확인한 뒤 로그인하세요.";
    }
  });

  $("logoutBtn").addEventListener("click", async () => {
    await sb.auth.signOut();
    user = null;
    showAuth();
  });

  function startOfToday(now = new Date()) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  function startOfWeeklyReset(now = new Date()) {
    const reset = startOfToday(now);
    const day = reset.getDay();
    const daysSinceThursday = (day - 4 + 7) % 7;
    reset.setDate(reset.getDate() - daysSinceThursday);
    return reset;
  }

  function startOfMonth(now = new Date()) {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  function resetBoundary(cycle) {
    if (cycle === "daily") return startOfToday();
    if (cycle === "weekly") return startOfWeeklyReset();
    if (cycle === "monthly") return startOfMonth();
    return new Date(0);
  }

  function isCompleted(item) {
    if (!item.completed_at) return false;
    return new Date(item.completed_at) >= resetBoundary(item.cycle);
  }

  function renderChecklistGroup(cycle, boxId) {
    const box = $(boxId);
    box.innerHTML = "";

    const items = checklist.filter(item => item.cycle === cycle);

    if (!items.length) {
      box.innerHTML = '<div class="empty-state">등록된 항목이 없습니다.</div>';
      return;
    }

    items.forEach(item => {
      const done = isCompleted(item);
      const row = document.createElement("div");
      row.className = `record-row ${done ? "done" : ""}`;

      row.innerHTML = `
        <button class="check-btn ${done ? "checked" : ""}" type="button">✓</button>
        <div class="record-title"></div>
        <button class="delete-btn" type="button">삭제</button>
      `;

      row.querySelector(".record-title").textContent = item.title;

      row.querySelector(".check-btn").addEventListener("click", async () => {
        const { data, error } = await sb
          .from("maple_checklist")
          .update({ completed_at: done ? null : new Date().toISOString() })
          .eq("id", item.id)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) return alert(error.message);

        Object.assign(item, data);
        renderAll();
      });

      row.querySelector(".delete-btn").addEventListener("click", async () => {
        if (!confirm("이 체크 항목을 삭제할까요?")) return;

        const { error } = await sb
          .from("maple_checklist")
          .delete()
          .eq("id", item.id)
          .eq("user_id", user.id);

        if (error) return alert(error.message);

        checklist = checklist.filter(x => x.id !== item.id);
        renderAll();
      });

      box.appendChild(row);
    });
  }

  function renderChecklist() {
    renderChecklistGroup("daily", "dailyChecklist");
    renderChecklistGroup("weekly", "weeklyChecklist");
    renderChecklistGroup("monthly", "monthlyChecklist");
  }

  $("checklistForm").addEventListener("submit", async e => {
    e.preventDefault();
    e.stopPropagation();

    const title = $("checkTitle").value.trim();
    if (!title || !user) return;

    const submitButton = e.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const { data, error } = await sb
        .from("maple_checklist")
        .insert({
          user_id: user.id,
          title,
          cycle: $("checkCycle").value
        })
        .select()
        .single();

      if (error) throw error;

      checklist.push(data);
      $("checkTitle").value = "";
      renderAll();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      submitButton.disabled = false;
    }
  });

  async function fetchCharacterProfile(characterName) {
    const { data, error } = await sb.functions.invoke("maple-character", {
      body: { character_name: characterName }
    });

    if (error) {
      console.error(error);
      throw new Error("캐릭터 정보를 불러오지 못했습니다. Edge Function과 NEXON API Key 설정을 확인해주세요.");
    }

    if (!data || data.error) {
      throw new Error(data?.message || data?.error || "캐릭터 정보를 불러오지 못했습니다.");
    }

    return data;
  }

  function formatUpdatedAt(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("ko-KR", {
      year:"2-digit", month:"2-digit", day:"2-digit",
      hour:"2-digit", minute:"2-digit"
    }).format(new Date(value));
  }

  function resetBoundaryForCycle(cycle,now=new Date()){if(cycle==="daily")return new Date(now.getFullYear(),now.getMonth(),now.getDate());if(cycle==="weekly"){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate());d.setDate(d.getDate()-((d.getDay()-4+7)%7));return d;}return new Date(now.getFullYear(),now.getMonth(),1);}
  function isCharacterCheckDone(cid,item){const s=characterCheckStates.find(x=>x.character_id===cid&&x.checklist_id===item.id);return !!s?.completed_at&&new Date(s.completed_at)>=resetBoundaryForCycle(item.cycle);}
  function getCharacterChecklistProgress(cid,cycle){const items=checklist.filter(x=>x.cycle===cycle);return{done:items.filter(x=>isCharacterCheckDone(cid,x)).length,total:items.length};}
  function openCharacterChecklist(ch){checklistEditingCharacter=ch;$("characterChecklistTitle").textContent=ch.nickname||"캐릭터";$("characterChecklistSubtitle").textContent=`${ch.class_name||"직업 미확인"} · ${ch.world_name||"월드 미확인"}`;$("characterChecklistModal").classList.remove("hidden");document.body.classList.add("modal-open");renderCharacterChecklistModal();}
  function closeCharacterChecklist(){$("characterChecklistModal").classList.add("hidden");document.body.classList.remove("modal-open");checklistEditingCharacter=null;}
  async function toggleCharacterCheck(item){const ch=checklistEditingCharacter;if(!ch)return;const existing=characterCheckStates.find(x=>x.character_id===ch.id&&x.checklist_id===item.id),completed_at=isCharacterCheckDone(ch.id,item)?null:new Date().toISOString();const q=existing?await sb.from("character_check_states").update({completed_at}).eq("id",existing.id).eq("user_id",user.id).select().single():await sb.from("character_check_states").insert({user_id:user.id,character_id:ch.id,checklist_id:item.id,completed_at}).select().single();if(q.error){alert(q.error.message);return;}if(existing)Object.assign(existing,q.data);else characterCheckStates.push(q.data);renderCharacterChecklistModal();renderCharacters();renderSummary();setSync("체크 저장됨");}
  function renderCharacterChecklistModal(){const ch=checklistEditingCharacter,box=$("characterChecklistContent");if(!ch||!box)return;box.innerHTML="";const labels={daily:"일일",weekly:"주간",monthly:"월간"};["daily","weekly","monthly"].forEach(cycle=>{const items=checklist.filter(x=>x.cycle===cycle),p=getCharacterChecklistProgress(ch.id,cycle),section=document.createElement("section");section.className="character-check-section";section.innerHTML=`<div class="character-check-head"><h3>${labels[cycle]}</h3><strong>${p.done} / ${p.total}</strong></div><div class="character-check-items"></div>`;const ib=section.querySelector(".character-check-items");if(!items.length)ib.innerHTML='<div class="empty-state">등록된 항목이 없습니다.</div>';else items.forEach(item=>{const done=isCharacterCheckDone(ch.id,item),btn=document.createElement("button");btn.type="button";btn.className=`character-check-item ${done?"done":""}`;btn.innerHTML=`<span class="character-check-box">${done?"✓":""}</span><span>${item.title}</span>`;btn.onclick=()=>toggleCharacterCheck(item);ib.appendChild(btn);});box.appendChild(section);});const bp=getBossProgress(ch.id),bs=document.createElement("section");bs.className="character-check-section";bs.innerHTML=`<div class="character-check-head"><h3>주간 보스</h3><strong>${bp.killed} / ${bp.selected}</strong></div><p class="muted">보스 선택/처치는 설정의 ✎에서 관리합니다.</p>`;box.appendChild(bs);}
  $("characterChecklistClose")?.addEventListener("click",closeCharacterChecklist);document.querySelector("[data-close-character-checklist]")?.addEventListener("click",closeCharacterChecklist);

  function renderCharacters() {
    const box = $("characterGrid");
    box.innerHTML = "";
    $("characterCount").textContent = `${characters.length} / 20`;

    if (!characters.length) {
      box.innerHTML = '<div class="empty-state">등록된 캐릭터가 없습니다.</div>';
      return;
    }

    characters.forEach(ch => {
      const card = document.createElement("article");
      card.className = "character-card";

      const levelText = ch.level ? `Lv.${fmt.format(ch.level)}` : "-";
      const powerText = ch.combat_power ? shortMoney(ch.combat_power) : "-";
      const ownedText = shortMoney(ch.owned_meso || 0);
      const bossText = shortMoney(ch.boss_meso || 0);

      card.innerHTML = `
        <div class="character-avatar-wrap">
          <img class="character-avatar" alt="">
        </div>

        <div class="character-card-top with-avatar">
          <div class="character-title">
            <div class="character-name"></div>
            <span class="character-class-badge"></span>
            <div class="character-world"></div><div class="character-status-row"><span class="status-chip daily-status"></span><span class="status-chip weekly-status"></span><span class="status-chip monthly-status"></span></div>
          </div>
        </div>

        <div class="character-info">
          <div class="info-pair"><span>레벨</span><strong class="view-level"></strong></div>
          <div class="info-pair"><span>전투력</span><strong class="view-power"></strong></div>
          <div class="info-pair"><span>보유 메소</span><strong class="view-owned"></strong></div>
          <div class="info-pair"><span>보스 메소</span><strong class="view-boss"></strong></div>
          <div class="info-pair boss-progress-pair"><span>보스 현황</span><strong class="view-boss-progress"></strong></div>
        </div>

        <div class="character-note"></div>
        <div class="api-updated"></div>

        <div class="character-actions">
          <button class="character-refresh icon-action" type="button" aria-label="정보 새로고침" title="정보 새로고침">↻</button>
          <button class="edit-toggle icon-action" type="button" aria-label="보유 메소/메모 수정" title="보유 메소/메모 수정">✎</button>
        </div>

        <div class="character-editor">
          <div class="character-editor-grid">
            <input class="edit-owned" type="number" min="0" step="1" placeholder="보유 메소">
            <textarea class="edit-memo" maxlength="120" placeholder="메모"></textarea>
          </div>
          <div class="character-editor-actions">
            <button class="cancel-character" type="button">취소</button>
            <button class="save-character" type="button">저장</button>
          </div>
        </div>
      `;

      const avatar = card.querySelector(".character-avatar");
      if (ch.image_url) {
        avatar.src = ch.image_url;
        avatar.alt = `${ch.nickname} 캐릭터 이미지`;
      } else {
        avatar.style.display = "none";
      }

      card.querySelector(".character-name").textContent = ch.nickname || "-";
      card.querySelector(".character-class-badge").textContent = ch.class_name || "직업 미확인";
      card.querySelector(".character-world").textContent = ch.world_name || "";
      const dp=getCharacterChecklistProgress(ch.id,"daily"),wp=getCharacterChecklistProgress(ch.id,"weekly"),mp=getCharacterChecklistProgress(ch.id,"monthly");
      card.querySelector(".daily-status").textContent=`일일 ${dp.done}/${dp.total}`;card.querySelector(".weekly-status").textContent=`주간 ${wp.done}/${wp.total}`;card.querySelector(".monthly-status").textContent=`월간 ${mp.done}/${mp.total}`;
      card.querySelector(".view-level").textContent = levelText;
      card.querySelector(".view-power").textContent = powerText;
      card.querySelector(".view-owned").textContent = ownedText;
      card.querySelector(".view-boss").textContent = bossText;
      const bossProgress = getBossProgress(ch.id);
      card.querySelector(".view-boss-progress").textContent = `${bossProgress.killed} / ${bossProgress.selected}`;
      card.querySelector(".character-note").textContent = ch.memo || "메모 없음";
      card.querySelector(".api-updated").textContent =
        ch.api_updated_at ? `게임 정보 갱신 ${formatUpdatedAt(ch.api_updated_at)}` : "";

      const owned = card.querySelector(".edit-owned");
      const memo = card.querySelector(".edit-memo");

      owned.value = ch.owned_meso ?? 0;
      memo.value = ch.memo || "";

      card.querySelector(".edit-toggle").addEventListener("click", () => {
        card.classList.toggle("editing");
      });

      card.querySelector(".cancel-character").addEventListener("click", () => {
        owned.value = ch.owned_meso ?? 0;
          memo.value = ch.memo || "";
        card.classList.remove("editing");
      });

      card.querySelector(".save-character").addEventListener("click", async () => {
        const payload = {
          owned_meso: Number(owned.value || 0),
          memo: memo.value.trim() || null,
          updated_at: new Date().toISOString()
        };

        const { data, error } = await sb
          .from("maple_characters")
          .update(payload)
          .eq("id", ch.id)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) return alert(error.message);

        Object.assign(ch, data);
        renderAll();
        setSync("저장됨");
      });

      card.querySelector(".character-refresh").addEventListener("click", async e => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = "…";
        setSync(`${ch.nickname} 조회 중…`);

        try {
          const info = await fetchCharacterProfile(ch.nickname);

          const payload = {
            ocid: info.ocid || null,
            class_name: info.class_name || null,
            level: info.level ?? null,
            combat_power: info.combat_power ?? null,
            image_url: info.image_url || null,
            world_name: info.world_name || null,
            api_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data, error } = await sb
            .from("maple_characters")
            .update(payload)
            .eq("id", ch.id)
            .eq("user_id", user.id)
            .select()
            .single();

          if (error) throw error;

          Object.assign(ch, data);
          renderAll();
          setSync("정보 갱신됨");
        } catch (err) {
          console.error(err);
          setSync("조회 실패");
          alert(err.message || String(err));
        } finally {
          btn.disabled = false;
          btn.textContent = "↻";
        }
      });



      card.addEventListener("click",e=>{if(e.target.closest("button,input,textarea,select,.character-editor"))return;openCharacterChecklist(ch);});
      box.appendChild(card);
    });
  }

  $("characterForm").addEventListener("submit", async e => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert("로그인 세션이 없습니다. 새로고침 후 다시 로그인해주세요.");
      return;
    }

    if (characters.length >= 20) {
      alert("캐릭터는 최대 20개까지 등록할 수 있습니다.");
      return;
    }

    const nickname = $("characterNickname").value.trim();
    if (!nickname) return;

    if (characters.some(ch => ch.nickname === nickname)) {
      alert("이미 등록된 캐릭터입니다.");
      return;
    }

    const submitButton = e.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "정보 불러오는 중…";
    setSync(`${nickname} 조회 중…`);

    try {
      const info = await fetchCharacterProfile(nickname);

      const payload = {
        user_id: user.id,
        nickname,
        ocid: info.ocid || null,
        class_name: info.class_name || null,
        level: info.level ?? null,
        combat_power: info.combat_power ?? null,
        image_url: info.image_url || null,
        world_name: info.world_name || null,
        owned_meso: Number($("characterOwnedMeso").value || 0),
        boss_meso: 0,
        memo: $("characterMemo").value.trim() || null,
        api_updated_at: new Date().toISOString(),
        sort_order: characters.length
      };

      const { data, error } = await sb
        .from("maple_characters")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      characters.push(data);

      ["characterNickname","characterOwnedMeso","characterMemo"]
        .forEach(id => $(id).value = "");

      renderAll();
      setSync("캐릭터 추가됨");
    } catch (err) {
      console.error(err);
      setSync("추가 실패");
      alert(err.message || String(err));
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "닉네임으로 추가";
    }
  });

  async function saveCharacterOrder() {
    setSync("순서 저장 중…");

    const updates = characters.map((ch, index) => ({
      id: ch.id,
      user_id: user.id,
      sort_order: index
    }));

    // 개별 update를 병렬 실행해 기존 필드를 건드리지 않습니다.
    const results = await Promise.all(
      updates.map(item =>
        sb.from("maple_characters")
          .update({ sort_order: item.sort_order })
          .eq("id", item.id)
          .eq("user_id", item.user_id)
      )
    );

    const failed = results.find(result => result.error);
    if (failed) {
      console.error(failed.error);
      setSync("순서 저장 실패");
      alert(`순서를 저장하지 못했습니다.\n${failed.error.message}`);
      await loadAll();
      return false;
    }

    characters.forEach((ch, index) => {
      ch.sort_order = index;
    });

    setSync("순서 저장됨");
    return true;
  }

  async function moveCharacter(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= characters.length) return;

    const temp = characters[index];
    characters[index] = characters[target];
    characters[target] = temp;

    // UI를 먼저 바꿔 즉각적으로 보이게 합니다.
    renderCharacters();
    renderSettingsCharacters();
    renderSummary();

    await saveCharacterOrder();
  }

  function renderSettingsCharacters() {
    const box = $("settingsCharacterList");
    if (!box) return;

    box.innerHTML = "";

    if (!characters.length) {
      box.innerHTML = '<div class="empty-state">등록된 캐릭터가 없습니다.</div>';
      return;
    }

    characters.forEach(ch => {
      const row = document.createElement("div");
      row.className = "settings-character-row";
      row.innerHTML = `
        <div class="settings-order-controls">
          <button class="order-btn move-up" type="button" aria-label="위로 이동" title="위로 이동">↑</button>
          <button class="order-btn move-down" type="button" aria-label="아래로 이동" title="아래로 이동">↓</button>
        </div>
        <div class="settings-char-main">
          <img class="settings-char-image" alt="">
          <div>
            <strong class="settings-char-name"></strong>
            <div class="settings-char-sub"></div>
          </div>
        </div>
        <div class="settings-row-actions"><button class="boss-edit-btn" type="button" title="주간 보스 설정">✎</button><button class="delete-btn danger-delete" type="button">삭제</button></div>
      `;

      const img = row.querySelector(".settings-char-image");
      if (ch.image_url) {
        img.src = ch.image_url;
        img.alt = `${ch.nickname} 캐릭터 이미지`;
      } else {
        img.style.display = "none";
      }

      row.querySelector(".settings-char-name").textContent = ch.nickname || "-";
      const settingsBossProgress = getBossProgress(ch.id);
      row.querySelector(".settings-char-sub").textContent =
        `${ch.class_name || "직업 미확인"} · ${ch.world_name || "월드 미확인"} · 보스 ${settingsBossProgress.killed}/${settingsBossProgress.selected}`;

      const currentIndex = characters.findIndex(item => item.id === ch.id);
      const upBtn = row.querySelector(".move-up");
      const downBtn = row.querySelector(".move-down");

      upBtn.disabled = currentIndex === 0;
      downBtn.disabled = currentIndex === characters.length - 1;

      upBtn.addEventListener("click", () => moveCharacter(currentIndex, -1));
      downBtn.addEventListener("click", () => moveCharacter(currentIndex, 1));

      row.querySelector(".boss-edit-btn").addEventListener("click", () => openBossModal(ch));
      row.querySelector(".danger-delete").addEventListener("click", async () => {
        if (!confirm(`${ch.nickname} 캐릭터를 삭제할까요?`)) return;

        const { error } = await sb
          .from("maple_characters")
          .delete()
          .eq("id", ch.id)
          .eq("user_id", user.id);

        if (error) return alert(error.message);

        characters = characters.filter(x => x.id !== ch.id);
        renderAll();
        setSync("캐릭터 삭제됨");
      });

      box.appendChild(row);
    });
  }

  function weeklyBossResetBoundary(now = new Date()) {
    const reset = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const day = reset.getDay(); // 0 Sun ... 4 Thu
    const daysSinceThursday = (day - 4 + 7) % 7;
    reset.setDate(reset.getDate() - daysSinceThursday);
    return reset;
  }

  function isBossKilledThisWeek(selection) {
    if (!selection?.killed_at) return false;
    return new Date(selection.killed_at) >= weeklyBossResetBoundary();
  }

  function getBossProgress(characterId) {
    const selected = bossSelections.filter(x => x.character_id === characterId);
    const killed = selected.filter(isBossKilledThisWeek).length;
    return { selected: selected.length, killed };
  }

  function openBossModal(ch) {
    bossEditingCharacter = ch;
    bossDraft = new Map(bossSelections.filter(x=>x.character_id===ch.id).map(x=>[x.boss_key,x]));
    $("bossModalCharacter").textContent = `${ch.nickname} · 최대 12개`;
    $("bossModal").classList.remove("hidden");
    document.body.classList.add("modal-open");
    renderBossCatalog();
  }
  function closeBossModal() {
    $("bossModal").classList.add("hidden"); document.body.classList.remove("modal-open");
    bossEditingCharacter=null; bossDraft=new Map();
  }
  function renderBossCatalog() {
    const box = $("bossCatalog");
    box.innerHTML = "";

    const grouped = new Map();
    BOSS_CATALOG.forEach(b => {
      if (!grouped.has(b.name)) grouped.set(b.name, []);
      grouped.get(b.name).push(b);
    });

    grouped.forEach((variants, name) => {
      const group = document.createElement("section");
      group.className = "boss-group";
      group.innerHTML = `
        <div class="boss-group-head">
          <div class="boss-icon">${variants[0].short}</div>
          <strong>${name}</strong>
        </div>
        <div class="boss-difficulties"></div>
      `;

      const diffBox = group.querySelector(".boss-difficulties");

      variants.forEach(b => {
        const selectedData = bossDraft.get(b.key);
        const selected = !!selectedData;
        const killed = selected && isBossKilledThisWeek(selectedData);

        const wrap = document.createElement("div");
        wrap.className = `boss-option-wrap ${selected ? "selected" : ""}`;

        const selectBtn = document.createElement("button");
        selectBtn.type = "button";
        selectBtn.className = "boss-option";
        if (selected) selectBtn.classList.add("selected");
        selectBtn.innerHTML = `<span>${b.difficulty}</span><strong>${shortMoney(b.price)}</strong>`;

        selectBtn.onclick = () => {
          const wasSelected = bossDraft.has(b.key);

          // 같은 보스의 다른 난이도 제거
          variants.forEach(v => bossDraft.delete(v.key));

          if (!wasSelected) {
            if (bossDraft.size >= 12) {
              alert("주간 보스는 최대 12개까지 선택할 수 있습니다.");
              renderBossCatalog();
              return;
            }
            bossDraft.set(b.key, {
              ...b,
              killed_at: null
            });
          }

          renderBossCatalog();
        };

        wrap.appendChild(selectBtn);

        if (selected) {
          const killBtn = document.createElement("button");
          killBtn.type = "button";
          killBtn.className = `boss-kill-btn ${killed ? "killed" : ""}`;
          killBtn.innerHTML = killed ? "✓ 처치" : "○ 미처치";

          killBtn.onclick = () => {
            const current = bossDraft.get(b.key);
            if (!current) return;

            const nextKilledAt = isBossKilledThisWeek(current)
              ? null
              : new Date().toISOString();

            bossDraft.set(b.key, {
              ...current,
              ...b,
              killed_at: nextKilledAt
            });

            renderBossCatalog();
          };

          wrap.appendChild(killBtn);
        }

        diffBox.appendChild(wrap);
      });

      box.appendChild(group);
    });

    const values = [...bossDraft.values()];
    const total = values.reduce((s, b) => s + Number(b.price || b.crystal_price || 0), 0);
    const killed = values.filter(isBossKilledThisWeek).length;

    $("bossSelectedCount").textContent = `${values.length} / 12`;
    $("bossKilledCount").textContent = `${killed} / ${values.length}`;
    $("bossSelectedMeso").textContent = shortMoney(total);
  }

  async function saveBossSelection(){
    if(!bossEditingCharacter)return;
    const ch=bossEditingCharacter, chosen=[...bossDraft.values()];
    $("bossModalSave").disabled=true; setSync("보스 설정 저장 중…");
    try{
      const d=await sb.from("character_boss_selections").delete().eq("user_id",user.id).eq("character_id",ch.id); if(d.error)throw d.error;
      if(chosen.length){
        const rows=chosen.map(b=>({
          user_id:user.id,
          character_id:ch.id,
          boss_key:b.key,
          boss_name:b.name,
          difficulty:b.difficulty,
          crystal_price:b.price,
          killed_at:b.killed_at || null
        }));
        const ins=await sb.from("character_boss_selections").insert(rows); if(ins.error)throw ins.error;
      }
      const total=chosen.reduce((s,b)=>s+Number(b.price),0);
      const up=await sb.from("maple_characters").update({boss_meso:total,updated_at:new Date().toISOString()}).eq("id",ch.id).eq("user_id",user.id).select().single();
      if(up.error)throw up.error;
      bossSelections=bossSelections.filter(x=>x.character_id!==ch.id);
      bossSelections.push(...chosen.map(b=>({
        user_id:user.id,
        character_id:ch.id,
        boss_key:b.key,
        boss_name:b.name,
        difficulty:b.difficulty,
        crystal_price:b.price,
        killed_at:b.killed_at || null
      })));
      Object.assign(ch,up.data); closeBossModal(); renderAll(); setSync("보스 설정 저장됨");
    }catch(err){console.error(err);alert(err.message||String(err));setSync("보스 설정 저장 실패");}
    finally{$("bossModalSave").disabled=false;}
  }
  $("bossModalClose")?.addEventListener("click",closeBossModal);
  $("bossModalCancel")?.addEventListener("click",closeBossModal);
  document.querySelector("[data-close-boss]")?.addEventListener("click",closeBossModal);
  $("bossModalSave")?.addEventListener("click",saveBossSelection);

  function renderSummary(){const dt=characters.reduce((n,ch)=>n+getCharacterChecklistProgress(ch.id,"daily").total,0),dd=characters.reduce((n,ch)=>n+getCharacterChecklistProgress(ch.id,"daily").done,0),wt=characters.reduce((n,ch)=>n+getCharacterChecklistProgress(ch.id,"weekly").total,0),wd=characters.reduce((n,ch)=>n+getCharacterChecklistProgress(ch.id,"weekly").done,0);$("dailySummary").textContent=`${dd} / ${dt}`;$("weeklySummary").textContent=`${wd} / ${wt}`;$("ownedMesoSummary").textContent=shortMoney(characters.reduce((a,ch)=>a+Number(ch.owned_meso||0),0));$("bossMesoSummary").textContent=shortMoney(characters.reduce((a,ch)=>a+Number(ch.boss_meso||0),0));$("characterCountSummary").textContent=characters.length;$("characterCount").textContent=`${characters.length} / 20`;}

  function renderAll() {
    renderChecklist();
    renderCharacters();
    renderSettingsCharacters();
    renderSummary();
  }

  sb.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      user = null;
      showAuth();
      return;
    }

    if (event === "SIGNED_IN" && session?.user) {
      user = session.user;
      showApp();

      if (!isLoading) {
        loadAll();
      }
    }
  });

  (async () => {
    const { data, error } = await sb.auth.getSession();

    if (error) {
      console.error(error);
      showAuth();
      return;
    }

    if (data.session?.user) {
      user = data.session.user;
      showApp();
      await loadAll();
    } else {
      showAuth();
    }
  })();
})();
