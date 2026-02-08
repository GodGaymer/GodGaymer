const STORAGE_KEY = "orbital-syndicate-save-v1";
const TICK_MS = 3000;

const resources = [
  { key: "iron", label: "Iron Ore", basePrice: 8, volatility: 0.08 },
  { key: "ice", label: "Cryo Ice", basePrice: 11, volatility: 0.09 },
  { key: "cobalt", label: "Cobalt", basePrice: 17, volatility: 0.11 },
  { key: "helium3", label: "Helium-3", basePrice: 29, volatility: 0.14 },
  { key: "alloy", label: "Star Alloy", basePrice: 38, volatility: 0.1 }
];

const belts = [
  { key: "ceres", label: "Ceres Strip", richness: { iron: 4, ice: 3 }, risk: 0.02 },
  { key: "vulcan", label: "Vulcan Fracture", richness: { cobalt: 3, iron: 2 }, risk: 0.05 },
  { key: "tycho", label: "Tycho Deep", richness: { helium3: 2, cobalt: 1 }, risk: 0.09 },
  { key: "ashen", label: "Ashen Halo", richness: { helium3: 3, ice: 1 }, risk: 0.12 }
];

const upgrades = [
  { key: "drills", label: "Laser Drill Array", baseCost: 450, effect: 0.14 },
  { key: "logistics", label: "Freight Logistics AI", baseCost: 600, effect: 0.12 },
  { key: "security", label: "Fleet Security", baseCost: 520, effect: 0.08 }
];

function createInitialState() {
  return {
    corp: "Your Syndicate",
    credits: 2200,
    reputation: 12,
    fleetSize: 3,
    extractionRate: 1,
    inventory: Object.fromEntries(resources.map((r) => [r.key, 30])),
    markets: Object.fromEntries(resources.map((r) => [r.key, r.basePrice])),
    territories: Object.fromEntries(belts.map((b) => [b.key, 25])),
    upgrades: Object.fromEntries(upgrades.map((u) => [u.key, 0])),
    contracts: [],
    rivals: [
      { name: "Nova Drillers", strength: 1.05, credits: 2400, rep: 16 },
      { name: "Eclipse Cartel", strength: 1.22, credits: 3200, rep: 21 },
      { name: "Astra Forge", strength: 1.12, credits: 2800, rep: 19 }
    ],
    log: ["Syndicate charter approved. Begin expansion into orbital belts."],
    ticks: 0
  };
}

let state = loadState();
if (!state.contracts.length) {
  spawnContracts();
}

const el = {
  statsGrid: document.getElementById("statsGrid"),
  beltList: document.getElementById("beltList"),
  refineSelect: document.getElementById("refineSelect"),
  marketSelect: document.getElementById("marketSelect"),
  tradeAmount: document.getElementById("tradeAmount"),
  upgradeList: document.getElementById("upgradeList"),
  contracts: document.getElementById("contracts"),
  leaderboard: document.getElementById("leaderboard"),
  eventLog: document.getElementById("eventLog"),
  refineBtn: document.getElementById("refineBtn"),
  sellBtn: document.getElementById("sellBtn"),
  buyBtn: document.getElementById("buyBtn"),
  resetBtn: document.getElementById("resetBtn"),
  tickBoostBtn: document.getElementById("tickBoostBtn")
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : createInitialState();
  } catch {
    return createInitialState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatNumber(num) {
  return Intl.NumberFormat().format(Math.round(num));
}

function priceFor(key) {
  return state.markets[key] || 0;
}

function logEvent(text) {
  state.log.unshift(`[T+${state.ticks}] ${text}`);
  state.log = state.log.slice(0, 40);
}

function spawnContracts() {
  const ore = resources[Math.floor(Math.random() * 4)];
  state.contracts = Array.from({ length: 3 }, (_, i) => {
    const amount = 40 + i * 30 + Math.floor(Math.random() * 30);
    return {
      id: `${Date.now()}-${i}`,
      resource: ore.key,
      amount,
      payout: amount * (priceFor(ore.key) + 3),
      rep: 2 + i
    };
  });
}

function beltYieldFactor(beltKey) {
  return 0.6 + state.territories[beltKey] / 100;
}

function simulateTick() {
  state.ticks += 1;

  const drillBoost = 1 + state.upgrades.drills * upgrades[0].effect;
  const logisticsBoost = 1 + state.upgrades.logistics * upgrades[1].effect;

  belts.forEach((belt) => {
    const fleetsHere = Math.max(1, Math.floor(state.fleetSize / belts.length) + 1);
    const riskPenalty = 1 - belt.risk + state.upgrades.security * 0.02;
    const base = state.extractionRate * fleetsHere * drillBoost * beltYieldFactor(belt.key) * riskPenalty;

    Object.entries(belt.richness).forEach(([res, richness]) => {
      state.inventory[res] += base * richness;
    });

    state.territories[belt.key] = Math.max(8, Math.min(92,
      state.territories[belt.key] + (Math.random() * 4 - 1.9)
    ));
  });

  resources.forEach((res) => {
    const rivalPressure = state.rivals.reduce((sum, r) => sum + r.strength, 0) / state.rivals.length;
    const ownStock = state.inventory[res.key] / 500;
    const delta = 1 + (Math.random() - 0.5) * res.volatility - ownStock * 0.01 + rivalPressure * 0.005;
    state.markets[res.key] = Math.max(3, state.markets[res.key] * delta);
  });

  const passiveIncome = 35 * logisticsBoost + state.reputation * 1.5;
  state.credits += passiveIncome;

  state.rivals.forEach((rival) => {
    const gain = 60 * rival.strength + Math.random() * 30;
    rival.credits += gain;
    rival.rep += Math.random() * 0.25;
  });

  if (state.ticks % 8 === 0) {
    maybeTriggerSectorEvent();
  }

  if (state.ticks % 10 === 0 && Math.random() > 0.5) {
    spawnContracts();
    logEvent("New federation contracts have been posted.");
  }

  saveState();
  render();
}

function maybeTriggerSectorEvent() {
  const events = [
    () => {
      const target = resources[Math.floor(Math.random() * 4)];
      state.markets[target.key] *= 1.16;
      logEvent(`Solar storm disrupted ${target.label} routes. Prices surged.`);
    },
    () => {
      const key = belts[Math.floor(Math.random() * belts.length)].key;
      state.territories[key] += 8;
      state.reputation += 1;
      logEvent(`Your convoy secured ${key} sector lanes. Influence increased.`);
    },
    () => {
      const key = resources[Math.floor(Math.random() * 4)].key;
      state.inventory[key] += 45;
      logEvent("A derelict hauler was salvaged and added to stock.");
    }
  ];
  events[Math.floor(Math.random() * events.length)]();
}

function runAction(action) {
  action();
  saveState();
  render();
}

function render() {
  el.statsGrid.innerHTML = "";
  const netWorth = state.credits + resources.reduce((sum, r) => sum + state.inventory[r.key] * priceFor(r.key), 0);

  const stats = [
    ["Credits", `${formatNumber(state.credits)} cr`],
    ["Reputation", state.reputation.toFixed(1)],
    ["Fleet Size", formatNumber(state.fleetSize)],
    ["Net Worth", `${formatNumber(netWorth)} cr`],
    ["Mining Power", (state.extractionRate * (1 + state.upgrades.drills * 0.14)).toFixed(2)],
    ["Ticks", formatNumber(state.ticks)]
  ];

  stats.forEach(([label, value]) => {
    const tile = document.createElement("div");
    tile.className = "stat-tile";
    tile.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    el.statsGrid.appendChild(tile);
  });

  el.beltList.innerHTML = "";
  belts.forEach((belt) => {
    const row = document.createElement("div");
    row.className = "row";
    const pct = Math.round(state.territories[belt.key]);
    const actionCost = 150 + (100 - pct) * 4;

    row.innerHTML = `
      <div>
        <strong>${belt.label}</strong>
        <small>Influence: ${pct}% · Risk: ${Math.round(belt.risk * 100)}%</small>
      </div>
      <button class="btn ghost">Secure Lane (${formatNumber(actionCost)} cr)</button>
    `;

    row.querySelector("button").onclick = () => runAction(() => {
      if (state.credits < actionCost) return;
      state.credits -= actionCost;
      state.territories[belt.key] = Math.min(95, state.territories[belt.key] + 10);
      logEvent(`Security wing improved control in ${belt.label}.`);
    });

    el.beltList.appendChild(row);
  });

  const nonAlloyResources = resources.filter((r) => r.key !== "alloy");
  el.refineSelect.innerHTML = nonAlloyResources.map((r) => `<option value="${r.key}">${r.label}</option>`).join("");

  el.marketSelect.innerHTML = resources.map((r) => {
    const inv = formatNumber(state.inventory[r.key]);
    return `<option value="${r.key}">${r.label} · ${priceFor(r.key).toFixed(1)} cr · Inv ${inv}</option>`;
  }).join("");

  el.upgradeList.innerHTML = "";
  upgrades.forEach((upg) => {
    const lvl = state.upgrades[upg.key];
    const cost = Math.round(upg.baseCost * (1 + lvl * 0.85));
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div>
        <strong>${upg.label}</strong>
        <small>Level ${lvl} · +${Math.round(upg.effect * 100)}% / level</small>
      </div>
      <button class="btn">Upgrade (${formatNumber(cost)} cr)</button>
    `;
    row.querySelector("button").onclick = () => runAction(() => {
      if (state.credits < cost) return;
      state.credits -= cost;
      state.upgrades[upg.key] += 1;
      if (upg.key === "logistics") state.fleetSize += 1;
      logEvent(`${upg.label} upgraded to level ${state.upgrades[upg.key]}.`);
    });
    el.upgradeList.appendChild(row);
  });

  el.contracts.innerHTML = "";
  state.contracts.forEach((contract) => {
    const row = document.createElement("div");
    row.className = "row";
    const owned = state.inventory[contract.resource];
    row.innerHTML = `
      <div>
        <strong>${resources.find((r) => r.key === contract.resource).label} Contract</strong>
        <small>Deliver ${contract.amount} · Reward ${formatNumber(contract.payout)} cr + ${contract.rep} rep</small>
      </div>
      <button class="btn ghost">${owned >= contract.amount ? "Complete" : `Need ${Math.ceil(contract.amount - owned)}`}</button>
    `;
    const button = row.querySelector("button");
    button.disabled = owned < contract.amount;
    button.onclick = () => runAction(() => {
      state.inventory[contract.resource] -= contract.amount;
      state.credits += contract.payout;
      state.reputation += contract.rep;
      state.contracts = state.contracts.filter((c) => c.id !== contract.id);
      if (!state.contracts.length) spawnContracts();
      logEvent("Contract fulfilled. Federation standing improved.");
    });
    el.contracts.appendChild(row);
  });

  const leaderboard = [
    {
      name: state.corp,
      score: netWorth + state.reputation * 200
    },
    ...state.rivals.map((r) => ({
      name: r.name,
      score: r.credits + r.rep * 220
    }))
  ].sort((a, b) => b.score - a.score);

  el.leaderboard.innerHTML = leaderboard
    .map((entry) => `<li><strong>${entry.name}</strong> — ${formatNumber(entry.score)} pts</li>`)
    .join("");

  el.eventLog.innerHTML = state.log.map((item) => `<li>${item}</li>`).join("");
}

el.refineBtn.onclick = () => runAction(() => {
  const key = el.refineSelect.value;
  const oreNeeded = 20;
  if (state.inventory[key] < oreNeeded) return;
  state.inventory[key] -= oreNeeded;
  state.inventory.alloy += 10;
  logEvent(`Refinery processed ${resources.find((r) => r.key === key).label} into Star Alloy.`);
});

el.sellBtn.onclick = () => runAction(() => {
  const key = el.marketSelect.value;
  const amount = Math.max(1, Number(el.tradeAmount.value) || 1);
  if (state.inventory[key] < amount) return;
  const value = amount * priceFor(key);
  state.inventory[key] -= amount;
  state.credits += value;
  logEvent(`Sold ${amount} ${resources.find((r) => r.key === key).label} for ${formatNumber(value)} credits.`);
});

el.buyBtn.onclick = () => runAction(() => {
  const key = el.marketSelect.value;
  const amount = Math.max(1, Number(el.tradeAmount.value) || 1);
  const totalCost = amount * priceFor(key);
  if (state.credits < totalCost) return;
  state.credits -= totalCost;
  state.inventory[key] += amount;
  logEvent(`Purchased ${amount} ${resources.find((r) => r.key === key).label}.`);
});

el.resetBtn.onclick = () => {
  if (!window.confirm("Reset your corporation progress?")) return;
  state = createInitialState();
  spawnContracts();
  saveState();
  render();
};

el.tickBoostBtn.onclick = () => runAction(() => {
  for (let i = 0; i < 20; i += 1) {
    simulateTick();
  }
  logEvent("8-hour strategic simulation completed.");
});

render();
setInterval(simulateTick, TICK_MS);
