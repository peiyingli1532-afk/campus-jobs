#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""每日更新校招清单：Tavily 搜新闻 -> DeepSeek 整理 -> 写回 data.json

只在模型返回合法 JSON 数组时才覆盖 data.json，避免损坏数据。
"""
import json, os, sys, datetime
import requests

DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
TAVILY_URL = "https://api.tavily.com/search"
DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
TAVILY_KEY = os.environ.get("TAVILY_API_KEY", "")
MODEL = "deepseek-v4-pro"

QUERIES = [
    "深圳 2027届 校园招聘 新岗位 官网 互联网 科技 AI 出海",
    "香港 2027 应届生 校招 管理培训生 新岗位 银行",
    "深圳 2027 校招 启动 截止日期 大厂 新增",
]


def load_data():
    with open("data.json", encoding="utf-8") as f:
        return json.load(f)


def tavily_search(query):
    r = requests.post(
        TAVILY_URL,
        json={"api_key": TAVILY_KEY, "query": query,
              "max_results": 5, "search_depth": "basic", "days": 3},
        timeout=30,
    )
    r.raise_for_status()
    return r.json().get("results", [])


def gather_news():
    news = []
    for q in QUERIES:
        try:
            for it in tavily_search(q):
                news.append({
                    "title": it.get("title", ""),
                    "url": it.get("url", ""),
                    "content": (it.get("content") or "")[:600],
                })
        except Exception as e:
            print(f"[search] 失败: {q} -> {e}", file=sys.stderr)
    return news


def call_deepseek(current, news, today):
    system = (
        "你是校招信息整理助手。下面是一份「深圳/香港·互联网/科技/AI/出海/金融/外企」公司校招清单(JSON数组)，"
        "以及今天搜索到的校招新闻。请基于新闻对清单做增/改：\n"
        "- 有新公司或新一批校招启动/截止日期变化，更新对应字段；\n"
        "- 若新闻显示某公司已明确不招/停止，可删除；\n"
        "- 字段结构必须与现有完全一致：name/en/city/ind/role/url/desc/deadline/salary/note(可空)/hidden(可空布尔)/addedDate(可空,\"YYYY-MM-DD\")/jd(可选，{岗位方向:\"关键词 关键词\"}画像)；\n"
        "- hidden=true 表示『尚未开放27届秋招』或『深圳无校招岗』，要保留；若新闻显示它已开放27届校招或有深圳校招岗，则去掉 hidden 并把 addedDate 设为今天；\n"
        "- 新增公司要设 addedDate 为今天；已有公司(含 hidden 的)的 addedDate 保持不变；\n"
        "- 已有公司的 url、jd 字段要原样保留不变（不要改动或截断已有链接）；新增公司时要为它的每个岗位方向生成 jd 关键词画像(8~15个空格分隔关键词，结合该公司业务特点)，且 url 必须是完整可访问的官方投递链接(完整域名+路径，不能截断)；\n"
        "- ind 行业可选值：互联网、科技、AI、出海、金融、外企；外资企业可同时标『外企』+其行业(如 ind:['金融','外企'])；\n"
        "- 只输出更新后的完整 JSON 数组，不要任何解释、不要 markdown 代码块。"
    )
    user = json.dumps({"date": today, "current": current, "news": news}, ensure_ascii=False)
    r = requests.post(
        DEEPSEEK_URL,
        headers={"Authorization": "Bearer " + DEEPSEEK_KEY, "Content-Type": "application/json"},
        json={"model": MODEL, "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ], "temperature": 0.2, "stream": False},
        timeout=180,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def extract_json(text):
    t = text.strip()
    if t.startswith("```"):
        t = t.strip("`")
        if t.startswith("json"):
            t = t[4:]
        t = t.strip()
    try:
        return json.loads(t)
    except Exception:
        pass
    a, b = t.find("["), t.rfind("]")
    if a != -1 and b != -1 and b > a:
        try:
            return json.loads(t[a:b + 1])
        except Exception:
            pass
    return None


def main():
    today = datetime.date.today().isoformat()
    current = load_data()
    news = gather_news()
    print(f"[update] {today} 当前 {len(current)} 家，搜到 {len(news)} 条新闻")
    if not news:
        print("[update] 无新闻，跳过")
        return
    text = call_deepseek(current, news, today)
    updated = extract_json(text)
    if isinstance(updated, list) and len(updated) > 0:
        with open("data.json", "w", encoding="utf-8") as f:
            json.dump(updated, f, ensure_ascii=False, indent=2)
        print(f"[update] 已写入 {len(updated)} 家")
    else:
        print("[update] 模型未返回合法 JSON，本次跳过（保留原数据）")


if __name__ == "__main__":
    main()
