# 依 content/pages/*.json 的內容，自動產生後台（Pages CMS）「頁面內容」的欄位設定，附加到 .pages.yml
# 用法：python3 backend/gen-pages-config.py   （改了 json 結構後再跑一次）
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = [('common','選單・頁尾・預約區・最下方 CTA'),('home','首頁｜頁面文字與圖片'),('about','關於7E｜頁面文字與圖片'),('consultants','顧問團隊｜列表頁文字'),
 ('eling','黃凱鈴｜完整介紹頁'),('vessi','林彥廷｜完整介紹頁'),('su','蘇琮瑜｜完整介紹頁'),
 ('marketing','品牌行銷服務｜頁面文字與圖片'),('training','企業內訓｜頁面文字與圖片'),('courses','商業教育課程｜頁面文字與圖片'),
 ('articles','最新文章｜列表頁文字'),('news','最新消息｜列表頁文字'),('recaps','課程回顧｜列表頁文字'),('contact','聯絡我們｜頁面文字'),('member','加入會員｜頁面文字'),('privacy','隱私權政策｜條文')]
L = {
 'banner':'頁面上方大標區','word':'背景大字（英文）','eyebrow':'小標（英文）','title':'標題','title_1':'標題第一行','title_2':'標題第二行','text':'內文','text_1':'內文（第一段）','text_2':'內文（第二段）','lead':'說明文字','note':'備註文字','intro':'介紹',
 'button':'按鈕文字','button_1':'按鈕 1 文字','button_2':'按鈕 2 文字','image':'圖片','image_1':'圖片 1','image_2':'圖片 2','photo':'照片','photos':'照片（可多張）','cover':'封面圖','avatar':'頭像','logo':'Logo','logo_text':'沒有 Logo 時顯示的文字',
 'items':'項目','cards':'卡片','link':'連結（頁面或網址）','label':'標籤','name':'名稱','role':'職稱','sub':'副標','quote':'金句','quote_by':'金句署名','quote_1':'金句第一行','quote_2':'金句第二行','quote_note':'金句補充','quote_en':'金句英文',
 'closing':'段落結尾文字','paragraphs':'段落（一格一段）','timeline':'時間軸','year':'年份','stats':'數字亮點','num':'數字','tags':'標籤','tagline':'一句話標語','who':'統籌','en':'英文名稱','no':'編號',
 'hero':'最上方主視覺／個人簡介','formula':'公式文字','articles':'最新文章區','consultants':'顧問團隊區','services':'服務區','news':'最新消息區','follow':'追蹤 7E 區','partners':'協力夥伴區','fb_name':'Facebook 顯示名稱',
 'story':'品牌故事','philosophy':'品牌理念','roots':'根・枝葉・土壤','mark':'圓點字','pre':'標題前半','em':'標題強調字','why':'7E 的不同','values':'七大核心','founder':'創辦人初衷','steps':'步驟','method':'7E 二階段','stage_1':'第一階段','stage_2':'第二階段','k':'代號','desc':'說明','jump':'上方跳轉標籤文字',
 'note_eyebrow':'小卡標題','note_1':'小卡內文 1','note_2':'小卡內文 2','sign':'署名','entry':'入門服務小卡','crumb':'麵包屑名稱','name_sub':'姓名後的小字','tag':'標籤','expertise':'擅長領域','cases':'案例','people_first':'以人為本','pillars':'三大重點','flow':'流程（一格一步）',
 'talent':'人才定位・天賦課程','gallery_title':'照片區標題','show_recap':'照片區最前面顯示最新一筆課程回顧','big_first':'第一張照片放大','sessions':'場次（同場次只在第一張標說明）','testimonials':'學員反饋','boards':'設計過的回饋看板','screenshots':'回饋截圖',
 'interview':'媒體訪談','subtitle':'副標題','youtube_url':'YouTube 影片網址','advisory':'顧問服務項目','courses':'課程區','duration':'時數','outline':'大綱','extra_title':'補充區塊標題','extra_text':'補充區塊內文','plans':'方案','results':'實績','resume':'學經歷表','col_1':'表格第 1 欄標題','col_2':'表格第 2 欄標題','rows':'表格列',
 'v':'內容','certs':'專業認證','gallery':'照片牆','caption':'圖說','industries':'適用產業','scope':'服務範疇','highlight_title':'重點框標題','highlight_text':'重點框內文','groups':'分組','talks':'講座與課程',
 'overview':'服務總覽','help_title':'提示卡標題','help_text':'提示卡內文','help_button':'提示卡按鈕','nav':'跳轉標籤文字','card_title':'總覽卡標題（不填用標題）','card_who':'總覽卡負責人','card_summary':'總覽卡摘要','owner_name':'負責夥伴','owner_role':'負責夥伴職稱','slogan':'標語',
 'items_title':'項目標題','lessons_title':'課程區標題','lessons_note':'課程區備註','lessons':'課程','plans_title':'方案標題','period':'期間','cases_label':'案例標籤','works':'代表作品','works_title':'案例區標題','works_wide':'橫式案例（2 格，放橫的照片）','works_tall':'直式案例（4 格，放直的照片）','highlights':'重點','tags_title':'標籤標題','bio':'介紹','website_title':'官網建置標題','website_text':'官網建置說明',
 'steps_title':'步驟標題','advantages_title':'優勢標題','advantages':'優勢','table_title':'表格標題','table_cols':'表格欄位標題','table_rows':'表格列','cells':'各欄內容','promises_title':'承諾標題','promises':'承諾','results_eyebrow':'成效小標','projects':'代表專案',
 'startup':'01 創業輔導','brand':'02 品牌行銷顧問','video':'03 影音製作','ai':'04 AI 智能體','seo':'05 SEO & AEO','pos':'06 網站 & POS 系統','ads':'07 廣告投放',
 'strong':'粗體標語','approach':'內訓方式','beasts':'職能五獸','fit_label':'「適合」標題','fit':'適合對象','gain_label':'「可以得到」標題','gain':'可以得到','programs':'四大課程主軸','bullets':'重點','lecturer':'講師','lecturers':'講師陣容','focus':'照片對焦位置（例：center 15%）',
 'audience':'依對象規劃','focus_label':'「課程重點」標題','result_label':'「預期成果」標題','result':'預期成果','compare':'比較表','item':'項目','general':'一般企業培訓','ours':'7E 企業內訓','clients':'合作企業','faq':'常見問題區','booking':'預約區','enroll':'報名流程','online':'線上課程區','demo_title':'示意卡標題','demo_member':'示意會員','demo':'示意課程','percent':'完成度（數字）',
 'search_placeholder':'搜尋框提示文字','empty':'沒有內容時顯示','account_note':'帳號說明','follow_button':'追蹤按鈕','more_button':'看更多按鈕','book_button':'預約按鈕','card':'聯絡資訊卡','line_label':'LINE 標題','line_note':'LINE 說明','phone_label':'電話標題','email_label':'Email 標題','email_note':'Email 說明','hours_label':'時間標題','hours_note':'時間說明','address_label':'地址標題','address_note':'地址說明','form':'表單區',
 'cta':'最下方行動區（全站共用）','menu':'上方選單（可改名稱、順序、連結）','menu_member':'右上「加入會員」按鈕文字','menu_line':'LINE 預約按鈕文字','member_button':'加入會員按鈕','join':'LINE 加入區','hello':'問候語','interests_label':'興趣欄位標題','interests':'有興趣的服務選項','industries':'產業別選項','sizes':'公司人數選項','agree':'同意隱私權政策文字','subscribe':'同意接收訊息文字','update_button':'更新資料按鈕','existing':'已是會員提示','done':'完成畫面','line_button':'加 LINE 好友按鈕','back_button':'回首頁按鈕','updated':'更新完成文字／最後更新日期','messages':'提示訊息','verifying':'確認中','not_ready':'尚未設定時','error':'登入失敗','expired':'逾時','missing':'缺必填','bad_email':'Email 格式錯誤','fail':'送出失敗','benefits':'會員好處','sections':'條文段落','contact_title':'聯絡方式標題','footer':'頁尾','slogan_1':'頁尾標語第一行','slogan_2':'頁尾標語第二行','copyright':'版權文字','info_1':'說明 1','info_2':'說明 2（後面會接地址）','info_3':'說明 3',
}
IMG = re.compile(r'(image|image_\d|photo|logo|avatar|cover)$')
LONG = {'text','text_1','text_2','lead','intro','desc','note','quote_note','bio','note_1','note_2','extra_text','highlight_text','website_text','projects','closing','v','result','general','ours','help_text','lessons_note'}
def lab(k): return L.get(k, k)
def q(s): return json.dumps(s, ensure_ascii=False)
def field(k, v, ind):
    sp = ' ' * ind; out = []
    if isinstance(v, dict):
        out.append(f'{sp}- name: {q(k)}\n{sp}  label: {q(lab(k))}\n{sp}  type: object\n{sp}  fields:')
        for kk, vv in v.items(): out += field(kk, vv, ind + 4)
    elif isinstance(v, list):
        if v and all(isinstance(x, dict) for x in v):
            keys = {}
            for x in v:
                for kk, vv in x.items():
                    if kk not in keys or (isinstance(vv, (list, dict)) and not keys[kk]): keys[kk] = vv
            out.append(f'{sp}- name: {q(k)}\n{sp}  label: {q(lab(k))}\n{sp}  type: object\n{sp}  list: true\n{sp}  fields:')
            for kk, vv in keys.items(): out += field(kk, vv, ind + 4)
        elif k in ('photos', 'boards', 'screenshots'):
            out.append(f'{sp}- name: {q(k)}\n{sp}  label: {q(lab(k))}\n{sp}  type: image\n{sp}  options:\n{sp}    multiple: true')
        else:
            long = any(isinstance(x, str) and len(x) > 40 for x in v) or k == 'paragraphs'
            out.append(f'{sp}- name: {q(k)}\n{sp}  label: {q(lab(k))}\n{sp}  type: {"text" if long else "string"}\n{sp}  list: true')
    elif isinstance(v, bool):
        out.append(f'{sp}- name: {q(k)}\n{sp}  label: {q(lab(k))}\n{sp}  type: boolean')
    else:
        t = 'image' if IMG.search(k) else ('text' if (k in LONG or (isinstance(v, str) and len(v) > 50)) else 'string')
        out.append(f'{sp}- name: {q(k)}\n{sp}  label: {q(lab(k))}\n{sp}  type: {t}')
    return out
blocks = []
for key, label in PAGES:
    path = os.path.join(ROOT, 'content/pages', key + '.json')
    if not os.path.exists(path): continue
    d = json.load(open(path))
    lines = [f'  - name: page-{key}', f'    label: {q(label)}', '    type: file', f'    path: content/pages/{key}.json', '    format: json', '    fields:']
    for k, v in d.items(): lines += field(k, v, 6)
    blocks.append('\n'.join(lines))
# ===== 組合後台設定：依網站選單分類（每個分類收合，點開就是那一頁所有可修改的內容）=====
import yaml
class D(yaml.SafeDumper):
    def ignore_aliases(self, data): return True
def flat(items):
    out = []
    for it in items or []:
        if it.get('type') == 'group': out += flat(it.get('items'))
        else: out.append(it)
    return out
cfg = yaml.safe_load(open(os.path.join(ROOT, '.pages.yml'), encoding='utf8'))
E = {e['name']: e for e in flat(cfg.get('content')) if not e['name'].startswith('page-') and e['name'] != 'faq'}
for b in blocks:
    e = yaml.safe_load(b)[0]; E[e['name']] = e
QA = [{'name': 'q', 'label': '問題', 'type': 'string', 'required': True}, {'name': 'a', 'label': '回答（可換行；貼上網址會自動變成連結）', 'type': 'text'}, {'name': 'show', 'label': '顯示', 'type': 'boolean', 'default': True}]
for k, lb in (('training', '企業內訓｜常見問題'), ('courses', '商業教育課程｜常見問題')):
    E['faq-' + k] = {'name': 'faq-' + k, 'label': lb, 'type': 'file', 'path': f'content/faq-{k}.json', 'format': 'json', 'fields': [{'name': 'items', 'label': '常見問題（可新增、拖曳排序）', 'type': 'object', 'list': True, 'fields': QA}]}
REN = {'articles': '最新文章｜文章（新增・編輯）', 'news': '最新消息｜IG 貼文', 'recaps': '課程回顧｜每場紀錄（新增・編輯）', 'courses': '商業教育課程｜課程與檢測卡片', 'plans': '企業內訓｜五獸方案與價格',
       'consultants': '顧問團隊｜顧問卡片（名單、排序）', 'partners': '首頁｜協力夥伴 Logo', 'settings': '網站設定｜聯絡資訊、連結、表單網址', 'forms': '聯絡我們｜預約表單欄位（進階）'}
for k, v in REN.items():
    if k in E: E[k]['label'] = v
LAYOUT = [
 ('home', '🏠 首頁', ['page-home', 'partners']),
 ('menu', '🧭 選單・頁尾・共用區塊', ['page-common']),
 ('about', '📖 關於7E', ['page-about']),
 ('team', '👥 顧問團隊', ['consultants', 'page-consultants', 'page-eling', 'page-vessi', 'page-su']),
 ('posts', '📝 最新文章', ['articles', 'page-articles']),
 ('ig', '📣 最新消息', ['news', 'page-news']),
 ('marketing', '💼 品牌行銷服務', ['page-marketing']),
 ('training', '🏢 企業內訓', ['page-training', 'plans', 'faq-training']),
 ('edu', '🎓 商業教育課程', ['courses', 'page-courses', 'faq-courses', 'recaps', 'page-recaps']),
 ('contact', '✉️ 聯絡我們', ['page-contact', 'forms']),
 ('member', '⭐ 加入會員', ['page-member']),
 ('site', '⚙️ 網站設定', ['settings', 'page-privacy']),
]
used, content = set(), []
for name, label, keys in LAYOUT:
    items = [dict(E[k], label=E[k]['label'].split('｜', 1)[-1]) for k in keys if k in E]; used.update(keys)
    if items: content.append({'name': name, 'label': label, 'type': 'group', 'items': items})
rest = [e for k, e in E.items() if k not in used]
if rest: content.append({'name': 'other', 'label': '📦 其他', 'type': 'group', 'items': rest})
cfg['content'] = content
head = '# 7E 商學院官網後台設定（Pages CMS，https://app.pagescms.org）\n# 這個檔案由 backend/gen-pages-config.py 產生：改了 content/pages/*.json 的結構後執行它，再把 pages-config.txt 的內容貼到 .pages.yml\n'
yml = head + yaml.dump(cfg, Dumper=D, allow_unicode=True, sort_keys=False, width=1000)
open(os.path.join(ROOT, '.pages.yml'), 'w', encoding='utf8').write(yml)
open(os.path.join(ROOT, 'pages-config.txt'), 'w', encoding='utf8').write(yml)
print('ok', len(blocks), 'pages,', len(content), 'groups')
