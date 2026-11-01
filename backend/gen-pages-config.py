# 依 content/pages/*.json 的內容，自動產生後台（Pages CMS）「頁面內容」的欄位設定，附加到 .pages.yml
# 用法：python3 backend/gen-pages-config.py   （改了 json 結構後再跑一次）
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = [('common','全站共用（頁尾、預約區、最下方 CTA）'),('home','頁面｜首頁'),('about','頁面｜關於7E'),('consultants','頁面｜顧問團隊列表'),
 ('eling','頁面｜顧問完整介紹：黃凱鈴'),('vessi','頁面｜顧問完整介紹：林彥廷'),('su','頁面｜顧問完整介紹：蘇琮瑜'),
 ('marketing','頁面｜品牌行銷服務'),('training','頁面｜企業內訓'),('courses','頁面｜商業教育課程'),
 ('articles','頁面｜最新文章（頁首文字）'),('news','頁面｜最新消息（頁首文字）'),('recaps','頁面｜課程回顧（頁首文字）'),('contact','頁面｜聯絡我們')]
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
 'items_title':'項目標題','lessons_title':'課程區標題','lessons_note':'課程區備註','lessons':'課程','plans_title':'方案標題','period':'期間','cases_label':'案例標籤','works':'代表作品','highlights':'重點','tags_title':'標籤標題','bio':'介紹','website_title':'官網建置標題','website_text':'官網建置說明',
 'steps_title':'步驟標題','advantages_title':'優勢標題','advantages':'優勢','table_title':'表格標題','table_cols':'表格欄位標題','table_rows':'表格列','cells':'各欄內容','promises_title':'承諾標題','promises':'承諾','results_eyebrow':'成效小標','projects':'代表專案',
 'startup':'01 創業輔導','brand':'02 品牌行銷顧問','video':'03 影音製作','ai':'04 AI 智能體','seo':'05 SEO & AEO','pos':'06 網站 & POS 系統','ads':'07 廣告投放',
 'strong':'粗體標語','approach':'內訓方式','beasts':'職能五獸','fit_label':'「適合」標題','fit':'適合對象','gain_label':'「可以得到」標題','gain':'可以得到','programs':'四大課程主軸','bullets':'重點','lecturer':'講師','lecturers':'講師陣容','focus':'照片對焦位置（例：center 15%）',
 'audience':'依對象規劃','focus_label':'「課程重點」標題','result_label':'「預期成果」標題','result':'預期成果','compare':'比較表','item':'項目','general':'一般企業培訓','ours':'7E 企業內訓','clients':'合作企業','faq':'常見問題區','booking':'預約區','enroll':'報名流程','online':'線上課程區','demo_title':'示意卡標題','demo_member':'示意會員','demo':'示意課程','percent':'完成度（數字）',
 'search_placeholder':'搜尋框提示文字','empty':'沒有內容時顯示','account_note':'帳號說明','follow_button':'追蹤按鈕','more_button':'看更多按鈕','book_button':'預約按鈕','card':'聯絡資訊卡','line_label':'LINE 標題','line_note':'LINE 說明','phone_label':'電話標題','email_label':'Email 標題','email_note':'Email 說明','hours_label':'時間標題','hours_note':'時間說明','address_label':'地址標題','address_note':'地址說明','form':'表單區',
 'cta':'最下方行動區（全站共用）','footer':'頁尾','slogan_1':'頁尾標語第一行','slogan_2':'頁尾標語第二行','copyright':'版權文字','info_1':'說明 1','info_2':'說明 2（後面會接地址）','info_3':'說明 3',
}
IMG = re.compile(r'(image|image_\d|photo|logo|avatar|cover)$')
LONG = {'text','text_1','text_2','lead','intro','desc','note','quote_note','bio','note_1','note_2','extra_text','highlight_text','website_text','projects','closing','v','result','general','ours','help_text','lessons_note'}
def lab(k): return L.get(k, k)
def q(s): return json.dumps(s, ensure_ascii=False)
def field(k, v, ind):
    sp = ' ' * ind; out = []
    if isinstance(v, dict):
        out.append(f'{sp}- name: {k}\n{sp}  label: {q(lab(k))}\n{sp}  type: object\n{sp}  fields:')
        for kk, vv in v.items(): out += field(kk, vv, ind + 4)
    elif isinstance(v, list):
        if v and all(isinstance(x, dict) for x in v):
            keys = {}
            for x in v:
                for kk, vv in x.items():
                    if kk not in keys or (isinstance(vv, (list, dict)) and not keys[kk]): keys[kk] = vv
            out.append(f'{sp}- name: {k}\n{sp}  label: {q(lab(k))}\n{sp}  type: object\n{sp}  list: true\n{sp}  fields:')
            for kk, vv in keys.items(): out += field(kk, vv, ind + 4)
        elif k in ('photos', 'boards', 'screenshots'):
            out.append(f'{sp}- name: {k}\n{sp}  label: {q(lab(k))}\n{sp}  type: image\n{sp}  options:\n{sp}    multiple: true')
        else:
            long = any(isinstance(x, str) and len(x) > 40 for x in v) or k == 'paragraphs'
            out.append(f'{sp}- name: {k}\n{sp}  label: {q(lab(k))}\n{sp}  type: {"text" if long else "string"}\n{sp}  list: true')
    elif isinstance(v, bool):
        out.append(f'{sp}- name: {k}\n{sp}  label: {q(lab(k))}\n{sp}  type: boolean')
    else:
        t = 'image' if IMG.search(k) else ('text' if (k in LONG or (isinstance(v, str) and len(v) > 50)) else 'string')
        out.append(f'{sp}- name: {k}\n{sp}  label: {q(lab(k))}\n{sp}  type: {t}')
    return out
blocks = []
for key, label in PAGES:
    path = os.path.join(ROOT, 'content/pages', key + '.json')
    if not os.path.exists(path): continue
    d = json.load(open(path))
    lines = [f'  - name: page-{key}', f'    label: {q(label)}', '    type: file', f'    path: content/pages/{key}.json', '    format: json', '    fields:']
    for k, v in d.items(): lines += field(k, v, 6)
    blocks.append('\n'.join(lines))
MARK = '  # ===== 頁面內容（自動產生，請勿手動修改這段以下；改完 json 結構後執行 backend/gen-pages-config.py）====='
yml = open(os.path.join(ROOT, '.pages.yml')).read()
if MARK in yml: yml = yml[:yml.index(MARK)].rstrip() + '\n'
yml = yml.rstrip() + '\n\n' + MARK + '\n' + '\n\n'.join(blocks) + '\n'
open(os.path.join(ROOT, '.pages.yml'), 'w').write(yml)
open(os.path.join(ROOT, 'pages-config.txt'), 'w').write(yml)
print('ok', len(blocks), 'pages')
