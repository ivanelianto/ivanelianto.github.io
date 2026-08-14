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
  { id: "diamond", label: "Diamond", bg: "#f8fafc", fg: "#172033", border: "#cbd5e1" },
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
  game.market[tier] = game.market[tier].filter((card) => card.id !== cardId);
  const nextCard = game.decks[tier].shift();
  if (nextCard) game.market[tier].push(nextCard);
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

function validateTokenSelection(game, playerId, selection) {
  const selectedIds = GEM_IDS.filter((id) => (selection[id] || 0) > 0);
  const total = selectedIds.reduce((sum, id) => sum + selection[id], 0);
  if (total === 0) return "Pilih token dulu.";
  if (sumTokens(getPlayer(game, playerId).tokens) + total > 10) return "Maksimal 10 token di tangan.";

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
    missing[id] = Math.max(0, cost[id] - (player.tokens[id] || 0) - (player.tokens.gold || 0));
  });
  return missing;
}

function botChooseTarget(game, playerId) {
  const bot = getPlayer(game, playerId);
  return allVisibleCards(game)
    .map((candidate) => {
      const missing = missingForTarget(bot, candidate.card);
      const missingTotal = GEM_IDS.reduce((sum, id) => sum + missing[id], 0);
      const value = candidate.card.points * 8 + candidate.card.tier * 2 - missingTotal * 3 - totalCost(candidate.card, bot);
      return { ...candidate, missing, value, missingTotal };
    })
    .sort((a, b) => b.value - a.value)[0];
}

function botBuildTokenSelection(game, playerId) {
  const bot = getPlayer(game, playerId);
  const room = 10 - sumTokens(bot.tokens);
  const selection = emptyCounts(0);
  if (room <= 0) return selection;

  const target = botChooseTarget(game, playerId);
  const wanted = target ? [...GEM_IDS].sort((a, b) => (target.missing[b] || 0) - (target.missing[a] || 0)) : GEM_IDS;
  const topWanted = wanted.find((id) => (target?.missing[id] || 0) >= 2 && game.tokenPool[id] >= 4);

  if (topWanted && room >= 2) {
    selection[topWanted] = 2;
    return selection;
  }

  const picked = new Set();
  [...wanted, ...GEM_IDS]
    .filter((id, index, list) => list.indexOf(id) === index)
    .forEach((id) => {
      if (picked.size >= Math.min(3, room)) return;
      if (game.tokenPool[id] <= 0) return;
      if (target && target.missingTotal > 0 && target.missing[id] === 0 && picked.size < Math.min(2, room)) return;
      selection[id] = 1;
      picked.add(id);
    });

  if (picked.size === 0) {
    GEM_IDS.some((id) => {
      if (game.tokenPool[id] <= 0) return false;
      selection[id] = 1;
      return true;
    });
  }

  return selection;
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
    const selection = botBuildTokenSelection(game, bot.id);
    const selectionTotal = sumTokens(selection);
    if (selectionTotal > 0 && !validateTokenSelection(game, bot.id, selection)) {
      takeTokens(game, bot.id, selection);
    } else {
      const reserve = botReserveCandidate(game, bot.id);
      if (reserve) reserveCard(game, bot.id, reserve.card, reserve.tier);
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
    <Tooltip label={gem.label} hasArrow>
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
    </Tooltip>
  );
}

function LogTokenBadges({ tokens }) {
  if (!tokens) return null;
  const items = GEM_IDS.filter((id) => (tokens[id] || 0) > 0);
  if (items.length === 0) return null;

  return (
    <HStack spacing={1} wrap="wrap" mt={1}>
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
            px={2}
            py={0.5}
          >
            {gem.label} x{tokens[id]}
          </Badge>
        );
      })}
    </HStack>
  );
}

function CostRow({ cost }) {
  const items = GEM_IDS.filter((id) => (cost[id] || 0) > 0);
  if (items.length === 0) return <Text fontSize="xs">Gratis</Text>;
  return (
    <HStack spacing={1} wrap="wrap">
      {items.map((id) => (
        <TokenPip key={id} id={id} amount={cost[id]} size="24px" />
      ))}
    </HStack>
  );
}

function DevelopmentCard({ card, canBuy, onBuy, onReserve, compact = false, isRemoving = false }) {
  const gem = gemMeta(card.bonus);
  const tierStyle = TIER_STYLES[card.tier];
  return (
    <Box
      border="1px solid"
      borderColor={tierStyle.border}
      bg={tierStyle.bg}
      color="#172033"
      borderRadius="8px"
      overflow="hidden"
      minH={compact ? "132px" : "176px"}
      boxShadow="0 8px 20px rgba(69, 54, 28, .08)"
      opacity={isRemoving ? 0 : 1}
      transform={isRemoving ? "scale(.92)" : "scale(1)"}
      transition="opacity 1s ease, transform 1s ease"
      pointerEvents={isRemoving ? "none" : "auto"}
    >
      <Flex align="center" color="111827" px={3} py={2} minH="42px">
        <Text fontSize="2xl" fontWeight="900" lineHeight="1">
          {card.points}🌟
        </Text>
        <Spacer />
        <TokenPip id={card.bonus} shape="bonus" />
      </Flex>
      <VStack align="stretch" spacing={3} p={3}>
        <Badge
          alignSelf="flex-start"
          bg="rgba(255,255,255,.72)"
          color="#172033"
          border="1px solid"
          borderColor={tierStyle.border}
          borderRadius="999px"
          px={2}
        >
          {tierStyle.label}
        </Badge>
        <CostRow cost={card.cost} />
        {(onBuy || onReserve) && (
          <HStack>
            {onBuy && (
              <Button
                size="sm"
                colorScheme="green"
                flex="1"
                isDisabled={!canBuy}
                onClick={onBuy}
                leftIcon={<CheckIcon />}
              >
                Beli
              </Button>
            )}
            {onReserve && (
              <Button
                size="sm"
                flex="1"
                bg="#111827"
                color={KEEP_GOLD}
                border="1px solid"
                borderColor="#111827"
                leftIcon={<BookmarkIcon color={KEEP_GOLD} />}
                _hover={{ bg: "#0b1220" }}
                _active={{ bg: "#050816" }}
                onClick={onReserve}
              >
                Keep
              </Button>
            )}
          </HStack>
        )}
      </VStack>
    </Box>
  );
}

function NobleTile({ noble }) {
  return (
    <Box border="1px solid" bg="#111827" borderRadius="8px" p={3}>
      <Flex align="center" mb={2} color="white">
        <Text fontSize="2xl" fontWeight="900" lineHeight="1">
          {noble.points}🌟
        </Text>
      </Flex>
      <CostRow cost={noble.requirement} />
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
    <Box border="1px solid" borderColor="#d7c9ad" bg="rgba(255,255,255,.72)" borderRadius="8px" p={4}>
      <Flex align="center" mb={3}>
        <Heading size="sm">Token</Heading>
        <Spacer />
        <Text fontSize="sm" color="#66736d">
          Pilih: {selectedTotal}
        </Text>
      </Flex>
      <Stack spacing={2}>
        {GEM_IDS.map((id) => {
          const meta = gemMeta(id);
          const selected = game.selectedTokens[id] || 0;
          return (
            <Button
              key={id}
              h="50px"
              justifyContent="space-between"
              bg={meta.bg}
              color={meta.fg}
              border="2px solid"
              borderColor={selected ? "#111827" : meta.border}
              _hover={{ filter: "brightness(.96)" }}
              onClick={() => onSelectToken(id)}
              isDisabled={!isPlayerTurn || game.tokenPool[id] === 0}
            >
              <HStack>
                <Box
                  w="22px"
                  h="22px"
                  border="1px solid"
                  borderColor={meta.border}
                  bg={meta.bg}
                  borderRadius="999px"
                  boxShadow="inset 0 1px 0 rgba(255,255,255,.4)"
                />
                <Text>{TOKEN_BUTTON_LABELS[id]}</Text>
              </HStack>
              <Text fontSize="xs">
                {game.tokenPool[id]}{selected ? ` / ${selected}` : ""}
              </Text>
            </Button>
          );
        })}
      </Stack>
      <HStack mt={3}>
        <Button
          colorScheme="green"
          flex="1"
          leftIcon={<CheckIcon />}
          onClick={onTakeTokens}
          isDisabled={!isPlayerTurn || selectedTotal === 0}
        >
          Ambil
        </Button>
        <Tooltip label="Batal pilih token" hasArrow>
          <IconButton
            aria-label="Batal pilih token"
            icon={<SmallCloseIcon />}
            onClick={onClearSelection}
            isDisabled={!isPlayerTurn || selectedTotal === 0}
          />
        </Tooltip>
      </HStack>
      {selectedTotal === 1 && (
        <Text mt={2} fontSize="xs" color="#66736d">
          Klik warna yang sama lagi untuk ambil 2, jika bank masih minimal 4.
        </Text>
      )}
    </Box>
  );
}

function PlayerPanel({ player, isActive = false, canControl = false, onBuyReserved, removingCardIds = [] }) {
  const score = scoreFor(player);
  return (
    <Box
      border="1px solid"
      borderColor={isActive ? "#111827" : "#d7c9ad"}
      bg={isActive ? "#fffdf6" : "rgba(255,255,255,.72)"}
      borderRadius="8px"
      p={4}
      boxShadow={isActive ? "0 0 0 2px rgba(242, 201, 76, .7)" : "none"}
    >
      <Flex align="center" mb={3}>
        <Box>
          <Text fontSize="sm" color="#66736d">
            {player.isBot ? "Bot" : "Pemain"}
          </Text>
          <HStack spacing={2} align="center">
            <Heading size="md">{player.name}</Heading>
            {isActive && (
              <Badge bg="#111827" color={KEEP_GOLD} borderRadius="4px" paddingX="6px">
                Turn
              </Badge>
            )}
          </HStack>
        </Box>
        <Spacer />
        <Box textAlign="right">
          <Text fontSize="sm" color="#66736d">
            Poin
          </Text>
          <Text fontSize="3xl" fontWeight="900" lineHeight="1">
            {score}🌟
          </Text>
        </Box>
      </Flex>

      <Stack spacing={3}>
        <Box>
          <Text fontSize="xs" fontWeight="800" color="#66736d" mb={1}>
            Token ({sumTokens(player.tokens)}/10)
          </Text>
          <HStack spacing={1} wrap="wrap">
            {ALL_TOKEN_IDS.map((id) => (
              <TokenPip key={id} id={id} amount={player.tokens[id]} />
            ))}
          </HStack>
        </Box>

        <Box>
          <Text fontSize="xs" fontWeight="800" color="#66736d" mb={1}>
            Bonus
          </Text>
          <HStack spacing={1} wrap="wrap">
            {GEM_IDS.map((id) => (
              <TokenPip key={id} id={id} amount={player.bonuses[id]} shape="bonus" />
            ))}
          </HStack>
        </Box>

        <HStack color="#66736d" fontSize="sm" justify="space-between">
          <Text>Kartu: {player.cards.length}</Text>
          <Text>Keep: {player.reserved.length}/3</Text>
          <Text>Bangsawan: {player.nobles.length}</Text>
        </HStack>

        <Box>
          <Text fontSize="xs" fontWeight="800" color="#66736d" mb={2}>
            Keep
          </Text>
          <Stack spacing={2}>
            {player.reserved.length === 0 && (
              <Text fontSize="sm" color="#66736d">
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
              />
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

export default function Home() {
  const [playerConfigs, setPlayerConfigs] = useState(DEFAULT_PLAYER_CONFIGS);
  const [game, setGame] = useState(null);
  const [removingCardIds, setRemovingCardIds] = useState([]);
  const toast = useToast();

  const activePlayer = game ? getActivePlayer(game) : null;
  const isActionLocked = removingCardIds.length > 0;
  const isPlayerTurn = Boolean(game && activePlayer && !activePlayer.isBot && !game.winner && !isActionLocked);
  const selectedTotal = useMemo(() => (game ? sumTokens(game.selectedTokens) : 0), [game]);
  const totalScoreText = game
    ? game.players.map((player) => `${player.name} ${scoreFor(player)}`).join(" - ")
    : "";

  useEffect(() => {
    if (!game || game.winner || !activePlayer?.isBot) return undefined;
    const timer = window.setTimeout(() => {
      setGame((current) => runBotTurn(current));
    }, BOT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [game?.activePlayerId, game?.winner, activePlayer?.isBot]);

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
    setPlayerConfigs(configs);
    setGame(createGame(Date.now(), configs));
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
        if (total !== 1 || next.tokenPool[id] < 4) return previous;
        next.selectedTokens[id] = 2;
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
      <Container maxW="1720px" py={{ base: 4, lg: 6 }}>
        <Flex align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }} gap={3} mb={5}>
          <Box>
            <Heading size="lg" letterSpacing="0">
              Offline Splendor
            </Heading>
            <Text color="#5f6c66" fontSize="sm">
              Target {WIN_SCORE} poin. {game.players.length} peserta aktif.
            </Text>
          </Box>
          <Spacer />
          <HStack>
            <Badge colorScheme={activePlayer?.isBot ? "purple" : "green"} px={3} py={2} borderRadius="999px">
              {statusText}
            </Badge>
            <Tooltip label="Setup game baru" hasArrow>
              <IconButton aria-label="Setup game baru" icon={<RepeatIcon />} onClick={resetToSetup} />
            </Tooltip>
          </HStack>
        </Flex>

        {game.winner && (
          <Box border="1px solid" borderColor="#9b7a38" bg="#fff6da" borderRadius="8px" p={4} mb={5}>
            <Heading size="md">{statusText}</Heading>
            <Text color="#5f5132" fontSize="sm">
              Skor akhir: {totalScoreText}.
            </Text>
          </Box>
        )}

        <Grid
          templateColumns={{ base: "1fr", xl: "240px minmax(0, 1fr) 160px 180px 280px" }}
          gap={5}
          alignItems="start"
        >
          <VStack align="stretch" spacing={4}>
            <Stack spacing={3}>
              {game.players.map((player) => (
                <PlayerPanel
                  key={player.id}
                  player={player}
                  isActive={player.id === game.activePlayerId}
                  canControl={isPlayerTurn && player.id === game.activePlayerId}
                  onBuyReserved={(card) => handleBuy(card, "reserved", card.tier)}
                  removingCardIds={removingCardIds}
                />
              ))}
            </Stack>
          </VStack>

          <VStack align="stretch" spacing={5}>
            {[3, 2, 1].map((tier) => (
              <Box key={tier}>
                <Flex align="center" mb={2}>
                  <Heading size="sm">Tier {tier}</Heading>
                  <Spacer />
                  <Text fontSize="sm" color="#66736d">
                    Deck: {game.decks[tier].length}
                  </Text>
                </Flex>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={3}>
                  {game.market[tier].map((card) => (
                    <DevelopmentCard
                      key={card.id}
                      card={card}
                      canBuy={isPlayerTurn && affordability(activePlayer, card).canBuy}
                      onBuy={() => handleBuy(card, "market", tier)}
                      onReserve={() => handleReserve(card, tier)}
                      isRemoving={removingCardIds.includes(card.id)}
                    />
                  ))}
                </SimpleGrid>
              </Box>
            ))}
          </VStack>

          <BankTokenPanel
            game={game}
            selectedTotal={selectedTotal}
            isPlayerTurn={isPlayerTurn}
            onSelectToken={selectToken}
            onTakeTokens={takeSelectedTokens}
            onClearSelection={clearSelection}
          />

          <VStack align="stretch" spacing={4}>
            <Box border="1px solid" borderColor="#d7c9ad" bg="rgba(255,255,255,.72)" borderRadius="8px" p={4}>
              <Heading size="sm" mb={3}>
                Bangsawan
              </Heading>
              <Stack spacing={3}>
                {game.nobles.map((noble) => (
                  <NobleTile key={noble.id} noble={noble} />
                ))}
              </Stack>
            </Box>
          </VStack>

          <Box
            border="1px solid"
            borderColor="#d7c9ad"
            bg="rgba(255,255,255,.72)"
            borderRadius="8px"
            p={4}
            position={{ base: "static", xl: "sticky" }}
            top={{ xl: 5 }}
          >
            <Heading size="sm" mb={3}>
              Log
            </Heading>
            <Stack spacing={2} divider={<Divider borderColor="#e3d7bf" />}>
              {game.log.map((entry, index) => {
                const normalizedEntry = typeof entry === "string" ? { id: `${entry}-${index}`, message: entry } : entry;
                return (
                  <Box key={normalizedEntry.id || `${normalizedEntry.message}-${index}`}>
                    <Text fontSize="sm" color={index === 0 ? "#1d2525" : "#66736d"}>
                      {normalizedEntry.message}
                    </Text>
                    <LogTokenBadges tokens={normalizedEntry.tokens} />
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Grid>
      </Container>
    </Box>
  );
}
