(() => {
  const cfg = window.APP_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY &&
    !cfg.SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
    cfg.SUPABASE_PUBLISHABLE_KEY !== "YOUR_PUBLISHABLE_KEY";

  const $ = id => document.getElementById(id);
  let sb, user = null, checklist = [], meso = [], enhancements = [], profile = null;
  let checkFilter = "all";
  const fmt = new Intl.NumberFormat("ko-KR");

  const shortMoney = value => {
    let n = Number(value || 0);
    const sign = n < 0 ? "-" : "";
    n = Math.abs(n);
    if (n >= 100000000) return `${sign}${(n / 100000000).toFixed(n % 100000000 ? 1 : 0)}억`;
    if (n >= 10000) return `${sign}${(n / 10000).toFixed(n % 10000 ? 1 : 0)}만`;
    return `${sign}${fmt.format(n)}`;
  };
  const money = value => `${fmt.format(Number(value || 0))} 메소`;
  const dateText = value => new Intl.DateTimeFormat("ko-KR", {
    month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit"
  }).format(new Date(value));
  const setSync = text => $("syncStatus").textContent = text;

  if (!configured) {
    $("authMessage").textContent = "config.js에 Supabase URL과 Publishable Key를 입력해주세요.";
    $("authMessage").style.color = "#ff727c";
    document.querySelectorAll("input,button,select,textarea").forEach(el => el.disabled = true);
    return;
  }

  sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
  });

  function showTab(id) {
    document.querySelectorAll(".tab-page").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".tab").forEach(el => el.classList.remove("active"));
    $(id).classList.remove("hidden");
    document.querySelector(`.tab[data-tab="${id}"]`)?.classList.add("active");
  }

  document.querySelectorAll(".tab").forEach(btn => btn.onclick = () => showTab(btn.dataset.tab));
  document.querySelectorAll("[data-go]").forEach(btn => btn.onclick = () => showTab(btn.dataset.go));

  async function setUser(nextUser) {
    user = nextUser;
    if (!user) {
      $("appView").classList.add("hidden");
      $("authView").classList.remove("hidden");
      return;
    }
    $("authView").classList.add("hidden");
    $("appView").classList.remove("hidden");
    await loadAll();
  }

  $("authForm").onsubmit = async e => {
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
  };

  $("signupBtn").onclick = async () => {
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
    if (data.session) await setUser(data.user);
    else $("authMessage").textContent = "회원가입 완료. 이메일 인증이 켜져 있다면 인증 메일을 확인한 뒤 로그인하세요.";
  };

  $("logoutBtn").onclick = async () => {
    await sb.auth.signOut();
    await setUser(null);
  };

  async function loadAll() {
    setSync("불러오는 중…");
    const [c, m, e, p] = await Promise.all([
      sb.from("maple_checklist").select("*").eq("user_id", user.id).order("created_at", { ascending:true }),
      sb.from("meso_records").select("*").eq("user_id", user.id).order("created_at", { ascending:false }).limit(500),
      sb.from("enhancement_records").select("*").eq("user_id", user.id).order("created_at", { ascending:false }).limit(500),
      sb.from("maple_profile").select("*").eq("user_id", user.id).maybeSingle()
    ]);
    [c,m,e,p].forEach(result => { if (result.error) console.error(result.error); });
    checklist = c.data || [];
    meso = m.data || [];
    enhancements = e.data || [];
    profile = p.data || null;
    renderAll();
    setSync("동기화됨");
  }

  function isCompleted(item) {
    if (item.cycle === "once") return !!item.completed_at;
    if (!item.completed_at) return false;
    const now = new Date();
    const done = new Date(item.completed_at);
    if (item.cycle === "daily") return done.toDateString() === now.toDateString();
    const start = new Date(now);
    start.setHours(0,0,0,0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return done >= start;
  }
  const cycleLabel = v => v === "daily" ? "일일" : v === "weekly" ? "주간" : "1회";

  function renderChecklist() {
    const box = $("checklistList");
    box.innerHTML = "";
    const items = checklist.filter(x => checkFilter === "all" || x.cycle === checkFilter);
    if (!items.length) box.innerHTML = '<div class="empty-state">체크 항목이 없습니다.</div>';

    items.forEach(item => {
      const done = isCompleted(item);
      const row = document.createElement("div");
      row.className = `record-row ${done ? "done" : ""}`;
      row.innerHTML = `
        <button class="check-btn ${done ? "checked" : ""}" type="button">✓</button>
        <div><div class="record-title"></div><div class="record-meta"><span class="tag">${cycleLabel(item.cycle)}</span></div></div>
        <button class="delete-btn" type="button">삭제</button>`;
      row.querySelector(".record-title").textContent = item.title;
      row.querySelector(".check-btn").onclick = () => toggleCheck(item, done);
      row.querySelector(".delete-btn").onclick = () => deleteCheck(item.id);
      box.appendChild(row);
    });
  }

  $("checklistForm").onsubmit = async e => {
    e.preventDefault();
    const title = $("checkTitle").value.trim();
    if (!title) return;
    const { data, error } = await sb.from("maple_checklist").insert({
      user_id:user.id, title, cycle:$("checkCycle").value
    }).select().single();
    if (error) return alert(error.message);
    checklist.push(data);
    $("checkTitle").value = "";
    renderAll();
  };

  async function toggleCheck(item, done) {
    const { data, error } = await sb.from("maple_checklist").update({
      completed_at: done ? null : new Date().toISOString()
    }).eq("id", item.id).eq("user_id", user.id).select().single();
    if (error) return alert(error.message);
    Object.assign(item, data);
    renderAll();
  }

  async function deleteCheck(id) {
    if (!confirm("이 체크 항목을 삭제할까요?")) return;
    const { error } = await sb.from("maple_checklist").delete().eq("id", id).eq("user_id", user.id);
    if (error) return alert(error.message);
    checklist = checklist.filter(x => x.id !== id);
    renderAll();
  }

  document.querySelectorAll("[data-check-filter]").forEach(btn => btn.onclick = () => {
    checkFilter = btn.dataset.checkFilter;
    document.querySelectorAll("[data-check-filter]").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    renderChecklist();
  });

  function renderMeso() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = meso.filter(x => new Date(x.created_at).toDateString() === now.toDateString());
    const month = meso.filter(x => new Date(x.created_at) >= start);
    const sum = (arr, type) => arr.filter(x => !type || x.type === type).reduce((s,x) => s + Number(x.amount), 0);
    const todayNet = sum(today, "income") - sum(today, "expense");
    const income = sum(month, "income");
    const expense = sum(month, "expense");

    $("mesoTodayStat").textContent = shortMoney(todayNet);
    $("mesoIncomeStat").textContent = shortMoney(income);
    $("mesoExpenseStat").textContent = shortMoney(expense);
    $("mesoNetStat").textContent = shortMoney(income - expense);

    const box = $("mesoList");
    box.innerHTML = "";
    if (!meso.length) box.innerHTML = '<div class="empty-state">메소 기록이 없습니다.</div>';

    meso.forEach(x => {
      const row = document.createElement("div");
      row.className = "record-row";
      row.innerHTML = `
        <div class="tag">${x.type === "income" ? "수입" : "지출"}</div>
        <div>
          <div class="record-title"></div>
          <div class="record-meta"><span></span><span></span></div>
        </div>
        <div>
          <div class="amount ${x.type === "income" ? "positive" : "negative"}"></div>
          <button class="delete-btn" type="button">삭제</button>
        </div>`;
      row.querySelector(".record-title").textContent = x.memo || x.category || "메소 기록";
      const meta = row.querySelectorAll(".record-meta span");
      meta[0].textContent = x.category || "기타";
      meta[1].textContent = dateText(x.created_at);
      row.querySelector(".amount").textContent = `${x.type === "income" ? "+" : "-"}${money(x.amount)}`;
      row.querySelector(".delete-btn").onclick = () => deleteMeso(x.id);
      box.appendChild(row);
    });
  }

  $("mesoForm").onsubmit = async e => {
    e.preventDefault();
    const amount = Number($("mesoAmount").value);
    if (!amount) return;
    const { data, error } = await sb.from("meso_records").insert({
      user_id:user.id,
      type:$("mesoType").value,
      amount,
      category:$("mesoCategory").value.trim() || null,
      memo:$("mesoMemo").value.trim() || null
    }).select().single();
    if (error) return alert(error.message);
    meso.unshift(data);
    ["mesoAmount","mesoCategory","mesoMemo"].forEach(id => $(id).value = "");
    renderAll();
  };

  async function deleteMeso(id) {
    if (!confirm("이 메소 기록을 삭제할까요?")) return;
    const { error } = await sb.from("meso_records").delete().eq("id", id).eq("user_id", user.id);
    if (error) return alert(error.message);
    meso = meso.filter(x => x.id !== id);
    renderAll();
  }

  function renderEnhancements() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const month = enhancements.filter(x => new Date(x.created_at) >= start);

    $("enhanceAttempts").textContent = month.length;
    $("enhanceSuccess").textContent = month.filter(x => x.result === "success").length;
    $("enhanceFail").textContent = month.filter(x => x.result === "fail" || x.result === "destroyed").length;
    $("enhanceCost").textContent = shortMoney(month.reduce((s,x) => s + Number(x.cost || 0), 0));

    const labels = {
      starforce:"스타포스", potential:"잠재", additional:"에디셔널", scroll:"주문서", other:"기타",
      success:"성공", fail:"실패", destroyed:"파괴", change:"변경"
    };

    const box = $("enhanceList");
    box.innerHTML = "";
    if (!enhancements.length) box.innerHTML = '<div class="empty-state">강화 기록이 없습니다.</div>';

    enhancements.forEach(x => {
      const row = document.createElement("div");
      row.className = "record-row";
      row.innerHTML = `
        <div class="tag">${labels[x.enhance_type] || x.enhance_type}</div>
        <div>
          <div class="record-title"></div>
          <div class="record-meta"><span class="tag"></span><span></span><span></span></div>
        </div>
        <button class="delete-btn" type="button">삭제</button>`;
      row.querySelector(".record-title").textContent = x.item_name;
      const meta = row.querySelectorAll(".record-meta span");
      meta[0].textContent = labels[x.result] || x.result;
      meta[1].textContent = x.memo || "";
      meta[2].textContent = `${shortMoney(x.cost || 0)} · ${dateText(x.created_at)}`;
      row.querySelector(".delete-btn").onclick = () => deleteEnhance(x.id);
      box.appendChild(row);
    });
  }

  $("enhanceForm").onsubmit = async e => {
    e.preventDefault();
    const item = $("enhanceItem").value.trim();
    if (!item) return;
    const { data, error } = await sb.from("enhancement_records").insert({
      user_id:user.id,
      item_name:item,
      enhance_type:$("enhanceType").value,
      result:$("enhanceResult").value,
      cost:Number($("enhanceCostInput").value || 0),
      memo:$("enhanceMemo").value.trim() || null
    }).select().single();
    if (error) return alert(error.message);
    enhancements.unshift(data);
    ["enhanceItem","enhanceCostInput","enhanceMemo"].forEach(id => $(id).value = "");
    renderAll();
  };

  async function deleteEnhance(id) {
    if (!confirm("이 강화 기록을 삭제할까요?")) return;
    const { error } = await sb.from("enhancement_records").delete().eq("id", id).eq("user_id", user.id);
    if (error) return alert(error.message);
    enhancements = enhancements.filter(x => x.id !== id);
    renderAll();
  }

  function renderProfile() {
    $("profileNickname").value = profile?.nickname || "";
    $("profileClass").value = profile?.class_name || "";
    $("profileLevel").value = profile?.level ?? "";
    $("profilePower").value = profile?.combat_power ?? "";
    $("profileMemo").value = profile?.memo || "";

    $("summaryNickname").textContent = profile?.nickname || "-";
    $("summaryClass").textContent = profile?.class_name || "-";
    $("summaryLevel").textContent = profile?.level || "-";
    $("summaryPower").textContent = profile?.combat_power ? shortMoney(profile.combat_power) : "-";
  }

  $("profileForm").onsubmit = async e => {
    e.preventDefault();
    const payload = {
      user_id:user.id,
      nickname:$("profileNickname").value.trim() || null,
      class_name:$("profileClass").value.trim() || null,
      level:$("profileLevel").value ? Number($("profileLevel").value) : null,
      combat_power:$("profilePower").value ? Number($("profilePower").value) : null,
      memo:$("profileMemo").value.trim() || null,
      updated_at:new Date().toISOString()
    };
    const { data, error } = await sb.from("maple_profile").upsert(payload, { onConflict:"user_id" }).select().single();
    if (error) return alert(error.message);
    profile = data;
    renderProfile();
    setSync("저장됨");
  };

  function renderOverview() {
    const total = checklist.length;
    const done = checklist.filter(isCompleted).length;
    $("todayCheckStat").textContent = `${done} / ${total}`;

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = meso.filter(x => new Date(x.created_at).toDateString() === now.toDateString());
    const month = meso.filter(x => new Date(x.created_at) >= start);
    const net = arr => arr.reduce((s,x) => s + (x.type === "income" ? Number(x.amount) : -Number(x.amount)), 0);

    $("todayMesoStat").textContent = shortMoney(net(today));
    $("monthNetStat").textContent = shortMoney(net(month));
    $("monthEnhanceStat").textContent = shortMoney(
      enhancements.filter(x => new Date(x.created_at) >= start).reduce((s,x) => s + Number(x.cost || 0), 0)
    );

    const cbox = $("overviewChecklist");
    cbox.innerHTML = "";
    checklist.slice(0,5).forEach(x => {
      const done = isCompleted(x);
      const row = document.createElement("div");
      row.className = `compact-row overview-check-row ${done ? "done" : ""}`;
      row.innerHTML = `
        <div class="left overview-check-left">
          <button class="check-btn ${done ? "checked" : ""}" type="button" aria-label="체크 상태 변경">✓</button>
          <div class="overview-check-text">
            <div class="title"></div>
            <div class="sub">${cycleLabel(x.cycle)}</div>
          </div>
        </div>
        <span>${done ? "완료" : "미완료"}</span>`;
      row.querySelector(".title").textContent = x.title;
      row.querySelector(".check-btn").onclick = () => toggleCheck(x, done);
      cbox.appendChild(row);
    });
    if (!checklist.length) cbox.innerHTML = '<div class="empty-state">등록된 체크 항목이 없습니다.</div>';

    const mbox = $("overviewMeso");
    mbox.innerHTML = "";
    meso.slice(0,5).forEach(x => {
      const row = document.createElement("div");
      row.className = "compact-row";
      row.innerHTML = `<div class="left"><div class="title"></div><div class="sub"></div></div><strong class="${x.type === "income" ? "positive" : "negative"}"></strong>`;
      row.querySelector(".title").textContent = x.memo || x.category || "메소 기록";
      row.querySelector(".sub").textContent = dateText(x.created_at);
      row.querySelector("strong").textContent = `${x.type === "income" ? "+" : "-"}${shortMoney(x.amount)}`;
      mbox.appendChild(row);
    });
    if (!meso.length) mbox.innerHTML = '<div class="empty-state">메소 기록이 없습니다.</div>';
  }

  function renderAll() {
    renderChecklist();
    renderMeso();
    renderEnhancements();
    renderProfile();
    renderOverview();
  }

  sb.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") setUser(null);
    if (event === "SIGNED_IN" && session?.user && session.user.id !== user?.id) setUser(session.user);
  });

  (async () => {
    const { data } = await sb.auth.getSession();
    await setUser(data.session?.user || null);
  })();
})();
