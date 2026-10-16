import type { BuildingType, GoodType, RoleId } from '../game/cards'
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
  hostButton: 'Host Game',
  joinTitle: 'Join a game',
  joinPlaceholder: 'Room token, e.g. K7PX2M',
  joinButton: 'Join Game',
  roomToken: 'Room token',
  shareHint: 'Ask your opponent to enter this token under “Join Game”, or send them the link:',
  copyLink: 'Copy link',
  lookingForHost: (token: string) => `Looking for host of room ${token}… (retrying automatically)`,
  tokenInUse: 'That room token is already in use. Please host a new game.',
  p2pError: (type: string, message: string) => `P2P error${type ? ` (${type})` : ''}: ${message}`,

  // Connection status
  status: { connecting: 'Connecting', waiting: 'Waiting for opponent', connected: 'Connected', error: 'Error' },
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
  governorIs: (who: string) => `Governor: ${who}`,
  governorTag: 'governor',
  stepGameOver: 'Game over',
  stepGovernor: 'Governor phase: chapel and hand limit',
  stepChooseRole: (who: string, me: boolean) => `${who} ${me ? 'choose' : 'chooses'} a role`,
  stepRole: (role: string, who: string) => `${role} phase (chosen by ${who})`,
  deckDiscard: (deck: number, discard: number) => `Deck ${deck} · Discard ${discard}`,
  waitingFor: (who: string) => `Waiting for ${who}…`,
  yourMove: 'Your move!',
  cardHint: 'Tip: right-click (or long-press) any card to see what it does.',

  roleSummary: (action: string, privilege: string) => `Action: ${action} Privilege: ${privilege}`,
  chooseRolePrompt: 'Click a role to see it, then confirm.',
  confirmRole: (role: string) => `Choose ${role}`,
  cancel: 'Cancel',

  inHand: (n: number) => `${s(n, 'card')} in hand`,
  underChapel: (n: number) => `${n} under chapel`,
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
  none: '— none —',
  buildPick: 'Click a card in your hand to build it.',
  buildPay: (card: string, cost: number, paid: number) => `Building ${card}: costs ${s(cost, 'card')}. Select payment cards (${paid}/${cost}).`,
  blackMarketHint: ' Black market: click buildings with goods to pay with them.',
  craneLabel: 'Crane — build over:',
  craneNone: '— nothing (new building) —',
  producePrompt: (max: number, sel: number) => `Select up to ${s(max, 'empty production building')} to produce on (${sel}/${max}).`,
  sellPrompt: (max: number, sel: number) => `Select up to ${s(max, 'good')} to sell (${sel}/${max}).`,
  councilPrompt: (drawn: number, need: number, archive: boolean) =>
    `You drew ${s(drawn, 'card')}. Select ${s(need, 'card')} to discard${archive ? ' (archive: from drawn cards or your hand)' : ''}.`,
  goldMinePick: 'Gold mine: all four costs differ — take one card.',
  goldMineReveal: (who: string) => `${who}'s gold mine reveals:`,
  tradeTile: 'Trading house tile',
  placement: {
    needCrane: 'You need a crane to build over a building.',
    noSuchBuilding: 'No such building to replace.',
    maxBuildings: 'You already have 12 buildings.',
    violetUnique: 'You already own this violet building; violet buildings are unique.',
  } satisfies Record<PlacementError, string>,
  tags: { build: 'build', pay: 'pay', discard: 'discard', chapel: 'chapel', produce: 'produce', sell: 'sell' },
  good: 'good',

  gameLog: 'Game log',
  youWin: '🏆 You win!',
  winner: (names: string) => `Winner: ${names}`,
  scoreCols: ['Player', 'Buildings', 'Chapel', 'Bonus', 'Palace', 'Total', 'Tie-break'],
  tiebreakTitle: 'Cards in hand + goods',

  // Card details
  close: 'Close',
  cost: 'Cost',
  vp: 'Victory points',
  vpVariable: 'Variable (end of game)',
  copies: 'Copies in deck',
  kind: { production: 'Production building', violet: 'Violet building', monument: 'Monument' },
  produces: 'Produces',

  goods: { indigo: 'indigo', sugar: 'sugar', tobacco: 'tobacco', coffee: 'coffee', silver: 'silver' } satisfies Record<GoodType, string>,
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
    gold_mine: ['Gold mine', 'Prospector: reveal 4 cards; if all have different costs, take 1 into your hand.'],
    archive: ['Archive', 'Councillor: you may discard from your whole hand, not only the drawn cards.'],
    poor_house: ['Poor house', 'Builder: after building, if you have 0 or 1 cards in hand, draw 1 card.'],
    black_market: ['Black market', 'Builder: you may pay with up to 2 goods (1 card each).'],
    trading_post: ['Trading post', 'Trader: you may sell 1 additional good.'],
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
    guild_hall: ['Guild hall', 'Game end: 2 VP per production building.'],
    city_hall: ['City hall', 'Game end: 1 VP per violet building (including this one).'],
    triumphal_arch: ['Triumphal arch', 'Game end: 4 / 6 / 8 VP for 1 / 2 / 3 monuments.'],
    palace: ['Palace', 'Game end: +1 VP per 4 VP you have (rounded down).'],
  } satisfies Record<BuildingType, [string, string]>,

  log: (e: LogEvent, t: { card: (b: BuildingType) => string; good: (g: GoodType) => string; who: (p: string) => string; role: (r: RoleId) => string }): string => {
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
      case 'councilKeptAll': return `drew and kept ${s(e.n, 'card')}.`
      case 'prospect': return `prospects and draws ${s(e.n, 'card')}.`
      case 'handLimitDiscard': return `discards ${s(e.n, 'card')} down to the hand limit.`
      case 'councilKeep': return `keeps ${s(e.n, 'card')} as councillor.`
      case 'goldStrike': return `strikes gold: ${list(e.cards.map(t.card))}.`
      case 'goldMiss': return `finds no gold (${list(e.cards.map(t.card)) || 'no cards'}).`
      case 'goldTake': return `takes the ${t.card(e.card)} from the gold mine.`
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
  hostButton: '建立遊戲',
  joinTitle: '加入遊戲',
  joinPlaceholder: '房間代碼，例如 K7PX2M',
  joinButton: '加入遊戲',
  roomToken: '房間代碼',
  shareHint: '請對手在「加入遊戲」輸入這組代碼，或把連結傳給對方：',
  copyLink: '複製連結',
  lookingForHost: (token) => `正在尋找房間 ${token} 的主持人…（會自動重試）`,
  tokenInUse: '這組房間代碼已被使用，請重新建立遊戲。',
  p2pError: (type, message) => `P2P 錯誤${type ? `（${type}）` : ''}：${message}`,

  status: { connecting: '連線中', waiting: '等待對手', connected: '已連線', error: '錯誤' },
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
  governorIs: (who) => `總督：${who}`,
  governorTag: '總督',
  stepGameOver: '遊戲結束',
  stepGovernor: '總督階段：禮拜堂與手牌上限',
  stepChooseRole: (who) => zj(who, '選擇角色'),
  stepRole: (role, who) => `${role}階段（由${zj(who, '選擇')}）`,
  deckDiscard: (deck, discard) => `牌堆 ${deck} · 棄牌堆 ${discard}`,
  waitingFor: (who) => `等待${who}…`,
  yourMove: '輪到你了！',
  cardHint: '提示：在任何卡牌上按滑鼠右鍵（手機長按）可查看卡牌說明。',

  roleSummary: (action, privilege) => `行動：${action}特權：${privilege}`,
  chooseRolePrompt: '點選一個角色查看說明，再按確認。',
  confirmRole: (role) => `確認選擇${role}`,
  cancel: '取消',

  inHand: (n) => `手牌 ${n} 張`,
  underChapel: (n) => `禮拜堂下 ${n} 張`,
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
  chapelPrompt: '你可以將 1 張手牌蓋在禮拜堂下（遊戲結束時 1 分）。',
  discardPrompt: (n) => (n > 0 ? `請選擇 ${n} 張牌棄掉，讓手牌符合上限。` : '不需要棄牌。'),
  tuckLabel: '蓋在禮拜堂下：',
  none: '— 不蓋 —',
  buildPick: '點選一張手牌來建造。',
  buildPay: (card, cost, paid) => `建造${card}：需要 ${cost} 張牌，請選擇付款的手牌（${paid}/${cost}）。`,
  blackMarketHint: '黑市：可點選有貨物的建築，用貨物付款。',
  craneLabel: '起重機 — 蓋在：',
  craneNone: '— 不覆蓋（新建築）—',
  producePrompt: (max, sel) => `最多選擇 ${max} 棟空的生產建築來生產（${sel}/${max}）。`,
  sellPrompt: (max, sel) => `最多選擇 ${max} 個貨物來販賣（${sel}/${max}）。`,
  councilPrompt: (drawn, need, archive) => `你抽了 ${drawn} 張牌，請選擇 ${need} 張棄掉${archive ? '（檔案館：可從新抽的牌或手牌中選）' : ''}。`,
  goldMinePick: '金礦：四張牌的費用都不同，選一張加入手牌。',
  goldMineReveal: (who) => zj(who, '的金礦翻出：'),
  tradeTile: '交易所價格板',
  placement: {
    needCrane: '需要起重機才能蓋在舊建築上。',
    noSuchBuilding: '找不到要覆蓋的建築。',
    maxBuildings: '你已經有 12 棟建築。',
    violetUnique: '你已經有這棟紫色建築了；每種紫色建築只能有一棟。',
  },
  tags: { build: '建造', pay: '付款', discard: '棄掉', chapel: '禮拜堂', produce: '生產', sell: '販賣' },
  good: '貨物',

  gameLog: '遊戲紀錄',
  youWin: '🏆 你贏了！',
  winner: (names) => `勝利者：${names}`,
  scoreCols: ['玩家', '建築', '禮拜堂', '加分', '宮殿', '總分', '平手判定'],
  tiebreakTitle: '手牌數 + 貨物數',

  close: '關閉',
  cost: '費用',
  vp: '分數',
  vpVariable: '視情況而定（遊戲結束時計算）',
  copies: '牌堆張數',
  kind: { production: '生產建築', violet: '紫色建築', monument: '紀念碑' },
  produces: '生產',

  goods: { indigo: '染料', sugar: '糖', tobacco: '菸草', coffee: '咖啡', silver: '銀' },
  roles: {
    builder: { name: '建築師', action: '每位玩家可以建造 1 棟建築。', privilege: '建造時少付 1 張牌。' },
    producer: { name: '生產者', action: '每位玩家可以生產 1 個貨物。', privilege: '多生產 1 個貨物。' },
    trader: { name: '商人', action: '每位玩家可以賣出 1 個貨物。', privilege: '多賣 1 個貨物。' },
    councillor: { name: '議員', action: '每位玩家抽 2 張牌，保留 1 張。', privilege: '改抽 5 張牌。' },
    prospector: { name: '淘金者', action: '其他玩家沒有行動。', privilege: '抽 1 張牌。' },
  },

  cards: {
    indigo_plant: ['染料廠', '生產染料。'],
    sugar_mill: ['製糖廠', '生產糖。'],
    tobacco_storage: ['菸草廠', '生產菸草。'],
    coffee_roaster: ['咖啡烘焙廠', '生產咖啡。'],
    silver_smelter: ['煉銀廠', '生產銀。'],
    smithy: ['鐵匠鋪', '建築階段：蓋生產建築少付 1 張牌。'],
    gold_mine: ['金礦', '淘金階段：翻開 4 張牌，若費用全部不同，選 1 張加入手牌。'],
    archive: ['檔案館', '議員階段：可以從整副手牌（包含新抽的牌）中棄牌，不只限於新抽的牌。'],
    poor_house: ['救濟院', '建築階段：蓋完建築後，若手牌只剩 0 或 1 張，抽 1 張牌。'],
    black_market: ['黑市', '建築階段：可用最多 2 個貨物付款（每個抵 1 張牌）。'],
    trading_post: ['交易站', '商人階段：可以多賣 1 個貨物。'],
    well: ['水井', '生產階段：若生產 2 個以上貨物，抽 1 張牌。'],
    market_stand: ['攤販', '商人階段：若賣出 2 個以上貨物，抽 1 張牌。'],
    crane: ['起重機', '建築階段：可以把新建築蓋在自己的舊建築上，只需支付差額。'],
    chapel: ['禮拜堂', '總督階段：可將 1 張手牌蓋在禮拜堂下，遊戲結束時每張 1 分。'],
    tower: ['塔樓', '總督階段：手牌上限從 7 張提高為 12 張。'],
    aqueduct: ['水道橋', '生產階段：可以多生產 1 個貨物。'],
    carpenter: ['木工場', '建築階段：蓋完紫色建築後，抽 1 張牌。'],
    prefecture: ['省政府', '議員階段：多保留 1 張牌。'],
    market_hall: ['市場', '商人階段：至少賣出 1 個貨物時，多抽 1 張牌。'],
    quarry: ['採石場', '建築階段：蓋紫色建築少付 1 張牌。'],
    library: ['圖書館', '你選擇的角色特權加倍。（2 人遊戲：總督每回合只能使用一次。）'],
    statue: ['雕像', '紀念碑：只提供分數。'],
    victory_column: ['勝利紀念柱', '紀念碑：只提供分數。'],
    hero: ['英雄像', '紀念碑：只提供分數。'],
    guild_hall: ['同業公會', '遊戲結束：每棟生產建築得 2 分。'],
    city_hall: ['市政廳', '遊戲結束：每棟紫色建築得 1 分（包含本建築）。'],
    triumphal_arch: ['凱旋門', '遊戲結束：擁有 1／2／3 座紀念碑時，得 4／6／8 分。'],
    palace: ['宮殿', '遊戲結束：總分每 4 分額外加 1 分（無條件捨去）。'],
  },

  log: (e, t) => {
    const list = (xs: string[]) => xs.join('、')
    switch (e.key) {
      case 'roundStart': return `新回合開始，${zj(t.who(e.governor), '擔任總督。')}`
      case 'cannotBuild': return '沒有可以建造的建築。'
      case 'noEmptyProduction': return '沒有空的生產建築。'
      case 'noGoods': return '沒有貨物可賣。'
      case 'chapelTuck': return '將 1 張牌蓋在禮拜堂下。'
      case 'pass': return '跳過。'
      case 'poorHouseDraw': return '抽 1 張牌（救濟院）。'
      case 'carpenterDraw': return '抽 1 張牌（木工場）。'
      case 'wellDraw': return '抽 1 張牌（水井）。'
      case 'councilKeptAll': return `抽了 ${e.n} 張牌並全部保留。`
      case 'prospect': return `淘金，抽 ${e.n} 張牌。`
      case 'handLimitDiscard': return `棄掉 ${e.n} 張牌以符合手牌上限。`
      case 'councilKeep': return `擔任議員，保留 ${e.n} 張牌。`
      case 'goldStrike': return `挖到金礦：${list(e.cards.map(t.card))}。`
      case 'goldMiss': return `沒挖到金礦（${list(e.cards.map(t.card)) || '沒有牌'}）。`
      case 'goldTake': return `從金礦拿走${t.card(e.card)}。`
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
