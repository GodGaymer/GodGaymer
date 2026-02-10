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

const policyBranches = [
  { key: "industrial", label: "Industrial Mandate", bonus: "+18% extract throughput", effect: () => ({ extract: 1.18, threat: 1.06 }) },
  { key: "diplomatic", label: "Diplomatic Channels", bonus: "-16% campaign threat growth", effect: () => ({ threat: 0.84, marketBuy: 0.94 }) },
  { key: "militarized", label: "Militarized Convoys", bonus: "+10% influence control actions", effect: () => ({ territory: 1.1, security: 1.08 }) }
];

const mutatorPool = [
  { key: "rich-veins", label: "Rich Veins", detail: "+15% extraction, +8% threat growth", extract: 1.15, threat: 1.08 },
  { key: "tight-storage", label: "Tight Storage", detail: "-20% storage capacity, +10% market prices", storage: 0.8, price: 1.1 },
  { key: "freight-subsidy", label: "Freight Subsidy", detail: "+20% buy throughput", buy: 1.2 },
  { key: "unstable-lanes", label: "Unstable Lanes", detail: "+12% belt risk, +10% contract payout", risk: 1.12, contractPayout: 1.1 }
];

const createGrid = () => Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({ type: i < 4 ? "habitat" : "empty", boost: 1 + Math.random() * 0.5 }));

const newObjectives = () => ([
  { id: "bankroll", label: "Reach 12,000 credits", type: "credits", target: 12000 },
  { id: "control", label: "Reach 60% average influence", type: "influence", target: 60 },
  { id: "contracts", label: "Complete 5 contracts", type: "contracts", target: 5 }
]);

function createInitialState() {
  const startingInventory = Object.fromEntries(resources.map((r) => [r.key, 30]));
  const startingCapByResource = Object.fromEntries(resources.map((r) => [r.key, 400]));
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
    inventory: { ...startingInventory },
    previousInventorySnapshot: { ...startingInventory },
    resourceDeltas: Object.fromEntries(resources.map((r) => [r.key, { current: 30, lastTick: 30, delta: 0 }])),
    storage: {
      sharedCapacity: 2200,
      perResource: startingCapByResource
    },
    throughput: {
      extractPerTick: 42,
      refinePerTick: 24,
      buyPerTick: 50
    },
    ledger: {
      waste: Object.fromEntries(resources.map((r) => [r.key, 0]))
    },
    tickFlow: {
      extract: 0,
      refine: 0,
      buy: 0,
      overflow: Object.fromEntries(resources.map((r) => [r.key, 0]))
    },
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
    activePolicy: null,
    mutators: mutatorPool.slice(0, 2).map((m) => m.key),
    refineryQueue: [],
    rivals: [
      { name: "Nova Drillers", strength: 1.05, credits: 2400, rep: 16 },
      { name: "Eclipse Cartel", strength: 1.22, credits: 3200, rep: 21 },
      { name: "Astra Forge", strength: 1.12, credits: 2800, rep: 19 }
    ],
    log: ["Syndicate charter approved. Begin expansion into orbital belts."],
    ticks: 0
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
  emergencyLoanBtn: document.getElementById("emergencyLoanBtn"),
  rerollMutatorsBtn: document.getElementById("rerollMutatorsBtn"),
  policyPanel: document.getElementById("policyPanel"),
  mutatorPanel: document.getElementById("mutatorPanel"),
  resourceLedgerPanel: document.getElementById("resourceLedgerPanel"),
  rivalIntel: document.getElementById("rivalIntel"),
  scorecardPanel: document.getElementById("scorecardPanel"),
  refineryQueueInfo: document.getElementById("refineryQueueInfo"),
  sabotageIntelBtn: document.getElementById("sabotageIntelBtn"),
  diplomaticPactBtn: document.getElementById("diplomaticPactBtn"),
  defensiveInvestmentBtn: document.getElementById("defensiveInvestmentBtn"),
  resetBtn: document.getElementById("resetBtn"),
  tickBoostBtn: document.getElementById("tickBoostBtn"),
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
      completedContracts: parsed.completedContracts || 0
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

    const fallbackPerResource = Object.fromEntries(resources.map((r) => [r.key, 400]));
    merged.storage = {
      sharedCapacity: Number(merged.storage?.sharedCapacity) || 2200,
      perResource: {
        ...fallbackPerResource,
        ...(merged.storage?.perResource || {})
      }
    };

    merged.throughput = {
      extractPerTick: Number(merged.throughput?.extractPerTick) || 42,
      refinePerTick: Number(merged.throughput?.refinePerTick) || 24,
      buyPerTick: Number(merged.throughput?.buyPerTick) || 50
    };

    merged.ledger = {
      waste: {
        ...Object.fromEntries(resources.map((r) => [r.key, 0])),
        ...(merged.ledger?.waste || {})
      }
    };

    merged.tickFlow = {
      extract: 0,
      refine: 0,
      buy: 0,
      overflow: Object.fromEntries(resources.map((r) => [r.key, 0]))
    };

    return merged;
  } catch {
    return createInitialState();
  }
}

const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const formatNumber = (num) => Intl.NumberFormat().format(Math.round(num));
const priceFor = (key) => state.markets[key] || 0;
const avgInfluence = () => belts.reduce((sum, b) => sum + state.territories[b.key], 0) / belts.length;
const activeMutators = () => state.mutators.map((key) => mutatorPool.find((m) => m.key === key)).filter(Boolean);
const activePolicy = () => policyBranches.find((policy) => policy.key === state.activePolicy);

function mutatorValue(key, fallback = 1) {
  return activeMutators().reduce((value, mutator) => value * (mutator[key] || 1), fallback);
}

function policyValue(key, fallback = 1) {
  const policy = activePolicy();
  if (!policy) return fallback;
  const values = policy.effect();
  return (values[key] || 1) * fallback;
}

const inventoryTotal = () => resources.reduce((sum, r) => sum + (state.inventory[r.key] || 0), 0);
const storageCapacity = () => {
  const logisticsCount = countBuildings("logistics");
  const logisticsBoost = 1 + state.upgrades.logistics * upgrades[1].effect + logisticsCount * 0.012;
  return {
    shared: state.storage.sharedCapacity * logisticsBoost * mutatorValue("storage"),
    perResource: Object.fromEntries(resources.map((r) => [r.key, (state.storage.perResource[r.key] || 0) * logisticsBoost * mutatorValue("storage")]))
  };
};

function availableStorageFor(resourceKey) {
  const capacity = storageCapacity();
  const perResourceRemaining = Math.max(0, (capacity.perResource[resourceKey] || 0) - (state.inventory[resourceKey] || 0));
  const sharedRemaining = Math.max(0, capacity.shared - inventoryTotal());
  return Math.max(0, Math.min(perResourceRemaining, sharedRemaining));
}

function throughputLimits() {
  const logisticsCount = countBuildings("logistics");
  const refineryCount = countBuildings("refinery");
  const logisticsBoost = 1 + state.upgrades.logistics * upgrades[1].effect + logisticsCount * 0.012;
  return {
    extract: state.throughput.extractPerTick * logisticsBoost * policyValue("extract") * mutatorValue("extract"),
    refine: state.throughput.refinePerTick * (1 + refineryCount * 0.03),
    buy: state.throughput.buyPerTick * logisticsBoost * mutatorValue("buy")
  };
}

function resetTickFlow() {
  state.tickFlow = {
    extract: 0,
    refine: 0,
    buy: 0,
    overflow: Object.fromEntries(resources.map((r) => [r.key, 0]))
  };
}

function applyStorageClampAndLog() {
  const capacity = storageCapacity();
  let sharedOver = Math.max(0, inventoryTotal() - capacity.shared);
  const overflowed = [];

  resources.forEach((resource) => {
    const key = resource.key;
    const resourceCap = capacity.perResource[key] || 0;
    const over = Math.max(0, (state.inventory[key] || 0) - resourceCap);
    if (over > 0) {
      state.inventory[key] -= over;
      state.ledger.waste[key] += over;
      state.tickFlow.overflow[key] += over;
      overflowed.push([key, over]);
      sharedOver = Math.max(0, sharedOver - over);
    }
  });

  if (sharedOver > 0) {
    const byStock = resources
      .map((resource) => [resource.key, state.inventory[resource.key] || 0])
      .sort((a, b) => b[1] - a[1]);

    for (const [key, amount] of byStock) {
      if (sharedOver <= 0) break;
      const loss = Math.min(sharedOver, amount);
      if (loss <= 0) continue;
      state.inventory[key] -= loss;
      state.ledger.waste[key] += loss;
      state.tickFlow.overflow[key] += loss;
      overflowed.push([key, loss]);
      sharedOver -= loss;
    }
  }

  if (overflowed.length) {
    const combined = overflowed.reduce((acc, [key, value]) => {
      acc[key] = (acc[key] || 0) + value;
      return acc;
    }, {});
    const [topKey, topValue] = Object.entries(combined).sort((a, b) => b[1] - a[1])[0];
    logEvent(`Overflow loss: ${topKey} -${topValue.toFixed(1)} units this tick.`);
  }
}

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
    return { id: `${Date.now()}-${i}`, resource: ore.key, amount, payout: amount * (priceFor(ore.key) + 3) * mutatorValue("contractPayout"), rep: 2 + i };
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
  const pressure = Math.max(0, (1.6 - defenseCount * 0.12 - state.upgrades.security * 0.18) * policyValue("threat") * mutatorValue("threat"));
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

function simulateTick() {
  if (state.gameOver) return;

  const previousSnapshot = { ...(state.previousInventorySnapshot || {}) };

  state.ticks += 1;
  resetTickFlow();
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
    const riskPenalty = 1 - (belt.risk * mutatorValue("risk")) / (securityBoost * policyValue("security"));
    const base = state.extractionRate * fleetsHere * drillBoost * (0.6 + state.territories[belt.key] / 100) * riskPenalty;

    Object.entries(belt.richness).forEach(([res, richness]) => {
      const rawAmount = base * richness;
      const extractLimit = Math.max(0, throughputLimits().extract - state.tickFlow.extract);
      const allowed = Math.max(0, Math.min(rawAmount, extractLimit, availableStorageFor(res)));
      state.inventory[res] += allowed;
      state.tickFlow.extract += allowed;
    });

    state.territories[belt.key] = Math.max(8, Math.min(95, state.territories[belt.key] + (Math.random() * 3 - 1.5) + defenseCount * 0.05));
  });

  if (refineryCount > 0) {
    const refineLimit = Math.max(0, throughputLimits().refine - state.tickFlow.refine);
    const refined = Math.min(state.inventory.iron, state.inventory.cobalt, refineryCount * 0.8, refineLimit);
    const alloyGain = Math.min(refined * 1.2, availableStorageFor("alloy"));
    const consumed = alloyGain / 1.2;
    state.inventory.iron -= consumed;
    state.inventory.cobalt -= consumed;
    state.inventory.alloy += alloyGain;
    state.tickFlow.refine += consumed;
  }

  applyStorageClampAndLog();

  resources.forEach((res) => {
    const rivalPressure = state.rivals.reduce((sum, r) => sum + r.strength, 0) / state.rivals.length;
    const ownStock = state.inventory[res.key] / 600;
    const delta = 1 + (Math.random() - 0.5) * res.volatility - ownStock * 0.01 + rivalPressure * 0.005;
    state.markets[res.key] = Math.max(3, state.markets[res.key] * delta);
  });

  state.credits += 30 * logisticsBoost + habitatCount * 3 + state.reputation;
  state.reputation += 0.08 + habitatCount * 0.005;

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
  applyStorageClampAndLog();
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
  const capacity = storageCapacity();
  resources.forEach((resource) => {
    const metrics = state.resourceDeltas?.[resource.key] || {
      current: state.inventory[resource.key] ?? 0,
      lastTick: state.inventory[resource.key] ?? 0,
      delta: 0
    };
    const row = document.createElement("div");
    const usedPct = (metrics.current / Math.max(1, capacity.perResource[resource.key])) * 100;
    const atCap = usedPct >= 98;
    const overflowed = (state.tickFlow?.overflow?.[resource.key] || 0) > 0;
    row.className = `resource-row${atCap ? " at-cap" : ""}${overflowed ? " overflowed" : ""}`;
    const deltaClass = metrics.delta > 0 ? "positive" : metrics.delta < 0 ? "negative" : "neutral";
    const deltaPrefix = metrics.delta > 0 ? "+" : "";

    row.innerHTML = `
      <div>
        <strong>${resource.label}</strong>
        <small>Stock ${formatNumber(metrics.current)} / ${formatNumber(capacity.perResource[resource.key])} (${usedPct.toFixed(0)}%)</small>
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

function renderPolicyPanel() {
  el.policyPanel.innerHTML = "";
  policyBranches.forEach((policy) => {
    const row = document.createElement("div");
    row.className = "row";
    const active = state.activePolicy === policy.key;
    row.innerHTML = `<div><strong>${policy.label}</strong><small>${policy.bonus}</small></div><button class="btn ghost">${active ? "Active" : state.activePolicy ? "Locked" : "Adopt"}</button>`;
    const button = row.querySelector("button");
    button.disabled = Boolean(state.activePolicy);
    button.onclick = () => runAction(() => {
      if (state.activePolicy) return;
      state.activePolicy = policy.key;
      logEvent(`${policy.label} doctrine adopted.`);
    });
    el.policyPanel.appendChild(row);
  });
}

function renderMutatorPanel() {
  el.mutatorPanel.innerHTML = activeMutators().map((mutator) => (`
    <div class="objective"><strong>${mutator.label}</strong><small>${mutator.detail}</small></div>
  `)).join("");
}

function renderResourceLedger() {
  el.resourceLedgerPanel.innerHTML = resources.map((resource) => {
    const overflow = state.tickFlow.overflow?.[resource.key] || 0;
    const waste = state.ledger.waste?.[resource.key] || 0;
    const delta = state.resourceDeltas?.[resource.key]?.delta || 0;
    return `<div class="row"><div><strong>${resource.label}</strong><small>Δ ${delta.toFixed(1)} / tick</small></div><small>Overflow ${overflow.toFixed(1)} · Total Waste ${formatNumber(waste)}</small></div>`;
  }).join("");
}

function renderRivalIntel() {
  const leader = [...state.rivals].sort((a, b) => b.credits - a.credits)[0];
  el.rivalIntel.innerHTML = state.rivals.map((rival) => {
    const mood = rival === leader ? "Aggressive expansion" : "Consolidating";
    return `<div class="row"><div><strong>${rival.name}</strong><small>${mood}</small></div><small>${formatNumber(rival.credits)} cr · Rep ${rival.rep.toFixed(1)}</small></div>`;
  }).join("");
}

function renderScorecard() {
  const totalWaste = resources.reduce((sum, resource) => sum + (state.ledger.waste?.[resource.key] || 0), 0);
  const efficiency = Math.max(0, 100 - (totalWaste / Math.max(1, inventoryTotal() + totalWaste)) * 100);
  el.scorecardPanel.innerHTML = `
    <div class="objective"><strong>Completed Contracts</strong><small>${state.completedContracts}</small></div>
    <div class="objective"><strong>Total Waste</strong><small>${formatNumber(totalWaste)} units</small></div>
    <div class="objective"><strong>Ops Efficiency</strong><small>${efficiency.toFixed(1)}%</small></div>
  `;
}

function render() {
  el.statsGrid.innerHTML = "";
  const netWorth = state.credits + resources.reduce((sum, r) => sum + state.inventory[r.key] * priceFor(r.key), 0);
  const capacity = storageCapacity();
  const usedCapacity = inventoryTotal();
  const usedPct = (usedCapacity / Math.max(1, capacity.shared)) * 100;
  const limits = throughputLimits();
  const bottlenecks = [];
  if (state.tickFlow.extract >= limits.extract * 0.98) bottlenecks.push("Extract TPS capped");
  if (state.tickFlow.refine >= limits.refine * 0.98) bottlenecks.push("Refine TPS capped");
  if (state.tickFlow.buy >= limits.buy * 0.98) bottlenecks.push("Buy TPS capped");
  const topOverflow = Object.entries(state.tickFlow.overflow || {}).sort((a, b) => b[1] - a[1])[0];
  const topOverflowLabel = topOverflow && topOverflow[1] > 0
    ? `${resources.find((r) => r.key === topOverflow[0]).label} (${topOverflow[1].toFixed(1)})`
    : "None";

  const stats = [
    ["Credits", `${formatNumber(state.credits)} cr`],
    ["Reputation", state.reputation.toFixed(1)],
    ["Fleet Size", formatNumber(state.fleetSize)],
    ["Avg Influence", `${avgInfluence().toFixed(1)}%`],
    ["Net Worth", `${formatNumber(netWorth)} cr`],
    ["Capacity", `${usedPct.toFixed(0)}% used`],
    ["Bottlenecks", bottlenecks.length ? bottlenecks.join(" · ") : "Stable"],
    ["Top Overflow", topOverflowLabel],
    ["Ticks", formatNumber(state.ticks)]
  ];
  stats.forEach(([label, value]) => {
    const tile = document.createElement("div");
    tile.className = `stat-tile${label === "Capacity" && usedPct >= 95 ? " warn" : ""}${label === "Top Overflow" && topOverflowLabel !== "None" ? " overflow" : ""}`;
    tile.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    el.statsGrid.appendChild(tile);
  });

  renderCampaign();
  renderPolicyPanel();
  renderMutatorPanel();
  renderResourcePanel();
  renderResourceLedger();
  renderGrid();
  renderBuildActions();
  renderRivalIntel();
  renderScorecard();
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
  el.refineryQueueInfo.textContent = state.refineryQueue.length
    ? `Queue: ${state.refineryQueue.map((item) => `${item.amount} ${item.key}`).join(" → ")}`
    : "Queue is empty.";

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

  el.eventLog.innerHTML = state.log.map((item) => `<p>${item}</p>`).join("");
}

el.refineBtn.onclick = () => runAction(() => {
  const key = el.refineSelect.value;
  const amount = Math.max(1, Math.floor(Number(el.tradeAmount.value) || 1));
  state.refineryQueue.push({ key, amount });
  const refineRoom = Math.max(0, throughputLimits().refine - state.tickFlow.refine);
  const maxByStorage = Math.floor(availableStorageFor("alloy") / 0.8);
  const allowed = Math.min(amount, state.inventory[key], refineRoom, maxByStorage);
  if (allowed <= 0) return;
  state.inventory[key] -= allowed;
  const alloyOut = Math.round(allowed * 0.8 + countBuildings("refinery") * 0.2);
  const storable = Math.min(alloyOut, availableStorageFor("alloy"));
  state.inventory.alloy += storable;
  state.tickFlow.refine += allowed;
  if (storable < alloyOut) {
    const overflow = alloyOut - storable;
    state.ledger.waste.alloy += overflow;
    state.tickFlow.overflow.alloy += overflow;
    logEvent(`Refine overflow: lost ${overflow.toFixed(1)} alloy.`);
  }
  if (state.refineryQueue.length > 6) state.refineryQueue = state.refineryQueue.slice(-6);
  logEvent(`Refinery converted ${allowed} ${key} into Star Alloy.`);
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
  const buyRoom = Math.max(0, throughputLimits().buy - state.tickFlow.buy);
  const allowed = Math.min(amount, buyRoom, availableStorageFor(key));
  const cost = allowed * priceFor(key);
  const policyDiscount = policyValue("marketBuy");
  const discountedCost = cost * policyDiscount;
  if (allowed <= 0 || state.credits < discountedCost) return;
  state.credits -= discountedCost;
  state.inventory[key] += allowed;
  state.tickFlow.buy += allowed;
  logEvent(`Purchased ${allowed} ${key} for ${formatNumber(discountedCost)} credits.`);
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
  const belt = belts.find((b) => b.key === state.selectedSector);
  let extracted = 0;
  Object.entries(belt.richness).forEach(([res, richness]) => {
    const requested = 14 * richness;
    const extractRoom = Math.max(0, throughputLimits().extract - state.tickFlow.extract);
    const allowed = Math.max(0, Math.min(requested, extractRoom, availableStorageFor(res)));
    state.inventory[res] += allowed;
    state.tickFlow.extract += allowed;
    extracted += allowed;
  });
  if (extracted <= 0) {
    logEvent("Extraction surge blocked by storage or logistics bottlenecks.");
    return;
  }
  state.credits -= cost;
  state.campaign.threat = Math.min(100, state.campaign.threat + 5);
  logEvent(`Extraction surge at ${belt.label}: +${extracted.toFixed(1)} ore.`);
});


el.sabotageIntelBtn.onclick = () => runAction(() => {
  const cost = 280;
  if (state.credits < cost) return;
  state.credits -= cost;
  state.rivals.forEach((rival) => { rival.credits = Math.max(0, rival.credits - 120); });
  state.campaign.threat = Math.max(0, state.campaign.threat - 6);
  logEvent("Counter-intel sabotage disrupted rival funding routes.");
});

el.diplomaticPactBtn.onclick = () => runAction(() => {
  const cost = 340;
  if (state.credits < cost) return;
  state.credits -= cost;
  state.reputation += 3;
  belts.forEach((belt) => {
    state.territories[belt.key] = Math.min(95, state.territories[belt.key] + 3 * policyValue("territory"));
  });
  logEvent("Diplomatic pact signed. Border influence stabilized.");
});

el.defensiveInvestmentBtn.onclick = () => runAction(() => {
  const cost = 360;
  if (state.credits < cost) return;
  state.credits -= cost;
  state.campaign.threat = Math.max(0, state.campaign.threat - 12);
  state.upgrades.security += 0.2;
  logEvent("Defensive stations reinforced across trade lanes.");
});

el.emergencyLoanBtn.onclick = () => runAction(() => {
  state.credits += 650;
  state.reputation = Math.max(0, state.reputation - 1.2);
  state.campaign.threat = Math.min(100, state.campaign.threat + 4);
  logEvent("Emergency loan accepted. Treasury restored at political cost.");
});

el.rerollMutatorsBtn.onclick = () => runAction(() => {
  if (state.ticks > 0) {
    logEvent("Mutators can only be rerolled before launch.");
    return;
  }
  const shuffled = [...mutatorPool].sort(() => Math.random() - 0.5);
  state.mutators = shuffled.slice(0, 2).map((m) => m.key);
  logEvent("Scenario mutators rerolled.");
});

Object.entries(el.mapNodes).forEach(([key, node]) => {
  node.onclick = () => runAction(() => {
    state.selectedSector = key;
  });
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
