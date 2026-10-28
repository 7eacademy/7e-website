# 7E 商學院官網｜上架與後台使用教學

這個資料夾就是整個官網。網站本身放在 **GitHub**（存檔案），由 **Cloudflare Pages** 免費對外發布，
內容用 **Pages CMS** 網頁後台編輯，官網表單的資料存進 **Google 試算表**。

```
你在後台改內容 → 存到 GitHub → Cloudflare 自動重新產生網站（約 1–2 分鐘）→ 網站更新
```

> 為什麼不用 GitHub Pages？GitHub 規定 Pages 不能用來經營線上生意或以商業交易為主的網站，
> 7E 有課程收費與報名，所以改用可以商用、同樣免費的 Cloudflare Pages。

---

## 第 1 步：把網站檔案放上 GitHub

1. 登入 GitHub（帳號 7eacademy），右上角「＋」→ **New repository**。
2. Repository name 填 `7e-website`，選 **Private**（私人），按 **Create repository**。
3. 在新倉庫頁面點 **uploading an existing file**。
4. 把這個資料夾裡的**所有檔案和資料夾**拖進去（一次最多 100 個檔案，本資料夾約 100 個）→ 按 **Commit changes**。

> ⚠️ Mac 的 Finder 預設會隱藏「.」開頭的檔案。上傳後請確認倉庫裡有 `.pages.yml`（後台設定）。
> 如果沒有：在 GitHub 倉庫頁按 **Add file → Create new file**，檔名打 `.pages.yml`，
> 把資料夾裡 `pages-config.txt` 的內容整份貼上，按 **Commit changes**。

## 第 2 步：用 Cloudflare Pages 發布網站

1. 到 https://dash.cloudflare.com 註冊／登入（免費方案即可）。
2. 左側 **Workers & Pages** → **Create** → 選 **Pages** → **Connect to Git**。
3. 授權 GitHub，選 `7e-website` 倉庫 → **Begin setup**。
4. 設定：
   - Production branch：`main`
   - Framework preset：`None`
   - Build command：`npm run build`
   - Build output directory：`dist`
5. 按 **Save and Deploy**。完成後會得到網址，例如 `https://7e-website.pages.dev`。
6. 要用自己的網域：專案頁 → **Custom domains** → **Set up a custom domain**，照畫面設定 DNS。
7. 網址確定後，到後台「網站設定 → 網站正式網址」填上（Google 搜尋網站地圖會用到）。

之後每次在後台存檔，Cloudflare 都會自動更新網站。免費方案每月 500 次更新，日常使用綽綽有餘。

## 第 3 步：開通網頁後台（Pages CMS）

1. 到 https://app.pagescms.org ，用 GitHub 帳號登入。
2. 依畫面指示安裝 Pages CMS 的 GitHub App，選擇 `7e-website` 倉庫。
3. 打開倉庫，左側就會出現後台選單：

| 後台選單 | 可以做的事 | 網站上出現的位置 |
|---|---|---|
| 最新文章 | 新增／修改／刪除文章、上傳封面、寫內文、設編輯精選、取消發布 | 首頁「最新文章」、文章頁、每篇文章內頁 |
| 最新消息（IG 貼文） | 上傳貼文圖、介紹文字、IG 貼文網址 | 首頁最新 4 則、最新消息頁 |
| 商業教育｜課程與檢測 | 課程名稱、說明、價格、按鈕文字、報名連結、圖片、排序、上下架 | 商業教育課程頁 |
| 企業內訓｜五獸方案與價格 | 方案名稱、價格、說明條列、按鈕連結 | 企業內訓頁 |
| 顧問團隊 | 姓名、職稱、照片、專長標籤、介紹、案例、排序 | 首頁顧問卡、顧問團隊頁 |
| 協力夥伴 | 夥伴名稱、Logo | 首頁協力夥伴 |
| 網站設定 | LINE、IG、FB、Email、電話、地址、服務時間、各表單網址 | 全站 |

如果要讓其他人一起管理，在倉庫的 Settings → Collaborators 邀請他們的 GitHub 帳號即可。

## 第 4 步：開通官網表單（存進 Google 試算表）

官網上的「顧問預約」「企業內訓諮詢」「聯絡我們」表單，送出後要有地方接收：

1. 建立一份新的 Google 試算表，命名「7E 官網表單資料」。
2. 上方選單 **擴充功能 → Apps Script**，刪掉原本內容，把 `backend/apps-script.gs` 整份貼上，按儲存。
3. 右上角 **部署 → 新增部署作業** → 齒輪選「網頁應用程式」：
   - 執行身分：**我**
   - 誰可以存取：**所有人**
4. 按 **部署**，第一次會要求授權（選自己的帳號 → 進階 → 前往），完成後複製「網頁應用程式網址」。
5. 回到後台「網站設定 → 官網表單接收網址」貼上 → 存檔。

完成後，每一筆表單會依類型存在不同分頁（例如「顧問預約｜黃凱鈴」「聯絡我們」），
有「處理狀態」欄可以自己標記，並寄通知信到 7eacademy.unicorn@gmail.com。
還沒完成這一步之前，表單送出時會提示訪客改用官方 LINE@。

## 課程下單與預約怎麼運作

- 課程與檢測卡片的按鈕，連到你在後台填的表單網址（職能四獸、職能五獸、個人／商業品牌 7E 健檢等 Google 表單）。
- 付費項目在表單最後提供匯款資訊，報名資料存在各表單原本的 Google 試算表。
- 要新增一個課程：後台「商業教育｜課程與檢測」→ 新增 → 填名稱、價格、按鈕連結 → 存檔。

---

## 給技術人員

- `src/`：電腦版頁面範本；`src/m/`：手機版頁面範本；`_article.html` 是文章內頁範本。
- `content/`：後台編輯的資料（文章、消息、課程、方案、顧問、夥伴、設定）。
- `media/`：圖片；後台上傳的新圖片也會放在這裡。
- `build.mjs`：把範本與資料組成 `dist/` 網站（範本語法相容 Mustache）。
- 本機預覽：`npm install && npm run build && npm run preview`，開 http://localhost:8080
- 電腦版設計寬 1440、手機版 375；`assets/site.js` 會依螢幕寬度自動切換 `/` 與 `/m/`，並在較小螢幕等比例縮放。
- 其他頁面（關於 7E、品牌行銷服務、顧問個人頁等）的固定文字在 `src/*.html`，可直接在 GitHub 網頁上編輯。
