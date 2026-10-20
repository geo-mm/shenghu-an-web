import type { PlayerColor, PlayerIcon } from '../game/players'
import type { BuildingType, RoleId, SoldGood } from '../game/cards'
import type { PlacementError } from '../game/engine'
import type { LogEvent } from '../game/state'

export type Lang = 'en' | 'zh-TW'

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh-TW', label: '繁體中文' },
]

const s = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
/** Chinese: keep a space after a trailing number ("玩家 0 選擇" but "你選擇"). */
const zj = (who: string, rest: string) => (/\d$/.test(who) ? `${who} ${rest}` : `${who}${rest}`)

const en = {
  appTitle: 'San Juan · P2P',
  language: 'Language',
  leave: 'Leave',
  footer:
    'Pure peer-to-peer via WebRTC: the host’s browser runs the authoritative game state. A PeerJS signaling server is only used to introduce the two peers.',

  // Lobby
  hostTitle: 'Host a game',
  hostHint: 'Creates a room in this browser. Share the token with your opponent.',
  expansionOption: 'Include the “New Buildings” expansion',
  profileTitle: 'Your colour & icon',
  profileHint: 'Everyone sees you in this colour. If another player already has it, you keep a free colour and can change it during the game by clicking your token.',
  changeProfile: 'Change your colour or icon',
  colorLabel: 'Colour',
  iconLabel: 'Icon',
  colorTaken: (color: string) => `${color} (taken)`,
  colorNames: { teal: 'Teal', crimson: 'Crimson', amber: 'Amber', green: 'Green', blue: 'Blue', purple: 'Purple', pink: 'Pink', brown: 'Brown' } as Record<PlayerColor, string>,
  iconNames: { anchor: 'Anchor', ship: 'Ship', sun: 'Sun', olive: 'Olive branch', compass: 'Compass', key: 'Key', crown: 'Crown', fish: 'Fish' } as Record<PlayerIcon, string>,
  hostButton: 'Host Game',
  joinTitle: 'Join a game',
  joinPlaceholder: 'Room token, e.g. K7PX2M',
  joinButton: 'Join Game',
  roomToken: 'Room token',
  shareHint: 'Ask friends to enter this token under “Join Game”, or send them the link. You can also fill seats with computer players.',
  seatsTitle: 'Seats',
  seatEmpty: 'Empty seat',
  botName: (seat: string) => `Computer ${seat}`,
  hostLabel: 'Host',
  addBot: 'Add computer player',
  removeBot: 'Remove',
  startGame: (n: number) => `Start game (${n} players)`,
  needTwoPlayers: 'A game needs at least 2 players.',
  waitingForHost: 'Waiting for the host to start the game…',
  gameStartedError: 'This game has already started, so no one else can join.',
  roomFullError: 'This room is full.',
  copyLink: 'Copy link',
  lookingForHost: (token: string) => `Looking for host of room ${token}… (retrying automatically)`,
  tokenInUse: 'That room token is already in use. Please host a new game.',
  p2pError: (type: string, message: string) => `P2P error${type ? ` (${type})` : ''}: ${message}`,

  // Connection status
  status: { connecting: 'Connecting', waiting: 'Waiting for players', connected: 'Connected', error: 'Error' },
  asRole: (host: boolean, token: string) => `as ${host ? 'Host' : 'Guest'} · room ${token}`,
  players: 'Players',
  noPlayerData: 'No player data yet…',
  playerLabel: (id: number | string) => `Player ${id}`,
  hostTag: '(Host)',
  guestTag: '(Guest)',
  you: 'you',
  online: 'online',
  offline: 'offline',

  // Board
  who: (p: string, me: boolean) => (me ? 'You' : `Player ${p}`),
  round: (n: number) => `Round ${n}`,
  governor: 'Governor',
  governorIs: (who: string) => `Governor: ${who}`,
  governorTag: 'governor',
  stepGameOver: 'Game over',
  stepGovernor: 'Start of round: office building, chapel, bank and hand limit',
  stepChooseRole: (who: string, me: boolean) => `${who} ${me ? 'choose' : 'chooses'} a role`,
  stepRole: (role: string, who: string) => `${role} phase (chosen by ${who})`,
  deckDiscard: (deck: number, discard: number) => `Deck ${deck} · Discard ${discard}`,
  waitingFor: (who: string) => `Waiting for ${who}…`,
  yourMove: 'Your move!',
  cardHint: 'Tip: right-click (or long-press) any card to see what it does.',
  galleryTitle: 'Card gallery',
  galleryLarge: 'Large cards',
  galleryRoles: 'Roles',

  roleSummary: (action: string, privilege: string) => `Action: ${action} Privilege: ${privilege}`,
  chooseRolePrompt: 'Click a role to see it, then confirm.',
  confirmRole: (role: string) => `Choose ${role}`,
  cancel: 'Cancel',

  inHand: (n: number) => `${s(n, 'card')} in hand`,
  underChapel: (n: number) => `${n} under chapel`,
  stored: (chapel: number, bank: number, harbor: number) =>
    [chapel && `${chapel} under chapel`, bank && `${bank} in bank`, harbor && `${harbor} under harbor`].filter(Boolean).join(' · '),
  buildingsCount: (n: number) => s(n, 'building'),
  youPlayer: (id: string) => `You (Player ${id})`,
  buildingsTitle: (n: number) => `Buildings (${n}/12)`,
  handTitle: (n: number) => `Hand (${n})`,
  noCards: 'No cards',

  confirm: 'Confirm',
  build: 'Build',
  pass: 'Pass',
  produce: 'Produce',
  sell: 'Sell',
  chapelPrompt: 'You may tuck one card under your chapel (1 VP at the end). ',
  discardPrompt: (n: number) => (n > 0 ? `Select ${s(n, 'card')} to discard down to your hand limit.` : 'No discards needed.'),
  tuckLabel: 'Tuck under chapel:',
  bankPrompt: 'Bank (once per game): you may deposit any number of hand cards, 1 VP each at the end. ',
  assignLabel: 'Clicking a hand card:',
  assignDiscard: 'discards it',
  assignBank: 'puts it in the bank',
  customsPrice: (n: number) => `customs office ${n}`,
  officePrompt: (sel: number) => `Office building: select up to 2 hand cards to swap for new ones (${sel}/2), or skip.`,
  officeSwap: 'Swap',
  skip: 'Skip',
  none: '— none —',
  buildPick: 'Click a card in your hand to build it.',
  buildPay: (card: string, cost: number, paid: number) => `Building ${card}: costs ${s(cost, 'card')}. Select payment cards (${paid}/${cost}).`,
  blackMarketHint: ' Black market: click buildings with goods to pay with them.',
  costBreakdown: (printed: number, discounts: string[], cost: number) => `Price ${printed} − ${discounts.join(' − ')} = ${cost}.`,
  discountPrivilege: (n: number) => `${n} builder privilege`,
  discountBuilding: (n: number, card: string) => `${n} ${card}`,
  discountCrane: (n: number) => `${n} replaced building`,
  noPrivilege: (who: string) => `Only ${who} chose the Builder, so only they pay 1 card less.`,
  craneLabel: 'Crane — build over:',
  craneNone: '— nothing (new building) —',
  producePrompt: (max: number, sel: number) => `Select up to ${s(max, 'empty production building')} to produce on (${sel}/${max}).`,
  sellPrompt: (max: number, sel: number) => `Select up to ${s(max, 'good')} to sell (${sel}/${max}).`,
  councilPrompt: (drawn: number, need: number, archive: boolean) =>
    `You drew ${s(drawn, 'card')}. Select ${s(need, 'card')} to discard${archive ? ' (archive: from drawn cards or your hand)' : ''}.`,
  tradeTile: 'Trading house tile',
  placement: {
    needCrane: 'You need a crane to build over a building.',
    noSuchBuilding: 'No such building to replace.',
    maxBuildings: 'You already have 12 buildings.',
    violetUnique: 'You already own this violet building; violet buildings are unique.',
  } satisfies Record<PlacementError, string>,
  tags: { build: 'build', pay: 'pay', discard: 'discard', chapel: 'chapel', bank: 'bank', swap: 'swap', produce: 'produce', sell: 'sell' },
  good: 'good',

  gameLog: 'Game log',
  youWin: '🏆 You win!',
  winner: (names: string) => `Winner: ${names}`,
  scoreCols: ['Player', 'Buildings', 'Stored cards', 'Bonus', 'Palace', 'Total', 'Tie-break'],
  storedTitle: 'Cards under the chapel, in the bank and under the harbor',
  tiebreakTitle: 'Cards in hand + goods',

  // Card details
  close: 'Close',
  cost: 'Cost',
  vp: 'Victory points',
  vpVariable: 'Variable (end of game)',
  copies: 'Copies in deck',
  kind: { production: 'Production building', violet: 'Violet building', monument: 'Monument' },
  produces: 'Produces',

  goods: { indigo: 'indigo', sugar: 'sugar', tobacco: 'tobacco', coffee: 'coffee', silver: 'silver', customs: 'customs good' } satisfies Record<SoldGood, string>,
  roles: {
    builder: { name: 'Builder', action: 'Everyone may build 1 building.', privilege: 'Pays 1 card less.' },
    producer: { name: 'Producer', action: 'Everyone may produce 1 good.', privilege: 'Produces 1 extra good.' },
    trader: { name: 'Trader', action: 'Everyone may sell 1 good.', privilege: 'Sells 1 extra good.' },
    councillor: { name: 'Councillor', action: 'Everyone draws 2 cards and keeps 1.', privilege: 'Draws 5 cards instead of 2.' },
    prospector: { name: 'Prospector', action: 'No action for the other players.', privilege: 'Draws 1 card.' },
  } satisfies Record<RoleId, { name: string; action: string; privilege: string }>,

  cards: {
    indigo_plant: ['Indigo plant', 'Produces indigo.'],
    sugar_mill: ['Sugar mill', 'Produces sugar.'],
    tobacco_storage: ['Tobacco storage', 'Produces tobacco.'],
    coffee_roaster: ['Coffee roaster', 'Produces coffee.'],
    silver_smelter: ['Silver smelter', 'Produces silver.'],
    smithy: ['Smithy', 'Builder: production buildings cost 1 card less.'],
    gold_mine: ['Gold mine', 'Prospector: turn up 4 cards; if their costs all differ, you keep the cheapest one and the rest are discarded.'],
    archive: ['Archive', 'Councillor: you may discard from your whole hand, not only the drawn cards.'],
    poor_house: ['Poor house', 'Builder: after building, if you have 0 or 1 cards in hand, draw 1 card.'],
    black_market: ['Black market', 'Builder: you may pay with up to 2 goods (1 card each).'],
    trading_post: ['Trading house', 'Trader: you may sell 1 additional good.'],
    well: ['Well', 'Producer: if you produce 2 or more goods, draw 1 card.'],
    market_stand: ['Market stand', 'Trader: if you sell 2 or more goods, draw 1 card.'],
    crane: ['Crane', 'Builder: you may build over one of your buildings, paying only the difference.'],
    chapel: ['Chapel', 'Governor: you may tuck 1 hand card under the chapel; 1 VP each at game end.'],
    tower: ['Tower', 'Governor: your hand limit is 12 instead of 7.'],
    aqueduct: ['Aqueduct', 'Producer: you may produce 1 additional good.'],
    carpenter: ['Carpenter', 'Builder: after building a violet building, draw 1 card.'],
    prefecture: ['Prefecture', 'Councillor: keep 1 additional card.'],
    market_hall: ['Market hall', 'Trader: when you sell at least 1 good, draw 1 additional card.'],
    quarry: ['Quarry', 'Builder: violet buildings cost 1 card less.'],
    library: ['Library', 'Doubles the privilege of the role you choose. (2 players: the governor may use it only once per round.)'],
    statue: ['Statue', 'Monument: victory points only.'],
    victory_column: ['Victory column', 'Monument: victory points only.'],
    hero: ['Hero', 'Monument: victory points only.'],
    guild_hall: ['Guild hall', 'Game end: 1 VP per production building, plus 1 VP for each different kind of production building you own.'],
    city_hall: ['City hall', 'Game end: 1 VP per violet building (including this one).'],
    triumphal_arch: ['Triumphal arch', 'Game end: 4 / 6 / 8 VP for 1 / 2 / 3 monuments.'],
    palace: ['Palace', 'Game end: +1 VP per 4 VP you have (rounded down).'],
    guard_room: ['Guard room', 'Start of round: while you own this, every player without a guard room may keep only 6 cards (tower owners still keep 12).'],
    office_building: ['Office building', 'Start of round: you may get rid of 1 or 2 hand cards and draw the same number of new ones.'],
    hut: ['Hut', 'Trader: if the whole phase passes without anyone selling a good, draw 1 card.'],
    tavern: ['Tavern', 'Builder: when the phase ends, draw 1 card if nobody has fewer buildings than you.'],
    bank: ['Bank', 'Once per game, at the start of a round: stash as many hand cards as you like in the bank; each is worth 1 VP at the end.'],
    customs_office: ['Customs office', 'Councillor: an empty customs office receives 1 good. Trader: selling that good always earns 2 cards.'],
    park: ['Park', 'Builder: rebuilding over the park with a crane makes the new building 6 cards cheaper (never below 0).'],
    harbor: ['Harbor', 'Trader: one of the goods you sell is kept face down under the harbor and scores 1 VP at the end.'],
    goldsmith: ['Goldsmith', 'Prospector: turn up 1 card; take it if no player has that building in play yet, otherwise discard it.'],
    residence: ['Residence', 'Game end: every 3 different buildings sharing a cost form a set; 1 / 2 / 3 / 4+ sets give 4 / 7 / 9 / 10 VP.'],
    cathedral: ['Cathedral', 'Game end: 4 / 7 / 9 / 10 VP when your opponents own 1 / 2 / 3 / 4+ cost-6 buildings between them.'],
  } satisfies Record<BuildingType, [string, string]>,

  log: (e: LogEvent, t: { card: (b: BuildingType) => string; good: (g: SoldGood) => string; who: (p: string) => string; role: (r: RoleId) => string }): string => {
    const list = (xs: string[]) => xs.join(', ')
    switch (e.key) {
      case 'roundStart': return `New round — governor: ${t.who(e.governor)}.`
      case 'cannotBuild': return 'cannot build anything.'
      case 'noEmptyProduction': return 'has no empty production building.'
      case 'noGoods': return 'has no goods to sell.'
      case 'chapelTuck': return 'tucks a card under the chapel.'
      case 'pass': return 'passes.'
      case 'poorHouseDraw': return 'draws 1 card (poor house).'
      case 'carpenterDraw': return 'draws 1 card (carpenter).'
      case 'wellDraw': return 'draws 1 card (well).'
      case 'tavernDraw': return 'draws 1 card (tavern).'
      case 'hutDraw': return 'draws 1 card (hut).'
      case 'customsGood': return 'places a good on the customs office.'
      case 'harborStore': return 'keeps a sold good under the harbor.'
      case 'bankDeposit': return `deposits ${s(e.n, 'card')} in the bank.`
      case 'officeSwap': return `swaps ${s(e.n, 'card')} (office building).`
      case 'goldsmithKeep': return `turns up a ${t.card(e.card)} with the goldsmith and keeps it.`
      case 'goldsmithMiss': return `turns up a ${t.card(e.card)} with the goldsmith, but it is already built.`
      case 'councilKeptAll': return `drew and kept ${s(e.n, 'card')}.`
      case 'prospect': return `prospects and draws ${s(e.n, 'card')}.`
      case 'handLimitDiscard': return `discards ${s(e.n, 'card')} down to the hand limit.`
      case 'councilKeep': return `keeps ${s(e.n, 'card')} as councillor.`
      case 'goldStrike': return `strikes gold (${list(e.cards.map(t.card))}) and keeps the cheapest: ${t.card(e.card)}.`
      case 'goldMiss': return `finds no gold (${list(e.cards.map(t.card)) || 'no cards'}).`
      case 'chooseRole': return `chooses the ${t.role(e.role)}.`
      case 'build': return e.over
        ? `builds a ${t.card(e.card)} over the ${t.card(e.over)} for ${s(e.n, 'card')}.`
        : `builds a ${t.card(e.card)} for ${s(e.n, 'card')}.`
      case 'produce': return e.goods.length ? `produces ${list(e.goods.map(t.good))}.` : 'produces nothing (no cards left).'
      case 'sell': return `sells ${list(e.goods.map(t.good))} for ${s(e.n, 'card')}.`
      case 'gameOver': return `Game over! Winner: ${e.winners.map(t.who).join(' & ')} with ${e.vp} VP.`
    }
  },
}

export type Messages = typeof en

const zhTW: Messages = {
  appTitle: '聖胡安 · P2P',
  language: '語言',
  leave: '離開',
  footer: '純點對點 WebRTC 連線：遊戲狀態由主持人的瀏覽器負責裁決，PeerJS 伺服器只用來讓兩個瀏覽器互相找到對方。',

  hostTitle: '建立遊戲',
  hostHint: '在這個瀏覽器開一個房間，把代碼分享給對手。',
  expansionOption: '加入「新建築」擴充',
  profileTitle: '你的顏色與圖示',
  profileHint: '其他玩家會用這個顏色看到你。如果顏色已經被別人選走，會先給你一個沒人用的顏色，遊戲中點自己的圖示可以再換。',
  changeProfile: '更換顏色或圖示',
  colorLabel: '顏色',
  iconLabel: '圖示',
  colorTaken: (color) => `${color}（已被選走）`,
  colorNames: { teal: '青綠', crimson: '緋紅', amber: '琥珀橘', green: '橄欖綠', blue: '海藍', purple: '紫', pink: '玫瑰粉', brown: '棕' },
  iconNames: { anchor: '船錨', ship: '帆船', sun: '太陽', olive: '橄欖枝', compass: '羅盤', key: '鑰匙', crown: '王冠', fish: '魚' },
  hostButton: '建立遊戲',
  joinTitle: '加入遊戲',
  joinPlaceholder: '房間代碼，例如 K7PX2M',
  joinButton: '加入遊戲',
  roomToken: '房間代碼',
  shareHint: '請朋友在「加入遊戲」輸入這組代碼，或把連結傳給對方。空位也可以放電腦玩家。',
  seatsTitle: '座位',
  seatEmpty: '空位',
  botName: (seat) => `電腦 ${seat}`,
  hostLabel: '主持人',
  addBot: '加入電腦玩家',
  removeBot: '移除',
  startGame: (n) => `開始遊戲（${n} 人）`,
  needTwoPlayers: '至少需要 2 位玩家才能開始。',
  waitingForHost: '等待主持人開始遊戲…',
  gameStartedError: '這局遊戲已經開始，無法再加入。',
  roomFullError: '房間已經滿了。',
  copyLink: '複製連結',
  lookingForHost: (token) => `正在尋找房間 ${token} 的主持人…（會自動重試）`,
  tokenInUse: '這組房間代碼已被使用，請重新建立遊戲。',
  p2pError: (type, message) => `P2P 錯誤${type ? `（${type}）` : ''}：${message}`,

  status: { connecting: '連線中', waiting: '等待玩家', connected: '已連線', error: '錯誤' },
  asRole: (host, token) => `身分：${host ? '主持人' : '加入者'} · 房間 ${token}`,
  players: '玩家',
  noPlayerData: '尚無玩家資料…',
  playerLabel: (id) => `玩家 ${id}`,
  hostTag: '（主持人）',
  guestTag: '（加入者）',
  you: '你',
  online: '在線',
  offline: '離線',

  who: (p, me) => (me ? '你' : `玩家 ${p}`),
  round: (n) => `第 ${n} 回合`,
  governor: '總督',
  governorIs: (who) => `總督：${who}`,
  governorTag: '總督',
  stepGameOver: '遊戲結束',
  stepGovernor: '回合開始：辦公大樓、教堂、銀行與手牌上限',
  stepChooseRole: (who) => zj(who, '選擇角色'),
  stepRole: (role, who) => `${role}階段（由${zj(who, '選擇')}）`,
  deckDiscard: (deck, discard) => `牌堆 ${deck} · 棄牌堆 ${discard}`,
  waitingFor: (who) => `等待${who}…`,
  yourMove: '輪到你了！',
  cardHint: '提示：在任何卡牌上按滑鼠右鍵（手機長按）可查看卡牌說明。',
  galleryTitle: '卡牌圖鑑',
  galleryLarge: '大卡片',
  galleryRoles: '職業',

  roleSummary: (action, privilege) => `行動：${action}特權：${privilege}`,
  chooseRolePrompt: '點選一個角色查看說明，再按確認。',
  confirmRole: (role) => `確認選擇${role}`,
  cancel: '取消',

  inHand: (n) => `手牌 ${n} 張`,
  underChapel: (n) => `教堂下 ${n} 張`,
  stored: (chapel, bank, harbor) =>
    [chapel && `教堂下 ${chapel} 張`, bank && `銀行 ${bank} 張`, harbor && `港口下 ${harbor} 張`].filter(Boolean).join(' · '),
  buildingsCount: (n) => `建築 ${n} 棟`,
  youPlayer: (id) => `你（玩家 ${id}）`,
  buildingsTitle: (n) => `建築（${n}/12）`,
  handTitle: (n) => `手牌（${n}）`,
  noCards: '沒有手牌',

  confirm: '確認',
  build: '建造',
  pass: '跳過',
  produce: '生產',
  sell: '販賣',
  chapelPrompt: '你可以把 1 張手牌壓在教堂下（終局 1 分）。',
  discardPrompt: (n) => (n > 0 ? `請選擇 ${n} 張牌棄掉，讓手牌符合上限。` : '不需要棄牌。'),
  tuckLabel: '壓在教堂下：',
  bankPrompt: '銀行（整場限一次）：可以把任意張手牌存進銀行，終局每張 1 分。',
  assignLabel: '點手牌時：',
  assignDiscard: '棄掉',
  assignBank: '存進銀行',
  customsPrice: (n) => `海關 ${n}`,
  officePrompt: (sel) => `辦公大樓：最多選 2 張手牌換成新牌（${sel}/2），也可以跳過。`,
  officeSwap: '換牌',
  skip: '跳過',
  none: '— 不蓋 —',
  buildPick: '點選一張手牌來建造。',
  buildPay: (card, cost, paid) => `建造${card}：需要 ${cost} 張牌，請選擇付款的手牌（${paid}/${cost}）。`,
  blackMarketHint: '黑市：可點選有貨物的建築，用貨物付款。',
  costBreakdown: (printed, discounts, cost) => `原價 ${printed} − ${discounts.join(' − ')} = ${cost}。`,
  discountPrivilege: (n) => `建築師特權 ${n}`,
  discountBuilding: (n, card) => `${card} ${n}`,
  discountCrane: (n) => `被覆蓋的建築 ${n}`,
  noPrivilege: (who) => `只有選擇建築師的${who} 能少付 1 張，其他玩家照原價付。`,
  craneLabel: '起重機 — 蓋在：',
  craneNone: '— 不覆蓋（新建築）—',
  producePrompt: (max, sel) => `最多選擇 ${max} 棟空的生產建築來生產（${sel}/${max}）。`,
  sellPrompt: (max, sel) => `最多選擇 ${max} 個貨物來販賣（${sel}/${max}）。`,
  councilPrompt: (drawn, need, archive) => `你抽了 ${drawn} 張牌，請選擇 ${need} 張棄掉${archive ? '（檔案室：可從新抽的牌或手牌中選）' : ''}。`,
  tradeTile: '交易所價格板',
  placement: {
    needCrane: '需要起重機才能蓋在舊建築上。',
    noSuchBuilding: '找不到要覆蓋的建築。',
    maxBuildings: '你已經有 12 棟建築。',
    violetUnique: '你已經有這棟紫色建築了；每種紫色建築只能有一棟。',
  },
  tags: { build: '建造', pay: '付款', discard: '棄掉', chapel: '教堂', bank: '銀行', swap: '換掉', produce: '生產', sell: '販賣' },
  good: '貨物',

  gameLog: '遊戲紀錄',
  youWin: '🏆 你贏了！',
  winner: (names) => `勝利者：${names}`,
  scoreCols: ['玩家', '建築', '存放的牌', '加分', '皇宮', '總分', '平手判定'],
  storedTitle: '教堂下、銀行裡和港口下的牌',
  tiebreakTitle: '手牌數 + 貨物數',

  close: '關閉',
  cost: '費用',
  vp: '分數',
  vpVariable: '視情況而定（遊戲結束時計算）',
  copies: '牌堆張數',
  kind: { production: '工廠建築', violet: '城市建築', monument: '紀念碑' },
  produces: '生產',

  goods: { indigo: '染料', sugar: '砂糖', tobacco: '菸草', coffee: '咖啡', silver: '銀錠', customs: '海關貨物' },
  roles: {
    builder: { name: '建築師', action: '每位玩家可以建造 1 棟建築。', privilege: '建造時少付 1 張牌。' },
    producer: { name: '製造商', action: '每位玩家可以生產 1 個貨物。', privilege: '多生產 1 個貨物。' },
    trader: { name: '貿易商', action: '每位玩家可以賣出 1 個貨物。', privilege: '多賣 1 個貨物。' },
    councillor: { name: '議員', action: '每位玩家抽 2 張牌，保留 1 張。', privilege: '改抽 5 張牌。' },
    prospector: { name: '礦工', action: '其他玩家沒有行動。', privilege: '抽 1 張牌。' },
  },

  cards: {
    indigo_plant: ['染坊', '生產階段：可以生產 1 份染料。'],
    sugar_mill: ['製糖廠', '生產階段：可以生產 1 份砂糖。'],
    tobacco_storage: ['菸草廠', '生產階段：可以生產 1 份菸草。'],
    coffee_roaster: ['咖啡烘焙廠', '生產階段：可以生產 1 份咖啡。'],
    silver_smelter: ['煉銀廠', '生產階段：可以生產 1 份銀錠。'],
    smithy: ['鐵匠鋪', '建築階段：蓋工廠建築時，費用便宜 1 張牌。'],
    gold_mine: ['金礦', '礦工階段：翻開 4 張牌；如果 4 張的費用都不一樣，最便宜的那張歸你，其餘棄掉。'],
    archive: ['檔案室', '議員階段：要棄的牌不限於新抽的牌，也可以從原本的手牌裡挑。'],
    poor_house: ['濟貧院', '建築階段：蓋好建築後手上只剩 0～1 張牌時，補抽 1 張。'],
    black_market: ['黑市', '建築階段：最多可拿 2 份貨物抵建造費，每份抵 1 張牌。'],
    trading_post: ['貿易站', '交易階段：可以多賣 1 份貨物。'],
    well: ['水井', '生產階段：一次生產 2 份以上貨物時，補抽 1 張牌。'],
    market_stand: ['攤販', '交易階段：一次賣出 2 份以上貨物時，補抽 1 張牌。'],
    crane: ['起重機', '建築階段：可以拆掉自己的一棟建築改蓋新的，只付兩者費用的差額（最少 0）。'],
    chapel: ['教堂', '回合開始：可以把 1 張手牌壓在教堂下，終局時每張算 1 分。'],
    tower: ['高塔', '回合開始：你的手牌上限變成 12 張。'],
    aqueduct: ['上水道', '生產階段：可以多生產 1 份貨物。'],
    carpenter: ['木工坊', '建築階段：每蓋好一棟城市建築，補抽 1 張牌。'],
    prefecture: ['總督府', '議員階段：抽完牌後可以多留 1 張。'],
    market_hall: ['市場', '交易階段：只要有賣出貨物，就多拿 1 張牌。'],
    quarry: ['採石場', '建築階段：蓋城市建築時，費用便宜 1 張牌。'],
    library: ['圖書館', '所有階段：你選的職業，特權效果變成兩倍。（2 人遊戲：總督每回合只能用一次。）'],
    statue: ['雕像', '紀念碑：沒有特殊能力，只提供分數。'],
    victory_column: ['勝利紀念柱', '紀念碑：沒有特殊能力，只提供分數。'],
    hero: ['英雄像', '紀念碑：沒有特殊能力，只提供分數。'],
    guild_hall: ['公會大廳', '遊戲結束：每棟工廠建築加 1 分，你擁有的工廠建築每多一種，再加 1 分。'],
    city_hall: ['市政廳', '遊戲結束：每棟城市建築（含市政廳本身）加 1 分。'],
    triumphal_arch: ['凱旋門', '遊戲結束：擁有 1／2／3 座紀念碑時，分別加 4／6／8 分。'],
    palace: ['皇宮', '遊戲結束：總分每滿 4 分，再加 1 分。'],
    guard_room: ['警衛室', '回合開始：只要你有這棟建築，沒有警衛室的其他玩家手牌最多只能留 6 張（有高塔的人仍可留 12 張）。'],
    office_building: ['辦公大樓', '回合開始：可以換牌——丟掉 1～2 張手牌，再抽回一樣多張。'],
    hut: ['茅屋', '交易階段：如果整個階段都沒有人賣出貨物，你補 1 張牌。'],
    tavern: ['酒館', '建築階段：階段結束時，若沒有人的建築比你少，你補 1 張牌。'],
    bank: ['銀行', '整場遊戲限用一次：在某回合開始時，把想要的張數手牌存進銀行，終局每張算 1 分。'],
    customs_office: ['海關', '議員階段：海關若是空的，就在上面放 1 份貨物。交易階段：賣掉這份貨物固定換 2 張牌。'],
    park: ['公園', '建築階段：用起重機把公園改建成別的建築時，新建築便宜 6 張牌（最低 0）。'],
    harbor: ['港口', '交易階段：賣出的貨物中，留 1 份面朝下收在港口下，終局算 1 分。'],
    goldsmith: ['金工坊', '礦工階段：翻開 1 張牌，若場上還沒有人蓋過這種建築就收進手牌，否則棄掉。'],
    residence: ['官邸', '遊戲結束：同費用的 3 種不同建築湊成一組；1／2／3／4 組以上分別加 4／7／9／10 分。'],
    cathedral: ['大教堂', '遊戲結束：對手們合計擁有 1／2／3／4 棟以上的 6 元建築時，你分別得到 4／7／9／10 分。'],
  },

  log: (e, t) => {
    const list = (xs: string[]) => xs.join('、')
    switch (e.key) {
      case 'roundStart': return `新回合開始，${zj(t.who(e.governor), '擔任總督。')}`
      case 'cannotBuild': return '沒有可以建造的建築。'
      case 'noEmptyProduction': return '沒有空的生產建築。'
      case 'noGoods': return '沒有貨物可賣。'
      case 'chapelTuck': return '將 1 張牌壓在教堂下。'
      case 'pass': return '跳過。'
      case 'poorHouseDraw': return '抽 1 張牌（濟貧院）。'
      case 'carpenterDraw': return '抽 1 張牌（木工坊）。'
      case 'wellDraw': return '抽 1 張牌（水井）。'
      case 'tavernDraw': return '抽 1 張牌（酒館）。'
      case 'hutDraw': return '抽 1 張牌（茅屋）。'
      case 'customsGood': return '在海關放上 1 個貨物。'
      case 'harborStore': return '把 1 個賣出的貨物收進港口。'
      case 'bankDeposit': return `把 ${e.n} 張牌存進銀行。`
      case 'officeSwap': return `用辦公大樓換了 ${e.n} 張牌。`
      case 'goldsmithKeep': return `用金工坊翻到${t.card(e.card)}，收進手牌。`
      case 'goldsmithMiss': return `用金工坊翻到${t.card(e.card)}，但已有人蓋過，棄掉。`
      case 'councilKeptAll': return `抽了 ${e.n} 張牌並全部保留。`
      case 'prospect': return `擔任礦工，抽 ${e.n} 張牌。`
      case 'handLimitDiscard': return `棄掉 ${e.n} 張牌以符合手牌上限。`
      case 'councilKeep': return `擔任議員，保留 ${e.n} 張牌。`
      case 'goldStrike': return `金礦翻出${list(e.cards.map(t.card))}，費用都不同，收下最便宜的${t.card(e.card)}。`
      case 'goldMiss': return `金礦翻出${list(e.cards.map(t.card)) || '（沒有牌）'}，費用有重複，全部棄掉。`
      case 'chooseRole': return `選擇了${t.role(e.role)}。`
      case 'build': return e.over
        ? `把${t.card(e.card)}蓋在${t.card(e.over)}上，付了 ${e.n} 張牌。`
        : `建造${t.card(e.card)}，付了 ${e.n} 張牌。`
      case 'produce': return e.goods.length ? `生產了${list(e.goods.map(t.good))}。` : '沒有生產（牌堆已空）。'
      case 'sell': return `賣出${list(e.goods.map(t.good))}，得到 ${e.n} 張牌。`
      case 'gameOver': return `遊戲結束！勝利者：${e.winners.map(t.who).join('、')}，${e.vp} 分。`
    }
  },
}

export const MESSAGES: Record<Lang, Messages> = { en, 'zh-TW': zhTW }
