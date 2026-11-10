# 島丸築城

在海島上當鎮長，和原創小生物「島丸」一起經營小鎮的 3D 城市建造遊戲。手機和電腦的瀏覽器都能玩。

**線上遊玩：** https://scu95155254.github.io/simcityyo/

## 玩法

- 蓋住宅、農田、伐木場、發電站等建築，管理金幣、木材、食物、電力與居民滿意度。
- 鎮長會自己巡視小鎮，也可以指揮他移動。
- 完成任務後通往野外島的橋會開通，可以用靈果收服島丸。
- 島丸可以派駐到建築提高產量，養成後還能進化。
- 建築可以升級到 Lv3，四棟同類建築排成 2×2 能合併成大型建築。

## 檔案結構

不需要安裝或打包，`index.html` 依序載入下面的檔案。所有 JS 檔共用同一組全域變數，所以**載入順序不能換**，新增檔案時要放在用到它的檔案前面。

```
index.html            頁面骨架與 HTML 介面元素，以及載入順序
css/style.css         所有樣式（顏色、字體、卡片版面、手機版調整）
js/
  core/
    config.js         遊戲規則與常數：建築、島丸、任務、等級、共用小工具
    game.js           遊戲狀態與模擬：經濟計算、每日更新、任務、各種動作、存檔
  render/
    materials.js      3D 基礎：材質、方塊／屋頂／窗戶等幾何小工具
    buildings.js      建築模型：各建築造型、升級與合併外觀、動態效果、道路
    art.js            模型快取，以及載入外包 GLB 模型
    scene.js          場景：燈光、海、雲、遠方小島、地形、野外島、橋
    creatures.js      六種島丸與進化型的模型
    people.js         居民與鎮長的模型
    overlays.js       游標格子、放置預覽、影響範圍、海面波動
  world/
    map.js            地圖格子、行走格子、野外島地形與石階
    sync.js           把遊戲狀態同步到 3D 場景
    agents.js         會動的角色：島丸、野生島丸、居民、無人機
    mayor.js          鎮長的巡視、尋路與事件
  input/
    camera.js         鏡頭、滑鼠觸控操作、快捷鍵
  ui/
    hud.js            上方資源列、任務卡、資訊卡、進化動畫
    tools.js          下方建築列與工具切換
    menus.js          開場選單、玩法說明、選夥伴、美術資源頁
    catch.js          收服小遊戲
  main.js             主迴圈與啟動流程（最後載入）
art/                  外包的 GLB 模型，檔名規則見美術規格書
```

### 常見修改要去哪裡找

| 想改的東西 | 檔案 |
| --- | --- |
| 建築價格、產量、說明文字 | `js/core/config.js` 的 `B` |
| 島丸的屬性與派駐效果 | `js/core/config.js` 的 `SP`、`baseFx` |
| 任務內容與獎勵 | `js/core/config.js` 的 `M` |
| 起始資源、稅收、人口成長 | `js/core/game.js` 的 `newGame`、`econ`、`tick` |
| 建築外觀 | `js/render/buildings.js` 的 `BUILD`、`UPG` |
| 島丸外觀 | `js/render/creatures.js` 的 `creature` |
| 顏色、字體、版面 | `css/style.css` 開頭的 `:root` |

## 在自己電腦上執行

直接用瀏覽器打開 `index.html` 就能玩。如果要測試匯入 GLB 模型，建議用本機伺服器開啟：

```bash
cd simcityyo
python3 -m http.server 8000
```

再打開 http://localhost:8000

3D 引擎使用 [three.js](https://threejs.org/) r128，從 CDN 載入。遊戲進度存在瀏覽器的 localStorage。
