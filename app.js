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
            <div class="character-world"></div>
          </div>
        </div>

        <div class="character-info">
          <div class="info-pair"><span>레벨</span><strong class="view-level"></strong></div>
          <div class="info-pair"><span>전투력</span><strong class="view-power"></strong></div>
          <div class="info-pair"><span>보유 메소</span><strong class="view-owned"></strong></div>
          <div class="info-pair"><span>보스 메소</span><strong class="view-boss"></strong></div>
        </div>

        <div class="character-note"></div>
        <div class="api-updated"></div>

        <div class="character-actions">
          <button class="character-refresh icon-action" type="button" aria-label="정보 새로고침" title="정보 새로고침">↻</button>
          <button class="edit-toggle icon-action" type="button" aria-label="메소/메모 수정" title="메소/메모 수정">✎</button>
        </div>

        <div class="character-editor">
          <div class="character-editor-grid">
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
      card.querySelector(".view-level").textContent = levelText;
      card.querySelector(".view-power").textContent = powerText;
      card.querySelector(".view-owned").textContent = ownedText;
      card.querySelector(".view-boss").textContent = bossText;
      card.querySelector(".character-note").textContent = ch.memo || "메모 없음";
      card.querySelector(".api-updated").textContent =
        ch.api_updated_at ? `게임 정보 갱신 ${formatUpdatedAt(ch.api_updated_at)}` : "";

      const owned = card.querySelector(".edit-owned");
      const boss = card.querySelector(".edit-boss");
      const memo = card.querySelector(".edit-memo");

      owned.value = ch.owned_meso ?? 0;
      boss.value = ch.boss_meso ?? 0;
      memo.value = ch.memo || "";

      card.querySelector(".edit-toggle").addEventListener("click", () => {
        card.classList.toggle("editing");
      });

      card.querySelector(".cancel-character").addEventListener("click", () => {
        owned.value = ch.owned_meso ?? 0;
        boss.value = ch.boss_meso ?? 0;
        memo.value = ch.memo || "";
        card.classList.remove("editing");
      });

      card.querySelector(".save-character").addEventListener("click", async () => {
        const payload = {
          owned_meso: Number(owned.value || 0),
          boss_meso: Number(boss.value || 0),
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
        boss_meso: Number($("characterBossMeso").value || 0),
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

      ["characterNickname","characterOwnedMeso","characterBossMeso","characterMemo"]
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
        <button class="delete-btn danger-delete" type="button">삭제</button>
      `;

      const img = row.querySelector(".settings-char-image");
      if (ch.image_url) {
        img.src = ch.image_url;
        img.alt = `${ch.nickname} 캐릭터 이미지`;
      } else {
        img.style.display = "none";
      }

      row.querySelector(".settings-char-name").textContent = ch.nickname || "-";
      row.querySelector(".settings-char-sub").textContent =
        `${ch.class_name || "직업 미확인"} · ${ch.world_name || "월드 미확인"}`;

      const currentIndex = characters.findIndex(item => item.id === ch.id);
      const upBtn = row.querySelector(".move-up");
      const downBtn = row.querySelector(".move-down");

      upBtn.disabled = currentIndex === 0;
      downBtn.disabled = currentIndex === characters.length - 1;

      upBtn.addEventListener("click", () => moveCharacter(currentIndex, -1));
      downBtn.addEventListener("click", () => moveCharacter(currentIndex, 1));

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
