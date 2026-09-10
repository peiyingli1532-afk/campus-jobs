// ============ 简历 vs 多岗位JD 匹配（Cloudflare Worker，调用 DeepSeek）============
// 部署后设置环境变量：DEEPSEEK_API_KEY
// 前端 POST { resume: "简历文本", jds: [{name:"岗位名", text:"JD文本"}, ...] }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== 'POST') {
      return json({ error: '仅支持 POST' }, 405);
    }
    try {
      const body = await request.json();
      const { resume, jds } = body;
      if (!resume || !Array.isArray(jds) || !jds.length) {
        return json({ error: '缺少 resume 或 jds' }, 400);
      }
      const result = await match(resume, jds, env.DEEPSEEK_API_KEY || '');
      return json(result, 200);
    } catch (e) {
      return json({ error: (e && e.message) || String(e) }, 500);
    }
  },
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function match(resume, jds, apiKey) {
  const system = `你是资深校招简历筛选专家。给一份简历和多个岗位JD，对每个岗位做匹配度评估，帮助求职者判断"投哪个岗位最匹配"。

【评分维度（总分100）】
1. 硬性门槛匹配（25分）：学历（全日制/统招/985/211/海外名校）、专业对口程度、工作年限、行业背景、证书/资质、地域（年龄不作为评分项）。
2. 核心技能匹配（25分）：JD要求的技术栈/工具/方法论；简历实际掌握并验证过的技能；技能深度（精通>熟悉>了解）。
3. 项目/业务经验匹配（20分）：项目类型与岗位业务方向的重合度；项目规模与复杂度；是否有从0到1、规模化、跨团队等JD强调的经验。
4. 岗位职责匹配（15分）：JD每条职责 vs 简历中的对应经历，逐条标注"完全匹配/部分匹配/缺失"。
5. 软素质/隐性要求（8分）：领导力/带团队、沟通协调/跨部门、抗压/自驱（从成果密度推断）、英语能力。
6. 加分项匹配（5分）：JD中"加分项"命中了哪些；简历独有亮点（可能成为差异化优势）。
7. 简历呈现质量（2分）：是否量化成果（数字/比例/金额）、是否针对该岗位调整、表达是否清晰逻辑自洽。

【硬性门槛否决检查（独立，不计入总分）】
若JD明确要求且可识别（如"硕士及以上""必须有CPA/PMP/法考""限XX专业""要求X年经验"）而简历不满足，则 veto=true 并写明原因。这类岗位即使技能匹配高，也要标出。

【输出】只输出一个 JSON 对象，不要任何解释、不要 markdown 代码块：
{
  "results": [
    {
      "name": "岗位名",
      "total": 78,
      "veto": false,
      "vetoReason": "",
      "summary": "一句话总结匹配点与主要差距",
      "dimensions": {"硬性门槛":22,"核心技能":19,"项目经验":15,"岗位职责":11,"软素质":6,"加分项":3,"呈现质量":2},
      "职责对比": [{"职责":"JD职责原文摘要","状态":"完全匹配|部分匹配|缺失"}]
    }
  ]
}`;

  const user = JSON.stringify({ resume, jds }, null, 0);

  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: 'deepseek-v4-pro',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      stream: false,
    }),
  });

  if (!resp.ok) {
    throw new Error('DeepSeek 调用失败: HTTP ' + resp.status);
  }
  const data = await resp.json();
  const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  try {
    return JSON.parse(content);
  } catch (e) {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('模型未返回合法 JSON');
  }
}
