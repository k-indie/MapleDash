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
  let isLoading = false;

  const shortMoney = value => {
    let n = Number(value || 0);
    const sign = n < 0 ? "-" : "";
    n = Math.abs(n);

    if (n >= 1_000_000_000_000) {
      const v = n / 1_000_000_000_000;
      return `${sign}${v.toFixed(v >= 10 || Number.isInteger(v) ? 0 : 1)}조`;
    }
    if (n >= 100_000_000) {
      const v = n / 100_000_000;
      return `${sign}${v.toFixed(v >= 100 || Number.isInteger(v) ? 0 : 1)}억`;
    }
    if (n >= 10_000) {
      const v = n / 10_000;
      return `${sign}${v.toFixed(v >= 100 || Number.isInteger(v) ? 0 : 1)}만`;
    }
    return `${sign}${fmt.format(n)}`;
  };

  const setSync = text => {
    const el = $("syncStatus");
    if (el) el.textContent = text;
  };

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
      const [c, ch] = await Promise.all([
        sb.from("maple_checklist")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),

        sb.from("maple_characters")
          .select("*")
          .eq("user_id", user.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      ]);

      if (c.error) throw c.error;
      if (ch.error) throw ch.error;

      checklist = c.data || [];
      characters = ch.data || [];
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
        <div class="character-card-top">
          <div class="character-title">
            <div class="character-name"></div>
            <span class="character-class-badge"></span>
          </div>
          <button class="character-delete" type="button">삭제</button>
        </div>

        <div class="character-info">
          <div class="info-pair"><span>레벨</span><strong class="view-level"></strong></div>
          <div class="info-pair"><span>전투력</span><strong class="view-power"></strong></div>
          <div class="info-pair"><span>보유 메소</span><strong class="view-owned"></strong></div>
          <div class="info-pair"><span>보스 메소</span><strong class="view-boss"></strong></div>
        </div>

        <div class="character-note"></div>

        <div class="character-actions">
          <button class="edit-toggle" type="button">수정</button>
        </div>

        <div class="character-editor">
          <div class="character-editor-grid">
            <input class="edit-nickname" maxlength="20" placeholder="닉네임">
            <input class="edit-class" maxlength="30" placeholder="직업">
            <input class="edit-level" type="number" min="1" max="999" placeholder="레벨">
            <input class="edit-power" type="number" min="0" step="1" placeholder="전투력">
            <input class="edit-owned" type="number" min="0" step="1" placeholder="보유 메소">
            <input class="edit-boss" type="number" min="0" step="1" placeholder="보스 메소">
            <textarea class="edit-memo" maxlength="120" placeholder="메모"></textarea>
          </div>
          <div class="character-editor-actions">
            <button class="cancel-character" type="button">취소</button>
            <button class="save-character" type="button">저장</button>
          </div>
        </div>
      `;

      card.querySelector(".character-name").textContent = ch.nickname || "-";
      card.querySelector(".character-class-badge").textContent = ch.class_name || "직업 미입력";
      card.querySelector(".view-level").textContent = levelText;
      card.querySelector(".view-power").textContent = powerText;
      card.querySelector(".view-owned").textContent = ownedText;
      card.querySelector(".view-boss").textContent = bossText;
      card.querySelector(".character-note").textContent = ch.memo || "메모 없음";

      const nickname = card.querySelector(".edit-nickname");
      const className = card.querySelector(".edit-class");
      const level = card.querySelector(".edit-level");
      const power = card.querySelector(".edit-power");
      const owned = card.querySelector(".edit-owned");
      const boss = card.querySelector(".edit-boss");
      const memo = card.querySelector(".edit-memo");

      nickname.value = ch.nickname || "";
      className.value = ch.class_name || "";
      level.value = ch.level ?? "";
      power.value = ch.combat_power ?? "";
      owned.value = ch.owned_meso ?? 0;
      boss.value = ch.boss_meso ?? 0;
      memo.value = ch.memo || "";

      card.querySelector(".edit-toggle").addEventListener("click", () => {
        card.classList.toggle("editing");
      });

      card.querySelector(".cancel-character").addEventListener("click", () => {
        nickname.value = ch.nickname || "";
        className.value = ch.class_name || "";
        level.value = ch.level ?? "";
        power.value = ch.combat_power ?? "";
        owned.value = ch.owned_meso ?? 0;
        boss.value = ch.boss_meso ?? 0;
        memo.value = ch.memo || "";
        card.classList.remove("editing");
      });

      card.querySelector(".save-character").addEventListener("click", async () => {
        const payload = {
          nickname: nickname.value.trim(),
          class_name: className.value.trim() || null,
          level: level.value ? Number(level.value) : null,
          combat_power: power.value ? Number(power.value) : null,
          owned_meso: Number(owned.value || 0),
          boss_meso: Number(boss.value || 0),
          memo: memo.value.trim() || null,
          updated_at: new Date().toISOString()
        };

        if (!payload.nickname) return alert("닉네임은 비워둘 수 없습니다.");

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
        setSync("캐릭터 저장됨");
      });

      card.querySelector(".character-delete").addEventListener("click", async () => {
        if (!confirm(`${ch.nickname} 캐릭터를 삭제할까요?`)) return;

        const { error } = await sb
          .from("maple_characters")
          .delete()
          .eq("id", ch.id)
          .eq("user_id", user.id);

        if (error) return alert(error.message);

        characters = characters.filter(x => x.id !== ch.id);
        renderAll();
      });

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

    const submitButton = e.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setSync("캐릭터 추가 중…");

    try {
      const payload = {
        user_id: user.id,
        nickname,
        class_name: $("characterClass").value.trim() || null,
        level: $("characterLevel").value ? Number($("characterLevel").value) : null,
        combat_power: $("characterPower").value ? Number($("characterPower").value) : null,
        owned_meso: Number($("characterOwnedMeso").value || 0),
        boss_meso: Number($("characterBossMeso").value || 0),
        memo: $("characterMemo").value.trim() || null,
        sort_order: characters.length
      };

      const { data, error } = await sb
        .from("maple_characters")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      characters.push(data);

      [
        "characterNickname",
        "characterClass",
        "characterLevel",
        "characterPower",
        "characterOwnedMeso",
        "characterBossMeso",
        "characterMemo"
      ].forEach(id => {
        $(id).value = "";
      });

      renderAll();
      setSync("캐릭터 추가됨");
    } catch (err) {
      console.error(err);
      setSync("추가 실패");
      alert(`캐릭터 추가에 실패했습니다.\n${err.message || err}`);
    } finally {
      submitButton.disabled = false;
    }
  });

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
