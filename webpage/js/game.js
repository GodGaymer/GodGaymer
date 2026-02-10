const STORAGE_KEY = "orbital-syndicate-save-v4";
const TICK_MS = 3000;
const GRID_SIZE = 8;

const resources = [
  { key: "iron", label: "Iron Ore", basePrice: 8, volatility: 0.08 },
  { key: "ice", label: "Cryo Ice", basePrice: 11, volatility: 0.09 },
  { key: "cobalt", label: "Cobalt", basePrice: 17, volatility: 0.11 },
  { key: "helium3", label: "Helium-3", basePrice: 29, volatility: 0.14 },
  { key: "alloy", label: "Star Alloy", basePrice: 38, volatility: 0.1 }
];

const buildingTypes = {
  empty: { label: "Empty", icon: "·", cost: 0, prod: 0 },
  habitat: { label: "Habitat", icon: "🏠", cost: 240, prod: 0.06 },
  mine: { label: "Mine", icon: "⛏", cost: 320, prod: 0.18 },
  refinery: { label: "Refinery", icon: "🏭", cost: 420, prod: 0.12 },
  logistics: { label: "Logistics", icon: "🚚", cost: 360, prod: 0.08 },
  defense: { label: "Defense", icon: "🛡", cost: 390, prod: 0.05 }
};

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

const BUILDING_UPKEEP = {
  habitat: 5,
  mine: 11,
  refinery: 14,
  logistics: 10,
  defense: 12
};
const FLEET_OPERATING_BASE = 7;
const THREAT_INSURANCE_FACTOR = 0.18;
const LOAN_COOLDOWN_TICKS = 7;
const LOAN_BASE_INTEREST = 0.11;

const createGrid = () => Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({ type: i < 4 ? "habitat" : "empty", boost: 1 + Math.random() * 0.5 }));

const newObjectives = () => ([
  { id: "bankroll", label: "Reach 12,000 credits", type: "credits", target: 12000 },
  { id: "control", label: "Reach 60% average influence", type: "influence", target: 60 },
  { id: "contracts", label: "Complete 5 contracts", type: "contracts", target: 5 }
]);

function createInitialState() {
  return {
    credits: 2200,
    reputation: 12,
    fleetSize: 3,
    extractionRate: 1,
    selectedTile: 0,
    selectedSector: "ceres",
    gameOver: false,
    completedContracts: 0,
    grid: createGrid(),
    inventory: Object.fromEntries(resources.map((r) => [r.key, 30])),
    previousInventorySnapshot: Object.fromEntries(resources.map((r) => [r.key, 30])),
    resourceDeltas: Object.fromEntries(resources.map((r) => [r.key, { current: 30, lastTick: 30, delta: 0 }])),
    markets: Object.fromEntries(resources.map((r) => [r.key, r.basePrice])),
    territories: Object.fromEntries(belts.map((b) => [b.key, 25])),
    upgrades: Object.fromEntries(upgrades.map((u) => [u.key, 0])),
    contracts: [],
    campaign: {
      chapter: 1,
      threat: 14,
      status: "active",
      objectives: newObjectives()
    },
    rivals: [
      { name: "Nova Drillers", strength: 1.05, credits: 2400, rep: 16 },
      { name: "Eclipse Cartel", strength: 1.22, credits: 3200, rep: 21 },
      { name: "Astra Forge", strength: 1.12, credits: 2800, rep: 19 }
    ],
    log: ["Syndicate charter approved. Begin expansion into orbital belts."],
    ticks: 0,
    emergencyLoan: {
      cooldownUntilTick: 0,
      interestRate: LOAN_BASE_INTEREST,
      principal: 0
    },
    economy: {
      projectedIncome: 0,
      projectedCosts: 0,
      projectedNet: 0,
      lastTickCosts: 0,
      inNegativeCash: false
    }
  };
}

const el = {
  statsGrid: document.getElementById("statsGrid"),
  campaignPanel: document.getElementById("campaignPanel"),
  resourcePanel: document.getElementById("resourcePanel"),
  sectorGrid: document.getElementById("sectorGrid"),
  buildActions: document.getElementById("buildActions"),
  beltList: document.getElementById("beltList"),
  refineSelect: document.getElementById("refineSelect"),
  marketSelect: document.getElementById("marketSelect"),
  tradeAmount: document.getElementById("tradeAmount"),
  upgradeList: document.getElementById("upgradeList"),
  contracts: document.getElementById("contracts"),
  leaderboard: document.getElementById("leaderboard"),
  eventLog: document.getElementById("eventLog"),
  selectedSectorInfo: document.getElementById("selectedSectorInfo"),
  fortifySectorBtn: document.getElementById("fortifySectorBtn"),
  scanSectorBtn: document.getElementById("scanSectorBtn"),
  extractSectorBtn: document.getElementById("extractSectorBtn"),
  refineBtn: document.getElementById("refineBtn"),
  sellBtn: document.getElementById("sellBtn"),
  buyBtn: document.getElementById("buyBtn"),
  resetBtn: document.getElementById("resetBtn"),
  tickBoostBtn: document.getElementById("tickBoostBtn"),
  emergencyLoanBtn: document.getElementById("emergencyLoanBtn"),
  mapLabels: Object.fromEntries(belts.map((belt) => [belt.key, document.getElementById(`map-label-${belt.key}`)])),
  mapNodes: Object.fromEntries(belts.map((belt) => [belt.key, document.getElementById(`node-${belt.key}`)])),
  mapRoutes: Object.fromEntries(belts.map((belt) => [belt.key, document.getElementById(`route-${belt.key}`)]))
};

let state = loadState();
if (!state.contracts.length) spawnContracts();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : createInitialState();
    const initial = createInitialState();
    const merged = {
      ...initial,
      ...parsed,
      campaign: {
        ...initial.campaign,
        ...(parsed.campaign || {})
      },
      selectedSector: parsed.selectedSector || "ceres",
      completedContracts: parsed.completedContracts || 0,
      emergencyLoan: {
        ...initial.emergencyLoan,
        ...(parsed.emergencyLoan || {})
      },
      economy: {
        ...initial.economy,
        ...(parsed.economy || {})
      }
    };

    const fallbackSnapshot = Object.fromEntries(resources.map((r) => [r.key, merged.inventory[r.key] ?? 0]));
    merged.previousInventorySnapshot = {
      ...fallbackSnapshot,
      ...(parsed.previousInventorySnapshot || {})
    };
    merged.resourceDeltas = Object.fromEntries(resources.map((r) => {
      const current = merged.inventory[r.key] ?? 0;
      const lastTick = merged.previousInventorySnapshot[r.key] ?? current;
      return [r.key, { current, lastTick, delta: current - lastTick }];
    }));

    return merged;
  } catch {
    return createInitialState();
  }
}

const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const formatNumber = (num) => Intl.NumberFormat().format(Math.round(num));
const priceFor = (key) => state.markets[key] || 0;
const avgInfluence = () => belts.reduce((sum, b) => sum + state.territories[b.key], 0) / belts.length;

function updateResourceDeltas(previousSnapshot = state.previousInventorySnapshot || {}) {
  const snapshot = {};
  state.resourceDeltas = Object.fromEntries(resources.map((resource) => {
    const current = state.inventory[resource.key] ?? 0;
    const lastTick = previousSnapshot[resource.key] ?? current;
    snapshot[resource.key] = current;
    return [resource.key, { current, lastTick, delta: current - lastTick }];
  }));
  state.previousInventorySnapshot = snapshot;
}

function logEvent(text) {
  state.log.unshift(`[T+${state.ticks}] ${text}`);
  state.log = state.log.slice(0, 50);
}

function spawnContracts() {
  state.contracts = Array.from({ length: 3 }, (_, i) => {
    const ore = resources[Math.floor(Math.random() * 4)];
    const amount = 40 + i * 28 + Math.floor(Math.random() * 20);
    return { id: `${Date.now()}-${i}`, resource: ore.key, amount, payout: amount * (priceFor(ore.key) + 3), rep: 2 + i };
  });
}

const countBuildings = (type) => state.grid.filter((tile) => tile.type === type).length;

function objectiveProgress(objective) {
  if (objective.type === "credits") return state.credits;
  if (objective.type === "influence") return avgInfluence();
  return state.completedContracts;
}

function updateCampaign() {
  const defenseCount = countBuildings("defense");
  const pressure = Math.max(0, 1.6 - defenseCount * 0.12 - state.upgrades.security * 0.18);
  state.campaign.threat = Math.max(0, Math.min(100, state.campaign.threat + pressure));

  const finished = state.campaign.objectives.every((objective) => objectiveProgress(objective) >= objective.target);

  if (finished && state.campaign.status === "active") {
    state.campaign.status = "victory";
    state.gameOver = true;
    logEvent("Campaign objective complete. You secured orbital supremacy.");
  }

  if (state.campaign.threat >= 100 && state.campaign.status === "active") {
    state.campaign.status = "defeat";
    state.gameOver = true;
    logEvent("Threat reached critical mass. Rival coalitions overwhelmed your lanes.");
  }
}

function computeEconomicProjection() {
  const habitatCount = countBuildings("habitat");
  const mineCount = countBuildings("mine");
  const refineryCount = countBuildings("refinery");
  const logisticsCount = countBuildings("logistics");
  const defenseCount = countBuildings("defense");

  const logisticsBoost = 1 + state.upgrades.logistics * upgrades[1].effect + logisticsCount * 0.012;
  const income = 30 * logisticsBoost + habitatCount * 3 + state.reputation;

  const buildingUpkeep = (habitatCount * BUILDING_UPKEEP.habitat)
    + (mineCount * BUILDING_UPKEEP.mine)
    + (refineryCount * BUILDING_UPKEEP.refinery)
    + (logisticsCount * BUILDING_UPKEEP.logistics)
    + (defenseCount * BUILDING_UPKEEP.defense);
  const fleetCost = state.fleetSize * FLEET_OPERATING_BASE * (1 + state.fleetSize / 14);
  const insuranceCost = state.campaign.threat > 18 ? state.campaign.threat * THREAT_INSURANCE_FACTOR : 0;
  const loanInterest = state.emergencyLoan.principal > 0 ? state.emergencyLoan.principal * state.emergencyLoan.interestRate : 0;

  const costs = buildingUpkeep + fleetCost + insuranceCost + loanInterest;
  return {
    income,
    costs,
    net: income - costs,
    buildingUpkeep,
    fleetCost,
    insuranceCost,
    loanInterest
  };
}

function applyNegativeCashEffects() {
  if (state.credits >= 0) {
    if (state.economy.inNegativeCash) {
      state.economy.inNegativeCash = false;
      logEvent("Cash reserves restored above zero. Emergency austerity lifted.");
    }
    return;
  }

  if (!state.economy.inNegativeCash) {
    state.economy.inNegativeCash = true;
    logEvent("Negative cash state entered. Penalties activated.");
  }

  const deficitSeverity = Math.min(3.5, Math.abs(state.credits) / 900);
  const repLoss = 0.15 + deficitSeverity * 0.18;
  state.reputation = Math.max(0, state.reputation - repLoss);
  state.extractionRate = Math.max(0.6, state.extractionRate - 0.03 - deficitSeverity * 0.01);

  if (state.emergencyLoan.principal > 0) {
    const stressInterest = state.emergencyLoan.principal * 0.02;
    state.credits -= stressInterest;
  }
}

function simulateTick() {
  if (state.gameOver) return;

  const previousSnapshot = { ...(state.previousInventorySnapshot || {}) };

  state.ticks += 1;
  const mineCount = countBuildings("mine");
  const refineryCount = countBuildings("refinery");
  const logisticsCount = countBuildings("logistics");
  const defenseCount = countBuildings("defense");
  const habitatCount = countBuildings("habitat");

  const drillBoost = 1 + state.upgrades.drills * upgrades[0].effect + mineCount * 0.015;
  const logisticsBoost = 1 + state.upgrades.logistics * upgrades[1].effect + logisticsCount * 0.012;
  const securityBoost = 1 + state.upgrades.security * upgrades[2].effect + defenseCount * 0.01;

  belts.forEach((belt) => {
    const fleetsHere = Math.max(1, Math.floor((state.fleetSize + habitatCount * 0.2) / belts.length) + 1);
    const riskPenalty = 1 - belt.risk / securityBoost;
    const base = state.extractionRate * fleetsHere * drillBoost * (0.6 + state.territories[belt.key] / 100) * riskPenalty;

    Object.entries(belt.richness).forEach(([res, richness]) => {
      state.inventory[res] += base * richness;
    });

    state.territories[belt.key] = Math.max(8, Math.min(95, state.territories[belt.key] + (Math.random() * 3 - 1.5) + defenseCount * 0.05));
  });

  if (refineryCount > 0) {
    const refined = Math.min(state.inventory.iron, state.inventory.cobalt, refineryCount * 0.8);
    state.inventory.iron -= refined;
    state.inventory.cobalt -= refined;
    state.inventory.alloy += refined * 1.2;
  }

  resources.forEach((res) => {
    const rivalPressure = state.rivals.reduce((sum, r) => sum + r.strength, 0) / state.rivals.length;
    const ownStock = state.inventory[res.key] / 600;
    const delta = 1 + (Math.random() - 0.5) * res.volatility - ownStock * 0.01 + rivalPressure * 0.005;
    state.markets[res.key] = Math.max(3, state.markets[res.key] * delta);
  });

  const economy = computeEconomicProjection();
  state.economy.projectedIncome = economy.income;
  state.economy.projectedCosts = economy.costs;
  state.economy.projectedNet = economy.net;
  state.economy.lastTickCosts = economy.costs;

  const upkeepSpikeThreshold = Math.max(90, (state.economy.previousTickCosts || 0) * 1.25);
  if (economy.costs > upkeepSpikeThreshold && state.ticks > 1) {
    logEvent(`Upkeep spike detected: ${formatNumber(economy.costs)} cr/tick (Bld ${formatNumber(economy.buildingUpkeep)}, Fleet ${formatNumber(economy.fleetCost)}, Ins ${formatNumber(economy.insuranceCost)}).`);
  }

  state.credits += economy.income - economy.costs;
  state.economy.previousTickCosts = economy.costs;

  state.reputation += 0.08 + habitatCount * 0.005;
  applyNegativeCashEffects();

  state.rivals.forEach((rival) => {
    rival.credits += 40 * rival.strength + Math.random() * 20;
    rival.rep += Math.random() * 0.2;
  });

  if (state.ticks % 8 === 0) maybeTriggerSectorEvent();
  if (state.ticks % 10 === 0 && Math.random() > 0.5) {
    spawnContracts();
    logEvent("New federation contracts have been posted.");
  }

  updateCampaign();
  updateResourceDeltas(previousSnapshot);
  saveState();
  render();
}

function maybeTriggerSectorEvent() {
  const events = [
    () => {
      const target = resources[Math.floor(Math.random() * 4)];
      state.markets[target.key] *= 1.14;
      logEvent(`Solar storm disrupted ${target.label} routes. Prices surged.`);
    },
    () => {
      const key = belts[Math.floor(Math.random() * belts.length)].key;
      state.territories[key] += 8;
      state.reputation += 1;
      logEvent(`Security wing improved control in ${key.toUpperCase()}.`);
    },
    () => {
      state.credits += 420;
      logEvent("A derelict convoy was salvaged. Emergency credits acquired.");
    }
  ];
  events[Math.floor(Math.random() * events.length)]();
}

function runAction(action) {
  if (state.gameOver) return;
  const previousSnapshot = { ...(state.previousInventorySnapshot || {}) };
  action();
  updateCampaign();
  updateResourceDeltas(previousSnapshot);
  saveState();
  render();
}

function renderGrid() {
  el.sectorGrid.innerHTML = "";
  state.grid.forEach((tile, idx) => {
    const node = document.createElement("button");
    node.className = `tile ${tile.type}${state.selectedTile === idx ? " selected" : ""}`;
    node.innerHTML = `<span class="model">${buildingTypes[tile.type].icon}</span><span class="yield">${tile.boost.toFixed(1)}x</span>`;
    node.onclick = () => runAction(() => { state.selectedTile = idx; });
    el.sectorGrid.appendChild(node);
  });
}

function updateMapVisuals() {
  belts.forEach((belt) => {
    const influence = Math.round(state.territories[belt.key]);
    const pulse = 16 + influence * 0.1;
    el.mapLabels[belt.key].textContent = `${influence}%`;
    el.mapNodes[belt.key].setAttribute("r", `${pulse}`);
    el.mapNodes[belt.key].style.opacity = `${0.42 + influence / 180}`;
    el.mapRoutes[belt.key].style.strokeWidth = `${1.5 + influence / 45}`;
    el.mapNodes[belt.key].classList.toggle("active", state.selectedSector === belt.key);
  });

  const selected = belts.find((belt) => belt.key === state.selectedSector);
  const influence = Math.round(state.territories[selected.key]);
  el.selectedSectorInfo.textContent = `${selected.label} · Influence ${influence}% · Risk ${Math.round(selected.risk * 100)}%`;
}

function renderResourcePanel() {
  el.resourcePanel.innerHTML = "";
  resources.forEach((resource) => {
    const metrics = state.resourceDeltas?.[resource.key] || {
      current: state.inventory[resource.key] ?? 0,
      lastTick: state.inventory[resource.key] ?? 0,
      delta: 0
    };
    const row = document.createElement("div");
    row.className = "resource-row";
    const deltaClass = metrics.delta > 0 ? "positive" : metrics.delta < 0 ? "negative" : "neutral";
    const deltaPrefix = metrics.delta > 0 ? "+" : "";

    row.innerHTML = `
      <div>
        <strong>${resource.label}</strong>
        <small>Stock ${formatNumber(metrics.current)}</small>
      </div>
      <div class="resource-metrics">
        <span class="delta ${deltaClass}">${deltaPrefix}${metrics.delta.toFixed(1)} / tick</span>
        <span class="price">${priceFor(resource.key).toFixed(1)} cr</span>
      </div>
    `;
    el.resourcePanel.appendChild(row);
  });
}

function renderCampaign() {
  const threat = Math.round(state.campaign.threat);
  const objectivesMarkup = state.campaign.objectives.map((objective) => {
    const current = objectiveProgress(objective);
    const pct = Math.min(100, (current / objective.target) * 100);
    return `
      <div class="objective">
        <strong>${objective.label}</strong>
        <small>${formatNumber(current)} / ${formatNumber(objective.target)}</small>
        <div class="progress"><span style="width:${pct}%"></span></div>
      </div>
    `;
  }).join("");

  const statusText = state.campaign.status === "active"
    ? `Threat Level ${threat}%`
    : state.campaign.status === "victory"
      ? "Victory Achieved"
      : "Defeat: Coalition Overrun";

  el.campaignPanel.innerHTML = `
    <div class="objective">
      <strong>Chapter ${state.campaign.chapter}</strong>
      <small>${statusText}</small>
      <div class="progress"><span style="width:${threat}%"></span></div>
    </div>
    ${objectivesMarkup}
  `;
}

function renderBuildActions() {
  el.buildActions.innerHTML = "";
  Object.entries(buildingTypes).forEach(([key, build]) => {
    if (key === "empty") return;
    const row = document.createElement("button");
    row.className = "btn ghost";
    row.textContent = `${build.icon} ${build.label} (${formatNumber(build.cost)} cr)`;
    row.disabled = state.credits < build.cost || state.gameOver;
    row.onclick = () => runAction(() => {
      if (state.credits < build.cost) return;
      const tile = state.grid[state.selectedTile];
      state.credits -= build.cost;
      tile.type = key;
      state.reputation += build.prod;
      logEvent(`${build.label} deployed in district ${state.selectedTile + 1}.`);
    });
    el.buildActions.appendChild(row);
  });
}

function render() {
  el.statsGrid.innerHTML = "";
  const netWorth = state.credits + resources.reduce((sum, r) => sum + state.inventory[r.key] * priceFor(r.key), 0);
  const stats = [
    ["Credits", `${formatNumber(state.credits)} cr`],
    ["Reputation", state.reputation.toFixed(1)],
    ["Fleet Size", formatNumber(state.fleetSize)],
    ["Avg Influence", `${avgInfluence().toFixed(1)}%`],
    ["Net Worth", `${formatNumber(netWorth)} cr`],
    ["Next Tick Δ", `${state.economy.projectedNet >= 0 ? "+" : ""}${formatNumber(state.economy.projectedNet)} cr (${formatNumber(state.economy.projectedIncome)} in / ${formatNumber(state.economy.projectedCosts)} out)`],
    ["Ticks", formatNumber(state.ticks)]
  ];
  stats.forEach(([label, value]) => {
    const tile = document.createElement("div");
    tile.className = "stat-tile";
    tile.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    el.statsGrid.appendChild(tile);
  });

  const projection = computeEconomicProjection();
  state.economy.projectedIncome = projection.income;
  state.economy.projectedCosts = projection.costs;
  state.economy.projectedNet = projection.net;

  renderCampaign();
  renderResourcePanel();
  renderGrid();
  renderBuildActions();
  updateMapVisuals();

  el.beltList.innerHTML = "";
  belts.forEach((belt) => {
    const row = document.createElement("div");
    row.className = "row";
    const pct = Math.round(state.territories[belt.key]);
    const actionCost = 150 + (100 - pct) * 4;
    row.innerHTML = `<div><strong>${belt.label}</strong><small>Influence ${pct}% · Risk ${Math.round(belt.risk * 100)}%</small></div><button class="btn ghost">Secure (${formatNumber(actionCost)} cr)</button>`;
    row.querySelector("button").onclick = () => runAction(() => {
      if (state.credits < actionCost) return;
      state.credits -= actionCost;
      state.territories[belt.key] = Math.min(95, state.territories[belt.key] + 10);
      logEvent(`Patrols secured ${belt.label}.`);
    });
    el.beltList.appendChild(row);
  });

  const nonAlloyResources = resources.filter((r) => r.key !== "alloy");
  el.refineSelect.innerHTML = nonAlloyResources.map((r) => `<option value="${r.key}">${r.label}</option>`).join("");
  el.marketSelect.innerHTML = resources.map((r) => `<option value="${r.key}">${r.label} · ${priceFor(r.key).toFixed(1)} cr · Inv ${formatNumber(state.inventory[r.key])}</option>`).join("");

  el.upgradeList.innerHTML = "";
  upgrades.forEach((upg) => {
    const lvl = state.upgrades[upg.key];
    const cost = Math.round(upg.baseCost * (1 + lvl * 0.85));
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<div><strong>${upg.label}</strong><small>Level ${lvl} · +${Math.round(upg.effect * 100)}% / level</small></div><button class="btn">Upgrade (${formatNumber(cost)} cr)</button>`;
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
    row.innerHTML = `<div><strong>${resources.find((r) => r.key === contract.resource).label} Contract</strong><small>Deliver ${contract.amount} · Reward ${formatNumber(contract.payout)} cr + ${contract.rep} rep</small></div><button class="btn ghost">${owned >= contract.amount ? "Complete" : `Need ${Math.ceil(contract.amount - owned)}`}</button>`;
    const button = row.querySelector("button");
    button.disabled = owned < contract.amount;
    button.onclick = () => runAction(() => {
      if (owned < contract.amount) return;
      state.inventory[contract.resource] -= contract.amount;
      state.credits += contract.payout;
      state.reputation += contract.rep;
      state.completedContracts += 1;
      state.contracts = state.contracts.filter((c) => c.id !== contract.id);
      if (!state.contracts.length) spawnContracts();
      logEvent("Contract completed successfully.");
    });
    el.contracts.appendChild(row);
  });

  const me = { name: "Your Syndicate", credits: state.credits, rep: state.reputation };
  const board = [me, ...state.rivals].sort((a, b) => b.credits + b.rep * 130 - (a.credits + a.rep * 130));
  el.leaderboard.innerHTML = "";
  board.forEach((entry, idx) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<div><strong>#${idx + 1} ${entry.name}</strong><small>Rep ${entry.rep.toFixed(1)}</small></div><strong>${formatNumber(entry.credits)} cr</strong>`;
    el.leaderboard.appendChild(row);
  });

  const cooldown = Math.max(0, state.emergencyLoan.cooldownUntilTick - state.ticks);
  el.emergencyLoanBtn.disabled = state.gameOver || cooldown > 0;
  el.emergencyLoanBtn.textContent = cooldown > 0
    ? `Emergency Loan (${cooldown}t cd)`
    : `Emergency Loan (${Math.round(state.emergencyLoan.interestRate * 100)}% int)`;

  el.eventLog.innerHTML = state.log.map((item) => `<p>${item}</p>`).join("");
}

el.refineBtn.onclick = () => runAction(() => {
  const key = el.refineSelect.value;
  const amount = Math.max(1, Math.floor(Number(el.tradeAmount.value) || 1));
  if (state.inventory[key] < amount) return;
  state.inventory[key] -= amount;
  state.inventory.alloy += Math.round(amount * 0.8 + countBuildings("refinery") * 0.2);
  logEvent(`Refinery converted ${amount} ${key} into Star Alloy.`);
});

el.sellBtn.onclick = () => runAction(() => {
  const key = el.marketSelect.value;
  const amount = Math.max(1, Math.floor(Number(el.tradeAmount.value) || 1));
  if (state.inventory[key] < amount) return;
  const payout = amount * priceFor(key);
  state.inventory[key] -= amount;
  state.credits += payout;
  state.reputation += 0.08;
  logEvent(`Sold ${amount} ${key} for ${formatNumber(payout)} credits.`);
});

el.buyBtn.onclick = () => runAction(() => {
  const key = el.marketSelect.value;
  const amount = Math.max(1, Math.floor(Number(el.tradeAmount.value) || 1));
  const cost = amount * priceFor(key);
  if (state.credits < cost) return;
  state.credits -= cost;
  state.inventory[key] += amount;
  logEvent(`Purchased ${amount} ${key} for ${formatNumber(cost)} credits.`);
});

el.fortifySectorBtn.onclick = () => runAction(() => {
  const cost = 300;
  if (state.credits < cost) return;
  state.credits -= cost;
  state.territories[state.selectedSector] = Math.min(95, state.territories[state.selectedSector] + 12);
  state.campaign.threat = Math.max(0, state.campaign.threat - 8);
  logEvent(`Fortification teams hardened ${state.selectedSector.toUpperCase()} defenses.`);
});

el.scanSectorBtn.onclick = () => runAction(() => {
  const cost = 220;
  if (state.credits < cost) return;
  state.credits -= cost;
  const resource = resources[Math.floor(Math.random() * 4)];
  state.inventory[resource.key] += 22;
  state.territories[state.selectedSector] = Math.min(95, state.territories[state.selectedSector] + 4);
  logEvent(`Deep scan in ${state.selectedSector.toUpperCase()} found bonus ${resource.label}.`);
});

el.extractSectorBtn.onclick = () => runAction(() => {
  const cost = 260;
  if (state.credits < cost) return;
  state.credits -= cost;
  const belt = belts.find((b) => b.key === state.selectedSector);
  Object.entries(belt.richness).forEach(([res, richness]) => {
    state.inventory[res] += 14 * richness;
  });
  state.campaign.threat = Math.min(100, state.campaign.threat + 5);
  logEvent(`Extraction surge executed at ${belt.label}. Output spiked but threat increased.`);
});

Object.entries(el.mapNodes).forEach(([key, node]) => {
  node.onclick = () => runAction(() => {
    state.selectedSector = key;
  });
});

el.emergencyLoanBtn.onclick = () => runAction(() => {
  if (state.ticks < state.emergencyLoan.cooldownUntilTick) return;

  const debtLoad = 1 + state.emergencyLoan.principal / 2000;
  const payout = Math.round((900 + state.campaign.threat * 6) / debtLoad);

  state.credits += payout;
  state.emergencyLoan.principal += payout;
  state.emergencyLoan.interestRate = Math.min(0.42, state.emergencyLoan.interestRate + 0.04);
  state.emergencyLoan.cooldownUntilTick = state.ticks + LOAN_COOLDOWN_TICKS;

  logEvent(`Emergency loan approved: +${formatNumber(payout)} cr at ${Math.round(state.emergencyLoan.interestRate * 100)}% tick interest.`);
});

el.tickBoostBtn.onclick = () => simulateTick();
el.resetBtn.onclick = () => {
  if (!window.confirm("Reset your campaign and start a new run?")) return;
  state = createInitialState();
  spawnContracts();
  updateResourceDeltas(state.previousInventorySnapshot || state.inventory);
  saveState();
  render();
};

updateResourceDeltas(state.previousInventorySnapshot || state.inventory);
render();
setInterval(simulateTick, TICK_MS);
