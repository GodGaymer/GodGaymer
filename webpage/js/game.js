const STORAGE_KEY = "orbital-syndicate-save-v5";
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
  {
    key: "mining",
    label: "Mining Conglomerate",
    summary: "+35% extraction output · +30% upkeep · +18% threat pressure",
    extractionMult: 1.35,
    upkeepMult: 1.3,
    threatPressureMult: 1.18,
    marketSellMult: 1,
    marketBuyMult: 1
  },
  {
    key: "trade",
    label: "Trade Syndicate",
    summary: "+20% trade revenue · +15% market volatility · +8% import cost",
    extractionMult: 1,
    upkeepMult: 1,
    threatPressureMult: 1,
    marketSellMult: 1.2,
    marketBuyMult: 1.08,
    marketVolatilityMult: 1.15
  },
  {
    key: "security",
    label: "Security Bloc",
    summary: "-35% threat pressure · -10% extraction output · +18% patrol upkeep",
    extractionMult: 0.9,
    upkeepMult: 1.18,
    threatPressureMult: 0.65,
    marketSellMult: 1,
    marketBuyMult: 1
  }
];

const scenarioMutators = [
  { key: "scarce-ice", label: "Scarce Ice", summary: "Cryo Ice veins are sparse but command a higher baseline price." },
  { key: "volatile-markets", label: "Volatile Markets", summary: "Commodity prices swing harder every tick." },
  { key: "high-threat", label: "High-Threat Galaxy", summary: "Coalition aggression rises faster and events are harsher." }
];

const createGrid = () => Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({ type: i < 4 ? "habitat" : "empty", boost: 1 + Math.random() * 0.5 }));

function rollScenarioMutators() {
  const shuffled = [...scenarioMutators].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2).map((mutator) => mutator.key);
}

const newObjectives = () => ([
  { id: "bankroll", label: "Reach 12,000 credits", type: "credits", target: 12000 },
  { id: "control", label: "Reach 60% average influence", type: "influence", target: 60 },
  { id: "contracts", label: "Complete 5 contracts", type: "contracts", target: 5 },
  { id: "profit-kpi", label: "Sustain profit / tick above 420", type: "profitPerTick", target: 420 },
  { id: "waste-kpi", label: "Keep waste below 1,400", type: "waste", target: 1400, comparator: "max" },
  { id: "sla-kpi", label: "Maintain contract SLA at 75%", type: "sla", target: 75 }
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
    policyBranch: null,
    scenarioMutators: rollScenarioMutators(),
    ledger: {
      mined: Object.fromEntries(resources.map((r) => [r.key, 0])),
      sold: Object.fromEntries(resources.map((r) => [r.key, 0])),
      waste: 0,
      revenue: 0,
      operatingCost: 0,
      contractTotal: 0,
      contractOnTime: 0
    },
    campaign: {
      chapter: 1,
      threat: 14,
      status: "active",
      objectives: newObjectives()
    },
    rivals: [
      { name: "Nova Drillers", strength: 1.05, credits: 2400, rep: 16, aggression: 0.9 },
      { name: "Eclipse Cartel", strength: 1.22, credits: 3200, rep: 21, aggression: 1.1 },
      { name: "Astra Forge", strength: 1.12, credits: 2800, rep: 19, aggression: 1.0 }
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
  rivalIntel: document.getElementById("rivalIntel"),
  leaderboard: document.getElementById("leaderboard"),
  eventLog: document.getElementById("eventLog"),
  selectedSectorInfo: document.getElementById("selectedSectorInfo"),
  fortifySectorBtn: document.getElementById("fortifySectorBtn"),
  scanSectorBtn: document.getElementById("scanSectorBtn"),
  extractSectorBtn: document.getElementById("extractSectorBtn"),
  sabotageIntelBtn: document.getElementById("sabotageIntelBtn"),
  diplomaticPactBtn: document.getElementById("diplomaticPactBtn"),
  defensiveInvestmentBtn: document.getElementById("defensiveInvestmentBtn"),
  refineBtn: document.getElementById("refineBtn"),
  sellBtn: document.getElementById("sellBtn"),
  buyBtn: document.getElementById("buyBtn"),
  resetBtn: document.getElementById("resetBtn"),
  tickBoostBtn: document.getElementById("tickBoostBtn"),
  policyPanel: document.getElementById("policyPanel"),
  mutatorPanel: document.getElementById("mutatorPanel"),
  rerollMutatorsBtn: document.getElementById("rerollMutatorsBtn"),
  scorecardPanel: document.getElementById("scorecardPanel"),
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
      scenarioMutators: parsed.scenarioMutators?.length ? parsed.scenarioMutators : rollScenarioMutators()
    };

    merged.ledger = {
      ...initial.ledger,
      ...(parsed.ledger || {}),
      mined: { ...initial.ledger.mined, ...(parsed.ledger?.mined || {}) },
      sold: { ...initial.ledger.sold, ...(parsed.ledger?.sold || {}) }
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
const averageRivalPressure = () => belts.reduce((sum, belt) => sum + (state.rivalInfluence?.[belt.key] || 0), 0) / belts.length;

const getPolicy = () => policyBranches.find((policy) => policy.key === state.policyBranch);
const hasMutator = (mutatorKey) => state.scenarioMutators?.includes(mutatorKey);

function currentProfitPerTick() {
  if (!state.ticks) return 0;
  return (state.ledger.revenue - state.ledger.operatingCost) / state.ticks;
}

function currentContractSla() {
  if (!state.ledger.contractTotal) return 100;
  return (state.ledger.contractOnTime / state.ledger.contractTotal) * 100;
}

function recordOperatingCost(amount) {
  state.ledger.operatingCost += amount;
  state.credits -= amount;
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
    return { id: `${Date.now()}-${i}`, resource: ore.key, amount, payout: amount * (priceFor(ore.key) + 3), rep: 2 + i, expiresAt: state.ticks + 16 + i * 4 };
  });
}

const countBuildings = (type) => state.grid.filter((tile) => tile.type === type).length;

function objectiveProgress(objective) {
  if (objective.type === "credits") return state.credits;
  if (objective.type === "influence") return avgInfluence();
  if (objective.type === "contracts") return state.completedContracts;
  if (objective.type === "profitPerTick") return currentProfitPerTick();
  if (objective.type === "waste") return state.ledger.waste;
  if (objective.type === "sla") return currentContractSla();
  return 0;
}

function updateCampaign() {
  const defenseCount = countBuildings("defense");
  const policy = getPolicy();
  const mutatorThreat = hasMutator("high-threat") ? 1.35 : 1;
  const pressure = Math.max(0, 1.6 - defenseCount * 0.12 - state.upgrades.security * 0.18) * (policy?.threatPressureMult || 1) * mutatorThreat;
  state.campaign.threat = Math.max(0, Math.min(100, state.campaign.threat + pressure));

  const finished = state.campaign.objectives.every((objective) => {
    const value = objectiveProgress(objective);
    return objective.comparator === "max" ? value <= objective.target : value >= objective.target;
  });

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
  const mineCount = countBuildings("mine");
  const refineryCount = countBuildings("refinery");
  const logisticsCount = countBuildings("logistics");
  const defenseCount = countBuildings("defense");
  const habitatCount = countBuildings("habitat");

  const policy = getPolicy();
  const drillBoost = (1 + state.upgrades.drills * upgrades[0].effect + mineCount * 0.015) * (policy?.extractionMult || 1);
  const logisticsBoost = 1 + state.upgrades.logistics * upgrades[1].effect + logisticsCount * 0.012;
  const securityBoost = 1 + state.upgrades.security * upgrades[2].effect + defenseCount * 0.01;
  const iceYieldMult = hasMutator("scarce-ice") ? 0.52 : 1;
  const volatilityMult = (policy?.marketVolatilityMult || 1) * (hasMutator("volatile-markets") ? 1.55 : 1);

  runRivalTurn();

  belts.forEach((belt) => {
    const fleetsHere = Math.max(1, Math.floor((state.fleetSize + habitatCount * 0.2) / belts.length) + 1);
    const riskPenalty = 1 - belt.risk / securityBoost;
    const rivalShare = state.rivalInfluence[belt.key] || 0;
    const contestedPenalty = Math.max(0.45, 1 - rivalShare / 135);
    const base = state.extractionRate * fleetsHere * drillBoost * (0.6 + state.territories[belt.key] / 100) * riskPenalty * contestedPenalty;

    Object.entries(belt.richness).forEach(([res, richness]) => {
      const mined = base * richness * (res === "ice" ? iceYieldMult : 1);
      state.inventory[res] += mined;
      state.ledger.mined[res] += mined;
      state.ledger.waste += mined * 0.018;

    });

    state.territories[belt.key] = Math.max(8, Math.min(95, state.territories[belt.key] + (Math.random() * 3 - 1.5) + defenseCount * 0.05 - rivalShare * 0.02));
    state.rivalInfluence[belt.key] = Math.max(0, Math.min(95, state.rivalInfluence[belt.key] - (0.6 + defenseCount * 0.15 + state.upgrades.security * 0.4)));
  });

  if (refineryCount > 0) {
    const refined = Math.min(state.inventory.iron, state.inventory.cobalt, refineryCount * 0.8);
    state.inventory.iron -= refined;
    state.inventory.cobalt -= refined;
    state.inventory.alloy += refined * 1.2;
    state.ledger.waste += refined * 0.08;
  }

  resources.forEach((res) => {
    const rivalPressure = state.rivals.reduce((sum, r) => sum + r.strength, 0) / state.rivals.length;
    const ownStock = state.inventory[res.key] / 600;
    const baseShift = (Math.random() - 0.5) * res.volatility * volatilityMult;
    const delta = 1 + baseShift - ownStock * 0.01 + rivalPressure * 0.005;
    const scarceIcePremium = hasMutator("scarce-ice") && res.key === "ice" ? 1.04 : 1;
    state.markets[res.key] = Math.max(3, state.markets[res.key] * delta * scarceIcePremium);
  });

  const passiveIncome = 30 * logisticsBoost + habitatCount * 3 + state.reputation;
  state.credits += passiveIncome;
  state.ledger.revenue += passiveIncome;
  const upkeep = (mineCount * 14 + refineryCount * 16 + logisticsCount * 12 + defenseCount * 10 + state.fleetSize * 9) * (policy?.upkeepMult || 1) * (hasMutator("high-threat") ? 1.15 : 1);
  recordOperatingCost(upkeep);
  state.reputation += 0.08 + habitatCount * 0.005;

  state.rivals.forEach((rival) => {
    rival.credits += 40 * rival.strength + Math.random() * 20;
    rival.rep += Math.random() * 0.2;
  });

  if (state.ticks % 8 === 0) maybeTriggerSectorEvent();
  state.contracts = state.contracts.filter((contract) => {
    if (state.ticks <= contract.expiresAt) return true;
    state.ledger.contractTotal += 1;
    state.reputation = Math.max(0, state.reputation - 1.5);
    state.ledger.waste += 6;
    logEvent(`Contract for ${contract.resource.toUpperCase()} expired and harmed SLA ratings.`);
    return false;
  });
  if (!state.contracts.length) spawnContracts();

  if (state.credits < -2500 && state.campaign.status === "active") {
    state.campaign.status = "defeat";
    state.gameOver = true;
    logEvent("Bankruptcy declared after sustaining severe upkeep losses.");
  }
  if (state.ticks % 10 === 0 && Math.random() > 0.5) {
    spawnContracts();
    logEvent("New federation contracts have been posted.");
  }

  updateCampaign();
  updateResourceDeltas(previousSnapshot);
  saveState();
  render();
}

function contractWinnerName(contract) {
  if (contract.contestedBy === "player") return "Your Syndicate";
  return contract.contestedBy || "A rival consortium";
}

function updateContractTimers() {
  const expired = [];
  state.contracts = state.contracts.filter((contract) => {
    contract.expiresIn -= 1;
    if (contract.expiresIn > 0) return true;
    expired.push(contract);
    return false;
  });

  expired.forEach((contract) => {
    if (contract.contestedBy && contract.contestedBy !== "player") {
      state.campaign.threat = Math.min(100, state.campaign.threat + 5);
      logEvent(`Contract window closed: ${contractWinnerName(contract)} won the ${contract.resource.toUpperCase()} bid.`);
      return;
    }
    logEvent(`Contract for ${contract.resource.toUpperCase()} expired before delivery.`);
  });

  if (!state.contracts.length) {
    spawnContracts();
    logEvent("Fresh contracts posted after prior bids resolved.");
  }
}

function queueRivalIntent(rival, type, belt, detail = "") {
  const intent = { rival: rival.name, type, belt: belt.key, label: `${rival.name} ${type} ${belt.label}${detail}` };
  state.rivalIntents.unshift(intent);
  state.rivalIntents = state.rivalIntents.slice(0, 6);
}

function runRivalTurn() {
  const pactDampener = state.diplomacyPactTicks > 0 ? 0.72 : 1;
  state.rivals.forEach((rival) => {
    const targetBelt = belts[Math.floor(Math.random() * belts.length)];
    const intentRoll = Math.random();

    if (intentRoll < 0.34) {
      const gain = (2.2 + Math.random() * 3.8) * rival.strength * pactDampener;
      state.rivalInfluence[targetBelt.key] = Math.min(92, state.rivalInfluence[targetBelt.key] + gain);
      queueRivalIntent(rival, "targeting", targetBelt, " to expand influence");
    } else if (intentRoll < 0.58) {
      const targetResource = resources[Math.floor(Math.random() * 4)];
      const cut = 1 - (0.025 + Math.random() * 0.035) * rival.aggression * pactDampener;
      state.markets[targetResource.key] = Math.max(3, state.markets[targetResource.key] * cut);
      queueRivalIntent(rival, "undercutting", targetBelt, ` via ${targetResource.label} price war`);
    } else if (intentRoll < 0.82) {
      const openContracts = state.contracts.filter((contract) => !contract.contestedBy || contract.contestedBy === "player");
      if (openContracts.length) {
        const contract = openContracts[Math.floor(Math.random() * openContracts.length)];
        contract.contestedBy = rival.name;
        contract.expiresIn = Math.max(2, contract.expiresIn - (2 + Math.floor(Math.random() * 3)));
        queueRivalIntent(rival, "bidding against you in", targetBelt, ` for ${contract.resource.toUpperCase()} contracts`);
      }
    } else {
      const raidImpact = (2 + Math.random() * 4) * rival.strength * pactDampener;
      const defenseMitigation = state.defensiveInvestmentTicks > 0 ? 0.55 : 1;
      const totalImpact = raidImpact * defenseMitigation;
      state.territories[targetBelt.key] = Math.max(6, state.territories[targetBelt.key] - totalImpact * 0.9);
      state.rivalInfluence[targetBelt.key] = Math.min(95, state.rivalInfluence[targetBelt.key] + totalImpact * 0.65);
      state.credits = Math.max(0, state.credits - totalImpact * 12);
      queueRivalIntent(rival, "raiding", targetBelt, " after spotting weak defenses");
    }
  });
}

function maybeTriggerSectorEvent() {
  const hazardScale = hasMutator("high-threat") ? 1.5 : 1;
  const events = [
    () => {
      const target = resources[Math.floor(Math.random() * 4)];
      state.markets[target.key] *= 1.14 + (hazardScale - 1) * 0.12;
      logEvent(`Solar storm disrupted ${target.label} routes. Prices surged.`);
    },
    () => {
      const key = belts[Math.floor(Math.random() * belts.length)].key;
      state.territories[key] += 8;
      state.campaign.threat = Math.min(100, state.campaign.threat + 2 * (hazardScale - 1));
      state.reputation += 1;
      logEvent(`Security wing improved control in ${key.toUpperCase()}.`);
    },
    () => {
      state.credits += Math.round(420 / hazardScale);
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
  const rival = Math.round(state.rivalInfluence[selected.key] || 0);
  const efficiency = Math.max(45, Math.round((1 - rival / 135) * 100));
  el.selectedSectorInfo.textContent = `${selected.label} · Influence ${influence}% · Rival ${rival}% · Extraction Eff ${efficiency}% · Risk ${Math.round(selected.risk * 100)}%`;
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
    const pct = objective.comparator === "max"
      ? Math.max(0, Math.min(100, ((objective.target - current) / objective.target) * 100))
      : Math.min(100, (current / objective.target) * 100);
    return `
      <div class="objective">
        <strong>${objective.label}</strong>
        <small>${objective.comparator === "max" ? `${formatNumber(current)} / max ${formatNumber(objective.target)}` : `${formatNumber(current)} / ${formatNumber(objective.target)}`}</small>
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
    ["Rival Pressure", `${averageRivalPressure().toFixed(1)}%`],
    ["Ticks", formatNumber(state.ticks)]
  ];
  stats.forEach(([label, value]) => {
    const tile = document.createElement("div");
    tile.className = "stat-tile";
    tile.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    el.statsGrid.appendChild(tile);
  });

  renderCampaign();
  renderResourcePanel();

  el.policyPanel.innerHTML = policyBranches.map((branch) => {
    const selected = branch.key === state.policyBranch;
    const disabled = Boolean(state.policyBranch) && !selected;
    return `<div class="row policy-row${selected ? " selected" : ""}"><div><strong>${branch.label}</strong><small>${branch.summary}</small></div><button class="btn ghost" data-policy="${branch.key}" ${disabled ? "disabled" : ""}>${selected ? "Locked" : "Adopt"}</button></div>`;
  }).join("");
  el.policyPanel.querySelectorAll("button[data-policy]").forEach((button) => {
    button.onclick = () => runAction(() => {
      if (state.policyBranch) return;
      state.policyBranch = button.dataset.policy;
      logEvent(`${policyBranches.find((p) => p.key === state.policyBranch).label} doctrine adopted. Rival branches are now locked.`);
    });
  });

  el.mutatorPanel.innerHTML = state.scenarioMutators.map((key) => {
    const mutator = scenarioMutators.find((entry) => entry.key === key);
    return `<div class="objective"><strong>${mutator.label}</strong><small>${mutator.summary}</small></div>`;
  }).join("");

  const netProfit = state.ledger.revenue - state.ledger.operatingCost;
  const totalMined = resources.reduce((sum, resource) => sum + state.ledger.mined[resource.key], 0);
  const totalSold = resources.reduce((sum, resource) => sum + state.ledger.sold[resource.key], 0);
  const margin = state.ledger.revenue > 0 ? (netProfit / state.ledger.revenue) * 100 : 0;
  el.scorecardPanel.innerHTML = `
    <div class="objective"><strong>Total mined</strong><small>${formatNumber(totalMined)}</small></div>
    <div class="objective"><strong>Total sold</strong><small>${formatNumber(totalSold)}</small></div>
    <div class="objective"><strong>Waste generated</strong><small>${formatNumber(state.ledger.waste)}</small></div>
    <div class="objective"><strong>Profit / tick</strong><small>${formatNumber(currentProfitPerTick())} cr</small></div>
    <div class="objective"><strong>Contract SLA</strong><small>${currentContractSla().toFixed(1)}%</small></div>
    <div class="objective"><strong>Net margin</strong><small>${margin.toFixed(1)}%</small></div>
  `;


  renderGrid();
  renderBuildActions();
  updateMapVisuals();

  el.beltList.innerHTML = "";
  belts.forEach((belt) => {
    const row = document.createElement("div");
    row.className = "row";
    const pct = Math.round(state.territories[belt.key]);
    const actionCost = 150 + (100 - pct) * 4;
    const rival = Math.round(state.rivalInfluence[belt.key] || 0);
    const efficiency = Math.max(45, Math.round((1 - rival / 135) * 100));
    row.innerHTML = `<div><strong>${belt.label}</strong><small>Influence ${pct}% · Rival ${rival}% · Eff ${efficiency}% · Risk ${Math.round(belt.risk * 100)}%</small></div><button class="btn ghost">Secure (${formatNumber(actionCost)} cr)</button>`;
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
    row.innerHTML = `<div><strong>${resources.find((r) => r.key === contract.resource).label} Contract</strong><small>Deliver ${contract.amount} · Reward ${formatNumber(contract.payout)} cr + ${contract.rep} rep · Due T+${contract.expiresAt}</small></div><button class="btn ghost">${owned >= contract.amount ? "Complete" : `Need ${Math.ceil(contract.amount - owned)}`}</button>`;
    const button = row.querySelector("button");
    button.disabled = owned < contract.amount;
    button.onclick = () => runAction(() => {
      if (owned < contract.amount) return;
      contract.contestedBy = "player";
      state.inventory[contract.resource] -= contract.amount;
      state.credits += contract.payout;
      state.ledger.revenue += contract.payout;
      state.ledger.sold[contract.resource] += contract.amount;
      state.reputation += contract.rep;
      state.completedContracts += 1;
      state.ledger.contractTotal += 1;
      if (state.ticks <= contract.expiresAt) state.ledger.contractOnTime += 1;
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

  el.rivalIntel.innerHTML = "";
  if (!state.rivalIntents.length) {
    el.rivalIntel.innerHTML = `<div class="row"><small>No active rival intents detected.</small></div>`;
  } else {
    state.rivalIntents.slice(0, 5).forEach((intent) => {
      const row = document.createElement("div");
      row.className = "row intel-row";
      row.innerHTML = `<div><strong>${intent.rival}</strong><small>${intent.label}</small></div>`;
      el.rivalIntel.appendChild(row);
    });
  }

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
  const payout = amount * priceFor(key) * ((getPolicy()?.marketSellMult) || 1);
  state.inventory[key] -= amount;
  state.credits += payout;
  state.reputation += 0.08;
  state.ledger.revenue += payout;
  state.ledger.sold[key] += amount;
  logEvent(`Sold ${amount} ${key} for ${formatNumber(payout)} credits.`);
});

el.buyBtn.onclick = () => runAction(() => {
  const key = el.marketSelect.value;
  const amount = Math.max(1, Math.floor(Number(el.tradeAmount.value) || 1));
  const cost = amount * priceFor(key) * ((getPolicy()?.marketBuyMult) || 1);
  if (state.credits < cost) return;
  state.credits -= cost;
  state.ledger.operatingCost += cost;
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
    const surgeYield = 14 * richness;
    state.inventory[res] += surgeYield;
    state.ledger.mined[res] += surgeYield;
    state.ledger.waste += surgeYield * 0.05;
  });
  state.ledger.operatingCost += cost;
  state.campaign.threat = Math.min(100, state.campaign.threat + 5);
  logEvent(`Extraction surge executed at ${belt.label}. Output spiked but threat increased.`);
});

el.sabotageIntelBtn.onclick = () => runAction(() => {
  const cost = 280;
  if (state.credits < cost) return;
  state.credits -= cost;
  state.rivalIntents = state.rivalIntents.slice(2);
  Object.keys(state.rivalInfluence).forEach((key) => {
    state.rivalInfluence[key] = Math.max(0, state.rivalInfluence[key] - (3 + Math.random() * 2));
  });
  logEvent("Counter-intel strike disrupted rival targeting data.");
});

el.diplomaticPactBtn.onclick = () => runAction(() => {
  const cost = 340;
  if (state.credits < cost) return;
  state.credits -= cost;
  state.diplomacyPactTicks = 8;
  state.reputation += 0.6;
  logEvent("Temporary diplomatic pact signed. Rival aggression reduced for 8 ticks.");
});

el.defensiveInvestmentBtn.onclick = () => runAction(() => {
  const cost = 360;
  if (state.credits < cost) return;
  state.credits -= cost;
  state.defensiveInvestmentTicks = 8;
  state.campaign.threat = Math.max(0, state.campaign.threat - 4);
  logEvent("Defensive investment approved. Raid impacts reduced for 8 ticks.");
});

Object.entries(el.mapNodes).forEach(([key, node]) => {
  node.onclick = () => runAction(() => {
    state.selectedSector = key;
  });
});

el.rerollMutatorsBtn.onclick = () => runAction(() => {
  if (state.ticks > 0) return;
  state.scenarioMutators = rollScenarioMutators();
  logEvent("Scenario mutators rerolled before launch.");
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
