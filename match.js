import { data, esc, isNew, STATUS_ORDER } from "./app.js";

// ============ 简历匹配（纯本地 · ATS 风格评分） ============
let resumeText = "";

function switchTab(t) {
  document.getElementById("browseView").style.display = (t === "browse") ? "block" : "none";
  document.getElementById("matchView").style.display = (t === "match") ? "block" : "none";
  document.getElementById("dashView").style.display = (t === "dash") ? "block" : "none";
  document.getElementById("tabBrowse").classList.toggle("on", t === "browse");
  document.getElementById("tabMatch").classList.toggle("on", t === "match");
  document.getElementById("tabDash").classList.toggle("on", t === "dash");
  if (t === "dash") renderDashboard();
}

const STATUS_COLOR = {
  "待投递": "#6b7280", "已投递": "#2563eb", "已笔试": "#7c3aed", "已面试": "#d97706",
  "已Offer": "#16a34a", "已淘汰": "#dc2626", "已截止": "#4b5563"
};

function renderDashboard() {
  const active = data.filter(d => !d.hidden);
  const counts = {};
  STATUS_ORDER.forEach(s => counts[s] = 0);
  active.forEach(d => { counts[d.status || "待投递"]++; });
  const max = Math.max(1, ...STATUS_ORDER.map(s => counts[s]));

  document.getElementById("statusChart").innerHTML = STATUS_ORDER.map(s => {
    const n = counts[s];
    const pct = Math.round(n / max * 100);
    return `
    <div class="bar-row" title="${s}：${n} 家">
      <div class="bar-label">${s}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${STATUS_COLOR[s]}"></div></div>
      <div class="bar-count">${n}</div>
    </div>`;
  }).join("");

  const rows = [];
  STATUS_ORDER.forEach(s => {
    const items = active.filter(d => (d.status || "待投递") === s);
    if (!items.length) return;
    const cells = items.map(d =>
      `<span class="tbl-item">${esc(d.name)}<span class="tbl-role">${esc((d.role || []).join("·"))}</span></span>`
    ).join("");
    rows.push(`
    <div class="tbl-row">
      <div class="tbl-status"><span class="status-dot" style="background:${STATUS_COLOR[s]}"></span>${s}<span class="tbl-n">${items.length} 家</span></div>
      <div class="tbl-cells">${cells}</div>
    </div>`);
  });
  document.getElementById("statusTable").innerHTML = rows.join("") || '<div class="match-empty">暂无投递记录</div>';
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("加载失败: " + src));
    document.head.appendChild(s);
  });
}
const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDFWORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
async function ensurePdfjs() {
  if (!window.pdfjsLib) await loadScript(PDFJS_URL);
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWORKER_URL;
}
async function ensureJszip() {
  if (!window.JSZip) await loadScript("libs/jszip.min.js");
}

// —— 简历信息抽取 ——
const EDU_TIER = { "博士": 100, "硕士": 85, "研究生": 85, "本科": 70, "专科": 55 };
const SCHOOL_ELITE = ["985", "211", "双一流", "海归", "留学", "C9", "常春藤", "QS"];
const MAJORS = {
  "计算机/数据": ["计算机", "软件工程", "数据科学", "人工智能", "AI", "信息技术"],
  "金融/经济": ["金融", "经济", "会计", "财务", "投资", "统计", "精算"],
  "市场营销/传媒": ["市场营销", "广告", "传媒", "新闻", "传播", "品牌"],
  "管理/人力": ["工商管理", "管理", "人力资源", "行政管理", "公共管理"],
  "法律": ["法律", "法学", "法务"],
  "理工": ["数学", "物理", "电子", "通信", "自动化", "机械", "材料", "工程"],
  "外语": ["英语", "日语", "韩语", "翻译", "外语"]
};
const SKILLS = ["需求分析","竞品分析","用户研究","用户调研","数据分析","SQL","Excel","Tableau","Python","数据可视化","埋点","A/B测试","增长","活动策划","用户运营","内容运营","社群运营","新媒体","短视频","直播运营","投放","电商运营","销售","商务拓展","商务谈判","渠道拓展","客户关系","大客户","BD","GTM","市场拓展","项目管理","领导力","团队协作","跨部门协作","沟通表达","抗压能力","快速学习","组织协调","人力资源","招聘","薪酬绩效","财务","会计","审计","税务","法务","合规","行政","办公软件","PowerPoint","PPT","Photoshop","Figma","Axure","PRD","原型设计","需求文档","英语","粤语","日语","文案策划","用户增长","转化率"];
const CERTS = ["CFA","CPA","PMP","FRM","ACCA","证券从业","基金从业","司法考试","法考","教师资格"];
const ROLE_PROFILE = {
  "产品": ["需求分析","竞品分析","用户研究","用户调研","数据分析","PRD","原型设计","需求文档","Figma","Axure","A/B测试","埋点"],
  "运营": ["用户运营","内容运营","活动策划","社群运营","新媒体","短视频","直播运营","投放","增长","转化率","用户增长","数据分析","Excel"],
  "销售": ["销售","商务拓展","商务谈判","渠道拓展","客户关系","大客户","BD","GTM","市场拓展","沟通表达","抗压能力"],
  "管培生": ["领导力","团队协作","跨部门协作","沟通表达","组织协调","快速学习","抗压能力","项目管理"],
  "职能": ["人力资源","招聘","薪酬绩效","财务","会计","审计","税务","法务","合规","行政","办公软件","Excel","PowerPoint"]
};

// 否定前缀检测：关键词前若紧跟"不/没/无/非"（排除"非常/不错/不过/无论"等非否定词）则不计命中
function hasKeyword(text, keyword) {
  const idx = text.indexOf(keyword);
  if (idx === -1) return false;
  const before = text.slice(Math.max(0, idx - 8), idx);
  const seg = before.split(/[，。；、！？\n]/).pop();
  return !/(?:不(?!错|过)|没|无(?!论)|非(?!常))/.test(seg);
}

function extractProfile(text) {
  const t = text || "";
  const has = kws => kws.some(w => hasKeyword(t, w));
  let edu = "未识别", eduScore = 60;
  for (const k of Object.keys(EDU_TIER)) { if (t.includes(k)) { edu = k; eduScore = EDU_TIER[k]; break; } }
  const elite = SCHOOL_ELITE.filter(w => t.includes(w));
  const eduFinal = Math.min(100, eduScore + (elite.length ? 10 : 0));
  const majors = Object.keys(MAJORS).filter(k => has(MAJORS[k]));
  const skills = SKILLS.filter(w => hasKeyword(t, w));
  const certs = CERTS.filter(w => hasKeyword(t, w));
  const langs = [];
  if (/雅思|托福|专八|托业/i.test(t)) langs.push("英语(雅思/托福)");
  else if (/六级|CET-?6/i.test(t)) langs.push("英语六级");
  else if (/四级|CET-?4/i.test(t)) langs.push("英语四级");
  if (/粤语|广东话/.test(t)) langs.push("粤语");
  if (/日语|N1|N2/.test(t)) langs.push("日语");
  const intern = /实习|intern/i.test(t);
  const projects = (t.match(/项目/g) || []).length;
  const leadership = has(["主席","部长","会长","社团","学生会","班委","队长","负责人","领导"]);
  const quantified = /\d+\s*%|\d+\.?\d*\s*万|\d+\s*k\+|\d+\s*w\+/i.test(t);
  return { edu, eduFinal, elite, majors, skills, certs, langs, intern, projects, leadership, quantified };
}

// —— 评分 ——
const SCORE_WEIGHTS = { jdHit: 0.45, edu: 0.15, exp: 0.20, cert: 0.10, descHit: 0.10 };
const ROLE_WEIGHT_OVERRIDES = {
  "产品": { jdHit: 0.55, exp: 0.10 },
  "运营": { exp: 0.25 },
  "销售": { jdHit: 0.35, exp: 0.30 },
};
function getWeights(role) {
  const w = { ...SCORE_WEIGHTS, ...(ROLE_WEIGHT_OVERRIDES[role] || {}) };
  const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  Object.keys(w).forEach(k => { w[k] = w[k] / sum; });
  return w;
}

function jdProfile(d, role) {
  if (d.jd && d.jd[role]) return String(d.jd[role]).split(/[\s,，、/]+/).filter(Boolean);
  return ROLE_PROFILE[role] || [];
}

function scoreCandidate(p, d, role) {
  const detected = new Set(p.skills);
  const profile = jdProfile(d, role);
  const jdHit = profile.length ? profile.filter(k => detected.has(k)).length / profile.length : 0.5;
  const edu = p.eduFinal / 100;
  let exp = 0;
  if (p.intern) exp += 0.4;
  if (p.projects >= 1) exp += 0.2;
  if (p.leadership) exp += 0.2;
  if (p.quantified) exp += 0.2;
  exp = Math.min(1, exp);
  let cert = 0;
  if (p.certs.length) cert += 0.5;
  if (p.langs.length) cert += 0.5;
  cert = Math.min(1, cert);
  const descHit = p.skills.length ? Math.min(1, p.skills.filter(s => (d.desc || "").includes(s)).length / 5) : 0.4;
  const components = { jdHit, edu, exp, cert, descHit };
  const weights = getWeights(role);
  const score = Math.round(100 * Object.entries(weights).reduce((sum, [k, w]) => sum + w * (components[k] || 0), 0));
  return Math.max(0, Math.min(100, score));
}

function buildReason(p, d, role) {
  const parts = [];
  const profile = jdProfile(d, role);
  const hit = profile.filter(k => p.skills.includes(k));
  if (hit.length) parts.push("JD命中·" + hit.slice(0, 3).join("/"));
  parts.push("学历·" + p.edu + (p.elite.length ? "(" + p.elite[0] + ")" : ""));
  const expParts = [];
  if (p.intern) expParts.push("实习");
  if (p.projects) expParts.push("项目");
  if (p.leadership) expParts.push("社团/管理");
  if (p.quantified) expParts.push("量化成果");
  if (expParts.length) parts.push("经历·" + expParts.join("/"));
  const c = [];
  if (p.certs.length) c.push("证书");
  if (p.langs.length) c.push("语言");
  if (c.length) parts.push(c.join("/"));
  return parts.join(" ｜ ") || "综合匹配";
}

// —— 渲染 ——
function chips(arr, empty) {
  return arr.length ? arr.map(x => `<span class="chip-mini">${esc(x)}</span>`).join("") : `<span class="chip-mini" style="color:#b0b5bc">${empty || "未识别"}</span>`;
}
function renderSummary(p) {
  const expParts = [];
  if (p.intern) expParts.push("有实习");
  if (p.projects) expParts.push(p.projects + "段项目");
  if (p.leadership) expParts.push("有社团/管理");
  if (p.quantified) expParts.push("有量化成果");
  document.getElementById("resumeSummary").innerHTML = `
    <h3>我的简历（解析结果）</h3>
    <div class="row">
      <span><span class="k">学历：</span>${chips([p.edu + (p.elite.length ? "·" + p.elite[0] : "")])}</span>
      <span><span class="k">专业：</span>${chips(p.majors)}</span>
      <span><span class="k">证书：</span>${chips(p.certs)}</span>
      <span><span class="k">语言：</span>${chips(p.langs)}</span>
    </div>
    <div class="row" style="margin-top:6px"><span class="k">经历：</span>${chips(expParts)}</div>
    <div class="row" style="margin-top:6px"><span class="k">技能关键词：</span>${chips(p.skills)}</div>`;
}
function renderResults(results) {
  const el = document.getElementById("matchResults");
  if (!results.length) { el.innerHTML = '<div class="match-empty">暂无数据</div>'; return; }
  const top = results.slice(0, 60);
  const rows = top.map((x, i) => {
    const cls = x.score >= 80 ? "score-high" : (x.score >= 60 ? "score-mid" : "score-low");
    return `
    <div class="match-result">
      <div class="match-rank">#${i + 1}</div>
      <div class="match-main">
        <div class="match-name">${esc(x.name)}<span class="en">${esc(x.en || "")}</span><span class="match-role">${esc(x.role)}</span>${isNew(x) ? ' <span class="new-badge">NEW</span>' : ""}</div>
        <div class="match-reason">${esc(x.reason)}</div>
      </div>
      <div class="score-wrap">
        <div class="score-bar"><div class="score-fill ${cls}" style="width:${x.score}%"></div></div>
        <div class="score-num">${x.score}</div>
      </div>
      <a class="btn small" href="${esc(x.url || "#")}" target="_blank" rel="noopener noreferrer">投递 ↗</a>
    </div>`;
  }).join("");
  el.innerHTML = `<h3 class="match-results-title">匹配结果（按匹配度降序，共 ${results.length} 条，展示前 ${top.length}）</h3>` + rows;
}
function generateAdvice(p, results) {
  const tips = [];
  if (p.edu === "未识别") tips.push("① 未识别到「学历」。校招中学历/学校是硬性门槛（初筛可能直接卡学历），建议在简历顶部写清学校、学历、毕业时间。");
  else if (p.eduFinal < 75) tips.push("① 你的学历层级（" + p.edu + "）在部分学历要求高的岗位（金融/投行等）可能不占优，可突出学校排名/绩点/获奖弥补。");
  if (!p.majors.length) tips.push("② 未识别到「专业」。建议写清专业，专业相关度是初筛的重要维度。");
  if (p.skills.length < 3) tips.push("③ 技能关键词偏少（识别到 " + p.skills.length + " 个）。JD 关键词匹配占 45%，建议把目标岗位 JD 里的词（需求分析、数据分析、用户运营等）写进技能和经历。");
  if (!p.intern) tips.push("④ 未识别到「实习经历」。大厂 AI 筛选很看重相关实习，建议补充实习/项目（哪怕是课程项目）。");
  if (!p.quantified) tips.push("⑤ 缺少量化成果。建议把成果数字化（如『提升转化率 30%』『覆盖 10w 用户』），AI 筛选对数字更敏感。");
  if (!p.certs.length && !p.langs.length) tips.push("⑥ 未识别到证书/语言成绩。建议补充（英语六级/雅思、CFA/CPA 等），能加分。");

  const ROLE_TIP = {
    "产品": "产品岗 JD 高频词：需求分析、竞品分析、用户研究、数据分析、PRD、原型(Axure/Figma)。建议把这些词+对应经历写进简历。",
    "运营": "运营岗 JD 高频词：用户运营、活动策划、增长、转化率、社群/内容、数据分析(Excel/SQL)。",
    "销售": "销售岗 JD 高频词：业绩数字、客户关系、商务谈判、渠道拓展、抗压。",
    "管培生": "管培生 JD 高频词：领导力、团队协作、跨部门、快速学习、社团/学生会。",
    "职能": "职能岗 JD 高频词：专业证书、办公软件、流程、合规、细心。"
  };
  if (results.length) {
    const top = results.slice(0, 5);
    const topNames = [...new Set(top.map(x => x.name))].slice(0, 3);
    const topRoles = [...new Set(top.map(x => x.role))].slice(0, 3);
    topRoles.forEach(role => { if (ROLE_TIP[role]) tips.push(ROLE_TIP[role]); });
    if (topNames.length) tips.push("你匹配度最高的公司是「" + topNames.map(esc).join("、") + "」，建议优先对照这些岗位的 JD 补强关键词。");
  }
  tips.push("通用建议：关键词对齐目标 JD、成果数据化、经历按「背景—动作—结果」写、控制一页以内、避免复杂排版导致解析失败。");
  return tips;
}
function renderAdvice(tips) {
  document.getElementById("resumeAdvice").innerHTML =
    `<h3 class="match-results-title">简历修改建议</h3>` + tips.map(t => `<div class="advice-item">${t}</div>`).join("");
}

// —— 文件解析 ——
async function extractPdfText(buf) {
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const c = await page.getTextContent();
    text += c.items.map(it => it.str).join(" ") + "\n";
  }
  return text;
}
async function extractDocxText(buf) {
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml").async("string");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const paras = [...doc.getElementsByTagName("w:p")];
  return paras.map(p => [...p.getElementsByTagName("w:t")].map(t => t.textContent).join("")).join("\n");
}

// —— 主流程 ——
function runAnalysis(text) {
  const p = extractProfile(text);
  renderSummary(p);
  const results = [];
  data.filter(d => !d.hidden).forEach(d => {
    (d.role || []).forEach(role => {
      results.push({ name: d.name, en: d.en, role: role, score: scoreCandidate(p, d, role), url: d.url, reason: buildReason(p, d, role), addedDate: d.addedDate });
    });
  });
  results.sort((a, b) => b.score - a.score);
  renderResults(results);
  renderAdvice(generateAdvice(p, results));
  document.getElementById("matchResults").scrollIntoView({ behavior: "smooth", block: "start" });
}
function analyzeResume() {
  if (!resumeText) { alert("请先上传 PDF / Word 简历文件"); return; }
  runAnalysis(resumeText);
}
function clearResume() {
  resumeText = "";
  document.getElementById("resumeFile").value = "";
  document.getElementById("uploadName").style.display = "none";
  document.getElementById("resumeSummary").innerHTML = "";
  document.getElementById("matchResults").innerHTML = '<div class="match-empty">上传 PDF / Word 简历后会自动解析，即可看到与你匹配度最高的企业和岗位方向。</div>';
  document.getElementById("resumeAdvice").innerHTML = "";
}

document.getElementById("resumeFile").addEventListener("change", e => {
  const f = e.target.files[0];
  if (!f) return;
  document.getElementById("uploadName").textContent = "" + f.name + "（解析中…）";
  document.getElementById("uploadName").style.display = "block";
  const reader = new FileReader();
  reader.onload = async ev => {
    const buf = ev.target.result;
    try {
      let text = "";
      const n = f.name.toLowerCase();
      if (n.endsWith(".pdf")) { await ensurePdfjs(); text = await extractPdfText(buf); }
      else if (n.endsWith(".docx")) { await ensureJszip(); text = await extractDocxText(buf); }
      else { alert("请上传 PDF 或 Word(.docx) 文件"); clearResume(); return; }
      if (!text.trim()) { alert("未能从文件中解析出文本（可能是扫描件/图片版 PDF）。"); clearResume(); return; }
      resumeText = text;
      document.getElementById("uploadName").textContent = "" + f.name + "（解析成功）";
      runAnalysis(resumeText);
    } catch (err) {
      document.getElementById("uploadName").textContent = "解析失败，请确认是 PDF 或 Word 文件";
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(f);
});

// ============ JD 匹配（调用 DeepSeek） ============
function getDeepSeekKey() { return localStorage.getItem("deepseek_key") || ""; }
function saveApiKey() {
  const k = document.getElementById("apiKeyInput").value.trim();
  if (!k) { alert("请输入 API Key"); return; }
  localStorage.setItem("deepseek_key", k);
  document.getElementById("apiKeyInput").value = "";
  document.getElementById("jdResults").innerHTML = '<div class="match-empty">Key 已保存到本机浏览器，可以开始分析。</div>';
}
const JD_SYSTEM_PROMPT = `你是资深校招简历筛选专家。给一份简历和多个岗位JD，对每个岗位做匹配度评估，帮助求职者判断"投哪个岗位最匹配"。

【评分维度（总分100）】
1. 硬性门槛匹配（25分）：学历（全日制/统招/985/211/海外名校）、专业对口程度、工作年限、行业背景、证书/资质、地域（年龄不作为评分项）。
2. 核心技能匹配（25分）：JD要求的技术栈/工具/方法论；简历实际掌握并验证过的技能；技能深度（精通>熟悉>了解）。
3. 项目/业务经验匹配（20分）：项目类型与岗位业务方向的重合度；项目规模与复杂度；是否有从0到1、规模化、跨团队等JD强调的经验。
4. 岗位职责匹配（15分）：JD每条职责 vs 简历中的对应经历，逐条标注"完全匹配/部分匹配/缺失"。
5. 软素质/隐性要求（8分）：领导力/带团队、沟通协调/跨部门、抗压/自驱、英语能力。
6. 加分项匹配（5分）：JD中"加分项"命中了哪些；简历独有亮点。
7. 简历呈现质量（2分）：是否量化成果、是否针对该岗位调整、表达是否清晰逻辑自洽。

【硬性门槛否决检查（独立，不计入总分）】
若JD明确要求且可识别（如"硕士及以上""必须有CPA/PMP/法考""限XX专业""要求X年经验"）而简历不满足，则 veto=true 并写明原因。

【输出】只输出一个 JSON 对象，不要任何解释、不要 markdown：
{"results":[{"name":"岗位名","total":78,"veto":false,"vetoReason":"","summary":"一句话","dimensions":{"硬性门槛":22,"核心技能":19,"项目经验":15,"岗位职责":11,"软素质":6,"加分项":3,"呈现质量":2},"职责对比":[{"职责":"...","状态":"完全匹配|部分匹配|缺失"}]}]}`;

function parseJDs(text) {
  return (text || "").split(/\n?\s*={3,}\s*\n?/).map(s => s.trim()).filter(Boolean).map((b, i) => {
    const lines = b.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return null;
    const first = lines[0];
    let name = "";
    let body = b;
    const m = first.match(/^(?:岗位名称|岗位名|职位名称|招聘岗位|招聘职位|职位|岗位|JD名称)[：:]\s*(.+)$/);
    if (m) {
      name = m[1].trim();
      body = lines.slice(1).join("\n").trim();
    } else if (first.length <= 40) {
      // 第一行较短，当作岗位名称（去掉常见的包裹符号）
      name = first.replace(/^[【\[《（(]+|[】\]》）)]+$/g, "").trim();
      body = lines.slice(1).join("\n").trim() || b;
    }
    if (!name) name = "岗位" + (i + 1);
    return { name, text: body };
  }).filter(Boolean);
}

async function callDeepSeekMatch(resume, jds) {
  const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + getDeepSeekKey() },
    body: JSON.stringify({
      model: "deepseek-v4-pro",
      messages: [
        { role: "system", content: JD_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ resume, jds }) },
      ],
      temperature: 0.2, stream: false,
    }),
  });
  if (!resp.ok) throw new Error("DeepSeek 调用失败: HTTP " + resp.status);
  const data = await resp.json();
  const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
  try { return JSON.parse(content); }
  catch (e) {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("模型未返回合法 JSON");
  }
}

async function analyzeJDMatch() {
  if (!resumeText) { alert("请先上传简历文件"); return; }
  if (!getDeepSeekKey()) { alert("请先在下方填写并保存 DeepSeek API Key（只存本机）"); return; }
  const raw = document.getElementById("jdInput").value.trim();
  if (!raw) { alert("请粘贴岗位JD文本"); return; }
  const jds = parseJDs(raw);
  if (!jds.length) { alert("未能识别岗位JD，请用「岗位名：」标注、用「====」分隔"); return; }
  const el = document.getElementById("jdResults");
  el.innerHTML = '<div class="match-empty">正在分析 ' + jds.length + ' 个岗位（约需 10-30 秒）…</div>';
  try {
    const data = await callDeepSeekMatch(resumeText, jds);
    renderJDResults(data);
  } catch (e) {
    el.innerHTML = '<div class="match-empty">分析失败：' + esc(String((e && e.message) || e)) + '</div>';
  }
}

function renderJDResults(data) {
  const el = document.getElementById("jdResults");
  const results = (data && data.results) || [];
  if (!results.length) { el.innerHTML = '<div class="match-empty">没有返回结果</div>'; return; }
  results.sort((a, b) => (a.veto ? 1 : 0) - (b.veto ? 1 : 0) || (b.total || 0) - (a.total || 0));
  el.innerHTML = '<h3 class="match-results-title">JD 匹配结果（按匹配分降序）</h3>' + results.map((r, i) => {
    const dims = r.dimensions ? Object.entries(r.dimensions).map(([k, v]) => '<span class="dim-chip">' + esc(k) + ' ' + esc(String(v)) + '</span>').join("") : "";
    const duty = r.职责对比 ? r.职责对比.map(d => '<div class="duty-line"><span class="duty-status ' + esc(d.状态 || "") + '">' + esc(d.状态 || "") + '</span> ' + esc(d.职责 || "") + '</div>').join("") : "";
    return `
    <div class="jd-result${r.veto ? " veto" : ""}">
      <div class="jd-result-top">
        <span class="jd-rank">#${i + 1}</span>
        <span class="jd-name">${esc(r.name || "岗位")}</span>
        ${r.veto ? '<span class="veto-badge">不满足硬性门槛</span>' : ""}
        <span class="jd-score">${r.total != null ? r.total : "?"}</span>
      </div>
      ${r.summary ? `<div class="jd-summary">${esc(r.summary)}</div>` : ""}
      ${dims ? `<div class="jd-dims">${dims}</div>` : ""}
      ${duty ? `<div class="jd-duty">${duty}</div>` : ""}
      ${r.vetoReason ? `<div class="jd-veto-reason">${esc(r.vetoReason)}</div>` : ""}
    </div>`;
  }).join("");
}

function clearJD() {
  document.getElementById("jdInput").value = "";
  document.getElementById("jdResults").innerHTML = "";
}

clearResume();

// 暴露给 HTML 内联 onclick
window.switchTab = switchTab;
window.analyzeResume = analyzeResume;
window.clearResume = clearResume;
window.analyzeJDMatch = analyzeJDMatch;
window.clearJD = clearJD;
window.saveApiKey = saveApiKey;
