# 卡牌美術 prompt 清單（給 ChatGPT）

美術方向：**奇幻南方海港**。陽光充足的海港小鎮、白牆紅瓦、棕櫚與柏樹、藍綠色的海，
畫風是柔和水彩上色的中世紀奇幻日式動畫背景。所有圖都是我們自己的原創描述，
不要拿官方卡圖給 ChatGPT 參考。

## 使用方式

1. 開一個新的 ChatGPT 對話，**先貼上「共用風格」那段**，之後每張圖只要貼「這張的描述」。
   同一個對話裡連續產生，風格會比較一致；風格跑掉時，再貼一次共用風格。
2. 每張圖下載後，**照表格的檔名存檔**（例如 `smithy.png`），全部放在同一個資料夾。
   想自動化的話，可以用 `scripts/generate_art.py`（見最下方「自動產生」）。
3. 交給程式處理，兩種方式擇一：
   - 把資料夾壓縮成 zip 傳給 Claude，我會處理並更新遊戲；或
   - 自己在專案根目錄放進 `art-src/` 資料夾，執行 `npm run art`，再 commit `src/assets/art/`。
4. 不必一次畫完：缺圖的卡會自動顯示目前的 CSS 版本，畫一張換一張。

處理程式會自動：把插圖裁成 4:3、縮小成 640×480、轉成 WebP；
把裝飾零件的**洋紅色背景 `#FF00FF` 變透明**並裁掉空白邊。

> 畫面上**不要有任何文字、數字或圖示**——名稱、費用、分數、效果都由程式排版，才能中英切換。

---

## 共用風格（每個對話先貼這段）

```
You are illustrating a fantasy card game. Keep ONE consistent art style for every image I ask for:

- Japanese anime background art for a gentle medieval-fantasy story: clean, thin line art with soft,
  watercolor-like coloring, pastel palette, delicate light and shadow, the texture of high-quality
  watercolor paper.
- Setting: a sunny southern harbor town in a fantasy world — whitewashed stone and stucco walls,
  terracotta tile roofs, wooden balconies, palm trees, cypresses, flowering vines, glimpses of a
  turquoise sea, clear blue sky with soft white clouds, warm late-morning sunlight.
- Color palette: soft sky blues, sea turquoises, warm sand colors and sun-bleached stone, accented by
  soft bougainvillea pinks and olive greens.
- Mood: calm, peaceful, slightly nostalgic. Clean and readable at small sizes.
- Composition for building illustrations: one main building, three-quarter view from slightly above,
  centered and LARGE — it should fill about 60% of the picture. Make its purpose obvious at a glance by
  showing its signature feature prominently. Layer the scene: a few foreground plants or flowers, the
  building in the middle ground, a simple pale background. Tiny distant townsfolk are fine, no close-up
  characters.
- Composition for character illustrations: one person, waist-up, facing the viewer at a slight angle,
  with a distinctive, recognizable face and outfit; the background shows their workplace, kept soft.
- Keep the background simple and soft: few details, slightly hazy and pale toward the edges, so the
  main building clearly stands out (the art is shown small on a card).
- Never draw any text, letters, numbers, signs with writing, logos, watermarks, borders or frames.
- Building and character illustrations are landscape 3:2 (1536×1024): keep everything important
  inside the central 4:3 area, because the left and right edges will be cropped. Other images use
  the size given in their request.

Reply only with the image.
```

---

## 建築插圖（40 張，橫式 1536×1024）

每張只要貼：`Illustration: <描述>`

### 工廠建築

| 檔名 | 卡名 | 描述（貼給 ChatGPT） |
|---|---|---|
| `indigo_plant.png` | 染坊 | A small dye works beside a clear stream, wooden vats of deep blue dye, long strips of indigo cloth drying on poles in the breeze. |
| `sugar_mill.png` | 製糖廠 | A whitewashed sugar mill with a large wooden water wheel turning in a channel, bundles of sugar cane stacked by the door. |
| `tobacco_storage.png` | 菸草廠 | A long timber drying barn with slatted walls and a thatched roof, rows of golden-brown tobacco leaves hanging inside. |
| `coffee_roaster.png` | 咖啡烘焙廠 | A cozy two-story roastery with a smoking brick chimney, burlap sacks of coffee beans and a copper roasting drum by the entrance. |
| `silver_smelter.png` | 煉銀廠 | A sturdy stone smelting house with a tall chimney and a warm glowing furnace mouth, a small cart of shining silver ingots outside. |

### 城市建築（基本遊戲）

| 檔名 | 卡名 | 描述 |
|---|---|---|
| `smithy.png` | 鐵匠鋪 | A blacksmith's forge with an open front, an anvil, a glowing hearth and tools hanging on the wall, a small water wheel beside it. |
| `gold_mine.png` | 金礦 | A mine entrance cut into a pale rocky hillside, timber supports, mine-cart rails and a few glints of gold in the rock. |
| `archive.png` | 檔案室 | A quiet two-story archive with tall arched windows, shelves of scrolls and bound ledgers visible inside, a shaded entrance. |
| `poor_house.png` | 濟貧院 | A modest, welcoming shelter house with a small vegetable garden, a bench under a tree and baskets of bread by the door. |
| `black_market.png` | 黑市 | A secretive back-alley stall under a patched canvas awning, covered crates and barrels, hanging lanterns in the shade. |
| `trading_post.png` | 貿易站 | A busy trading warehouse with wide open doors, barrels and crates being stacked by workers, a scale on a wooden table. |
| `well.png` | 水井 | A round stone well with a little tiled roof and a wooden pulley in a small sunny plaza ringed by palm trees. |
| `market_stand.png` | 攤販 | A cheerful open-air market stall with a striped awning, piles of colorful fruit and vegetables, baskets on the ground. |
| `crane.png` | 起重機 | A large wooden treadwheel crane on a construction site lifting a cut stone block, scaffolding around a half-built wall. |
| `chapel.png` | 教堂 | A small whitewashed chapel with a bell gable and a red-tiled roof, a low garden wall and flowering bushes. |
| `tower.png` | 高塔 | A slender white watchtower rising above the rooftops, with a small lookout balcony and a view of the sea behind it. |
| `aqueduct.png` | 上水道 | A long arched stone aqueduct crossing a green valley, water flowing along its top channel toward the town. |
| `carpenter.png` | 木工坊 | A carpenter's workshop with stacks of timber, sawhorses, a half-finished cart and wood shavings at the open door. |
| `prefecture.png` | 總督府 | An elegant governor's mansion with a grand front stair, red roofs, palm-lined courtyard and colorful flags on the roof. |
| `market_hall.png` | 市場 | A large covered market hall with stone arcades and a long tiled roof, shoppers moving between the arches. |
| `quarry.png` | 採石場 | An open stone quarry with terraces of pale rock, neatly cut blocks and wooden ramps. |
| `library.png` | 圖書館 | A grand three-story library with tall windows, a small dome and a shaded reading terrace. |
| `statue.png` | 雕像 | A stone statue of a robed scholar holding a staff, on a pedestal in a small garden square. |
| `victory_column.png` | 勝利紀念柱 | A tall carved victory column topped with a stone sphere, standing in a paved plaza with palms. |
| `hero.png` | 英雄像 | A bronze equestrian statue of a hero raising a sword, on a carved stone plinth in a plaza. |
| `guild_hall.png` | 公會大廳 | A stately guild hall with a wide front stair, arcaded wings and colorful craft-guild banners. |
| `city_hall.png` | 市政廳 | A handsome city hall with a clock tower and an arcaded ground floor facing a busy square. |
| `triumphal_arch.png` | 凱旋門 | A monumental stone triumphal arch with carved reliefs, framing a view of the harbor beyond. |
| `palace.png` | 皇宮 | A magnificent white palace with a central dome, colonnades and terraced gardens with fountains. |

### 城市建築（擴充「新建築」）

| 檔名 | 卡名 | 描述 |
|---|---|---|
| `office_building.png` | 辦公大樓 | A three-story merchant office building with balconies and arched doors, a horse-drawn carriage waiting outside. |
| `guard_room.png` | 警衛室 | A fortified guardhouse beside the town gate, a rack of spears, a banner on the wall and a watchful guard in the distance. |
| `hut.png` | 茅屋 | A simple thatched hut on wooden stilts among palm trees and tall grass. |
| `tavern.png` | 酒館 | A lively tavern with outdoor wooden tables under a vine pergola and a hanging sign shaped like a mug (no writing). |
| `bank.png` | 銀行 | A solid stone bank with columns, a heavy iron-bound door and small barred windows. |
| `customs_office.png` | 海關 | A harbor customs house on the quay, a large weighing scale and stacked cargo crates beside the pier. |
| `park.png` | 公園 | A formal garden park with a central fountain, trimmed hedges, cypress trees and an elegant colonnade. |
| `harbor.png` | 港口 | A harbor with several sailing ships moored at a stone quay, turquoise water and gulls overhead. |
| `goldsmith.png` | 金工坊 | A goldsmith's workshop with a small glowing furnace, fine tools on the bench and glittering jewelry in the window. |
| `residence.png` | 官邸 | A luxurious noble residence with twin towers, a red-roofed main hall and a courtyard garden. |
| `cathedral.png` | 大教堂 | A grand cathedral with twin bell towers, a great round window and a wide stair down to the plaza. |

---

## 角色插圖（6 張，橫式 1536×1024）

角色卡可以有人物。每張貼：`Character illustration (same style, one person, waist-up): <描述>`
外貌寫得越具體（年齡、髮型、鬍子、表情、服裝），辨識度越高，重畫時也比較一致。

| 檔名 | 角色 | 描述 |
|---|---|---|
| `role-builder.png` | 建築師 | A determined young man in his mid-20s with warm olive skin, messy dark brown curly hair tied loosely at the neck and bright green eyes, a light smudge of dust on his cheek, wearing a sturdy work apron and closely examining building plans in his hands; rising stone walls and wooden scaffolding behind him. |
| `role-producer.png` | 製造商 | A rugged workshop owner in his late 30s with a broad build, messy blonde hair pushed back, tanned weathered skin and a focused expression, wearing rolled-up linen sleeves and a leather tool belt, checking an inventory sheet beside neatly stacked wooden crates of finished goods. |
| `role-trader.png` | 貿易商 | A friendly, worldly merchant in his late 40s with slightly rounded cheeks, a well-groomed salt-and-pepper mustache, sharp observant eyes and an approachable smile, handing over a neatly tied wooden crate at a harbor counter; a few shining coins and a small brass scale rest on the table. |
| `role-councillor.png` | 議員 | A distinguished man in his 50s with silver-streaked dark hair combed back, a trim goatee and sharp intelligent eyes, wearing rich velvet robes and signing parchment documents with a quill at a polished wooden desk; a window shows a sunny town square. |
| `role-prospector.png` | 礦工 | A tough, weathered adventurer in his early 30s with short reddish-brown hair, a thick stubble beard and a warm rugged smile, wearing a sturdy travel jacket and a heavy backpack, a pickaxe over his shoulder, looking out over a wide sunlit valley and the sea. |
| `role-governor.png` | 總督 | An elegant, authoritative town governor in his late 40s with sharp features, neat black hair and an aristocratic posture, wearing formal embroidered attire with a decorative mantle, standing on a white stone balcony above the harbor with colorful flags fluttering in the wind. |

---

## 卡背（1 張，直式 1024×1536）

```
Card back design (same style), portrait 2:3 (1024×1536): a symmetric ornamental pattern with a compass rose
in the center, palm leaves and waves around it, warm parchment and deep teal colors, fills the whole image.
No text.
```

檔名：`card-back.png`

---

## 裝飾零件（5 張，背景一律純洋紅色）

這幾張的重點是**背景必須是完全平塗的洋紅色 `#FF00FF`**（不要漸層、不要陰影），程式會把它變透明。
顏色請用中性的金色／羊皮紙色，卡片種類的顏色由程式另外加上。

| 檔名 | 尺寸 | 貼給 ChatGPT |
|---|---|---|
| `frame.png` | 直式 1024×1536 | `An ornate card frame (same style): a decorative border about 6% of the width on all four sides, with flourished corners, carved gold and warm parchment colors, symmetric. Everything inside the border and outside it is a perfectly flat solid magenta #FF00FF. No text.` |
| `ribbon.png` | 橫式 1536×1024 | `A single horizontal parchment scroll banner for a card title, slightly curled ends, empty (no text), centered, on a perfectly flat solid magenta #FF00FF background with no shadow.` |
| `medallion.png` | 正方形 1024×1024 | `A round ornamental medallion with a carved gold ring and an empty cream-colored center for a number (no number drawn), centered, on a perfectly flat solid magenta #FF00FF background with no shadow.` |
| `vp-badge.png` | 正方形 1024×1024 | `A hexagonal badge in deep red enamel with a thin gold rim and an empty center for a number (no number drawn), centered, on a perfectly flat solid magenta #FF00FF background with no shadow.` |
| `text-panel.png` | 橫式 1536×1024 | `An empty rectangular parchment panel with softly worn edges and a faint inner border, for card rules text (no text), centered, on a perfectly flat solid magenta #FF00FF background with no shadow.` |

> 如果某個零件畫出來不好看，不放也沒關係，程式會用 CSS 畫的版本。

---

## 自動產生（選用）

`scripts/generate_art.py` 會讀這份文件，替每個檔名組好「共用風格 + 該張描述」再送出，存到 `art-src/`：

```bash
python3 scripts/generate_art.py --list                  # 列出所有檔名
python3 scripts/generate_art.py smithy --dry-run        # 只印出 prompt，不送出
python3 scripts/generate_art.py smithy --backend codex  # 交給 Codex CLI（codex exec）
python3 scripts/generate_art.py smithy --backend api    # 直接呼叫 OpenAI 圖片 API（需 OPENAI_API_KEY）
python3 scripts/generate_art.py --all --backend api     # 全部（已存在的會跳過）
npm run art                                             # 處理成遊戲用的圖
```

API key 只設定在自己電腦的環境變數，不要寫進任何檔案或 commit。
