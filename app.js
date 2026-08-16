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
  const BOSS_ICONS = {
    "자쿰":"assets/boss/zakum.png",
    "블러디 퀸":"assets/boss/queen.png",
    "반반":"assets/boss/vonbon.png",
    "피에르":"assets/boss/pierre.png",
    "매그너스":"assets/boss/magnus.png",
    "벨룸":"assets/boss/vellum.png",
    "파풀라투스":"assets/boss/papulatus.png",
    "스우":"assets/boss/lotus.png",
    "데미안":"assets/boss/damien.png",
    "가디언 엔젤 슬라임":"assets/boss/slime.png",
    "루시드":"assets/boss/lucid.png",
    "윌":"assets/boss/will.png",
    "더스크":"assets/boss/gloom.png",
    "듄켈":"assets/boss/darknell.png",
    "진 힐라":"assets/boss/vhilla.png",
    "선택받은 세렌":"assets/boss/seren.png",
    "감시자 칼로스":"assets/boss/kalos.png",
    "최초의 대적자":"assets/boss/adversary.png",
    "찬란한 흉성":"assets/boss/shining.png",
    "카링":"assets/boss/kaling.png",
    "림보":"assets/boss/limbo.png",
    "발드릭스":"assets/boss/baldricks.png",
    "유피테르":"assets/boss/jupiter.png",
    "검은 마법사":"assets/boss/blackmage.png"
  };

  const boss = (name, difficulty, price, short) => ({
    name, difficulty, price, short,
    icon: BOSS_ICONS[name] || null,
    key: `${name}-${difficulty}`
  });

  const BOSS_CATALOG = [

    boss("자쿰","카오스",8080000,"자"),
    boss("블러디 퀸","카오스",8140000,"퀸"),
    boss("반반","카오스",8150000,"반"),
    boss("피에르","카오스",8170000,"피"),
    boss("매그너스","하드",8560000,"매"),
    boss("벨룸","카오스",9280000,"벨"),
    boss("파풀라투스","카오스",13100000,"파"),

    boss("스우","노멀",16700000,"스"),
    boss("데미안","노멀",17500000,"데"),
    boss("가디언 엔젤 슬라임","노멀",25500000,"가"),
    boss("루시드","이지",29800000,"루"),
    boss("윌","이지",32300000,"윌"),
    boss("루시드","노멀",35600000,"루"),
    boss("윌","노멀",41100000,"윌"),
    boss("더스크","노멀",44000000,"더"),
    boss("듄켈","노멀",47500000,"듄"),
    boss("데미안","하드",48900000,"데"),
    boss("스우","하드",51500000,"스"),
    boss("루시드","하드",62900000,"루"),
    boss("더스크","카오스",69800000,"더"),
    boss("진 힐라","노멀",71200000,"진"),
    boss("가디언 엔젤 슬라임","카오스",75100000,"가"),
    boss("윌","하드",77100000,"윌"),
    boss("듄켈","하드",94400000,"듄"),
    boss("진 힐라","하드",106000000,"진"),

    boss("선택받은 세렌","노멀",239000000,"세"),
    boss("감시자 칼로스","이지",280000000,"칼"),
    boss("최초의 대적자","이지",308000000,"대"),
    boss("선택받은 세렌","하드",356000000,"세"),
    boss("카링","이지",377000000,"카"),
    boss("감시자 칼로스","노멀",505000000,"칼"),
    boss("최초의 대적자","노멀",560000000,"대"),
    boss("스우","익스트림",574000000,"스"),
    boss("찬란한 흉성","노멀",625000000,"흉"),
    boss("카링","노멀",678000000,"카"),

    boss("림보","노멀",1026000000,"림"),
    boss("감시자 칼로스","카오스",1273000000,"칼"),
    boss("발드릭스","노멀",1368000000,"발"),
    boss("최초의 대적자","하드",1435000000,"대"),
    boss("유피테르","노멀",1615000000,"유"),
    boss("카링","하드",1739000000,"카"),
    boss("림보","하드",2385000000,"림"),
    boss("찬란한 흉성","하드",2678000000,"흉"),
    boss("선택받은 세렌","익스트림",2835000000,"세"),
    boss("발드릭스","하드",3078000000,"발"),
    boss("감시자 칼로스","익스트림",4104000000,"칼"),
    boss("최초의 대적자","익스트림",4712000000,"대"),
    boss("유피테르","하드",4845000000,"유"),
    boss("카링","익스트림",5387000000,"카")
  ];

  const BLACK_MAGE_CATALOG = [
    boss("검은 마법사","하드",665000000,"검"),
    boss("검은 마법사","익스트림",8740000000,"검")
  ];


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
  async function toggleWholeCycle(ch, cycle) {
    const items = checklist.filter(x => x.cycle === cycle);
    if (!items.length) return;

    const progress = getCharacterChecklistProgress(ch.id, cycle);
    const shouldComplete = progress.done !== progress.total;
    const completedAt = shouldComplete ? new Date().toISOString() : null;

    setSync(shouldComplete ? "숙제 완료 처리 중…" : "숙제 완료 해제 중…");

    try {
      for (const item of items) {
        const existing = characterCheckStates.find(x =>
          x.character_id === ch.id && x.checklist_id === item.id
        );

        if (existing) {
          const { data, error } = await sb
            .from("character_check_states")
            .update({ completed_at: completedAt })
            .eq("id", existing.id)
            .eq("user_id", user.id)
            .select()
            .single();

          if (error) throw error;
          Object.assign(existing, data);
        } else {
          const { data, error } = await sb
            .from("character_check_states")
            .insert({
              user_id: user.id,
              character_id: ch.id,
              checklist_id: item.id,
              completed_at: completedAt
            })
            .select()
            .single();

          if (error) throw error;
          characterCheckStates.push(data);
        }
      }

      renderCharacters();
      renderSummary();

      if (checklistEditingCharacter?.id === ch.id) {
        renderCharacterChecklistModal();
      }

      setSync(shouldComplete ? "숙제 완료" : "숙제 해제됨");
    } catch (err) {
      console.error(err);
      alert(err.message || String(err));
      setSync("저장 실패");
      await loadAll();
    }
  }

  function openCharacterChecklist(ch){
    checklistEditingCharacter=ch;
    $("characterChecklistTitle").textContent=ch.nickname||"캐릭터";
    const bp=getBossProgress(ch.id);
    $("characterChecklistSubtitle").textContent=`${ch.class_name||"직업 미확인"} · ${ch.world_name||"월드 미확인"} · 보스 ${bp.killed}/${bp.selected}`;
    $("characterChecklistModal").classList.remove("hidden");
    document.body.classList.add("modal-open");
    renderCharacterChecklistModal();
  }
  function closeCharacterChecklist(){$("characterChecklistModal").classList.add("hidden");document.body.classList.remove("modal-open");checklistEditingCharacter=null;}
  async function toggleCharacterCheck(item){const ch=checklistEditingCharacter;if(!ch)return;const existing=characterCheckStates.find(x=>x.character_id===ch.id&&x.checklist_id===item.id),completed_at=isCharacterCheckDone(ch.id,item)?null:new Date().toISOString();const q=existing?await sb.from("character_check_states").update({completed_at}).eq("id",existing.id).eq("user_id",user.id).select().single():await sb.from("character_check_states").insert({user_id:user.id,character_id:ch.id,checklist_id:item.id,completed_at}).select().single();if(q.error){alert(q.error.message);return;}if(existing)Object.assign(existing,q.data);else characterCheckStates.push(q.data);renderCharacterChecklistModal();renderCharacters();renderSummary();setSync("체크 저장됨");}
  async function toggleBossKilledFromCard(selection) {
    const killedNow = isBossKilledCurrentPeriod(selection);
    const killedAt = killedNow ? null : new Date().toISOString();

    setSync(killedNow ? "보스 처치 해제 중…" : "보스 처치 저장 중…");

    const { data, error } = await sb
      .from("character_boss_selections")
      .update({ killed_at: killedAt })
      .eq("user_id", user.id)
      .eq("character_id", selection.character_id)
      .eq("boss_key", selection.boss_key)
      .select()
      .single();

    if (error) {
      console.error(error);
      alert(error.message);
      setSync("저장 실패");
      return;
    }

    const existing = bossSelections.find(x =>
      x.character_id === selection.character_id &&
      x.boss_key === selection.boss_key
    );

    if (existing) Object.assign(existing, data);

    renderCharacterChecklistModal();
    renderCharacters();
    renderSettingsCharacters();
    renderSummary();
    setSync(killedNow ? "처치 해제됨" : "처치 완료");
  }

  function renderCharacterChecklistModal() {
    const ch = checklistEditingCharacter;
    const box = $("characterChecklistContent");

    if (!ch || !box) return;

    box.innerHTML = "";

    const selectedBosses = bossSelections
      .filter(x => x.character_id === ch.id)
      .sort((a, b) => Number(a.crystal_price || 0) - Number(b.crystal_price || 0));

    const progress = getBossProgress(ch.id);

    const summary = document.createElement("div");
    summary.className = "card-boss-summary";
    summary.innerHTML = `
      <div>
        <span>보스 현황</span>
        <strong>${progress.killed} / ${progress.selected}</strong>
      </div>
      <div>
        <span>보스 메소</span>
        <strong>${shortMoney(selectedBosses.reduce((sum, x) => sum + Number(x.crystal_price || 0), 0))}</strong>
      </div>
    `;
    box.appendChild(summary);

    if (!selectedBosses.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state card-boss-empty";
      empty.textContent = "설정에서 선택한 주간 보스가 없습니다.";
      box.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "card-boss-list";

    selectedBosses.forEach(selection => {
      const killed = isBossKilledCurrentPeriod(selection);

      const row = document.createElement("button");
      row.type = "button";
      row.className = `card-boss-row ${killed ? "killed" : ""}`;
      row.innerHTML = `
        <span class="card-boss-check">${killed ? "✓" : ""}</span>
        <span class="card-boss-main">
          <strong class="card-boss-name"></strong>
          <span class="card-boss-difficulty"></span>
        </span>
        <span class="card-boss-price"></span>
        <span class="card-boss-state">${killed ? "처치" : "미처치"}</span>
      `;

      row.querySelector(".card-boss-name").textContent = selection.boss_name || "-";
      row.querySelector(".card-boss-difficulty").textContent = selection.difficulty || "";
      row.querySelector(".card-boss-price").textContent = shortMoney(selection.crystal_price || 0);

      row.addEventListener("click", () => toggleBossKilledFromCard(selection));
      list.appendChild(row);
    });

    box.appendChild(list);
  }

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
            <div class="character-world"></div><div class="character-status-row">
              <button class="status-chip daily-status" type="button" title="일간 숙제 전체 완료/해제"></button>
              <button class="status-chip weekly-status" type="button" title="주간 숙제 전체 완료/해제"></button>
              <button class="status-chip monthly-status" type="button" title="검마 완료/해제"></button>
            </div>
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
      const dp = getCharacterChecklistProgress(ch.id, "daily");
      const bp = getBossProgress(ch.id);
      const blackMage = getBlackMageSelection(ch.id);
      const dailyBtn = card.querySelector(".daily-status");
      const weeklyBtn = card.querySelector(".weekly-status");
      const monthlyBtn = card.querySelector(".monthly-status");

      dailyBtn.textContent = "일간";
      weeklyBtn.textContent = "주간";
      monthlyBtn.textContent = "검마";

      dailyBtn.classList.toggle("complete", dp.total > 0 && dp.done === dp.total);
      weeklyBtn.classList.toggle("complete", bp.selected > 0 && bp.killed === bp.selected);

      dailyBtn.addEventListener("click", e => {
        e.stopPropagation();
        toggleWholeCycle(ch, "daily");
      });

      weeklyBtn.title = bp.selected > 0
        ? `주간 보스 ${bp.killed}/${bp.selected} · 클릭하면 전체 처치/해제`
        : "설정에서 주간 보스를 먼저 선택해주세요.";
      weeklyBtn.addEventListener("click", e => {
        e.stopPropagation();
        toggleAllWeeklyBosses(ch);
      });

      if (blackMage) {
        monthlyBtn.classList.remove("hidden");
        monthlyBtn.classList.toggle("complete", isBossKilledThisMonth(blackMage));
        monthlyBtn.title = isBossKilledThisMonth(blackMage)
          ? "이번 달 검은마법사 처치 완료"
          : "캐릭터를 눌러 검은마법사 처치 상태를 변경하세요.";
        monthlyBtn.addEventListener("click", e => e.stopPropagation());
      } else {
        monthlyBtn.classList.add("hidden");
      }
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
    const daysSinceThursday = (reset.getDay() - 4 + 7) % 7;
    reset.setDate(reset.getDate() - daysSinceThursday);
    return reset;
  }

  function monthlyBossResetBoundary(now = new Date()) {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  function isBlackMageBoss(selection) {
    return (selection?.boss_name || selection?.name) === "검은 마법사";
  }

  function isBossKilledThisWeek(selection) {
    if (!selection?.killed_at) return false;
    return new Date(selection.killed_at) >= weeklyBossResetBoundary();
  }

  function isBossKilledThisMonth(selection) {
    if (!selection?.killed_at) return false;
    return new Date(selection.killed_at) >= monthlyBossResetBoundary();
  }

  function isBossKilledCurrentPeriod(selection) {
    return isBlackMageBoss(selection)
      ? isBossKilledThisMonth(selection)
      : isBossKilledThisWeek(selection);
  }

  function getBlackMageSelection(characterId) {
    return bossSelections.find(x =>
      x.character_id === characterId && isBlackMageBoss(x)
    ) || null;
  }

  function getBossProgress(characterId) {
    const selected = bossSelections.filter(x =>
      x.character_id === characterId && !isBlackMageBoss(x)
    );
    return {
      selected: selected.length,
      killed: selected.filter(isBossKilledThisWeek).length
    };
  }

  async function toggleAllWeeklyBosses(ch) {
    const weeklySelections = bossSelections.filter(x =>
      x.character_id === ch.id && !isBlackMageBoss(x)
    );

    if (!weeklySelections.length) {
      alert("설정에서 주간 보스를 먼저 선택해주세요.");
      return;
    }

    const allKilled = weeklySelections.every(isBossKilledThisWeek);
    const killedAt = allKilled ? null : new Date().toISOString();

    setSync(allKilled ? "주간 보스 전체 해제 중…" : "주간 보스 전체 완료 중…");

    try {
      for (const selection of weeklySelections) {
        const { data, error } = await sb
          .from("character_boss_selections")
          .update({ killed_at: killedAt })
          .eq("user_id", user.id)
          .eq("character_id", ch.id)
          .eq("boss_key", selection.boss_key)
          .select()
          .single();

        if (error) throw error;
        Object.assign(selection, data);
      }

      renderAll();
      if (checklistEditingCharacter?.id === ch.id) renderCharacterChecklistModal();
      setSync(allKilled ? "주간 보스 전체 해제됨" : "주간 보스 전체 완료");
    } catch (err) {
      console.error(err);
      alert(err.message || String(err));
      setSync("저장 실패");
      await loadAll();
    }
  }

  function openBossModal(ch) {
    bossEditingCharacter = ch;
    bossDraft = new Map(
      bossSelections
        .filter(x => x.character_id === ch.id)
        .map(x => [x.boss_key, x])
    );
    $("bossModalCharacter").textContent = `${ch.nickname} · 주간 12마리 + 월간 검은마법사`;
    $("bossModal").classList.remove("hidden");
    document.body.classList.add("modal-open");
    renderBossCatalog();
  }

  function closeBossModal() {
    $("bossModal").classList.add("hidden");
    document.body.classList.remove("modal-open");
    bossEditingCharacter = null;
    bossDraft = new Map();
  }

  function makeBossIcon(bossItem) {
    if (bossItem.icon) {
      return `<img class="boss-real-icon" src="${bossItem.icon}" alt="${bossItem.name}">`;
    }
    return `<span class="boss-fallback-icon">${bossItem.short}</span>`;
  }

  function renderBossCatalog() {
    const box = $("bossCatalog");
    box.innerHTML = "";

    const weeklyHeading = document.createElement("div");
    weeklyHeading.className = "boss-section-banner weekly-banner";
    weeklyHeading.innerHTML = `
      <div>
        <strong>주간 보스</strong>
        <span>최대 12마리 선택</span>
      </div>
      <strong class="weekly-count"></strong>
    `;
    box.appendChild(weeklyHeading);

    const weeklyGrid = document.createElement("div");
    weeklyGrid.className = "boss-card-grid";

    const grouped = new Map();
    BOSS_CATALOG.forEach(b => {
      if (!grouped.has(b.name)) grouped.set(b.name, []);
      grouped.get(b.name).push(b);
    });

    grouped.forEach((variants, bossName) => {
      const selectedVariant = variants.find(v => bossDraft.has(v.key));

      const card = document.createElement("section");
      card.className = `boss-select-card ${selectedVariant ? "has-selection" : ""}`;
      card.innerHTML = `
        <div class="boss-select-card-head">
          <div class="boss-select-icon">${makeBossIcon(variants[0])}</div>
          <div class="boss-select-title">
            <strong>${bossName}</strong>
            <span>${selectedVariant ? selectedVariant.difficulty + " 선택됨" : "난이도를 선택하세요"}</span>
          </div>
        </div>
        <div class="boss-select-options"></div>
      `;

      const optionBox = card.querySelector(".boss-select-options");

      variants.forEach(b => {
        const selectedData = bossDraft.get(b.key);
        const selected = !!selectedData;
        const killed = selected && isBossKilledThisWeek(selectedData);

        const option = document.createElement("button");
        option.type = "button";
        option.className = `boss-price-option ${selected ? "selected" : ""}`;
        option.innerHTML = `
          <span class="boss-option-difficulty">${b.difficulty}</span>
          <span class="boss-option-price">
            <img src="assets/boss/meso.png" alt="">
            ${shortMoney(b.price)}
          </span>
          ${selected ? `<span class="boss-option-kill ${killed ? "killed" : ""}">${killed ? "✓ 처치" : "○ 미처치"}</span>` : ""}
        `;

        option.addEventListener("click", e => {
          const killTarget = e.target.closest(".boss-option-kill");

          if (killTarget && selected) {
            const current = bossDraft.get(b.key);
            bossDraft.set(b.key, {
              ...current,
              ...b,
              killed_at: isBossKilledThisWeek(current) ? null : new Date().toISOString()
            });
            renderBossCatalog();
            return;
          }

          const wasSelected = bossDraft.has(b.key);
          variants.forEach(v => bossDraft.delete(v.key));

          if (!wasSelected) {
            const weeklyCount = [...bossDraft.values()].filter(x => !isBlackMageBoss(x)).length;
            if (weeklyCount >= 12) {
              alert("주간 보스는 최대 12마리까지 선택할 수 있습니다.");
              renderBossCatalog();
              return;
            }
            bossDraft.set(b.key, { ...b, killed_at: null });
          }

          renderBossCatalog();
        });

        optionBox.appendChild(option);
      });

      weeklyGrid.appendChild(card);
    });

    box.appendChild(weeklyGrid);

    const monthlyWrap = document.createElement("section");
    monthlyWrap.className = "blackmage-monthly-wrap";

    const monthlyHeading = document.createElement("div");
    monthlyHeading.className = "boss-section-banner monthly-banner";
    monthlyHeading.innerHTML = `
      <div>
        <strong>월간 보스 · 검은 마법사</strong>
        <span>주간 12마리와 별도</span>
      </div>
    `;
    monthlyWrap.appendChild(monthlyHeading);

    const bmSelected = BLACK_MAGE_CATALOG.find(v => bossDraft.has(v.key));

    const bmCard = document.createElement("section");
    bmCard.className = `boss-select-card blackmage-card ${bmSelected ? "has-selection" : ""}`;
    bmCard.innerHTML = `
      <div class="boss-select-card-head">
        <div class="boss-select-icon">${makeBossIcon(BLACK_MAGE_CATALOG[0])}</div>
        <div class="boss-select-title">
          <strong>검은 마법사</strong>
          <span>${bmSelected ? bmSelected.difficulty + " 선택됨" : "선택한 캐릭터에만 검마 버튼 표시"}</span>
        </div>
      </div>
      <div class="boss-select-options"></div>
    `;

    const bmOptions = bmCard.querySelector(".boss-select-options");

    BLACK_MAGE_CATALOG.forEach(b => {
      const selectedData = bossDraft.get(b.key);
      const selected = !!selectedData;
      const killed = selected && isBossKilledThisMonth(selectedData);

      const option = document.createElement("button");
      option.type = "button";
      option.className = `boss-price-option monthly-option ${selected ? "selected" : ""}`;
      option.innerHTML = `
        <span class="boss-option-difficulty">${b.difficulty}</span>
        <span class="boss-option-price">
          <img src="assets/boss/meso.png" alt="">
          ${shortMoney(b.price)}
        </span>
        ${selected ? `<span class="boss-option-kill ${killed ? "killed" : ""}">${killed ? "✓ 이번 달 처치" : "○ 미처치"}</span>` : ""}
      `;

      option.addEventListener("click", e => {
        const killTarget = e.target.closest(".boss-option-kill");

        if (killTarget && selected) {
          const current = bossDraft.get(b.key);
          bossDraft.set(b.key, {
            ...current,
            ...b,
            killed_at: isBossKilledThisMonth(current) ? null : new Date().toISOString()
          });
          renderBossCatalog();
          return;
        }

        const wasSelected = bossDraft.has(b.key);
        BLACK_MAGE_CATALOG.forEach(v => bossDraft.delete(v.key));

        if (!wasSelected) bossDraft.set(b.key, { ...b, killed_at: null });
        renderBossCatalog();
      });

      bmOptions.appendChild(option);
    });

    monthlyWrap.appendChild(bmCard);
    box.appendChild(monthlyWrap);

    const values = [...bossDraft.values()];
    const weeklyValues = values.filter(x => !isBlackMageBoss(x));
    const weeklyKilled = weeklyValues.filter(isBossKilledThisWeek).length;
    const total = values.reduce((sum, b) => sum + Number(b.price || b.crystal_price || 0), 0);

    weeklyHeading.querySelector(".weekly-count").textContent = `${weeklyValues.length} / 12`;
    $("bossSelectedCount").textContent = `${weeklyValues.length} / 12`;
    $("bossKilledCount").textContent = `${weeklyKilled} / ${weeklyValues.length}`;
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

  function renderSummary(){
    const dailyDoneCharacters = characters.filter(ch => {
      const p = getCharacterChecklistProgress(ch.id, "daily");
      return p.total > 0 && p.done === p.total;
    }).length;

    const weeklyDoneCharacters = characters.filter(ch => {
      const p = getBossProgress(ch.id);
      return p.selected > 0 && p.killed === p.selected;
    }).length;

    $("dailySummary").textContent=`${dailyDoneCharacters} / ${characters.length}`;
    $("weeklySummary").textContent=`${weeklyDoneCharacters} / ${characters.length}`;
    $("ownedMesoSummary").textContent=shortMoney(characters.reduce((a,ch)=>a+Number(ch.owned_meso||0),0));
    $("bossMesoSummary").textContent=shortMoney(characters.reduce((a,ch)=>a+Number(ch.boss_meso||0),0));
    $("characterCountSummary").textContent=characters.length;
    $("characterCount").textContent=`${characters.length} / 20`;
  }

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
