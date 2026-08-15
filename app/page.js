"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Spacer,
  Stack,
  Text,
  Tooltip,
  VStack,
  useToast
} from "@chakra-ui/react";
import { CheckIcon, RepeatIcon, SmallCloseIcon, createIcon } from "@chakra-ui/icons";

const GEM_TYPES = [
  { id: "diamond", label: "Diamond", bg: "#f8fafc", fg: "#172033", border: "#6d6d6d" },
  { id: "sapphire", label: "Sapphire", bg: "#2563eb", fg: "white", border: "#1d4ed8" },
  { id: "emerald", label: "Emerald", bg: "#16a34a", fg: "white", border: "#15803d" },
  { id: "ruby", label: "Ruby", bg: "#dc2626", fg: "white", border: "#b91c1c" },
  { id: "onyx", label: "Onyx", bg: "#27272a", fg: "white", border: "#18181b" }
];

const GOLD = { id: "gold", label: "Gold", bg: "#d9a441", fg: "#1d2525", border: "#ad7c1f" };
const GEM_IDS = GEM_TYPES.map((gem) => gem.id);
const ALL_TOKEN_IDS = [...GEM_IDS, "gold"];
const BOT_DELAY_MS = 700;
const WIN_SCORE = 15;
const TIER_STYLES = {
  1: { bg: "#dcf7df", border: "#78ad7d", label: "Tier 1" },
  2: { bg: "#fff1b8", border: "#d3a931", label: "Tier 2" },
  3: { bg: "#dff3ff", border: "#75afd0", label: "Tier 3" }
};
const TOKEN_BUTTON_LABELS = {
  diamond: "",
  sapphire: "",
  emerald: "",
  ruby: "",
  onyx: ""
};
const KEEP_GOLD = "#f2c94c";
const GAME_TIME_TICK_MS = 1000;
const BookmarkIcon = createIcon({
  displayName: "BookmarkIcon",
  viewBox: "0 0 24 24",
  path: (
    <path
      d="M6 4.75C6 3.78 6.78 3 7.75 3h8.5C17.22 3 18 3.78 18 4.75v15.1c0 .64-.72 1.02-1.25.66L12 17.32l-4.75 3.19A.79.79 0 0 1 6 19.85V4.75Z"
      fill="currentColor"
    />
  )
});
const DEFAULT_PLAYER_CONFIGS = [
  { name: "Player 1", isBot: false },
  { name: "Player 2", isBot: true }
];

function emptyCounts(value = 0) {
  return ALL_TOKEN_IDS.reduce((counts, id) => {
    counts[id] = value;
    return counts;
  }, {});
}

function gemMeta(id) {
  if (id === "gold") return GOLD;
  return GEM_TYPES.find((gem) => gem.id === id);
}

function sumTokens(tokens) {
  return ALL_TOKEN_IDS.reduce((sum, id) => sum + (tokens[id] || 0), 0);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}:${String(remainingMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${remainingMinutes}:${String(seconds).padStart(2, "0")}`;
}

function scoreFor(player) {
  const cardScore = player.cards.reduce((total, card) => total + card.points, 0);
  const nobleScore = player.nobles.reduce((total, noble) => total + noble.points, 0);
  return cardScore + nobleScore;
}

function createRng(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function shuffle(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function rotatedTargets(bonusIndex, variant) {
  const targets = [];
  for (let offset = 1; offset <= GEM_IDS.length; offset += 1) {
    targets.push(GEM_IDS[(bonusIndex + variant + offset) % GEM_IDS.length]);
  }
  return targets;
}

function makeCost(tier, bonusIndex, variant) {
  const patterns = {
    1: [
      [2, 1, 0, 0, 0],
      [1, 1, 1, 0, 0],
      [2, 2, 0, 0, 0],
      [3, 1, 1, 0, 0],
      [1, 2, 2, 0, 0],
      [4, 0, 0, 0, 0],
      [3, 2, 0, 0, 0],
      [2, 1, 1, 1, 0]
    ],
    2: [
      [3, 2, 2, 0, 0],
      [4, 2, 1, 0, 0],
      [5, 3, 0, 0, 0],
      [3, 3, 2, 0, 0],
      [5, 2, 1, 1, 0],
      [6, 2, 0, 0, 0]
    ],
    3: [
      [6, 3, 3, 0, 0],
      [7, 3, 0, 0, 0],
      [5, 3, 3, 3, 0],
      [7, 2, 2, 0, 0]
    ]
  };
  const cost = emptyCounts(0);
  const pattern = patterns[tier][variant % patterns[tier].length];
  const targets = rotatedTargets(bonusIndex, variant);

  pattern.forEach((amount, index) => {
    if (amount > 0) cost[targets[index]] += amount;
  });

  return cost;
}

function pointsFor(tier, variant) {
  if (tier === 1) return variant >= 6 ? 1 : 0;
  if (tier === 2) return variant >= 4 ? 3 : variant >= 2 ? 2 : 1;
  return variant >= 2 ? 5 : 4;
}

function buildDeck(tier) {
  const copiesByTier = { 1: 8, 2: 6, 3: 4 };
  const deck = [];

  GEM_TYPES.forEach((gem, bonusIndex) => {
    for (let variant = 0; variant < copiesByTier[tier]; variant += 1) {
      deck.push({
        id: `t${tier}-${gem.id}-${variant}`,
        tier,
        bonus: gem.id,
        points: pointsFor(tier, variant),
        cost: makeCost(tier, bonusIndex, variant)
      });
    }
  });

  return deck;
}

function buildNobles() {
  const nobles = [];
  for (let i = 0; i < GEM_IDS.length; i += 1) {
    const requirement = emptyCounts(0);
    requirement[GEM_IDS[i]] = 3;
    requirement[GEM_IDS[(i + 1) % GEM_IDS.length]] = 3;
    requirement[GEM_IDS[(i + 2) % GEM_IDS.length]] = 3;
    nobles.push({ id: `noble-three-${i}`, points: 3, requirement });
  }
  for (let i = 0; i < GEM_IDS.length; i += 1) {
    const requirement = emptyCounts(0);
    requirement[GEM_IDS[i]] = 4;
    requirement[GEM_IDS[(i + 2) % GEM_IDS.length]] = 4;
    nobles.push({ id: `noble-two-${i}`, points: 3, requirement });
  }
  return nobles;
}

function defaultPlayerConfig(index, isBot = index > 0) {
  return {
    name: `Player ${index + 1}`,
    isBot
  };
}

function normalizePlayerConfigs(configs) {
  const normalized = configs.slice(0, 4).map((config, index) => ({
    name: config.name?.trim() || `Player ${index + 1}`,
    isBot: Boolean(config.isBot)
  }));

  if (!normalized.some((config) => !config.isBot)) {
    normalized[0] = { ...normalized[0], isBot: false };
  }

  return normalized;
}

function createPlayer(id, name, isBot = false) {
  return {
    id,
    name,
    isBot,
    tokens: emptyCounts(0),
    bonuses: emptyCounts(0),
    cards: [],
    reserved: [],
    nobles: []
  };
}

function drawMarket(deck) {
  return {
    market: deck.slice(0, 4),
    deck: deck.slice(4)
  };
}

function createGame(seed = 20260813, playerConfigs = DEFAULT_PLAYER_CONFIGS) {
  const rng = createRng(seed);
  const tier1 = drawMarket(shuffle(buildDeck(1), rng));
  const tier2 = drawMarket(shuffle(buildDeck(2), rng));
  const tier3 = drawMarket(shuffle(buildDeck(3), rng));
  const tokenPool = emptyCounts(7);
  tokenPool.gold = 5;
  const players = normalizePlayerConfigs(playerConfigs).map((config, index) =>
    createPlayer(`p${index + 1}`, config.name, config.isBot)
  );

  return {
    seed,
    startedAt: seed,
    round: 1,
    activePlayerId: players[0].id,
    winner: null,
    selectedTokens: emptyCounts(0),
    decks: { 1: tier1.deck, 2: tier2.deck, 3: tier3.deck },
    market: { 1: tier1.market, 2: tier2.market, 3: tier3.market },
    nobles: shuffle(buildNobles(), rng).slice(0, 5),
    tokenPool,
    players,
    log: [{ id: `log-${seed}-start`, message: "Game dimulai." }]
  };
}

function cloneGame(game) {
  return JSON.parse(JSON.stringify(game));
}

function pushLog(game, message, tokens = null) {
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    message,
    tokens
  };
  game.log = [entry, ...game.log].slice(0, 8);
}

function getPlayer(game, playerId) {
  return game.players.find((player) => player.id === playerId);
}

function getActivePlayer(game) {
  return getPlayer(game, game.activePlayerId);
}

function advanceTurn(game) {
  const currentIndex = game.players.findIndex((player) => player.id === game.activePlayerId);
  const nextIndex = (currentIndex + 1) % game.players.length;
  game.activePlayerId = game.players[nextIndex].id;
  game.round = game.round || 1;
  if (nextIndex === 0) game.round += 1;
}

function effectiveCost(player, card) {
  const cost = emptyCounts(0);
  GEM_IDS.forEach((id) => {
    cost[id] = Math.max(0, (card.cost[id] || 0) - (player.bonuses[id] || 0));
  });
  return cost;
}

function affordability(player, card) {
  const cost = effectiveCost(player, card);
  let goldNeeded = 0;
  GEM_IDS.forEach((id) => {
    goldNeeded += Math.max(0, cost[id] - (player.tokens[id] || 0));
  });
  return {
    canBuy: goldNeeded <= (player.tokens.gold || 0),
    goldNeeded,
    cost
  };
}

function spendForCard(game, player, card) {
  const cost = effectiveCost(player, card);
  let goldSpent = 0;

  GEM_IDS.forEach((id) => {
    const spend = Math.min(player.tokens[id] || 0, cost[id]);
    player.tokens[id] -= spend;
    game.tokenPool[id] += spend;
    goldSpent += cost[id] - spend;
  });

  if (goldSpent > 0) {
    player.tokens.gold -= goldSpent;
    game.tokenPool.gold += goldSpent;
  }
}

function refillMarket(game, tier, cardId) {
  const replacedIndex = game.market[tier].findIndex((card) => card.id === cardId);
  if (replacedIndex < 0) return;

  const nextCard = game.decks[tier].shift();
  if (nextCard) {
    game.market[tier][replacedIndex] = nextCard;
  } else {
    game.market[tier].splice(replacedIndex, 1);
  }
}

function awardNobleIfEligible(game, player) {
  const noble = game.nobles.find((candidate) =>
    GEM_IDS.every((id) => (player.bonuses[id] || 0) >= (candidate.requirement[id] || 0))
  );

  if (!noble) return null;
  game.nobles = game.nobles.filter((candidate) => candidate.id !== noble.id);
  player.nobles.push(noble);
  return noble;
}

function resolveWinner(game) {
  if (game.players.every((player) => scoreFor(player) < WIN_SCORE)) return;

  const standings = game.players
    .map((player) => ({ id: player.id, score: scoreFor(player), cards: player.cards.length }))
    .sort((a, b) => b.score - a.score || a.cards - b.cards);
  const [first, second] = standings;

  game.winner = second && first.score === second.score && first.cards === second.cards ? "draw" : first.id;
}

function buyCard(game, playerId, card, source, tier) {
  const player = getPlayer(game, playerId);
  spendForCard(game, player, card);

  if (source === "market") {
    refillMarket(game, tier, card.id);
  } else {
    player.reserved = player.reserved.filter((reserved) => reserved.id !== card.id);
  }

  player.cards.push(card);
  player.bonuses[card.bonus] += 1;
  const noble = awardNobleIfEligible(game, player);
  const nobleText = noble ? " dan menarik bangsawan" : "";
  pushLog(game, `${player.name} membeli kartu tier ${card.tier}${nobleText}.`);
  resolveWinner(game);
}

function takeTokens(game, playerId, selection) {
  const player = getPlayer(game, playerId);
  const taken = emptyCounts(0);
  GEM_IDS.forEach((id) => {
    const amount = selection[id] || 0;
    if (amount <= 0) return;
    player.tokens[id] += amount;
    game.tokenPool[id] -= amount;
    taken[id] = amount;
  });
  pushLog(game, `${player.name} mengambil token`, taken);
}

function payableShortfall(player, card) {
  const cost = effectiveCost(player, card);
  const coloredDeficit = GEM_IDS.reduce(
    (sum, id) => sum + Math.max(0, (cost[id] || 0) - (player.tokens[id] || 0)),
    0
  );
  return Math.max(0, coloredDeficit - (player.tokens.gold || 0));
}

function botProgressValue(game, playerId) {
  const bot = getPlayer(game, playerId);
  const candidates = allBuyCandidates(game, playerId);
  if (candidates.length === 0) return -Infinity;

  return candidates
    .map(({ card, source }) => {
      const cost = effectiveCost(bot, card);
      const coloredDeficit = GEM_IDS.reduce(
        (sum, id) => sum + Math.max(0, (cost[id] || 0) - (bot.tokens[id] || 0)),
        0
      );
      const usefulTokens = GEM_IDS.reduce(
        (sum, id) => sum + Math.min(bot.tokens[id] || 0, cost[id] || 0),
        0
      );
      const shortfall = Math.max(0, coloredDeficit - (bot.tokens.gold || 0));
      const sourceValue = source === "reserved" ? 3 : 0;

      return card.points * 16 + card.tier * 4 + sourceValue + usefulTokens - shortfall * 80 - coloredDeficit * 4;
    })
    .sort((a, b) => b - a)[0];
}

function chooseTokenToReturn(game, playerId, target = botChooseTarget(game, playerId)) {
  const player = getPlayer(game, playerId);
  const targetCost = target ? effectiveCost(player, target.card) : emptyCounts(0);
  const targetGoldNeed = target ? affordability(player, target.card).goldNeeded : 0;

  return ALL_TOKEN_IDS.filter((id) => (player.tokens[id] || 0) > 0)
    .map((id) => {
      const amount = player.tokens[id] || 0;
      const targetNeed = id === "gold" ? targetGoldNeed : targetCost[id] || 0;
      return {
        id,
        amount,
        isGold: id === "gold",
        surplus: amount - targetNeed,
        targetNeed
      };
    })
    .sort(
      (a, b) =>
        b.surplus - a.surplus ||
        Number(a.isGold) - Number(b.isGold) ||
        a.targetNeed - b.targetNeed ||
        b.amount - a.amount
    )[0]?.id;
}

function returnTokensToLimit(game, playerId, limit = 10, options = {}) {
  const player = getPlayer(game, playerId);
  const returned = emptyCounts(0);
  const shouldLog = options.log !== false;

  while (sumTokens(player.tokens) > limit) {
    const id = chooseTokenToReturn(game, playerId, options.target);
    if (!id) break;
    player.tokens[id] -= 1;
    game.tokenPool[id] += 1;
    returned[id] += 1;
  }

  if (shouldLog && sumTokens(returned) > 0) {
    pushLog(game, `${player.name} mengembalikan token ke bank`, returned);
  }

  return sumTokens(returned);
}

function reserveCard(game, playerId, card, tier) {
  const player = getPlayer(game, playerId);
  if (player.reserved.length >= 3) return false;

  refillMarket(game, tier, card.id);
  player.reserved.push(card);

  if (game.tokenPool.gold > 0 && sumTokens(player.tokens) < 10) {
    game.tokenPool.gold -= 1;
    player.tokens.gold += 1;
  }

  pushLog(game, `${player.name} Keep kartu tier ${card.tier}.`);
  return true;
}

function validateTokenSelection(game, playerId, selection, options = {}) {
  const selectedIds = GEM_IDS.filter((id) => (selection[id] || 0) > 0);
  const total = selectedIds.reduce((sum, id) => sum + selection[id], 0);
  if (total === 0) return "Pilih token dulu.";
  if (!options.allowOverLimit && sumTokens(getPlayer(game, playerId).tokens) + total > 10) {
    return "Maksimal 10 token di tangan.";
  }

  const hasDouble = selectedIds.some((id) => selection[id] === 2);
  if (hasDouble) {
    if (selectedIds.length !== 1 || total !== 2) return "Ambil 2 token hanya boleh dari warna yang sama.";
    if (game.tokenPool[selectedIds[0]] < 4) return "Token warna itu harus tersisa minimal 4.";
  } else {
    if (total !== 3 || selectedIds.length !== 3) return "Pilih 2 token elemen sama atau 3 token elemen berbeda.";
    if (selectedIds.length !== total) return "Ambil 3 token harus dari elemen berbeda.";
  }

  const unavailable = selectedIds.find((id) => game.tokenPool[id] < selection[id]);
  if (unavailable) return "Token di bank tidak cukup.";
  return null;
}

function allVisibleCards(game) {
  return [1, 2, 3].flatMap((tier) => game.market[tier].map((card) => ({ card, source: "market", tier })));
}

function allBuyCandidates(game, playerId) {
  const marketCards = allVisibleCards(game);
  const reservedCards = getPlayer(game, playerId).reserved.map((card) => ({ card, source: "reserved", tier: card.tier }));
  return [...marketCards, ...reservedCards];
}

function totalCost(card, player) {
  const cost = effectiveCost(player, card);
  return GEM_IDS.reduce((sum, id) => sum + cost[id], 0);
}

function botChooseBuy(game, playerId) {
  const bot = getPlayer(game, playerId);
  return allBuyCandidates(game, playerId)
    .filter(({ card }) => affordability(bot, card).canBuy)
    .sort((a, b) => {
      const aValue = a.card.points * 12 + a.card.tier * 2 - totalCost(a.card, bot);
      const bValue = b.card.points * 12 + b.card.tier * 2 - totalCost(b.card, bot);
      return bValue - aValue;
    })[0];
}

function missingForTarget(player, card) {
  const cost = effectiveCost(player, card);
  const missing = emptyCounts(0);
  GEM_IDS.forEach((id) => {
    missing[id] = Math.max(0, cost[id] - (player.tokens[id] || 0));
  });
  return missing;
}

function botChooseTarget(game, playerId) {
  const bot = getPlayer(game, playerId);
  return allBuyCandidates(game, playerId)
    .map((candidate) => {
      const missing = missingForTarget(bot, candidate.card);
      const missingTotal = payableShortfall(bot, candidate.card);
      const value = candidate.card.points * 8 + candidate.card.tier * 2 - missingTotal * 6 - totalCost(candidate.card, bot);
      return { ...candidate, missing, value, missingTotal };
    })
    .sort((a, b) => b.value - a.value)[0];
}

function botTokenSelectionCandidates(game) {
  const candidates = [];

  GEM_IDS.forEach((id) => {
    if (game.tokenPool[id] < 4) return;
    const selection = emptyCounts(0);
    selection[id] = 2;
    candidates.push(selection);
  });

  for (let first = 0; first < GEM_IDS.length; first += 1) {
    for (let second = first + 1; second < GEM_IDS.length; second += 1) {
      for (let third = second + 1; third < GEM_IDS.length; third += 1) {
        const ids = [GEM_IDS[first], GEM_IDS[second], GEM_IDS[third]];
        if (ids.some((id) => game.tokenPool[id] <= 0)) continue;
        const selection = emptyCounts(0);
        ids.forEach((id) => {
          selection[id] = 1;
        });
        candidates.push(selection);
      }
    }
  }

  return candidates;
}

function botChooseTokenExchange(game, playerId, target) {
  const beforeValue = botProgressValue(game, playerId);

  return botTokenSelectionCandidates(game)
    .map((selection) => {
      const next = cloneGame(game);
      takeTokens(next, playerId, selection);
      returnTokensToLimit(next, playerId, 10, { target, log: false });
      return {
        selection,
        value: botProgressValue(next, playerId)
      };
    })
    .filter(({ value }) => value > beforeValue)
    .sort((a, b) => b.value - a.value)[0]?.selection || emptyCounts(0);
}

function botBuildTokenSelection(game, playerId, target = botChooseTarget(game, playerId)) {
  const bot = getPlayer(game, playerId);
  const selection = emptyCounts(0);
  const wanted = target ? [...GEM_IDS].sort((a, b) => (target.missing[b] || 0) - (target.missing[a] || 0)) : GEM_IDS;
  const topWanted = wanted.find((id) => (target?.missing[id] || 0) >= 2 && game.tokenPool[id] >= 4);

  if (topWanted) {
    selection[topWanted] = 2;
    return sumTokens(bot.tokens) + sumTokens(selection) <= 10
      ? selection
      : botChooseTokenExchange(game, playerId, target);
  }

  const picked = new Set();
  [...wanted, ...GEM_IDS]
    .filter((id, index, list) => list.indexOf(id) === index)
    .forEach((id) => {
      if (picked.size >= 3) return;
      if (game.tokenPool[id] <= 0) return;
      if (target && target.missingTotal > 0 && target.missing[id] === 0 && picked.size < 2) return;
      selection[id] = 1;
      picked.add(id);
    });

  if (picked.size === 3) {
    return sumTokens(bot.tokens) + sumTokens(selection) <= 10
      ? selection
      : botChooseTokenExchange(game, playerId, target);
  }

  const fallbackDouble = [...wanted, ...GEM_IDS]
    .filter((id, index, list) => list.indexOf(id) === index)
    .find((id) => game.tokenPool[id] >= 4);

  if (fallbackDouble) {
    const doubleSelection = emptyCounts(0);
    doubleSelection[fallbackDouble] = 2;
    return sumTokens(bot.tokens) + sumTokens(doubleSelection) <= 10
      ? doubleSelection
      : botChooseTokenExchange(game, playerId, target);
  }

  return emptyCounts(0);
}

function botReserveCandidate(game, playerId) {
  const bot = getPlayer(game, playerId);
  if (bot.reserved.length >= 3) return null;
  return allVisibleCards(game)
    .filter(({ card }) => card.tier >= 2)
    .sort((a, b) => b.card.points * 10 + b.card.tier - (a.card.points * 10 + a.card.tier))[0];
}

function runBotTurn(previous) {
  const game = cloneGame(previous);
  const bot = getActivePlayer(game);
  if (game.winner || !bot?.isBot) return previous;

  const buy = botChooseBuy(game, bot.id);
  if (buy) {
    buyCard(game, bot.id, buy.card, buy.source, buy.tier);
  } else {
    const target = botChooseTarget(game, bot.id);
    const selection = botBuildTokenSelection(game, bot.id, target);
    const selectionTotal = sumTokens(selection);
    if (selectionTotal > 0 && !validateTokenSelection(game, bot.id, selection, { allowOverLimit: true })) {
      takeTokens(game, bot.id, selection);
      returnTokensToLimit(game, bot.id, 10, { target });
    } else {
      const reserve = botReserveCandidate(game, bot.id);
      if (reserve) reserveCard(game, bot.id, reserve.card, reserve.tier);
      else if (sumTokens(bot.tokens) >= 10) returnTokensToLimit(game, bot.id, 9, { target });
      else pushLog(game, `${bot.name} melewati giliran.`);
    }
  }

  if (!game.winner) advanceTurn(game);
  game.selectedTokens = emptyCounts(0);
  return game;
}

function TokenPip({ id, amount = 0, size = "28px", shape = "token" }) {
  const gem = gemMeta(id);
  const isBonus = shape === "bonus";
  return (
    <Flex
      align="center"
      justify="center"
      minW={isBonus ? size : amount > 0 ? size : size}
      w={isBonus ? size : undefined}
      h={size}
      px={amount > 0 ? 2 : 0}
      border="1px solid"
      borderColor={gem.border}
      bg={gem.bg}
      color={gem.fg}
      borderRadius={isBonus ? "6px" : "999px"}
      fontSize="xs"
      fontWeight="800"
      boxShadow="inset 0 1px 0 rgba(255,255,255,.4)"
    >
      {amount > 0 ? amount : ""}
    </Flex>
  );
}

function LogTokenBadges({ tokens, compact = false }) {
  if (!tokens) return null;
  const items = ALL_TOKEN_IDS.filter((id) => (tokens[id] || 0) > 0);
  if (items.length === 0) return null;

  return (
    <HStack spacing={1} wrap="wrap" mt={compact ? 0.5 : 1}>
      {items.map((id) => {
        const gem = gemMeta(id);
        return (
          <Badge
            key={id}
            bg={gem.bg}
            color={gem.fg}
            border="1px solid"
            borderColor={gem.border}
            borderRadius="999px"
            px={compact ? 1.5 : 2}
            py={compact ? 0 : 0.5}
            fontSize={compact ? "9px" : "xs"}
          >
            {gem.label} x{tokens[id]}
          </Badge>
        );
      })}
    </HStack>
  );
}

function LogPanel({ game }) {
  return (
    <Box
      border="1px solid"
      borderColor="#d7c9ad"
      bg="rgba(255,255,255,.72)"
      borderRadius="8px"
      p={{ base: 2, xl: 2.5 }}
      h="100%"
      minH="0"
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      <Heading size="sm" mb={1.5} flexShrink={0}>
        Log
      </Heading>
      <Box flex="1" minH="0" overflowY="auto" overflowX="hidden" pr={1}>
        <Stack spacing={1.25} divider={<Divider borderColor="#e3d7bf" />}>
          {game.log.map((entry, index) => {
            const normalizedEntry = typeof entry === "string" ? { id: `${entry}-${index}`, message: entry } : entry;
            return (
              <Box key={normalizedEntry.id || `${normalizedEntry.message}-${index}`} overflow="hidden">
                <Text
                  fontSize="11px"
                  lineHeight="1.25"
                  color={index === 0 ? "#1d2525" : "#66736d"}
                  noOfLines={2}
                  wordBreak="break-word"
                >
                  {normalizedEntry.message}
                </Text>
                <LogTokenBadges tokens={normalizedEntry.tokens} compact />
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}

function CostRow({ cost, size = "20px" }) {
  const items = GEM_IDS.filter((id) => (cost[id] || 0) > 0);
  if (items.length === 0) return <Text fontSize="xs">Gratis</Text>;
  return (
    <HStack spacing={1} wrap="wrap">
      {items.map((id) => (
        <TokenPip key={id} id={id} amount={cost[id]} size={size} />
      ))}
    </HStack>
  );
}

function DevelopmentCard({
  card,
  canBuy,
  onBuy,
  onReserve,
  compact = false,
  isRemoving = false,
  actionsAlwaysVisible = false
}) {
  const tierStyle = TIER_STYLES[card.tier];
  const hasActions = Boolean(onBuy || onReserve);
  return (
    <Box
      role="group"
      position="relative"
      border="1px solid"
      borderColor={tierStyle.border}
      bg={tierStyle.bg}
      p="0.25em"
      color="#172033"
      borderRadius="8px"
      overflow="hidden"
      minH={compact ? { base: "54px", xl: "44px" } : { base: "92px", xl: "80px" }}
      boxShadow="0 6px 14px rgba(69, 54, 28, .08)"
      opacity={isRemoving ? 0 : 1}
      transform={isRemoving ? "scale(.92)" : "scale(1)"}
      transition="opacity 1s ease, transform .22s ease, box-shadow .22s ease"
      animation={isRemoving ? undefined : "cardDealIn .5s ease-out"}
      pointerEvents={isRemoving ? "none" : "auto"}
      _hover={
        isRemoving
          ? undefined
          : {
            transform: "translateY(-4px)",
            boxShadow: "0 12px 22px rgba(69, 54, 28, .16)",
            cursor: "pointer"
          }
      }
    >

      <Flex
        align="center"
        color="#111827"
        px={compact ? { base: 2, xl: 1.5 } : { base: 2.5, xl: 2 }}
        py={compact ? { base: 1, xl: 0.75 } : { base: 1, xl: 0.75 }}
        minH={compact ? { base: "24px", xl: "20px" } : { base: "28px", xl: "24px" }}
      >
        <Text fontSize={compact ? { base: "sm", xl: "xs" } : { base: "lg", xl: "md", "2xl": "lg" }} fontWeight="900" lineHeight="1">
          {card.points}🌟
        </Text>
        <Spacer />
        <TokenPip id={card.bonus} shape="bonus" size={compact ? "17px" : "18px"} />
      </Flex>

      <VStack
        align="flex-start"
        spacing={compact ? 0.75 : 1}
        px={compact ? { base: 2, xl: 1.5 } : { base: 2.5, xl: 2 }}
        py={compact ? { base: 1.5, xl: 1 } : { base: 2, xl: 1.5 }}
        w={"50%"}
      >
        <CostRow cost={card.cost} size={compact ? "16px" : "18px"} />
      </VStack>

      {hasActions && (
        <HStack
          position="absolute"
          right={compact ? 1 : 2}
          bottom={compact ? 1 : 2}
          spacing={1}
          justify="flex-end"
          opacity={actionsAlwaysVisible ? 1 : 0}
          transform={actionsAlwaysVisible ? "translateY(0)" : "translateY(8px)"}
          transition="opacity .18s ease, transform .18s ease"
          pointerEvents={actionsAlwaysVisible ? "auto" : "none"}
          _groupHover={{ opacity: 1, transform: "translateY(0)", pointerEvents: "auto" }}
          _groupFocusWithin={{ opacity: 1, transform: "translateY(0)", pointerEvents: "auto" }}
        >
          {onReserve && (
            <Button
              size="sm"
              h={compact ? "24px" : "28px"}
              w={compact ? "24px" : "28px"}
              bg="#111827"
              color={KEEP_GOLD}
              border="1px solid"
              borderColor="#111827"
              _hover={{ bg: "#0b1220" }}
              _active={{ bg: "#050816" }}
              onClick={onReserve}
            >
              <BookmarkIcon color={KEEP_GOLD} />
            </Button>
          )}

          {onBuy && (
            <Button
              size="sm"
              colorScheme="green"
              h={compact ? "24px" : "28px"}
              w={compact ? "24px" : "28px"}
              px={2}
              display={canBuy ? "block" : "none"}
              onClick={onBuy}
            >
              <CheckIcon />
            </Button>
          )}
        </HStack>
      )}
    </Box>
  );
}

function NobleTile({ noble }) {
  return (
    <Box border="1mm ridge #ae28d1" bg="#ae28d124" borderRadius="8px" flex={1} p="0.25em">
      <Flex align="center" mb={1} color="white" px="0.5em">
        <Text fontSize={{ base: "lg", xl: "md", "2xl": "lg" }} fontWeight="900" color="#111827">
          {noble.points}🌟
        </Text>
      </Flex>

      <Box px="0.5em">
        <CostRow cost={noble.requirement} size="18px" />
      </Box>
    </Box>
  );
}

function BankTokenPanel({
  game,
  selectedTotal,
  isPlayerTurn,
  onSelectToken,
  onTakeTokens,
  onClearSelection
}) {
  return (
    <Box
      border="1px solid"
      borderColor="#d7c9ad"
      bg="rgba(255,255,255,.72)"
      borderRadius="8px"
      p={{ base: 2, xl: 2.5 }}
      h="100%"
      minH="0"
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      <Flex align="center" mb={2} flexShrink={0}>
        <Heading size="sm">Token</Heading>
        <Spacer />
        <Text fontSize="xs" color="#66736d">
          Pilih: {selectedTotal}
        </Text>
      </Flex>

      <Stack spacing={{ base: 2, xl: 1.5, "2xl": 2 }} flex="1" minH="0">
        {GEM_IDS.map((id) => {
          const meta = gemMeta(id);
          const selected = game.selectedTokens[id] || 0;
          const isSelected = selected > 0;
          return (
            <Button
              key={id}
              h={{ base: "38px", xl: "clamp(34px, 5vh, 42px)" }}
              justifyContent="flex-start"
              // bg={isSelected ? meta.bg : "transparent"}
              bg="transparent"
              color="#172033"
              border={isSelected ? "3px solid" : "1px solid"}
              borderColor={meta.border}
              boxShadow={isSelected ? "inset 0 1px 0 rgba(255,255,255,.35)" : "none"}
              _hover={{
                transform: "translateY(-1px)"
              }}
              _active={{ transform: "translateY(0)" }}
              onClick={() => onSelectToken(id)}
              isDisabled={!isPlayerTurn || game.tokenPool[id] === 0}
            >
              <HStack spacing={2} w="100%" justify="space-between">
                <HStack>
                  <Text fontSize="sm" fontWeight="900" minW="20px" textAlign="left">
                    {game.tokenPool[id]}
                  </Text>

                  <Box
                    w="18px"
                    h="18px"
                    border="1px solid"
                    borderColor={meta.border}
                    bg={meta.bg}
                    borderRadius="999px"
                    boxShadow="inset 0 1px 0 rgba(255,255,255,.4)"
                  />
                </HStack>

                <Text fontSize="sm" fontWeight="900" minW="28px" textAlign="right">
                  {selected ? `${selected}x` : ""}
                </Text>
              </HStack>
            </Button>
          );
        })}
      </Stack>

      <HStack mt={2}>
        <Button
          colorScheme="green"
          flex="1"
          size="sm"
          leftIcon={<CheckIcon />}
          onClick={onTakeTokens}
          isDisabled={!isPlayerTurn || selectedTotal === 0}
        >
          Ambil
        </Button>
        <Tooltip label="Batal pilih token" hasArrow>
          <IconButton
            aria-label="Batal pilih token"
            size="sm"
            icon={<SmallCloseIcon />}
            onClick={onClearSelection}
            isDisabled={!isPlayerTurn || selectedTotal === 0}
          />
        </Tooltip>
      </HStack>

      {selectedTotal === 1 && (
        <Text mt={1.5} fontSize="10px" color="#66736d">
          Klik warna yang sama lagi untuk ambil 2, jika bank masih minimal 4.
        </Text>
      )}
    </Box>
  );
}

function PlayerPanel({
  player,
  isActive = false,
  canControl = false,
  onBuyReserved,
  removingCardIds = [],
  actionsAlwaysVisible = false
}) {
  const score = scoreFor(player);
  return (
    <Box
      border="1px solid"
      borderColor={isActive ? "#111827" : "#d7c9ad"}
      bg={isActive ? "#fffdf6" : "rgba(255,255,255,.72)"}
      borderRadius="8px"
      p={{ base: 2, xl: 2.5 }}
      boxShadow={isActive ? "0 0 0 2px rgba(242, 201, 76, .7)" : "none"}
      h="100%"
      minH="0"
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      <Flex align="center" mb={{ base: 1.5, xl: 1 }} flexShrink={0}>
        <Box>
          <Text fontSize="xs" color="#66736d">
            {player.isBot ? "🤖 Bot" : "Pemain"}
          </Text>
          <HStack spacing={2} align="center">
            <Heading size="sm">{player.name}</Heading>
            {isActive && (
              <Badge bg="#111827" color={KEEP_GOLD} borderRadius="4px" paddingX="6px">
                Turn
              </Badge>
            )}
          </HStack>
        </Box>
        <Spacer />
        <Box textAlign="right">
          <Text fontSize="xs" color="#66736d">
            Poin
          </Text>
          <Text fontSize="xl" fontWeight="900" lineHeight="1">
            {score}🌟
          </Text>
        </Box>
      </Flex>

      <Stack flex="1" minH="0">
        <Box>
          <Text fontSize="10px" fontWeight="800" color="#66736d" mb={0.5}>
            Token ({sumTokens(player.tokens)}/10)
          </Text>
          <HStack spacing={1} wrap="nowrap" overflow="hidden">
            {ALL_TOKEN_IDS.map((id) => (
              <TokenPip key={id} id={id} amount={player.tokens[id]} size="19px" />
            ))}
          </HStack>
        </Box>

        <Box>
          <Text fontSize="10px" fontWeight="800" color="#66736d" mb={0.5}>
            Bonus
          </Text>
          <HStack spacing={1} wrap="nowrap" overflow="hidden">
            {GEM_IDS.map((id) => (
              <TokenPip key={id} id={id} amount={player.bonuses[id]} shape="bonus" size="19px" />
            ))}
          </HStack>
        </Box>

        <HStack color="#66736d" fontSize="xs" justify="space-between">
          <Text>Kartu: {player.cards.length}</Text>
          <Text>Keep: {player.reserved.length}/3</Text>
          <Text>Bangsawan: {player.nobles.length}</Text>
        </HStack>

        <Box minH="110px" overflow="hidden" pt="0.25em">
          <SimpleGrid columns={player.reserved.length > 0 ? 3 : 1} spacing={1}>
            {player.reserved.length === 0 && (
              <Text fontSize="xs" color="#66736d">
                Belum ada kartu.
              </Text>
            )}
            {player.reserved.map((card) => (
              <DevelopmentCard
                key={card.id}
                card={card}
                compact
                canBuy={canControl && affordability(player, card).canBuy}
                onBuy={canControl ? () => onBuyReserved(card) : undefined}
                isRemoving={removingCardIds.includes(card.id)}
                actionsAlwaysVisible={actionsAlwaysVisible}
              />
            ))}
          </SimpleGrid>
        </Box>
      </Stack>
    </Box>
  );
}

export default function Home() {
  const [playerConfigs, setPlayerConfigs] = useState(DEFAULT_PLAYER_CONFIGS);
  const [game, setGame] = useState(null);
  const [removingCardIds, setRemovingCardIds] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [cardActionVisibility, setCardActionVisibility] = useState("hover");
  const toast = useToast();

  const activePlayer = game ? getActivePlayer(game) : null;
  const isActionLocked = removingCardIds.length > 0;
  const isPlayerTurn = Boolean(game && activePlayer && !activePlayer.isBot && !game.winner && !isActionLocked);
  const selectedTotal = useMemo(() => (game ? sumTokens(game.selectedTokens) : 0), [game]);
  const totalScoreText = game
    ? game.players.map((player) => `${player.name} ${scoreFor(player)}`).join(" - ")
    : "";
  const gameDurationText = game ? formatDuration(currentTime - (game.startedAt || game.seed || currentTime)) : "0:00";
  const gameRoundText = game ? game.round || 1 : 1;
  const actionsAlwaysVisible = cardActionVisibility === "always";

  useEffect(() => {
    if (!game || game.winner || !activePlayer?.isBot) return undefined;
    const timer = window.setTimeout(() => {
      setGame((current) => runBotTurn(current));
    }, BOT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [game?.activePlayerId, game?.winner, activePlayer?.isBot]);

  useEffect(() => {
    if (!game) return undefined;
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, GAME_TIME_TICK_MS);
    return () => window.clearInterval(timer);
  }, [game?.startedAt]);

  function showError(message) {
    toast({ title: message, status: "warning", duration: 1800, isClosable: true, position: "top" });
  }

  function setPlayerCount(count) {
    setPlayerConfigs((previous) => {
      const next = [...previous];
      while (next.length < count) next.push(defaultPlayerConfig(next.length));
      return normalizePlayerConfigs(next.slice(0, count));
    });
  }

  function updatePlayerConfig(index, patch) {
    setPlayerConfigs((previous) => {
      const next = previous.map((config, currentIndex) =>
        currentIndex === index ? { ...config, ...patch } : config
      );
      return normalizePlayerConfigs(next);
    });
  }

  function startGame() {
    const configs = normalizePlayerConfigs(playerConfigs);
    const now = Date.now();
    setPlayerConfigs(configs);
    setCurrentTime(now);
    setGame(createGame(now, configs));
  }

  function resetToSetup() {
    setRemovingCardIds([]);
    setGame(null);
  }

  function runAfterCardTransition(cardId, action) {
    setRemovingCardIds((previous) => (previous.includes(cardId) ? previous : [...previous, cardId]));
    window.setTimeout(() => {
      action();
      setRemovingCardIds((previous) => previous.filter((id) => id !== cardId));
    }, 1000);
  }

  function selectToken(id) {
    if (!isPlayerTurn) return;
    setGame((previous) => {
      const next = cloneGame(previous);
      const current = next.selectedTokens[id] || 0;
      const selectedIds = GEM_IDS.filter((gemId) => (next.selectedTokens[gemId] || 0) > 0);
      const total = sumTokens(next.selectedTokens);

      if (next.tokenPool[id] <= current) return previous;

      if (current === 0) {
        if (total >= 3) return previous;
        if (selectedIds.some((gemId) => next.selectedTokens[gemId] === 2)) return previous;
        next.selectedTokens[id] = 1;
      } else if (current === 1) {
        if (total === 1 && next.tokenPool[id] >= 4) {
          next.selectedTokens[id] = 2;
        } else {
          next.selectedTokens[id] = 0;
        }
      } else {
        next.selectedTokens[id] = 0;
      }

      return next;
    });
  }

  function clearSelection() {
    setGame((previous) => ({ ...previous, selectedTokens: emptyCounts(0) }));
  }

  function takeSelectedTokens() {
    if (!isPlayerTurn) return;
    const error = validateTokenSelection(game, activePlayer.id, game.selectedTokens);
    if (error) {
      showError(error);
      return;
    }

    setGame((previous) => {
      const next = cloneGame(previous);
      takeTokens(next, next.activePlayerId, next.selectedTokens);
      next.selectedTokens = emptyCounts(0);
      advanceTurn(next);
      return next;
    });
  }

  function handleBuy(card, source, tier) {
    if (!isPlayerTurn) return;
    if (!affordability(activePlayer, card).canBuy) {
      showError("Token belum cukup untuk membeli kartu ini.");
      return;
    }

    runAfterCardTransition(card.id, () => {
      setGame((previous) => {
        if (!previous) return previous;
        const next = cloneGame(previous);
        buyCard(next, next.activePlayerId, card, source, tier);
        if (!next.winner) advanceTurn(next);
        next.selectedTokens = emptyCounts(0);
        return next;
      });
    });
  }

  function handleReserve(card, tier) {
    if (!isPlayerTurn) return;
    if (activePlayer.reserved.length >= 3) {
      showError("Keep maksimal 3 kartu.");
      return;
    }

    runAfterCardTransition(card.id, () => {
      setGame((previous) => {
        if (!previous) return previous;
        const next = cloneGame(previous);
        reserveCard(next, next.activePlayerId, card, tier);
        if (!next.winner) advanceTurn(next);
        next.selectedTokens = emptyCounts(0);
        return next;
      });
    });
  }

  if (!game) {
    return (
      <Box minH="100vh" bg="#f5f1e8">
        <Container maxW="900px" py={{ base: 4, lg: 8 }}>
          <Stack spacing={5}>
            <Box>
              <Heading size="lg" letterSpacing="0">
                Offline Splendor
              </Heading>
              <Text color="#5f6c66" fontSize="sm">
                Pilih komposisi pemain, maksimal 4 peserta.
              </Text>
            </Box>

            <Box border="1px solid" borderColor="#d7c9ad" bg="rgba(255,255,255,.82)" borderRadius="8px" p={5}>
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="800">
                    Total pemain
                  </FormLabel>
                  <Select value={playerConfigs.length} onChange={(event) => setPlayerCount(Number(event.target.value))}>
                    {[2, 3, 4].map((count) => (
                      <option key={count} value={count}>
                        {count} pemain
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {playerConfigs.map((config, index) => (
                    <Box key={index} border="1px solid" borderColor="#d7c9ad" bg="white" borderRadius="8px" p={4}>
                      <Stack spacing={3}>
                        <Heading size="sm">Slot {index + 1}</Heading>
                        <FormControl>
                          <FormLabel fontSize="xs" fontWeight="800">
                            Nama
                          </FormLabel>
                          <Input
                            value={config.name}
                            placeholder={`Player ${index + 1}`}
                            onChange={(event) => updatePlayerConfig(index, { name: event.target.value })}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="xs" fontWeight="800">
                            Kendali
                          </FormLabel>
                          <Select
                            value={config.isBot ? "bot" : "human"}
                            onChange={(event) => updatePlayerConfig(index, { isBot: event.target.value === "bot" })}
                          >
                            <option value="human">Human</option>
                            <option value="bot">Bot</option>
                          </Select>
                        </FormControl>
                      </Stack>
                    </Box>
                  ))}
                </SimpleGrid>

                <Button colorScheme="green" alignSelf="flex-start" leftIcon={<CheckIcon />} onClick={startGame}>
                  Build Game
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>
    );
  }

  const winner = game.winner === "draw" ? null : getPlayer(game, game.winner);
  const statusText = game.winner
    ? game.winner === "draw"
      ? "Seri"
      : `${winner?.name} menang`
    : activePlayer?.isBot
      ? `${activePlayer.name} berpikir`
      : `Giliran ${activePlayer?.name}`;

  return (
    <Box minH="100vh" bg="#f5f1e8">
      <Container maxW="1600px" py={{ base: 2, lg: 3 }}>
        <Flex align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }} gap={3} mb={2}>
          <Box>
            <Heading size="lg" letterSpacing="0">
              Offline Splendor
            </Heading>
            <Text color="#5f6c66" fontSize="sm">
              Target {WIN_SCORE} poin. {game.players.length} peserta aktif.
            </Text>
          </Box>
          <Spacer />
          <HStack wrap="wrap" justify={{ base: "flex-start", md: "flex-end" }}>
            <Select
              value={cardActionVisibility}
              onChange={(event) => setCardActionVisibility(event.target.value)}
              size="sm"
              w="132px"
              bg="rgba(255,255,255,.82)"
              borderColor="#d7c9ad"
              borderRadius="999px"
              fontSize="xs"
              fontWeight="800"
            >
              <option value="hover">Aksi: hover</option>
              <option value="always">Aksi: tampil</option>
            </Select>
            <Badge bg="rgba(255,255,255,.82)" color="#172033" border="1px solid" borderColor="#d7c9ad" px={3} py={2} borderRadius="999px">
              Durasi {gameDurationText}
            </Badge>
            <Badge bg="rgba(255,255,255,.82)" color="#172033" border="1px solid" borderColor="#d7c9ad" px={3} py={2} borderRadius="999px">
              Turn {gameRoundText}
            </Badge>
            <Badge colorScheme={activePlayer?.isBot ? "purple" : "green"} px={3} py={2} borderRadius="999px">
              {statusText}
            </Badge>
            <Tooltip label="Setup game baru" hasArrow>
              <IconButton aria-label="Setup game baru" icon={<RepeatIcon />} onClick={resetToSetup} />
            </Tooltip>
          </HStack>
        </Flex>

        {game.winner && (
          <Box border="1px solid" borderColor="#9b7a38" bg="#fff6da" borderRadius="8px" p={3} mb={3}>
            <Heading size="md">{statusText}</Heading>
            <Text color="#5f5132" fontSize="sm">
              Skor akhir: {totalScoreText}.
            </Text>
          </Box>
        )}

        <Stack spacing={3}>
          <Grid
            templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) 300px" }}
            gap={3}
            alignItems="stretch"
            maxW="1400px"
            mx="auto"
            w="100%"
          >
            <SimpleGrid columns={{ base: 1, md: 2, xl: Math.min(game.players.length, 4) }} spacing={3}>
              {game.players.map((player) => (
                <PlayerPanel
                  key={player.id}
                  player={player}
                  isActive={player.id === game.activePlayerId}
                  canControl={isPlayerTurn && player.id === game.activePlayerId}
                  onBuyReserved={(card) => handleBuy(card, "reserved", card.tier)}
                  removingCardIds={removingCardIds}
                  actionsAlwaysVisible={actionsAlwaysVisible}
                />
              ))}
            </SimpleGrid>
            <LogPanel game={game} />
          </Grid>

          <Grid
            templateColumns={{ base: "1fr", xl: "164px minmax(0, 1fr) 240px" }}
            gap={3}
            alignItems="stretch"
            maxW="1500px"
            mx="auto"
            w="100%"
          >
            <VStack align="stretch" spacing={3}>
              <Box
                border="1px solid"
                borderColor="#d7c9ad"
                bg="rgba(255,255,255,.72)"
                borderRadius="8px"
                p={2.5}
                h={{ base: "auto", xl: "424px" }}
                display="flex"
                flexDirection="column"
              >
                <Heading size="sm" mb={2} flexShrink={0}>
                  Bangsawan
                </Heading>

                <VStack spacing={1.5} align="stretch" flex="1" minH={0}>
                  {game.nobles.map((noble) => (
                    <NobleTile key={noble.id} noble={noble} />
                  ))}
                </VStack>
              </Box>
            </VStack>

            <Box
              border="1px solid"
              borderColor="#d7c9ad"
              bg="rgba(255,255,255,.42)"
              borderRadius="8px"
              p={2.5}
              h={{ base: "auto", xl: "424px" }}
              display="flex"
              flexDirection="column"
            >
              <Heading size="sm" mb={2} flexShrink={0}>
                Pasar Kartu
              </Heading>

              <VStack align="stretch" spacing={2} flex={1} minH={0}>
                {[3, 2, 1].map((tier) => (
                  <Box key={tier}
                    flex={1}
                    minH={0}
                    display="flex"
                    flexDirection="column"
                  >
                    <Flex align="center" mb={1.5} flexShrink={0}>
                      <Heading size="sm">Tier {tier}</Heading>
                      <Spacer />

                      <Text fontSize="xs" color="#66736d">
                        Deck: {game.decks[tier].length}
                      </Text>
                    </Flex>

                    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={2}
                      flex={1}
                      minH={0}
                    >
                      {game.market[tier].map((card) => (
                        <DevelopmentCard
                          key={card.id}
                          card={card}
                          canBuy={isPlayerTurn && affordability(activePlayer, card).canBuy}
                          onBuy={() => handleBuy(card, "market", tier)}
                          onReserve={() => handleReserve(card, tier)}
                          isRemoving={removingCardIds.includes(card.id)}
                          actionsAlwaysVisible={actionsAlwaysVisible}
                        />
                      ))}
                    </SimpleGrid>
                  </Box>
                ))}
              </VStack>
            </Box>

            <BankTokenPanel
              game={game}
              selectedTotal={selectedTotal}
              isPlayerTurn={isPlayerTurn}
              onSelectToken={selectToken}
              onTakeTokens={takeSelectedTokens}
              onClearSelection={clearSelection}
            />
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
