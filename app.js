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
  let characterGroups = [];
  let selectedDashboardGroupId = sessionStorage.getItem("mapleSelectedDashboardGroupId") || null;
  let economySettings = {
    challenger_rate: 0,
    normal_rate: 0,
    reboot_rate: 0,
    hunting_income: 0
  };
  let economySaveTimer = null;
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
    "검은 마법사":"assets/boss/blackmage.png",
    "메이린":"assets/boss/mayrin.png",
    "벨로나":"assets/boss/belona.png"
  };

  const boss = (name, difficulty, price, short) => ({
    name, difficulty, price, short,
    icon: BOSS_ICONS[name] || null,
    key: `${name}-${difficulty}`
  });

  const BOSS_CATALOG = [

    boss("자쿰","카오스",4040000,"자"),
    boss("피에르","카오스",4080000,"피"),
    boss("반반","카오스",4070000,"반"),
    boss("블러디 퀸","카오스",4070000,"퀸"),
    boss("벨룸","카오스",4640000,"벨"),
    boss("매그너스","하드",4280000,"매"),
    boss("파풀라투스","카오스",6550000,"파"),

    boss("스우","노멀",8350000,"스"),
    boss("데미안","노멀",8750000,"데"),
    boss("가디언 엔젤 슬라임","노멀",12700000,"가"),
    boss("루시드","이지",14900000,"루"),
    boss("윌","이지",16100000,"윌"),
    boss("루시드","노멀",17800000,"루"),
    boss("윌","노멀",20500000,"윌"),
    boss("더스크","노멀",22000000,"더"),
    boss("듄켈","노멀",23700000,"듄"),

    boss("데미안","하드",46400000,"데"),
    boss("스우","하드",48900000,"스"),
    boss("루시드","하드",59700000,"루"),
    boss("더스크","카오스",66300000,"더"),
    boss("진 힐라","노멀",67600000,"진"),
    boss("가디언 엔젤 슬라임","카오스",71300000,"가"),
    boss("윌","하드",73200000,"윌"),
    boss("듄켈","하드",89600000,"듄"),
    boss("진 힐라","하드",100000000,"진"),

    boss("선택받은 세렌","노멀",167000000,"세"),
    boss("감시자 칼로스","이지",238000000,"칼"),
    boss("최초의 대적자","이지",261000000,"대"),
    boss("선택받은 세렌","하드",302000000,"세"),
    boss("카링","이지",320000000,"카"),
    boss("벨로나","이지",396000000,"벨"),
    boss("감시자 칼로스","노멀",479000000,"칼"),
    boss("최초의 대적자","노멀",532000000,"대"),
    boss("스우","익스트림",545000000,"스"),
    boss("카링","노멀",576000000,"카"),
    boss("찬란한 흉성","노멀",593000000,"흉"),
    boss("벨로나","노멀",824000000,"벨"),

    boss("림보","노멀",995000000,"림"),
    boss("감시자 칼로스","카오스",1230000000,"칼"),
    boss("발드릭스","노멀",1320000000,"발"),
    boss("최초의 대적자","하드",1390000000,"대"),
    boss("유피테르","노멀",1560000000,"유"),
    boss("카링","하드",1560000000,"카"),
    boss("선택받은 세렌","익스트림",1840000000,"세"),

    /* 변경 가격이 따로 제시되지 않은 난이도는 기존 가격 유지 */
    boss("림보","하드",2385000000,"림"),
    boss("찬란한 흉성","하드",2678000000,"흉"),
    boss("발드릭스","하드",3078000000,"발"),
    boss("감시자 칼로스","익스트림",4104000000,"칼"),
    boss("최초의 대적자","익스트림",4712000000,"대"),
    boss("유피테르","하드",4845000000,"유"),
    boss("카링","익스트림",5387000000,"카")
  ];

  const BLACK_MAGE_CATALOG = [
    boss("검은 마법사","하드",465000000,"검"),
    boss("검은 마법사","익스트림",5680000000,"검")
  ];

  // 챌린저스 월드 전용 추가 주간 보스.
  // 주간 12마리 선택 제한에는 포함되지 않지만 주간 수익/완료에는 포함됩니다.
  const MAYRIN_CATALOG = [
    boss("메이린","노멀",300000000,"메"),
    boss("메이린","하드",600000000,"메")
  ];

  const ALL_BOSS_CATALOG = [
    ...BOSS_CATALOG,
    ...BLACK_MAGE_CATALOG,
    ...MAYRIN_CATALOG
  ];

  const BOSS_CATALOG_BY_KEY = new Map(
    ALL_BOSS_CATALOG.map(item => [item.key, item])
  );

  function applyCurrentBossCatalogData(selection) {
    if (!selection) return selection;

    const key = selection.key || selection.boss_key;
    const current = BOSS_CATALOG_BY_KEY.get(key);
    if (!current) return selection;

    return {
      ...selection,
      key,
      boss_key: selection.boss_key || key,
      name: selection.name || selection.boss_name || current.name,
      boss_name: selection.boss_name || selection.name || current.name,
      difficulty: current.difficulty,
      price: Number(current.price),
      crystal_price: Number(current.price),
      icon: current.icon
    };
  }


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

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function isJwtIssuedAtFutureError(error) {
    const message = String(error?.message || error || "").toLowerCase();
    return (
      message.includes("jwt issued at future") ||
      message.includes("issued at future")
    );
  }

  async function refreshSessionForJwtRecovery() {
    setSync("세션 자동 복구 중…");

    await sleep(900);

    let result = await sb.auth.refreshSession();

    if (result.error && isJwtIssuedAtFutureError(result.error)) {
      await sleep(1600);
      result = await sb.auth.refreshSession();
    }

    if (result.error) throw result.error;

    if (result.data?.session?.user) {
      user = result.data.session.user;
    }

    return result.data?.session || null;
  }

  // ===== v1.49 MVP BLACK calculator =====
  const MVP_STORAGE_KEY = "mapleMvpBlackCalculatorV1";

  let mvpCalculator = {
    discordRate: 0,
    marketRate: 0,
    items: [],
    creditItems: [],
    chargeMethods: [],
    maplePointRate: 0,
    maplePointBenefits: []
  };

  function loadMvpCalculator() {
    try {
      const saved = JSON.parse(localStorage.getItem(MVP_STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") {
        mvpCalculator = {
          discordRate: Math.max(0, Number(saved.discordRate || 0)),
          marketRate: Math.max(0, Number(saved.marketRate || 0)),
          items: Array.isArray(saved.items) ? saved.items.map(item => ({
            id: String(item.id || `${Date.now()}-${Math.random()}`),
            name: String(item.name || ""),
            cash: Math.max(0, Number(item.cash || 0)),
            qty: Math.max(0, Math.floor(Number(item.qty ?? 1))),
            auction: Math.max(0, Number(item.auction || 0)),
            included: item.included !== false
          })) : [],
          creditItems: Array.isArray(saved.creditItems) ? saved.creditItems.map(item => ({
            id: String(item.id || `${Date.now()}-${Math.random()}`),
            name: String(item.name || ""),
            credit: Math.max(0, Number(item.credit || 0)),
            qty: Math.max(0, Math.floor(Number(item.qty ?? 1))),
            auction: Math.max(0, Number(item.auction || 0)),
            included: item.included !== false
          })) : [],
          chargeMethods: Array.isArray(saved.chargeMethods) ? saved.chargeMethods.map(item => ({
            id: String(item.id || `${Date.now()}-${Math.random()}`),
            name: String(item.name || ""),
            cash: Math.max(0, Number(item.cash || 0)),
            discount: Math.min(100, Math.max(0, Number(item.discount || 0)))
          })) : [],
          maplePointRate: Math.max(0, Number(saved.maplePointRate || 0)),
          maplePointBenefits: Array.isArray(saved.maplePointBenefits) ? saved.maplePointBenefits.map(item => ({
            id: String(item.id || `${Date.now()}-${Math.random()}`),
            name: String(item.name || ""),
            points: Math.max(0, Number(item.points || 0)),
            qty: Math.max(0, Math.floor(Number(item.qty ?? 1))),
            included: item.included !== false
          })) : []
        };
      }
    } catch (error) {
      console.warn("MVP calculator load failed:", error);
    }
  }

  function saveMvpCalculator() {
    try {
      localStorage.setItem(MVP_STORAGE_KEY, JSON.stringify(mvpCalculator));
    } catch (error) {
      console.warn("MVP calculator save failed:", error);
    }
  }

  function formatMvpNumber(value) {
    return Math.max(0, Math.floor(Number(value || 0))).toLocaleString("ko-KR");
  }

  function parseMvpNumber(value) {
    return Math.max(0, Number(String(value || "").replace(/[^\d.]/g, "")) || 0);
  }

  function formatMvpMeso(value) {
    const amount = Math.max(0, Math.floor(Number(value || 0)));
    if (typeof shortMoney === "function") return shortMoney(amount);
    return `${amount.toLocaleString("ko-KR")} 메소`;
  }

  function renderMvpSummary() {
    const requiredCash = mvpCalculator.items.reduce(
      (sum, item) => item.included !== false
        ? sum + Number(item.cash || 0) * Math.max(0, Number(item.qty ?? 1))
        : sum, 0
    );
    // 경매장 판매 수수료 3% 반영: 실제 획득 메소는 판매가의 97%
    const totalMeso = mvpCalculator.items.reduce(
      (sum, item) => item.included !== false
        ? sum + Number(item.auction || 0) * Math.max(0, Number(item.qty ?? 1)) * 0.97
        : sum, 0
    );
    const earnedCredit = Math.floor(requiredCash * 0.05);

    const usedCredit = mvpCalculator.creditItems.reduce(
      (sum, item) => item.included !== false
        ? sum + Number(item.credit || 0) * Math.max(0, Number(item.qty ?? 1))
        : sum, 0
    );
    const creditTotalMeso = mvpCalculator.creditItems.reduce(
      (sum, item) => item.included !== false
        ? sum + Number(item.auction || 0) * Math.max(0, Number(item.qty ?? 1)) * 0.97
        : sum, 0
    );
    const combinedTotalMeso = totalMeso + creditTotalMeso;

    const chargeCash = mvpCalculator.chargeMethods.reduce(
      (sum, item) => sum + Number(item.cash || 0), 0
    );
    const chargedActualSpent = mvpCalculator.chargeMethods.reduce(
      (sum, item) => sum + Number(item.cash || 0) * (1 - Number(item.discount || 0) / 100), 0
    );
    // 충전 수단을 등록하지 않았으면 기존처럼 넥슨캐시 1 = 1원으로 계산.
    // 등록한 경우에는 필요한 캐시 중 등록된 충전분은 할인 적용,
    // 부족한 캐시는 정가(1캐시=1원)로 계산.
    const discountedAppliedCash = Math.min(requiredCash, chargeCash);
    let discountedAppliedSpent = 0;
    let remainingAppliedCash = discountedAppliedCash;
    for (const method of mvpCalculator.chargeMethods) {
      if (remainingAppliedCash <= 0) break;
      const methodCash = Number(method.cash || 0);
      const applied = Math.min(methodCash, remainingAppliedCash);
      discountedAppliedSpent += applied * (1 - Number(method.discount || 0) / 100);
      remainingAppliedCash -= applied;
    }
    const actualCashSpent = mvpCalculator.chargeMethods.length
      ? discountedAppliedSpent + Math.max(0, requiredCash - discountedAppliedCash)
      : requiredCash;
    const averageDiscount = requiredCash > 0
      ? Math.max(0, (1 - actualCashSpent / requiredCash) * 100)
      : 0;

    const totalMaplePoints = mvpCalculator.maplePointBenefits.reduce(
      (sum, item) => item.included !== false
        ? sum + Number(item.points || 0) * Math.max(0, Number(item.qty ?? 1))
        : sum, 0
    );
    const maplePointRate = Number(mvpCalculator.maplePointRate || 0);
    const maplePointMesoEok = maplePointRate > 0 ? totalMaplePoints / maplePointRate : 0;

    const discordRate = Number(mvpCalculator.discordRate || 0); // 1억 메소당 원
    const marketRate = Number(mvpCalculator.marketRate || 0);   // 1억 메소당 메이플포인트

    // 경매장 판매 루트:
    // 총 획득 메소(억) × 디코 1억당 원화 시세
    const auctionMesoEok = combinedTotalMeso / 100000000;
    const discordWon = discordRate > 0 ? auctionMesoEok * discordRate : 0;
    const discordRecovery = actualCashSpent > 0 ? (discordWon / actualCashSpent) * 100 : 0;

    // 메소마켓 루트:
    // 필요한 넥슨캐시를 동일 수치의 메이플포인트로 보았을 때
    // 필요한 캐시 ÷ (1억당 메포 시세) = 획득 가능한 억 메소
    const marketMesoEok = marketRate > 0 ? requiredCash / marketRate : 0;
    const marketWon = discordRate > 0 ? marketMesoEok * discordRate : 0;

    // 넥슨캐시 1 = 1원 명목가 기준 회수율
    const marketRecovery = actualCashSpent > 0 ? (marketWon / actualCashSpent) * 100 : 0;

    const required = $("mvpRequiredCash");
    const total = $("mvpTotalMeso");
    const discord = $("mvpDiscordRate");
    const market = $("mvpMarketRate");
    const earnedCreditEl = $("mvpEarnedCredit");
    const creditEarnedSummaryEl = $("mvpCreditEarnedSummary");
    const remainingCreditEl = $("mvpRemainingCredit");
    const chargeCashEl = $("mvpChargeCash");
    const actualCashSpentEl = $("mvpActualCashSpent");
    const averageDiscountEl = $("mvpAverageDiscount");
    const totalMaplePointsEl = $("mvpTotalMaplePoints");
    const maplePointMesoValueEl = $("mvpMaplePointMesoValue");
    const benefitTotalPointsEl = $("mvpBenefitTotalPoints");
    const benefitMesoValueEl = $("mvpBenefitMesoValue");
    const usedCreditEl = $("mvpUsedCredit");
    const creditTotalMesoEl = $("mvpCreditTotalMeso");
    const discordWonEl = $("mvpDiscordWon");
    const discordRecoveryEl = $("mvpDiscordRecovery");
    const marketMesoEl = $("mvpMarketMeso");
    const marketWonEl = $("mvpMarketWon");
    const marketRecoveryEl = $("mvpMarketRecovery");

    if (required) required.textContent = `${formatMvpNumber(requiredCash)} 캐시`;
    if (earnedCreditEl) earnedCreditEl.textContent = `${formatMvpNumber(earnedCredit)} 크레딧`;
    if (creditEarnedSummaryEl) creditEarnedSummaryEl.textContent = formatMvpNumber(earnedCredit);
    if (remainingCreditEl) remainingCreditEl.textContent = formatMvpNumber(Math.max(0, earnedCredit - usedCredit));
    if (chargeCashEl) chargeCashEl.textContent = `${formatMvpNumber(chargeCash)} 캐시`;
    if (actualCashSpentEl) actualCashSpentEl.textContent = `${formatMvpNumber(actualCashSpent)}원`;
    if (averageDiscountEl) averageDiscountEl.textContent = `${averageDiscount.toFixed(2)}%`;
    if (totalMaplePointsEl) totalMaplePointsEl.textContent = `${formatMvpNumber(totalMaplePoints)} 메포`;
    if (maplePointMesoValueEl) maplePointMesoValueEl.textContent = `${formatMvpNumber(maplePointMesoEok)}억`;
    if (benefitTotalPointsEl) benefitTotalPointsEl.textContent = formatMvpNumber(totalMaplePoints);
    if (benefitMesoValueEl) benefitMesoValueEl.textContent = `${formatMvpNumber(maplePointMesoEok)}억`;
    if (usedCreditEl) usedCreditEl.textContent = formatMvpNumber(usedCredit);
    if (creditTotalMesoEl) creditTotalMesoEl.textContent = formatMvpMeso(creditTotalMeso);
    if (total) total.textContent = `${formatMvpMeso(combinedTotalMeso)}`;
    if (discord && document.activeElement !== discord) discord.value = mvpCalculator.discordRate ? formatMvpNumber(mvpCalculator.discordRate) : "";
    if (market && document.activeElement !== market) market.value = mvpCalculator.marketRate ? formatMvpNumber(mvpCalculator.marketRate) : "";

    if (discordWonEl) discordWonEl.textContent = `${formatMvpNumber(discordWon)}원`;
    if (discordRecoveryEl) discordRecoveryEl.textContent = `${discordRecovery.toFixed(2)}%`;
    if (marketMesoEl) marketMesoEl.textContent = `${marketMesoEok.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억 메소`;
    if (marketWonEl) marketWonEl.textContent = `${formatMvpNumber(marketWon)}원`;
    if (marketRecoveryEl) marketRecoveryEl.textContent = `${marketRecovery.toFixed(2)}%`;
  }

  function renderMvpItems() {
    const box = $("mvpItemRows");
    if (!box) return;
    box.innerHTML = "";

    if (!mvpCalculator.items.length) {
      const empty = document.createElement("div");
      empty.className = "mvp-empty";
      empty.textContent = "아래 ‘캐시 아이템 추가’를 눌러 품목별 회수율을 계산해보세요.";
      box.appendChild(empty);
      renderMvpSummary();
      return;
    }

    mvpCalculator.items.forEach(item => {
      const row = document.createElement("div");
      row.className = "mvp-item-row mvp-cash-item-row";

      const qtyValue = Math.max(0, Number(item.qty ?? 1));

      const updateRowResult = () => {
        const qty = Math.max(0, Number(item.qty ?? 1));
        const nominalCash = Number(item.cash || 0) * qty;
        const requiredCashAll = mvpCalculator.items.reduce(
          (sum, x) => x.included !== false
            ? sum + Number(x.cash || 0) * Math.max(0, Number(x.qty ?? 1))
            : sum, 0
        );
        const chargeCashAll = mvpCalculator.chargeMethods.reduce((sum, x) => sum + Number(x.cash || 0), 0);
        let appliedCash = Math.min(requiredCashAll, chargeCashAll);
        let appliedSpent = 0;
        let remain = appliedCash;
        for (const method of mvpCalculator.chargeMethods) {
          if (remain <= 0) break;
          const use = Math.min(Number(method.cash || 0), remain);
          appliedSpent += use * (1 - Number(method.discount || 0) / 100);
          remain -= use;
        }
        const actualAll = mvpCalculator.chargeMethods.length
          ? appliedSpent + Math.max(0, requiredCashAll - appliedCash)
          : requiredCashAll;
        const effectiveFactor = requiredCashAll > 0 ? actualAll / requiredCashAll : 1;
        const investedCash = nominalCash * effectiveFactor;
        // 경매장 예상가는 판매 등록가이며, 실제 획득 메소는 수수료 3% 차감
        const earnedMeso = Number(item.auction || 0) * qty * 0.97;
        const discordRate = Number(mvpCalculator.discordRate || 0);
        const recoveredWon = discordRate > 0 ? (earnedMeso / 100000000) * discordRate : 0;
        const recoveryRate = investedCash > 0 ? (recoveredWon / investedCash) * 100 : 0;
        const earnedCredit = Math.floor(nominalCash * 0.05);

        row.querySelector(".mvp-row-invested").textContent =
          investedCash > 0 ? `${formatMvpNumber(investedCash)}원` : "—";
        row.querySelector(".mvp-row-meso").textContent =
          earnedMeso > 0 ? formatMvpMeso(earnedMeso) : "—";
        row.querySelector(".mvp-row-recovered").textContent =
          recoveredWon > 0 ? `${formatMvpNumber(recoveredWon)}원` : "—";
        row.querySelector(".mvp-row-recovery").textContent =
          investedCash > 0 && discordRate > 0 ? `${recoveryRate.toFixed(2)}%` : "—";
        row.querySelector(".mvp-row-credit").textContent =
          investedCash > 0 ? `${formatMvpNumber(earnedCredit)}` : "—";
      };

      row.innerHTML = `
        <input class="mvp-item-name" type="text" maxlength="60" placeholder="아이템 이름">
        <input class="mvp-item-cash" type="text" inputmode="numeric" placeholder="캐시 원가">
        <input class="mvp-item-qty" type="text" inputmode="numeric" placeholder="수량">
        <input class="mvp-item-auction" type="text" inputmode="numeric" placeholder="경매장 예상가">
        <strong class="mvp-row-result mvp-row-invested">—</strong>
        <strong class="mvp-row-result mvp-row-meso">—</strong>
        <strong class="mvp-row-result mvp-row-recovered">—</strong>
        <strong class="mvp-row-result mvp-row-recovery">—</strong>
        <strong class="mvp-row-result mvp-row-credit">—</strong>
        <button class="mvp-include-toggle" type="button" title="총 계산 포함 여부"></button>
        <button class="mvp-delete-item" type="button" title="삭제">×</button>
      `;

      const name = row.querySelector(".mvp-item-name");
      const cash = row.querySelector(".mvp-item-cash");
      const qty = row.querySelector(".mvp-item-qty");
      const auction = row.querySelector(".mvp-item-auction");
      const includeToggle = row.querySelector(".mvp-include-toggle");

      name.value = item.name;
      cash.value = item.cash ? formatMvpNumber(item.cash) : "";
      qty.value = formatMvpNumber(qtyValue);
      auction.value = item.auction ? formatMvpNumber(item.auction) : "";

      const syncIncludeToggle = () => {
        const included = item.included !== false;
        includeToggle.textContent = included ? "포함" : "제외";
        includeToggle.classList.toggle("is-included", included);
        row.classList.toggle("is-excluded", !included);
      };
      syncIncludeToggle();

      name.addEventListener("input", () => {
        item.name = name.value;
        saveMvpCalculator();
      });

      cash.addEventListener("input", () => {
        item.cash = parseMvpNumber(cash.value);
        cash.value = item.cash ? formatMvpNumber(item.cash) : "";
        updateRowResult();
        renderMvpSummary();
        saveMvpCalculator();
        requestAnimationFrame(() => cash.setSelectionRange(cash.value.length, cash.value.length));
      });

      qty.addEventListener("input", () => {
        item.qty = Math.max(0, Math.floor(parseMvpNumber(qty.value)));
        qty.value = formatMvpNumber(item.qty);
        updateRowResult();
        renderMvpSummary();
        saveMvpCalculator();
        requestAnimationFrame(() => qty.setSelectionRange(qty.value.length, qty.value.length));
      });

      auction.addEventListener("input", () => {
        item.auction = parseMvpNumber(auction.value);
        auction.value = item.auction ? formatMvpNumber(item.auction) : "";
        updateRowResult();
        renderMvpSummary();
        saveMvpCalculator();
        requestAnimationFrame(() => auction.setSelectionRange(auction.value.length, auction.value.length));
      });

      includeToggle.addEventListener("click", () => {
        item.included = item.included === false;
        syncIncludeToggle();
        renderMvpSummary();
        saveMvpCalculator();
      });

      row.querySelector(".mvp-delete-item").addEventListener("click", () => {
        mvpCalculator.items = mvpCalculator.items.filter(x => x.id !== item.id);
        saveMvpCalculator();
        renderMvpItems();
      });

      box.appendChild(row);
      updateRowResult();
    });

    renderMvpSummary();
  }

  function renderMvpMaplePointBenefits() {
    const box = $("mvpMaplePointBenefitRows");
    if (!box) return;
    box.innerHTML = "";
    if (!mvpCalculator.maplePointBenefits.length) {
      const empty=document.createElement("div");
      empty.className="mvp-charge-empty";
      empty.textContent="받는 메이플포인트 혜택을 추가해 주세요.";
      box.appendChild(empty); renderMvpSummary(); return;
    }
    mvpCalculator.maplePointBenefits.forEach(item=>{
      const row=document.createElement("div");
      row.className="mvp-item-row mvp-maplepoint-item-row";
      row.innerHTML=`<input class="mvp-mp-name" type="text" maxlength="60" placeholder="혜택 이름">
        <input class="mvp-mp-points" type="text" inputmode="numeric" placeholder="받는 메포">
        <input class="mvp-mp-qty" type="text" inputmode="numeric" placeholder="수량">
        <strong class="mvp-mp-total">0 메포</strong>
        <button class="mvp-include-toggle" type="button"></button>
        <button class="mvp-delete-item" type="button">×</button>`;
      const name=row.querySelector(".mvp-mp-name"), points=row.querySelector(".mvp-mp-points"),
            qty=row.querySelector(".mvp-mp-qty"), toggle=row.querySelector(".mvp-include-toggle");
      name.value=item.name; points.value=item.points?formatMvpNumber(item.points):"";
      qty.value=formatMvpNumber(Math.max(0,Number(item.qty??1)));
      const sync=()=>{const inc=item.included!==false;toggle.textContent=inc?"포함":"제외";toggle.classList.toggle("is-included",inc);row.classList.toggle("is-excluded",!inc);};
      const recalc=()=>{row.querySelector(".mvp-mp-total").textContent=`${formatMvpNumber(Number(item.points||0)*Math.max(0,Number(item.qty??1)))} 메포`;renderMvpSummary();saveMvpCalculator();};
      sync(); recalc();
      name.addEventListener("input",()=>{item.name=name.value;saveMvpCalculator();});
      points.addEventListener("input",()=>{item.points=parseMvpNumber(points.value);points.value=item.points?formatMvpNumber(item.points):"";recalc();requestAnimationFrame(()=>points.setSelectionRange(points.value.length,points.value.length));});
      qty.addEventListener("input",()=>{item.qty=Math.max(0,Math.floor(parseMvpNumber(qty.value)));qty.value=formatMvpNumber(item.qty);recalc();requestAnimationFrame(()=>qty.setSelectionRange(qty.value.length,qty.value.length));});
      toggle.addEventListener("click",()=>{item.included=item.included===false;sync();renderMvpSummary();saveMvpCalculator();});
      row.querySelector(".mvp-delete-item").addEventListener("click",()=>{mvpCalculator.maplePointBenefits=mvpCalculator.maplePointBenefits.filter(x=>x.id!==item.id);saveMvpCalculator();renderMvpMaplePointBenefits();});
      box.appendChild(row);
    });
    renderMvpSummary();
  }

  function renderMvpChargeMethods() {
    const box = $("mvpChargeRows");
    if (!box) return;
    box.innerHTML = "";

    if (!mvpCalculator.chargeMethods.length) {
      const empty = document.createElement("div");
      empty.className = "mvp-charge-empty";
      empty.textContent = "충전 수단을 등록하지 않으면 1캐시 = 1원 기준으로 계산됩니다.";
      box.appendChild(empty);
      renderMvpSummary();
      return;
    }

    mvpCalculator.chargeMethods.forEach(item => {
      const row = document.createElement("div");
      row.className = "mvp-charge-row";
      const actual = Number(item.cash || 0) * (1 - Number(item.discount || 0) / 100);

      row.innerHTML = `
        <input class="mvp-charge-name" type="text" maxlength="40" placeholder="예: 카드 / 쿠폰">
        <input class="mvp-charge-cash" type="text" inputmode="numeric" placeholder="충전 캐시">
        <div class="mvp-discount-input"><input class="mvp-charge-discount" type="number" min="0" max="100" step="0.1"><span>%</span></div>
        <strong class="mvp-charge-actual">${formatMvpNumber(actual)}원</strong>
        <button class="mvp-delete-item" type="button" title="삭제">×</button>
      `;

      const name = row.querySelector(".mvp-charge-name");
      const cash = row.querySelector(".mvp-charge-cash");
      const discount = row.querySelector(".mvp-charge-discount");
      name.value = item.name;
      cash.value = item.cash ? formatMvpNumber(item.cash) : "";
      discount.value = Number(item.discount || 0);

      const recalc = () => {
        row.querySelector(".mvp-charge-actual").textContent =
          `${formatMvpNumber(Number(item.cash || 0) * (1 - Number(item.discount || 0) / 100))}원`;
        // 할인율이 품목별 투입현금/회수율에도 영향을 주므로 캐시 행 전체 갱신
        renderMvpItems();
        renderMvpSummary();
        saveMvpCalculator();
      };

      name.addEventListener("input", () => {
        item.name = name.value;
        saveMvpCalculator();
      });
      cash.addEventListener("input", () => {
        item.cash = parseMvpNumber(cash.value);
        cash.value = item.cash ? formatMvpNumber(item.cash) : "";
        recalc();
        requestAnimationFrame(() => cash.setSelectionRange(cash.value.length, cash.value.length));
      });
      discount.addEventListener("input", () => {
        item.discount = Math.min(100, Math.max(0, Number(discount.value || 0)));
        recalc();
      });
      row.querySelector(".mvp-delete-item").addEventListener("click", () => {
        mvpCalculator.chargeMethods = mvpCalculator.chargeMethods.filter(x => x.id !== item.id);
        saveMvpCalculator();
        renderMvpChargeMethods();
        renderMvpItems();
      });

      box.appendChild(row);
    });

    renderMvpSummary();
  }

  function renderMvpCreditItems() {
    const box = $("mvpCreditRows");
    if (!box) return;
    box.innerHTML = "";

    if (!mvpCalculator.creditItems.length) {
      const empty = document.createElement("div");
      empty.className = "mvp-empty";
      empty.textContent = "획득한 크레딧으로 구매해 판매할 아이템을 추가해주세요.";
      box.appendChild(empty);
      renderMvpSummary();
      return;
    }

    mvpCalculator.creditItems.forEach(item => {
      const row = document.createElement("div");
      row.className = "mvp-item-row mvp-credit-item-row";

      const efficiency = item.credit > 0 ? Math.floor((item.auction * 0.97) / item.credit) : 0;

      row.innerHTML = `
        <input class="mvp-credit-name" type="text" maxlength="60" placeholder="아이템명">
        <input class="mvp-credit-cost" type="text" inputmode="numeric" placeholder="필요 크레딧">
        <input class="mvp-credit-qty" type="text" inputmode="numeric" placeholder="개수">
        <input class="mvp-credit-auction" type="text" inputmode="numeric" placeholder="메소">
        <strong class="mvp-item-efficiency">${formatMvpNumber(efficiency)} 메소</strong>
        <button class="mvp-include-toggle" type="button" title="총 계산 포함 여부"></button>
        <button class="mvp-delete-item" type="button" title="삭제">삭제</button>
      `;

      const name = row.querySelector(".mvp-credit-name");
      const credit = row.querySelector(".mvp-credit-cost");
      const qty = row.querySelector(".mvp-credit-qty");
      const auction = row.querySelector(".mvp-credit-auction");
      const includeToggle = row.querySelector(".mvp-include-toggle");

      name.value = item.name;
      credit.value = item.credit ? formatMvpNumber(item.credit) : "";
      qty.value = formatMvpNumber(Math.max(0, Number(item.qty ?? 1)));
      auction.value = item.auction ? formatMvpNumber(item.auction) : "";

      const syncIncludeToggle = () => {
        const included = item.included !== false;
        includeToggle.textContent = included ? "포함" : "제외";
        includeToggle.classList.toggle("is-included", included);
        row.classList.toggle("is-excluded", !included);
      };
      syncIncludeToggle();

      name.addEventListener("input", () => {
        item.name = name.value;
        saveMvpCalculator();
      });

      const recalcRow = () => {
        row.querySelector(".mvp-item-efficiency").textContent =
          `${formatMvpNumber(item.credit > 0 ? (item.auction * 0.97) / item.credit : 0)} 메소`;
        renderMvpSummary();
        saveMvpCalculator();
      };

      credit.addEventListener("input", () => {
        item.credit = parseMvpNumber(credit.value);
        credit.value = item.credit ? formatMvpNumber(item.credit) : "";
        recalcRow();
        requestAnimationFrame(() => credit.setSelectionRange(credit.value.length, credit.value.length));
      });

      qty.addEventListener("input", () => {
        item.qty = Math.max(0, Math.floor(parseMvpNumber(qty.value)));
        qty.value = formatMvpNumber(item.qty);
        recalcRow();
        requestAnimationFrame(() => qty.setSelectionRange(qty.value.length, qty.value.length));
      });

      auction.addEventListener("input", () => {
        item.auction = parseMvpNumber(auction.value);
        auction.value = item.auction ? formatMvpNumber(item.auction) : "";
        recalcRow();
        requestAnimationFrame(() => auction.setSelectionRange(auction.value.length, auction.value.length));
      });

      includeToggle.addEventListener("click", () => {
        item.included = item.included === false;
        syncIncludeToggle();
        renderMvpSummary();
        saveMvpCalculator();
      });

      row.querySelector(".mvp-delete-item").addEventListener("click", () => {
        mvpCalculator.creditItems = mvpCalculator.creditItems.filter(x => x.id !== item.id);
        saveMvpCalculator();
        renderMvpCreditItems();
      });

      box.appendChild(row);
    });

    renderMvpSummary();
  }

  function bindMvpCalculator() {
    const mpRate=$("mvpMaplePointRate");
    if(mpRate && mpRate.dataset.bound!=="1"){
      mpRate.dataset.bound="1";
      mpRate.value=mvpCalculator.maplePointRate?formatMvpNumber(mvpCalculator.maplePointRate):"";
      mpRate.addEventListener("input",()=>{mvpCalculator.maplePointRate=parseMvpNumber(mpRate.value);mpRate.value=mvpCalculator.maplePointRate?formatMvpNumber(mvpCalculator.maplePointRate):"";renderMvpSummary();saveMvpCalculator();requestAnimationFrame(()=>mpRate.setSelectionRange(mpRate.value.length,mpRate.value.length));});
    }
    const addMp=$("mvpAddMaplePointBenefitBtn");
    if(addMp && addMp.dataset.bound!=="1"){
      addMp.dataset.bound="1";
      addMp.addEventListener("click",()=>{mvpCalculator.maplePointBenefits.push({id:`mp-${Date.now()}-${Math.random().toString(16).slice(2)}`,name:"",points:0,qty:1,included:true});saveMvpCalculator();renderMvpMaplePointBenefits();$("mvpMaplePointBenefitRows")?.lastElementChild?.querySelector(".mvp-mp-name")?.focus();});
    }
    const addCharge = $("mvpAddChargeBtn");
    if (addCharge && addCharge.dataset.bound !== "1") {
      addCharge.dataset.bound = "1";
      addCharge.addEventListener("click", () => {
        mvpCalculator.chargeMethods.push({
          id: `charge-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: "",
          cash: 0,
          discount: 0
        });
        saveMvpCalculator();
        renderMvpChargeMethods();
        $("mvpChargeRows")?.lastElementChild?.querySelector(".mvp-charge-name")?.focus();
      });
    }

    const addCredit = $("mvpAddCreditItemBtn");
    if (addCredit && addCredit.dataset.bound !== "1") {
      addCredit.dataset.bound = "1";
      addCredit.addEventListener("click", () => {
        mvpCalculator.creditItems.push({
          id: `credit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: "",
          credit: 0,
          qty: 1,
          auction: 0,
          included: true
        });
        saveMvpCalculator();
        renderMvpCreditItems();
        $("mvpCreditRows")?.lastElementChild?.querySelector(".mvp-credit-name")?.focus();
      });
    }

    const add = $("mvpAddItemBtn");
    if (add && add.dataset.bound !== "1") {
      add.dataset.bound = "1";
      add.addEventListener("click", () => {
        mvpCalculator.items.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: "",
          cash: 0,
          qty: 1,
          auction: 0,
          included: true
        });
        saveMvpCalculator();
        renderMvpItems();
        $("mvpItemRows")?.lastElementChild?.querySelector(".mvp-item-name")?.focus();
      });
    }

    [
      ["mvpDiscordRate", "discordRate"],
      ["mvpMarketRate", "marketRate"]
    ].forEach(([id, key]) => {
      const input = $(id);
      if (!input || input.dataset.bound === "1") return;
      input.dataset.bound = "1";
      input.addEventListener("input", () => {
        mvpCalculator[key] = parseMvpNumber(input.value);
        input.value = mvpCalculator[key] ? formatMvpNumber(mvpCalculator[key]) : "";

        // 시세 입력 즉시 품목별 회수금액/회수율과 상단 요약을 모두 다시 계산
        if (key === "discordRate") {
          renderMvpItems();
        } else {
          renderMvpSummary();
        }
        saveMvpCalculator();

        requestAnimationFrame(() => {
          input.setSelectionRange(input.value.length, input.value.length);
        });
      });
    });
  }

  function bindMvpRealtimeDelegation() {
    const rows = $("mvpItemRows");
    if (!rows || rows.dataset.realtimeBound === "1") return;
    rows.dataset.realtimeBound = "1";

    rows.addEventListener("input", event => {
      if (!event.target.closest(".mvp-item-row")) return;
      queueMicrotask(() => {
        renderMvpSummary();
        saveMvpCalculator();
      });
    });
  }

  loadMvpCalculator();

  function showView(viewId) {
    document.querySelectorAll(".app-view-section").forEach(section => section.classList.add("hidden"));
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    $(viewId).classList.remove("hidden");
    document.querySelector(`.nav-btn[data-view="${viewId}"]`)?.classList.add("active");

    if (viewId === "mvpView") {
      renderMvpItems();
      bindMvpCalculator();
      bindMvpRealtimeDelegation();
      renderMvpSummary();
    }
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

  async function loadAll({ allowJwtRecovery = true } = {}) {
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
      bossSelections = (bs.data || []).map(applyCurrentBossCatalogData);
      characterCheckStates = cs.data || [];

      // 그룹 테이블은 선택 기능입니다.
      // 아직 schema.sql을 실행하지 않았더라도 기존 캐릭터/체크리스트는 정상 표시합니다.
      const gr = await sb
        .from("character_groups")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (gr.error) {
        console.warn("character_groups load skipped:", gr.error);
        characterGroups = [];
        selectedDashboardGroupId = null;
      } else {
        characterGroups = gr.data || [];

        const stillExists = characterGroups.some(g => g.id === selectedDashboardGroupId);
        if (!stillExists) {
          selectedDashboardGroupId = characterGroups[0]?.id || null;
          if (selectedDashboardGroupId) {
            sessionStorage.setItem("mapleSelectedDashboardGroupId", String(selectedDashboardGroupId));
          } else {
            sessionStorage.removeItem("mapleSelectedDashboardGroupId");
          }
        }
      }

      const eco = await sb
        .from("maple_economy_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (eco.error) {
        console.warn("maple_economy_settings load skipped:", eco.error);
      } else if (eco.data) {
        economySettings = {
          challenger_rate: Number(eco.data.challenger_rate || 0),
          normal_rate: Number(eco.data.normal_rate || 0),
          reboot_rate: Number(eco.data.reboot_rate || 0),
          hunting_income: Number(eco.data.hunting_income || 0)
        };
      }

      renderAll();
      setSync("동기화됨");
    } catch (err) {
      console.error(err);

      if (allowJwtRecovery && isJwtIssuedAtFutureError(err)) {
        isLoading = false;

        try {
          await refreshSessionForJwtRecovery();
          return await loadAll({ allowJwtRecovery: false });
        } catch (recoveryError) {
          console.error("JWT 자동 복구 실패:", recoveryError);
          setSync("세션 복구 실패");
          alert(
            `로그인 세션을 자동으로 복구하지 못했습니다.\n` +
            `${recoveryError?.message || recoveryError}\n\n` +
            `Windows 시간 동기화 후 새로고침해주세요.`
          );
          return;
        }
      }

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
      renderGroupStatus();
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
    renderSettingsGroups();
    renderGroupStatus();
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
        <strong>${shortMoney(selectedBosses.reduce((sum, x) => sum + getBossPersonalIncome(x), 0))}</strong>
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
      row.querySelector(".card-boss-price").textContent = `${getBossPartySize(selection)}인 · ${shortMoney(getBossPersonalIncome(selection))}`;

      row.addEventListener("click", () => toggleBossKilledFromCard(selection));
      list.appendChild(row);
    });

    box.appendChild(list);
  }

  $("characterChecklistClose")?.addEventListener("click",closeCharacterChecklist);document.querySelector("[data-close-character-checklist]")?.addEventListener("click",closeCharacterChecklist);

  function renderCharacters() {
    const visibleCharacters = selectedDashboardGroupId
      ? characters.filter(ch => ch.group_id === selectedDashboardGroupId)
      : [];

    const box = $("characterGrid");
    box.innerHTML = "";
    $("characterCount").textContent = `${visibleCharacters.length} / ${characters.length}`;

    if (!visibleCharacters.length) {
      box.innerHTML = '<div class="empty-state">등록된 캐릭터가 없습니다.</div>';
      return;
    }

    visibleCharacters.forEach(ch => {
      const card = document.createElement("article");
      card.className = "character-card";

      const levelText = ch.level ? `Lv.${fmt.format(ch.level)}` : "-";
      const powerText = ch.combat_power ? shortMoney(ch.combat_power) : "-";
card.innerHTML = `
        <div class="character-avatar-wrap">
          <img class="character-avatar" alt="">
          <div class="character-profile-actions">
            <button class="character-refresh icon-action" type="button" aria-label="정보 새로고침" title="정보 새로고침">↻</button>
            <button class="edit-toggle icon-action" type="button" aria-label="메모 수정" title="메모 수정">✎</button>
          </div>
        </div>

        <div class="character-identity-row">
          <div class="character-name-class">
            <strong class="character-name"></strong>
            <span class="character-class-badge"></span>
          </div>
        </div>

        <div class="character-server-status-row">
          <div class="character-world"></div>
          <div class="character-status-row">
            <button class="status-chip daily-status" type="button" title="일간 숙제 전체 완료/해제"></button>
            <button class="status-chip weekly-status" type="button" title="주간 보스 전체 완료/해제"></button>
            <button class="status-chip monthly-status" type="button" title="검마 완료/해제"></button>
          </div>
        </div>

        <div class="character-info">
          <div class="info-pair"><span>레벨</span><strong class="view-level"></strong></div>
          <div class="info-pair"><span>전투력</span><strong class="view-power"></strong></div>
          <div class="info-pair"><span>주간 보스 수익</span><strong class="view-weekly-boss-income"></strong></div>
          <div class="info-pair"><span>월간 보스 수익</span><strong class="view-monthly-boss-income"></strong></div>
        </div>

        <div class="character-note-space">
          <div class="character-note"></div>
        </div>

        <div class="character-editor">
          <div class="character-editor-grid">
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
      weeklyBtn.classList.toggle("complete", bp.selected === 0 || bp.killed === bp.selected);

      dailyBtn.addEventListener("click", e => {
        e.stopPropagation();
        toggleWholeCycle(ch, "daily");
      });

      weeklyBtn.title = bp.selected > 0
        ? `주간 보스 ${bp.killed}/${bp.selected} · 클릭하면 전체 처치/해제`
        : "설정된 주간 보스 없음 · 완료 처리";
      weeklyBtn.addEventListener("click", e => {
        e.stopPropagation();
        toggleAllWeeklyBosses(ch);
      });

      if (blackMage) {
        monthlyBtn.classList.remove("hidden");
        monthlyBtn.classList.toggle("complete", isBossKilledThisMonth(blackMage));
        monthlyBtn.title = isBossKilledThisMonth(blackMage)
          ? "이번 달 검은마법사 처치 완료 · 클릭하면 해제"
          : "클릭하면 이번 달 검은마법사 처치 완료";

        monthlyBtn.addEventListener("click", e => {
          e.stopPropagation();
          toggleBlackMage(ch);
        });
      } else {
        monthlyBtn.classList.add("hidden");
      }
      card.querySelector(".view-level").textContent = levelText;
      card.querySelector(".view-power").textContent = powerText;
      card.querySelector(".view-weekly-boss-income").textContent =
        shortMoney(getCharacterWeeklyBossIncome(ch.id));
      card.querySelector(".view-monthly-boss-income").textContent =
        shortMoney(getCharacterMonthlyBossIncome(ch.id));
      card.querySelector(".character-note").textContent = ch.memo || "";

      const memo = card.querySelector(".edit-memo");
      memo.value = ch.memo || "";

      card.querySelector(".edit-toggle").addEventListener("click", () => {
        card.classList.toggle("editing");
      });

      card.querySelector(".cancel-character").addEventListener("click", () => {
        memo.value = ch.memo || "";
        card.classList.remove("editing");
      });

      card.querySelector(".save-character").addEventListener("click", async () => {
        const payload = {
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

  function getGroupById(groupId) {
    return characterGroups.find(g => g.id === groupId) || null;
  }

  function getCharacterDailyDone(characterId) {
    const p = getCharacterChecklistProgress(characterId, "daily");
    return p.total > 0 && p.done === p.total;
  }

  function getCharacterWeeklyDone(characterId) {
    const p = getBossProgress(characterId);
    return p.selected === 0 || p.killed === p.selected;
  }

  function getGroupHomeworkStatus(groupId) {
    const members = characters.filter(ch => ch.group_id === groupId);

    const dailyDone = members.filter(ch => getCharacterDailyDone(ch.id)).length;
    const weeklyDone = members.filter(ch => getCharacterWeeklyDone(ch.id)).length;

    return {
      members,
      dailyDone,
      dailyTotal: members.length,
      weeklyDone,
      weeklyTotal: members.length,
      dailyComplete: members.length > 0 && dailyDone === members.length,
      weeklyComplete: members.length > 0 && weeklyDone === members.length
    };
  }

  function getGroupWeeklyProgress(groupId) {
    const memberIds = new Set(
      characters.filter(ch => ch.group_id === groupId).map(ch => ch.id)
    );

    const normalWeekly = bossSelections.filter(selection =>
      memberIds.has(selection.character_id) &&
      !isBlackMageBoss(selection) &&
      !isMayrinBoss(selection)
    );

    const mayrinWeekly = bossSelections.filter(selection => {
      if (!memberIds.has(selection.character_id) || !isMayrinBoss(selection)) return false;
      const ch = characters.find(c => c.id === selection.character_id);
      return isChallengerWorld(ch?.world_name);
    });

    return {
      killed: normalWeekly.filter(isBossKilledThisWeek).length,
      selected: normalWeekly.length,
      mayrinConfigured: mayrinWeekly.length > 0,
      mayrinDone: mayrinWeekly.some(isBossKilledThisWeek),
      members: memberIds.size
    };
  }

  function getGroupNormalWeeklySelectedCount(groupId, excludingCharacterId = null) {
    const memberIds = new Set(
      characters
        .filter(ch => ch.group_id === groupId && ch.id !== excludingCharacterId)
        .map(ch => ch.id)
    );

    return bossSelections.filter(selection =>
      memberIds.has(selection.character_id) &&
      !isBlackMageBoss(selection) &&
      !isMayrinBoss(selection)
    ).length;
  }

  function getDraftNormalWeeklyCount() {
    return [...bossDraft.values()].filter(x =>
      !isBlackMageBoss(x) && !isMayrinBoss(x)
    ).length;
  }

  function wouldExceedGroupWeeklyLimit(character, nextDraftNormalCount) {
    if (!character?.group_id) return false;

    const otherCharactersCount =
      getGroupNormalWeeklySelectedCount(character.group_id, character.id);

    return otherCharactersCount + nextDraftNormalCount > 90;
  }

  function getGroupWeeklyLimitState(character, nextDraftNormalCount) {
    if (!character?.group_id) {
      return { grouped: false, current: nextDraftNormalCount, limit: 90 };
    }

    const otherCharactersCount =
      getGroupNormalWeeklySelectedCount(character.group_id, character.id);

    return {
      grouped: true,
      current: otherCharactersCount + nextDraftNormalCount,
      limit: 90
    };
  }

  function renderGroupStatus() {
    const box = $("groupStatusGrid");
    if (!box) return;
    box.innerHTML = "";

    if (!characterGroups.length) {
      box.innerHTML = '<div class="empty-state">설정에서 계정 · 월드 그룹을 먼저 만들어주세요.</div>';
      return;
    }

    characterGroups.forEach(group => {
      const progress = getGroupWeeklyProgress(group.id);
      const percent = progress.selected > 0 ? Math.min(100, (progress.killed / progress.selected) * 100) : 0;

      const card = document.createElement("article");
      // v1.46: selectedDashboardGroupId → selected-group 클래스가 유일한 선택 표시 기준
      const isSelectedGroup = String(selectedDashboardGroupId || "") === String(group.id);
      card.className = `group-status-card ${progress.selected > 0 && progress.killed === progress.selected ? "limit-reached" : ""} ${isSelectedGroup ? "selected-group" : ""}`;
      card.innerHTML = `
        <div class="group-status-head">
          <div>
            <strong class="group-account"></strong>
            <span class="group-world"></span>
          </div>
          <span class="group-member-count"></span>
        </div>

        <div class="group-homework-wrap">
          <div class="group-homework-buttons"></div>
          <div class="group-homework-popover" role="tooltip"></div>
        </div>

        <div class="group-status-metrics">
          <div class="group-status-count">
            <span>주간 보스 처치</span>
            <strong>${progress.killed} / ${progress.selected}</strong>
          </div>
          <div class="group-meso-line">
            <span>보유 메소</span>
            <strong class="group-owned-meso">${shortMoney(group.owned_meso || 0)}</strong>
            <button class="group-meso-edit" type="button" title="보유 메소 수정">✎</button>
          </div>
        </div>

        <div class="group-progress-track">
          <span style="width:${percent}%"></span>
        </div>

        <div class="group-meso-editor hidden">
          <input class="group-meso-input" type="number" min="0" step="1" value="${Number(group.owned_meso || 0)}">
          <button class="group-meso-cancel" type="button">취소</button>
          <button class="group-meso-save" type="button">저장</button>
        </div>
      `;

      card.querySelector(".group-account").textContent = group.account_name;
      card.querySelector(".group-world").textContent = group.world_name;
      const memberBadge = card.querySelector(".group-member-count");
      if (isChallengerWorld(group.world_name)) {
        memberBadge.innerHTML =
          `<span>${progress.members}캐릭</span>` +
          `<span class="group-mayrin-badge ${progress.mayrinDone ? "done" : ""}">메이린</span>`;
      } else {
        memberBadge.textContent = `${progress.members}캐릭`;
      }

      const homework = getGroupHomeworkStatus(group.id);
      const homeworkButtons = card.querySelector(".group-homework-buttons");
      const homeworkPopover = card.querySelector(".group-homework-popover");

      homeworkButtons.innerHTML = `
        <button type="button"
          class="group-homework-btn daily ${homework.dailyComplete ? "complete" : ""}"
          aria-label="그룹 일간 숙제 현황">
          일간 ${homework.dailyDone}/${homework.dailyTotal}
        </button>
        <button type="button"
          class="group-homework-btn weekly ${homework.weeklyComplete ? "complete" : ""}"
          aria-label="그룹 주간 숙제 현황">
          주간 ${homework.weeklyDone}/${homework.weeklyTotal}
        </button>
      `;

      if (!homework.members.length) {
        homeworkPopover.innerHTML = '<div class="group-homework-empty">소속 캐릭터가 없습니다.</div>';
      } else {
        homeworkPopover.innerHTML = `
          <div class="group-homework-popover-head">
            <strong>캐릭터 숙제 현황</strong>
            <span>일간 · 주간</span>
          </div>
          <div class="group-homework-list"></div>
        `;

        const list = homeworkPopover.querySelector(".group-homework-list");

        homework.members.forEach(member => {
          const dailyDone = getCharacterDailyDone(member.id);
          const weeklyDone = getCharacterWeeklyDone(member.id);

          const row = document.createElement("div");
          row.className = "group-homework-character";
          row.innerHTML = `
            <span class="group-homework-name"></span>
            <span class="mini-homework-status ${dailyDone ? "done" : ""}">일간</span>
            <span class="mini-homework-status ${weeklyDone ? "done" : ""}">주간</span>
          `;
          row.querySelector(".group-homework-name").textContent = member.nickname || "캐릭터";
          list.appendChild(row);
        });
      }

      const mesoEditor = card.querySelector(".group-meso-editor");
      const mesoInput = card.querySelector(".group-meso-input");

      card.querySelector(".group-meso-edit").addEventListener("click", () => {
        mesoEditor.classList.remove("hidden");
        mesoInput.focus();
        mesoInput.select();
      });

      card.querySelector(".group-meso-cancel").addEventListener("click", () => {
        mesoInput.value = Number(group.owned_meso || 0);
        mesoEditor.classList.add("hidden");
      });

      card.querySelector(".group-meso-save").addEventListener("click", async () => {
        const ownedMeso = Math.max(0, Math.floor(Number(mesoInput.value || 0)));

        const { data, error } = await sb
          .from("character_groups")
          .update({ owned_meso: ownedMeso })
          .eq("id", group.id)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) {
          alert(error.message);
          return;
        }

        Object.assign(group, data);
        renderGroupStatus();
        renderSettingsGroups();
        renderSummary();
        setSync("그룹 보유 메소 저장됨");
      });

      card.addEventListener("click", e => {
        // 메소 수정 버튼/입력 등 인터랙션 클릭은 그룹 선택 트리거에서 제외
        if (e.target.closest("button,input,select,textarea")) return;

        if (String(selectedDashboardGroupId || "") === String(group.id)) return;

        selectedDashboardGroupId = group.id;
        sessionStorage.setItem("mapleSelectedDashboardGroupId", String(group.id));

        // 선택 ID를 먼저 확정한 뒤 다시 그려서 selected-group 클래스가 유지되게 함
        renderGroupStatus();
        renderCharacters();
        updateSelectedGroupTitle();
      });

      box.appendChild(card);
    });
  }

  async function saveGroupOrder() {
    setSync("그룹 순서 저장 중…");

    const results = await Promise.all(
      characterGroups.map((group, index) =>
        sb.from("character_groups")
          .update({ sort_order: index })
          .eq("id", group.id)
          .eq("user_id", user.id)
      )
    );

    const failed = results.find(result => result.error);
    if (failed) {
      console.error(failed.error);
      setSync("그룹 순서 저장 실패");
      alert(`그룹 순서를 저장하지 못했습니다.\n${failed.error.message}`);
      await loadAll();
      return false;
    }

    characterGroups.forEach((group, index) => {
      group.sort_order = index;
    });

    setSync("그룹 순서 저장됨");
    return true;
  }

  async function moveGroupByDrag(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceIndex = characterGroups.findIndex(g => g.id === sourceId);
    const targetIndex = characterGroups.findIndex(g => g.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [moved] = characterGroups.splice(sourceIndex, 1);
    const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    characterGroups.splice(adjustedTarget, 0, moved);

    renderSettingsGroups();
    renderGroupStatus();
    await saveGroupOrder();
  }

  function renderSettingsGroups() {
    const box = $("settingsGroupList");
    if (!box) return;
    box.innerHTML = "";

    if (!characterGroups.length) {
      box.innerHTML = '<div class="empty-state">등록된 그룹이 없습니다.</div>';
      return;
    }

    characterGroups.forEach(group => {
      const progress = getGroupWeeklyProgress(group.id);
      const row = document.createElement("div");
      row.className = "settings-group-row";
      row.dataset.groupId = group.id;
      row.innerHTML = `
        <button class="group-drag-handle" type="button" draggable="true"
          aria-label="드래그해서 그룹 순서 변경" title="드래그해서 순서 변경">⠿</button>
        <div class="settings-group-main">
          <strong class="settings-group-account"></strong>
          <span class="settings-group-world"></span>
        </div>
        <div class="settings-group-progress">보스 ${progress.killed}/${progress.selected}${isChallengerWorld(group.world_name) ? ` · 메이린` : ""} · ${progress.members}캐릭 · 메소 ${shortMoney(group.owned_meso || 0)}</div>
        <div class="settings-group-actions">
          <button class="edit-group-btn" type="button">수정</button>
          <button class="delete-btn delete-group" type="button">삭제</button>
        </div>
      `;

      row.querySelector(".settings-group-account").textContent = group.account_name;
      row.querySelector(".settings-group-world").textContent = group.world_name;

      const dragHandle = row.querySelector(".group-drag-handle");

      dragHandle.addEventListener("dragstart", e => {
        row.classList.add("dragging");
        document.body.classList.add("sorting-active");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", group.id);

        if (e.dataTransfer.setDragImage) {
          e.dataTransfer.setDragImage(row, 28, 28);
        }
      });

      dragHandle.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        document.body.classList.remove("sorting-active");
        box.querySelectorAll(".settings-group-row").forEach(item => {
          item.classList.remove("drag-over", "drag-over-before", "drag-over-after");
        });
      });

      row.addEventListener("dragover", e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (row.classList.contains("dragging")) return;

        const rect = row.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;

        box.querySelectorAll(".settings-group-row").forEach(item => {
          item.classList.remove("drag-over", "drag-over-before", "drag-over-after");
        });

        row.classList.add("drag-over", before ? "drag-over-before" : "drag-over-after");
      });

      row.addEventListener("dragleave", e => {
        if (!row.contains(e.relatedTarget)) {
          row.classList.remove("drag-over", "drag-over-before", "drag-over-after");
        }
      });

      row.addEventListener("drop", e => {
        e.preventDefault();
        row.classList.remove("drag-over", "drag-over-before", "drag-over-after");
        const sourceId = e.dataTransfer.getData("text/plain");
        moveGroupByDrag(sourceId, group.id);
      });

      row.querySelector(".edit-group-btn").addEventListener("click", () => {
        if (row.querySelector(".settings-group-inline-editor")) return;

        const editor = document.createElement("div");
        editor.className = "settings-group-inline-editor";
        editor.innerHTML = `
          <label>
            <span>계정명</span>
            <input class="edit-group-account" type="text" maxlength="40">
          </label>
          <label>
            <span>월드명</span>
            <input class="edit-group-world" type="text" maxlength="40">
          </label>
          <div class="settings-group-inline-actions">
            <button class="cancel-group-edit" type="button">취소</button>
            <button class="save-group-edit" type="button">저장</button>
          </div>
        `;

        const accountInput = editor.querySelector(".edit-group-account");
        const worldInput = editor.querySelector(".edit-group-world");

        accountInput.value = group.account_name || "";
        worldInput.value = group.world_name || "";

        row.appendChild(editor);
        accountInput.focus();
        accountInput.select();

        editor.querySelector(".cancel-group-edit").addEventListener("click", () => {
          editor.remove();
        });

        editor.querySelector(".save-group-edit").addEventListener("click", async () => {
          const accountName = accountInput.value.trim();
          const worldName = worldInput.value.trim();

          if (!accountName || !worldName) {
            alert("계정명과 월드명을 모두 입력해주세요.");
            return;
          }

          const saveBtn = editor.querySelector(".save-group-edit");
          saveBtn.disabled = true;
          setSync("그룹 수정 중…");

          const { data, error } = await sb
            .from("character_groups")
            .update({
              account_name: accountName,
              world_name: worldName
            })
            .eq("id", group.id)
            .eq("user_id", user.id)
            .select()
            .single();

          saveBtn.disabled = false;

          if (error) {
            console.error(error);
            setSync("그룹 수정 실패");
            alert(error.message);
            return;
          }

          Object.assign(group, data);

          // 현재 선택 그룹이면 아래 내 캐릭터 제목의 그룹명/서버명도 즉시 반영
          renderSettingsGroups();
          renderSettingsCharacters();
          renderGroupStatus();
          renderCharacters();
          updateSelectedGroupTitle();
          renderSummary();

          setSync("그룹 수정됨");
        });
      });

      row.querySelector(".delete-group").addEventListener("click", async () => {
        if (!confirm(`${group.account_name} · ${group.world_name} 그룹을 삭제할까요?\\n배정된 캐릭터는 '미지정'으로 돌아갑니다.`)) return;

        const { error } = await sb
          .from("character_groups")
          .delete()
          .eq("id", group.id)
          .eq("user_id", user.id);

        if (error) {
          alert(error.message);
          return;
        }

        characterGroups = characterGroups.filter(g => g.id !== group.id);
        characters.forEach(ch => {
          if (ch.group_id === group.id) ch.group_id = null;
        });

        if (String(selectedDashboardGroupId || "") === String(group.id)) {
          selectedDashboardGroupId = characterGroups[0]?.id || null;
          if (selectedDashboardGroupId) {
            sessionStorage.setItem("mapleSelectedDashboardGroupId", String(selectedDashboardGroupId));
          } else {
            sessionStorage.removeItem("mapleSelectedDashboardGroupId");
          }
        }

        renderAll();
        setSync("그룹 삭제됨");
      });

      box.appendChild(row);
    });
  }

  $("groupForm")?.addEventListener("submit", async e => {
    e.preventDefault();

    const accountName = $("groupAccountName").value.trim();
    const worldName = $("groupWorldName").value.trim();
    if (!accountName || !worldName) return;

    if (characterGroups.some(g =>
      g.account_name === accountName && g.world_name === worldName
    )) {
      alert("같은 계정 이름과 월드의 그룹이 이미 있습니다.");
      return;
    }

    const { data, error } = await sb
      .from("character_groups")
      .insert({
        user_id: user.id,
        account_name: accountName,
        world_name: worldName,
        sort_order: characterGroups.length
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    characterGroups.push(data);
    if (!selectedDashboardGroupId) selectedDashboardGroupId = data.id;

    $("groupAccountName").value = "";
    $("groupWorldName").value = "";

    renderAll();
    setSync("그룹 추가됨");
  });

  async function saveCharacterOrder() {
    setSync("캐릭터 순서 저장 중…");

    const results = await Promise.all(
      characters.map((ch, index) =>
        sb.from("maple_characters")
          .update({ sort_order: index })
          .eq("id", ch.id)
          .eq("user_id", user.id)
      )
    );

    const failed = results.find(result => result.error);
    if (failed) {
      console.error(failed.error);
      setSync("캐릭터 순서 저장 실패");
      alert(`캐릭터 순서를 저장하지 못했습니다.\n${failed.error.message}`);
      await loadAll();
      return false;
    }

    characters.forEach((ch, index) => {
      ch.sort_order = index;
    });

    setSync("캐릭터 순서 저장됨");
    return true;
  }

  async function moveCharacterByDrag(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceIndex = characters.findIndex(ch => ch.id === sourceId);
    const targetIndex = characters.findIndex(ch => ch.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [moved] = characters.splice(sourceIndex, 1);
    const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    characters.splice(adjustedTarget, 0, moved);

    renderCharacters();
    renderSettingsCharacters();
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
        <button class="character-drag-handle" type="button" draggable="true"
          aria-label="드래그해서 캐릭터 순서 변경" title="드래그해서 순서 변경">⠿</button>
        <div class="settings-char-main">
          <img class="settings-char-image" alt="">
          <div>
            <strong class="settings-char-name"></strong>
            <div class="settings-char-sub"></div>
          </div>
        </div>
        <div class="settings-character-group">
          <select class="character-group-select" title="계정 · 월드 그룹"></select>
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

      const groupSelect = row.querySelector(".character-group-select");
      groupSelect.innerHTML = '<option value="">그룹 미지정</option>';

      // 캐릭터의 실제 월드와 같은 월드 그룹만 선택지에 보여줍니다.
      characterGroups
        .filter(group => !ch.world_name || group.world_name === ch.world_name)
        .forEach(group => {
          const option = document.createElement("option");
          option.value = group.id;
          option.textContent = `${group.account_name} · ${group.world_name}`;
          groupSelect.appendChild(option);
        });

      groupSelect.value = ch.group_id || "";

      groupSelect.addEventListener("change", async () => {
        const groupId = groupSelect.value || null;

        const { data, error } = await sb
          .from("maple_characters")
          .update({ group_id: groupId, updated_at: new Date().toISOString() })
          .eq("id", ch.id)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) {
          alert(error.message);
          groupSelect.value = ch.group_id || "";
          return;
        }

        Object.assign(ch, data);
        renderGroupStatus();
        renderSettingsGroups();
        setSync("그룹 저장됨");
      });

      row.dataset.characterId = ch.id;
      const dragHandle = row.querySelector(".character-drag-handle");

      dragHandle.addEventListener("dragstart", e => {
        row.classList.add("dragging");
        document.body.classList.add("sorting-active");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", ch.id);

        // 브라우저 기본 드래그 이미지를 현재 행 자체로 사용
        if (e.dataTransfer.setDragImage) {
          e.dataTransfer.setDragImage(row, 28, 28);
        }
      });

      dragHandle.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        document.body.classList.remove("sorting-active");
        box.querySelectorAll(".settings-character-row").forEach(item => {
          item.classList.remove("drag-over", "drag-over-before", "drag-over-after");
        });
      });

      row.addEventListener("dragover", e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (row.classList.contains("dragging")) return;

        const rect = row.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;

        box.querySelectorAll(".settings-character-row").forEach(item => {
          item.classList.remove("drag-over", "drag-over-before", "drag-over-after");
        });

        row.classList.add("drag-over", before ? "drag-over-before" : "drag-over-after");
      });

      row.addEventListener("dragleave", e => {
        if (!row.contains(e.relatedTarget)) {
          row.classList.remove("drag-over", "drag-over-before", "drag-over-after");
        }
      });

      row.addEventListener("drop", e => {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData("text/plain");
        row.classList.remove("drag-over", "drag-over-before", "drag-over-after");
        moveCharacterByDrag(sourceId, ch.id);
      });

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

  function isMayrinBoss(selection) {
    return (selection?.boss_name || selection?.name) === "메이린";
  }

  function isChallengerWorld(worldName) {
    return String(worldName || "").includes("챌린저스");
  }

  function isBossKilledThisWeek(selection) {
    if (!selection?.killed_at) return false;
    return new Date(selection.killed_at) >= weeklyBossResetBoundary();
  }

  function isBossKilledThisMonth(selection) {
    // 매월 1일 00:00 이전의 처치 기록은 자동으로 미완료 처리됩니다.
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
    const ch = characters.find(c => c.id === characterId);
    const selected = bossSelections.filter(x =>
      x.character_id === characterId &&
      !isBlackMageBoss(x) &&
      (!isMayrinBoss(x) || isChallengerWorld(ch?.world_name))
    );
    return {
      selected: selected.length,
      killed: selected.filter(isBossKilledThisWeek).length
    };
  }

  function getBossPartySize(selection) {
    const n = Math.floor(Number(selection?.party_size || 1));
    return Math.max(1, Math.min(6, Number.isFinite(n) ? n : 1));
  }

  function getBossPersonalIncome(selection) {
    const current = applyCurrentBossCatalogData(selection);
    const base = Number(current?.price ?? current?.crystal_price ?? 0);
    return Math.floor(base / getBossPartySize(current));
  }

  function getCharacterBossIncome(characterId) {
    return bossSelections
      .filter(x => x.character_id === characterId)
      .reduce((sum, x) => sum + getBossPersonalIncome(x), 0);
  }

  function getCharacterWeeklyBossIncome(characterId) {
    const ch = characters.find(c => c.id === characterId);
    return bossSelections
      .filter(x =>
        x.character_id === characterId &&
        !isBlackMageBoss(x) &&
        (!isMayrinBoss(x) || isChallengerWorld(ch?.world_name))
      )
      .reduce((sum, x) => sum + getBossPersonalIncome(x), 0);
  }

  function getCharacterBlackMageIncome(characterId) {
    return bossSelections
      .filter(x => x.character_id === characterId && isBlackMageBoss(x))
      .reduce((sum, x) => sum + getBossPersonalIncome(x), 0);
  }

  function getCharacterMonthlyBossIncome(characterId) {
    return getCharacterWeeklyBossIncome(characterId) * 4
      + getCharacterBlackMageIncome(characterId);
  }

  function getWeeklyBossIncome() {
    return bossSelections
      .filter(x => {
        if (isBlackMageBoss(x)) return false;
        if (!isMayrinBoss(x)) return true;
        const ch = characters.find(c => c.id === x.character_id);
        return isChallengerWorld(ch?.world_name);
      })
      .reduce((sum, x) => sum + getBossPersonalIncome(x), 0);
  }

  function getBlackMageMonthlyIncome() {
    return bossSelections
      .filter(isBlackMageBoss)
      .reduce((sum, x) => sum + getBossPersonalIncome(x), 0);
  }

  function getMonthlyBossIncome() {
    return getWeeklyBossIncome() * 4 + getBlackMageMonthlyIncome();
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

  async function toggleBlackMage(ch) {
    const blackMage = getBlackMageSelection(ch.id);

    if (!blackMage) {
      alert("설정에서 검은마법사를 먼저 선택해주세요.");
      return;
    }

    const killedNow = isBossKilledThisMonth(blackMage);
    const nextKilledAt = killedNow ? null : new Date().toISOString();

    setSync(killedNow ? "검마 완료 해제 중…" : "검마 완료 저장 중…");

    try {
      const { data, error } = await sb
        .from("character_boss_selections")
        .update({ killed_at: nextKilledAt })
        .eq("user_id", user.id)
        .eq("character_id", ch.id)
        .eq("boss_key", blackMage.boss_key)
        .select()
        .single();

      if (error) throw error;

      Object.assign(blackMage, data);

      renderCharacters();
      renderSettingsCharacters();
      renderSettingsGroups();
      renderGroupStatus();
      renderSummary();

      if (checklistEditingCharacter?.id === ch.id) {
        renderCharacterChecklistModal();
      }

      setSync(killedNow ? "검마 완료 해제됨" : "검마 완료");
    } catch (err) {
      console.error(err);
      alert(err.message || String(err));
      setSync("검마 저장 실패");
      await loadAll();
    }
  }

  function openBossModal(ch) {
    bossEditingCharacter = ch;
    bossDraft = new Map(
      bossSelections
        .filter(x => x.character_id === ch.id)
        .map(x => {
          const current = applyCurrentBossCatalogData(x);
          return [
            current.boss_key,
            {
              ...current,
              key: current.boss_key,
              name: current.boss_name,
              price: Number(current.crystal_price || 0),
              party_size: getBossPartySize(current)
            }
          ];
        })
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
        const partySize = selected ? getBossPartySize(selectedData) : 1;
        const shownIncome = selected ? Math.floor(Number(b.price) / partySize) : Number(b.price);

        option.innerHTML = `
          <span class="boss-option-difficulty">${b.difficulty}</span>
          <span class="boss-option-price">
            <img src="assets/boss/meso.png" alt="">
            <span>${shortMoney(shownIncome)}</span>
          </span>
          ${selected ? `
            <select class="boss-party-select" aria-label="${bossName} ${b.difficulty} 파티 인원" title="파티 인원">
              ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${partySize === n ? "selected" : ""}>${n}인</option>`).join("")}
            </select>
            <span class="boss-option-kill ${killed ? "killed" : ""}">${killed ? "✓ 처치" : "○ 미처치"}</span>
          ` : ""}
        `;

        const partySelect = option.querySelector(".boss-party-select");
        if (partySelect) {
          partySelect.addEventListener("click", e => e.stopPropagation());
          partySelect.addEventListener("change", e => {
            e.stopPropagation();
            const current = bossDraft.get(b.key);
            if (!current) return;
            bossDraft.set(b.key, {
              ...current,
              ...b,
              party_size: Number(e.target.value || 1)
            });
            renderBossCatalog();
          });
        }

        option.addEventListener("click", e => {
          if (e.target.closest(".boss-party-select")) return;

          const killTarget = e.target.closest(".boss-option-kill");

          if (killTarget && selected) {
            const current = bossDraft.get(b.key);
            bossDraft.set(b.key, {
              ...current,
              ...b,
              party_size: getBossPartySize(current),
              killed_at: isBossKilledThisWeek(current) ? null : new Date().toISOString()
            });
            renderBossCatalog();
            return;
          }

          const wasSelected = bossDraft.has(b.key);
          variants.forEach(v => bossDraft.delete(v.key));

          if (!wasSelected) {
            const weeklyCount = getDraftNormalWeeklyCount();

            if (weeklyCount >= 12) {
              alert("이 캐릭터의 일반 주간 보스는 최대 12마리까지 선택할 수 있습니다.");
              renderBossCatalog();
              return;
            }

            const nextDraftCount = weeklyCount + 1;
            if (wouldExceedGroupWeeklyLimit(bossEditingCharacter, nextDraftCount)) {
              const state = getGroupWeeklyLimitState(bossEditingCharacter, nextDraftCount);
              const group = getGroupById(bossEditingCharacter.group_id);
              const groupName = group
                ? `${group.account_name} · ${group.world_name}`
                : "현재 그룹";

              alert(
                `⚠️ ${groupName}의 일반 주간 보스 90마리 제한을 초과합니다.\n` +
                `선택 후 ${state.current} / ${state.limit}마리가 됩니다.\n\n` +
                `메이린은 이 90마리 제한에 포함되지 않습니다.`
              );

              renderBossCatalog();
              return;
            }

            bossDraft.set(b.key, { ...b, party_size: 1, killed_at: null });
          }

          renderBossCatalog();
        });

        optionBox.appendChild(option);
      });

      weeklyGrid.appendChild(card);
    });

    box.appendChild(weeklyGrid);

    // 챌린저스 전용 추가 주간 보스: 메이린
    if (bossEditingCharacter && isChallengerWorld(bossEditingCharacter.world_name)) {
      const mayrinWrap = document.createElement("section");
      mayrinWrap.className = "mayrin-weekly-wrap";

      const mayrinHeading = document.createElement("div");
      mayrinHeading.className = "boss-section-banner mayrin-banner";
      mayrinHeading.innerHTML = `
        <div>
          <strong>추가 주간 보스 · 메이린</strong>
          <span>챌린저스 전용 · 주간 12마리 제한과 별도</span>
        </div>
      `;
      mayrinWrap.appendChild(mayrinHeading);

      const mayrinSelected = MAYRIN_CATALOG.find(v => bossDraft.has(v.key));

      const mayrinCard = document.createElement("section");
      mayrinCard.className = `boss-select-card mayrin-card ${mayrinSelected ? "has-selection" : ""}`;
      mayrinCard.innerHTML = `
        <div class="boss-select-card-head">
          <div class="boss-select-icon">${makeBossIcon(MAYRIN_CATALOG[0])}</div>
          <div class="boss-select-title">
            <strong>메이린</strong>
            <span>${mayrinSelected ? mayrinSelected.difficulty + " 선택됨" : "노멀 / 하드 중 선택"}</span>
          </div>
        </div>
        <div class="boss-select-options"></div>
      `;

      const mayrinOptions = mayrinCard.querySelector(".boss-select-options");

      MAYRIN_CATALOG.forEach(b => {
        const selectedData = bossDraft.get(b.key);
        const selected = !!selectedData;
        const killed = selected && isBossKilledThisWeek(selectedData);
        const partySize = selected ? getBossPartySize(selectedData) : 1;
        const shownIncome = selected ? Math.floor(Number(b.price) / partySize) : Number(b.price);

        const option = document.createElement("button");
        option.type = "button";
        option.className = `boss-price-option mayrin-option ${selected ? "selected" : ""}`;
        option.innerHTML = `
          <span class="boss-option-difficulty">${b.difficulty}</span>
          <span class="boss-option-price">
            <img src="assets/boss/meso.png" alt="">
            <span>${shortMoney(shownIncome)}</span>
          </span>
          ${selected ? `
            <select class="boss-party-select" aria-label="메이린 ${b.difficulty} 파티 인원" title="파티 인원">
              ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${partySize === n ? "selected" : ""}>${n}인</option>`).join("")}
            </select>
            <span class="boss-option-kill ${killed ? "killed" : ""}">${killed ? "✓ 처치" : "○ 미처치"}</span>
          ` : ""}
        `;

        const partySelect = option.querySelector(".boss-party-select");
        if (partySelect) {
          partySelect.addEventListener("click", e => e.stopPropagation());
          partySelect.addEventListener("change", e => {
            e.stopPropagation();
            const current = bossDraft.get(b.key);
            if (!current) return;
            bossDraft.set(b.key, {
              ...current,
              ...b,
              party_size: Number(e.target.value || 1)
            });
            renderBossCatalog();
          });
        }

        option.addEventListener("click", e => {
          if (e.target.closest(".boss-party-select")) return;

          const killTarget = e.target.closest(".boss-option-kill");
          if (killTarget && selected) {
            const current = bossDraft.get(b.key);
            bossDraft.set(b.key, {
              ...current,
              ...b,
              party_size: getBossPartySize(current),
              killed_at: isBossKilledThisWeek(current) ? null : new Date().toISOString()
            });
            renderBossCatalog();
            return;
          }

          const wasSelected = bossDraft.has(b.key);
          MAYRIN_CATALOG.forEach(v => bossDraft.delete(v.key));

          if (!wasSelected) {
            bossDraft.set(b.key, {
              ...b,
              party_size: 1,
              killed_at: null
            });
          }

          renderBossCatalog();
        });

        mayrinOptions.appendChild(option);
      });

      mayrinWrap.appendChild(mayrinCard);
      box.appendChild(mayrinWrap);
    }

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
      const partySize = selected ? getBossPartySize(selectedData) : 1;
      const shownIncome = selected ? Math.floor(Number(b.price) / partySize) : Number(b.price);

      option.innerHTML = `
        <span class="boss-option-difficulty">${b.difficulty}</span>
        <span class="boss-option-price">
          <img src="assets/boss/meso.png" alt="">
          <span>${shortMoney(shownIncome)}</span>
        </span>
        ${selected ? `
          <select class="boss-party-select" aria-label="검은 마법사 ${b.difficulty} 파티 인원" title="파티 인원">
            ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${partySize === n ? "selected" : ""}>${n}인</option>`).join("")}
          </select>
          <span class="boss-option-kill ${killed ? "killed" : ""}">${killed ? "✓ 이번 달 처치" : "○ 미처치"}</span>
        ` : ""}
      `;

      const partySelect = option.querySelector(".boss-party-select");
      if (partySelect) {
        partySelect.addEventListener("click", e => e.stopPropagation());
        partySelect.addEventListener("change", e => {
          e.stopPropagation();
          const current = bossDraft.get(b.key);
          if (!current) return;
          bossDraft.set(b.key, {
            ...current,
            ...b,
            party_size: Number(e.target.value || 1)
          });
          renderBossCatalog();
        });
      }

      option.addEventListener("click", e => {
        if (e.target.closest(".boss-party-select")) return;

        const killTarget = e.target.closest(".boss-option-kill");

        if (killTarget && selected) {
          const current = bossDraft.get(b.key);
          bossDraft.set(b.key, {
            ...current,
            ...b,
            party_size: getBossPartySize(current),
            killed_at: isBossKilledThisMonth(current) ? null : new Date().toISOString()
          });
          renderBossCatalog();
          return;
        }

        const wasSelected = bossDraft.has(b.key);
        BLACK_MAGE_CATALOG.forEach(v => bossDraft.delete(v.key));

        if (!wasSelected) bossDraft.set(b.key, { ...b, party_size: 1, killed_at: null });
        renderBossCatalog();
      });

      bmOptions.appendChild(option);
    });

    monthlyWrap.appendChild(bmCard);
    box.appendChild(monthlyWrap);

    const values = [...bossDraft.values()];
    const weeklyValues = values.filter(x => !isBlackMageBoss(x) && !isMayrinBoss(x));
    const weeklyKilled = weeklyValues.filter(isBossKilledThisWeek).length;
    const total = values.reduce((sum, b) => sum + getBossPersonalIncome(b), 0);

    weeklyHeading.querySelector(".weekly-count").textContent = `${weeklyValues.length} / 12`;
    $("bossSelectedCount").textContent = `${weeklyValues.length} / 12`;
    $("bossKilledCount").textContent = `${weeklyKilled} / ${weeklyValues.length}`;
    $("bossSelectedMeso").textContent = shortMoney(total);
  }

  async function saveBossSelection(){
    if(!bossEditingCharacter)return;
    const ch=bossEditingCharacter, chosen=[...bossDraft.values()];

    const draftNormalCount = chosen.filter(x =>
      !isBlackMageBoss(x) && !isMayrinBoss(x)
    ).length;

    if (wouldExceedGroupWeeklyLimit(ch, draftNormalCount)) {
      const state = getGroupWeeklyLimitState(ch, draftNormalCount);
      const group = getGroupById(ch.group_id);
      const groupName = group
        ? `${group.account_name} · ${group.world_name}`
        : "현재 그룹";

      alert(
        `⚠️ ${groupName}의 일반 주간 보스 90마리 제한을 초과해서 저장할 수 없습니다.\n` +
        `현재 설정 기준 ${state.current} / ${state.limit}마리입니다.\n\n` +
        `메이린은 별도 계산되어 이 제한에 포함되지 않습니다.`
      );
      return;
    }

    $("bossModalSave").disabled=true; setSync("보스 설정 저장 중…");
    try{
      const d=await sb.from("character_boss_selections").delete().eq("user_id",user.id).eq("character_id",ch.id); if(d.error)throw d.error;
      if(chosen.length){
        const rows=chosen.map(b=>({
          user_id:user.id,
          character_id:ch.id,
          boss_key:b.key || b.boss_key,
          boss_name:b.name || b.boss_name,
          difficulty:b.difficulty,
          crystal_price:Number(b.price ?? b.crystal_price ?? 0),
          party_size:getBossPartySize(b),
          killed_at:b.killed_at || null
        }));
        const ins=await sb.from("character_boss_selections").insert(rows); if(ins.error)throw ins.error;
      }
      const total=chosen.reduce((s,b)=>s+getBossPersonalIncome(b),0);
      const up=await sb.from("maple_characters").update({boss_meso:total,updated_at:new Date().toISOString()}).eq("id",ch.id).eq("user_id",user.id).select().single();
      if(up.error)throw up.error;
      bossSelections=bossSelections.filter(x=>x.character_id!==ch.id);
      bossSelections.push(...chosen.map(b=>({
        user_id:user.id,
        character_id:ch.id,
        boss_key:b.key || b.boss_key,
        boss_name:b.name || b.boss_name,
        difficulty:b.difficulty,
        crystal_price:Number(b.price ?? b.crystal_price ?? 0),
        party_size:getBossPartySize(b),
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
      return p.selected === 0 || p.killed === p.selected;
    }).length;

    $("dailySummary").textContent=`${dailyDoneCharacters} / ${characters.length}`;
    $("weeklySummary").textContent=`${weeklyDoneCharacters} / ${characters.length}`;
    $("ownedMesoSummary").textContent=shortMoney(characterGroups.reduce((a,g)=>a+Number(g.owned_meso||0),0));
    $("weeklyBossIncomeSummary").textContent=shortMoney(getWeeklyBossIncome());
    $("monthlyBossIncomeSummary").textContent=shortMoney(getMonthlyBossIncome());
    $("characterCount").textContent=`${characters.length} / 20`;
  }

  function showAppView(viewName) {
    const dashboard = $("dashboardView");
    const settings = $("settingsView");

    const showDashboard = viewName === "dashboard";

    dashboard?.classList.toggle("hidden", !showDashboard);
    settings?.classList.toggle("hidden", showDashboard);

    dashboard?.setAttribute("aria-hidden", showDashboard ? "false" : "true");
    settings?.setAttribute("aria-hidden", showDashboard ? "true" : "false");

    $("dashboardTab")?.classList.toggle("active", showDashboard);
    $("settingsTab")?.classList.toggle("active", !showDashboard);
  }

  function updateSelectedGroupTitle() {
    const title = $("selectedGroupCharacterTitle");
    const sub = $("selectedGroupCharacterSubtitle");
    if (!title || !sub) return;

    const group = getGroupById(selectedDashboardGroupId);

    if (!group) {
      title.textContent = "내 캐릭터";
      sub.textContent = "그룹을 선택해주세요.";
      return;
    }

    title.textContent = "내 캐릭터";
    sub.textContent = `${group.account_name} · ${group.world_name}`;
  }

  function getGroupMonthlyIncome(groupId) {
    const memberIds = new Set(
      characters.filter(ch => ch.group_id === groupId).map(ch => ch.id)
    );

    let weekly = 0;
    let blackMage = 0;

    bossSelections.forEach(selection => {
      if (!memberIds.has(selection.character_id)) return;

      if (isBlackMageBoss(selection)) {
        blackMage += getBossPersonalIncome(selection);
      } else {
        weekly += getBossPersonalIncome(selection);
      }
    });

    return weekly * 4 + blackMage;
  }

  function getMonthlyIncomeBuckets() {
    let helios = 0;
    let challenger = 0;
    let normal = 0;

    characterGroups.forEach(group => {
      const income = getGroupMonthlyIncome(group.id);
      const world = String(group.world_name || "");

      if (world.includes("핼리오스")) {
        helios += income;
      } else if (world.includes("챌린저스")) {
        challenger += income;
      } else {
        normal += income;
      }
    });

    return { helios, challenger, normal };
  }

  function calculateMaplePoints() {
    const rates = {
      challenger: Number(economySettings.challenger_rate || 0),
      normal: Number(economySettings.normal_rate || 0),
      reboot: Number(economySettings.reboot_rate || 0)
    };

    const buckets = getMonthlyIncomeBuckets();
    const huntingIncome = Number(economySettings.hunting_income || 0);
    const MESO_UNIT = 100000000; // 1억 메소

    const heliosPoints =
      rates.reboot > 0
        ? (Number(buckets.helios || 0) / MESO_UNIT) * rates.reboot
        : 0;

    const challengerPoints =
      rates.challenger > 0
        ? (Number(buckets.challenger || 0) / MESO_UNIT) * rates.challenger
        : 0;

    const normalBossPoints =
      rates.normal > 0
        ? (Number(buckets.normal || 0) / MESO_UNIT) * rates.normal
        : 0;

    // 사냥 수익은 일반 서버 메포 시세로 별도 환산하여 반드시 합산
    const huntingPoints =
      rates.normal > 0
        ? (huntingIncome / MESO_UNIT) * rates.normal
        : 0;

    return Math.floor(
      heliosPoints
      + challengerPoints
      + normalBossPoints
      + huntingPoints
    );
  }
  function parseFormattedNumber(value) {
    const digits = String(value ?? "").replace(/[^\d]/g, "");
    return digits ? Number(digits) : 0;
  }

  function formatInputNumber(value) {
    const n = Math.max(0, Math.floor(Number(value || 0)));
    return n > 0 ? n.toLocaleString("ko-KR") : "";
  }

  function renderEconomyCalculator() {
    if (!$("challengerRate")) return;

    $("challengerRate").value = formatInputNumber(economySettings.challenger_rate);
    $("normalRate").value = formatInputNumber(economySettings.normal_rate);
    $("rebootRate").value = formatInputNumber(economySettings.reboot_rate);
    $("huntingIncome").value = formatInputNumber(economySettings.hunting_income);

    $("maplePointResult").textContent =
      `${calculateMaplePoints().toLocaleString("ko-KR")} 메이플 포인트`;
  }

  async function saveEconomySettings() {
    const payload = {
      user_id: user.id,
      challenger_rate: Number(economySettings.challenger_rate || 0),
      normal_rate: Number(economySettings.normal_rate || 0),
      reboot_rate: Number(economySettings.reboot_rate || 0),
      hunting_income: Math.max(0, Math.floor(Number(economySettings.hunting_income || 0))),
      updated_at: new Date().toISOString()
    };

    const { error } = await sb
      .from("maple_economy_settings")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      console.error(error);
      setSync("시세 저장 실패");
      return;
    }

    setSync("시세 저장됨");
  }

  function scheduleEconomySave() {
    clearTimeout(economySaveTimer);
    economySaveTimer = setTimeout(saveEconomySettings, 450);
  }

  function bindEconomyCalculator() {
    const bindings = [
      ["challengerRate", "challenger_rate"],
      ["normalRate", "normal_rate"],
      ["rebootRate", "reboot_rate"],
      ["huntingIncome", "hunting_income"]
    ];

    bindings.forEach(([id, key]) => {
      const input = $(id);
      if (!input || input.dataset.bound === "1") return;
      input.dataset.bound = "1";

      input.addEventListener("input", () => {
        const rawValue = parseFormattedNumber(input.value);
        economySettings[key] = rawValue;

        input.value = formatInputNumber(rawValue);

        // 입력 중에도 커서를 항상 뒤쪽에 자연스럽게 유지
        requestAnimationFrame(() => {
          const end = input.value.length;
          input.setSelectionRange(end, end);
        });

        $("maplePointResult").textContent =
          `${calculateMaplePoints().toLocaleString("ko-KR")} 메이플 포인트`;
        scheduleEconomySave();
      });
    });
  }

  function renderAll() {
    renderChecklist();
    renderCharacters();
    renderSettingsGroups();
    renderSettingsCharacters();
    renderGroupStatus();
    updateSelectedGroupTitle();
    renderSummary();
    renderEconomyCalculator();
    bindEconomyCalculator();
    renderMvpChargeMethods();
    renderMvpItems();
    renderMvpCreditItems();
    renderMvpMaplePointBenefits();
    bindMvpCalculator();
    bindMvpRealtimeDelegation();
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

      try {
        const refreshed = await sb.auth.refreshSession();

        if (refreshed.error) {
          if (isJwtIssuedAtFutureError(refreshed.error)) {
            await refreshSessionForJwtRecovery();
          } else {
            console.warn("startup session refresh skipped:", refreshed.error);
          }
        } else if (refreshed.data?.session?.user) {
          user = refreshed.data.session.user;
        }
      } catch (refreshError) {
        console.warn("startup session refresh failed:", refreshError);
      }

      await loadAll();
    } else {
      showAuth();
    }
  })();
})();
