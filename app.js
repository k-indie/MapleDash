(() => {
  const cfg = window.APP_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_PUBLISHABLE_KEY &&
    !cfg.SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
    cfg.SUPABASE_PUBLISHABLE_KEY !== "YOUR_PUBLISHABLE_KEY";

  const $ = id => document.getElementById(id);
  const fmt = new Intl.NumberFormat("ko-KR");
  let sb, user = null, checklist = [], characters = [];

  const shortMoney = value => {
    let n = Number(value || 0);
    const sign = n < 0 ? "-" : "";
    n = Math.abs(n);
    if (n >= 1000000000000) return `${sign}${(n / 1000000000000).toFixed(n % 1000000000000 ? 1 : 0)}조`;
    if (n >= 100000000) return `${sign}${(n / 100000000).toFixed(n % 100000000 ? 1 : 0)}억`;
    if (n >= 10000) return `${sign}${(n / 10000).toFixed(n % 10000 ? 1 : 0)}만`;
    return `${sign}${fmt.format(n)}`;
  };

  const setSync = text => $("syncStatus").textContent = text;

  if (!configured) {
    $("authMessage").textContent = "config.js에 Supabase URL과 Publishable Key를 입력해주세요.";
    $("authMessage").style.color = "#ff727c";
    document.querySelectorAll("input,button,select,textarea").forEach(el => el.disabled = true);
    return;
  }

  sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

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

    const [c, ch] = await Promise.all([
      sb.from("maple_checklist").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      sb.from("maple_characters").select("*").eq("user_id", user.id).order("sort_order", { ascending: true }).order("created_at", { ascending: true })
    ]);

    if (c.error) console.error(c.error);
    if (ch.error) console.error(ch.error);

    checklist = c.data || [];
    characters = ch.data || [];
    renderAll();
    setSync("동기화됨");
  }

  function startOfToday(now = new Date()) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  function startOfWeeklyReset(now = new Date()) {
    const reset = startOfToday(now);
    const day = reset.getDay(); // 0 sun ... 4 thu
    const daysSinceThursday = (day - 4 + 7) % 7;
    reset.setDate(reset.getDate() - daysSinceThursday);
    return reset;
  }

  function startOfMonth(now = new Date()) {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  function resetBoundary(cycle, now = new Date()) {
    if (cycle === "daily") return startOfToday(now);
    if (cycle === "weekly") return startOfWeeklyReset(now);
    if (cycle === "monthly") return startOfMonth(now);
    return new Date(0);
  }

  function isCompleted(item) {
    if (!item.completed_at) return false;
    return new Date(item.completed_at) >= resetBoundary(item.cycle);
  }

  function renderChecklistGroup(cycle, boxId) {
    const box = $(boxId);
    box.innerHTML = "";
    const items = checklist.filter(x => x.cycle === cycle);

    if (!items.length) {
      box.innerHTML = '<div class="empty-state">등록된 항목이 없습니다.</div>';
      return;
    }

    items.forEach(item => {
      const done = isCompleted(item);
      const row = document.createElement("div");
      row.className = `record-row ${done ? "done" : ""}`;
      row.innerHTML = `
        <button class="check-btn ${done ? "checked" : ""}" type="button" aria-label="체크 상태 변경">✓</button>
        <div><div class="record-title"></div></div>
        <button class="delete-btn" type="button">삭제</button>`;

      row.querySelector(".record-title").textContent = item.title;
      row.querySelector(".check-btn").onclick = () => toggleCheck(item, done);
      row.querySelector(".delete-btn").onclick = () => deleteCheck(item.id);
      box.appendChild(row);
    });
  }

  function renderChecklist() {
    renderChecklistGroup("daily", "dailyChecklist");
    renderChecklistGroup("weekly", "weeklyChecklist");
    renderChecklistGroup("monthly", "monthlyChecklist");
  }

  $("checklistForm").onsubmit = async e => {
    e.preventDefault();
    const title = $("checkTitle").value.trim();
    if (!title) return;

    const { data, error } = await sb.from("maple_checklist").insert({
      user_id: user.id,
      title,
      cycle: $("checkCycle").value
    }).select().single();

    if (error) return alert(error.message);

    checklist.push(data);
    $("checkTitle").value = "";
    renderAll();
  };

  async function toggleCheck(item, done) {
    const { data, error } = await sb.from("maple_checklist")
      .update({ completed_at: done ? null : new Date().toISOString() })
      .eq("id", item.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return alert(error.message);
    Object.assign(item, data);
    renderAll();
  }

  async function deleteCheck(id) {
    if (!confirm("이 체크 항목을 삭제할까요?")) return;

    const { error } = await sb.from("maple_checklist")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return alert(error.message);

    checklist = checklist.filter(x => x.id !== id);
    renderAll();
  }

  function renderCharacters() {
    const box = $("characterGrid");
    box.innerHTML = "";
    $("characterCount").textContent = `${characters.length} / 20`;

    if (!characters.length) {
      box.innerHTML = '<div class="empty-state character-empty">등록된 캐릭터가 없습니다.</div>';
      return;
    }

    characters.forEach(ch => {
      const card = document.createElement("article");
      card.className = "character-card";
      card.innerHTML = `
        <div class="character-card-head">
          <div>
            <input class="char-nickname" maxlength="20" value="">
            <input class="char-class" maxlength="30" value="">
          </div>
          <button class="delete-btn" type="button">삭제</button>
        </div>

        <div class="character-mini-grid two">
          <label><span>레벨</span><input class="char-level" type="number" min="1" max="999"></label>
          <label><span>전투력</span><input class="char-power" type="number" min="0" step="1"></label>
        </div>

        <div class="character-mini-grid two meso-grid">
          <label><span>보유 메소</span><input class="char-owned-meso" type="number" min="0" step="1"></label>
          <label><span>보스 메소</span><input class="char-boss-meso" type="number" min="0" step="1"></label>
        </div>

        <label class="char-memo-label"><span>메모</span><textarea class="char-memo" maxlength="120"></textarea></label>
        <button class="secondary char-save" type="button">저장</button>`;

      card.querySelector(".char-nickname").value = ch.nickname || "";
      card.querySelector(".char-class").value = ch.class_name || "";
      card.querySelector(".char-level").value = ch.level ?? "";
      card.querySelector(".char-power").value = ch.combat_power ?? "";
      card.querySelector(".char-owned-meso").value = ch.owned_meso ?? 0;
      card.querySelector(".char-boss-meso").value = ch.boss_meso ?? 0;
      card.querySelector(".char-memo").value = ch.memo || "";

      card.querySelector(".char-save").onclick = async () => {
        const payload = {
          nickname: card.querySelector(".char-nickname").value.trim(),
          class_name: card.querySelector(".char-class").value.trim() || null,
          level: card.querySelector(".char-level").value ? Number(card.querySelector(".char-level").value) : null,
          combat_power: card.querySelector(".char-power").value ? Number(card.querySelector(".char-power").value) : null,
          owned_meso: Number(card.querySelector(".char-owned-meso").value || 0),
          boss_meso: Number(card.querySelector(".char-boss-meso").value || 0),
          memo: card.querySelector(".char-memo").value.trim() || null,
          updated_at: new Date().toISOString()
        };

        if (!payload.nickname) return alert("닉네임은 비워둘 수 없습니다.");

        const { data, error } = await sb.from("maple_characters")
          .update(payload)
          .eq("id", ch.id)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) return alert(error.message);

        Object.assign(ch, data);
        renderSummary();
        setSync("캐릭터 저장됨");
      };

      card.querySelector(".delete-btn").onclick = async () => {
        if (!confirm(`${ch.nickname} 캐릭터를 삭제할까요?`)) return;

        const { error } = await sb.from("maple_characters")
          .delete()
          .eq("id", ch.id)
          .eq("user_id", user.id);

        if (error) return alert(error.message);

        characters = characters.filter(x => x.id !== ch.id);
        renderAll();
      };

      box.appendChild(card);
    });
  }

  $("characterForm").onsubmit = async e => {
    e.preventDefault();

    if (characters.length >= 20) {
      return alert("캐릭터는 최대 20개까지 등록할 수 있습니다.");
    }

    const nickname = $("characterNickname").value.trim();
    if (!nickname) return;

    const { data, error } = await sb.from("maple_characters").insert({
      user_id: user.id,
      nickname,
      class_name: $("characterClass").value.trim() || null,
      level: $("characterLevel").value ? Number($("characterLevel").value) : null,
      combat_power: $("characterPower").value ? Number($("characterPower").value) : null,
      owned_meso: Number($("characterOwnedMeso").value || 0),
      boss_meso: Number($("characterBossMeso").value || 0),
      memo: $("characterMemo").value.trim() || null,
      sort_order: characters.length
    }).select().single();

    if (error) return alert(error.message);

    characters.push(data);
    [
      "characterNickname","characterClass","characterLevel","characterPower",
      "characterOwnedMeso","characterBossMeso","characterMemo"
    ].forEach(id => $(id).value = "");

    renderAll();
    setSync("캐릭터 추가됨");
  };

  function renderSummary() {
    const daily = checklist.filter(x => x.cycle === "daily");
    const weekly = checklist.filter(x => x.cycle === "weekly");

    $("dailySummary").textContent = `${daily.filter(isCompleted).length} / ${daily.length}`;
    $("weeklySummary").textContent = `${weekly.filter(isCompleted).length} / ${weekly.length}`;

    const owned = characters.reduce((sum, ch) => sum + Number(ch.owned_meso || 0), 0);
    const boss = characters.reduce((sum, ch) => sum + Number(ch.boss_meso || 0), 0);

    $("ownedMesoSummary").textContent = shortMoney(owned);
    $("bossMesoSummary").textContent = shortMoney(boss);
    $("characterCountSummary").textContent = characters.length;
  }

  function renderAll() {
    renderChecklist();
    renderCharacters();
    renderSummary();
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
