// api/generate.js
// Node.js (Vercel Serverless Function / Node Runtime)

import OpenAI from "openai";

export const config = {
  runtime: "nodejs"
};

// --- 簡易言語判定（日本語文字を含むかで判定、なければ英語扱い） ---
function isJapanese(text) {
  if (!text) return false;
  return /[\u3040-\u30FF\u4E00-\u9FFF\uFF66-\uFF9D]/.test(text);
}

function decideLang(topic, lang) {
  if (!lang || lang === "auto") {
    return isJapanese(topic) ? "ja" : "en";
  }
  return lang.toLowerCase();
}

// ★ 追加: Accept-Language ヘッダーからの簡易推定（auto 時のみの補助）
function pickLangFromHeader(acceptLanguage = "") {
  const v = String(acceptLanguage || "").toLowerCase();
  if (!v) return null;
  // "ja,ja-JP;q=0.9,en-US;q=0.8,en;q=0.7" のような文字列を想定
  if (v.includes("ja")) return "ja";
  if (v.includes("en")) return "en";
  return null;
}

// --- フォールバック（テンプレ） ---
const fallback = {
  en(topic = "it") {
    return [
      {
        title: "Reboot button for humans",
        desc:
          `If you don’t press it in the morning, your day freezes. — ${topic} is just playing that role.`
      },
      {
        title: "Emergency exit from boredom",
        desc:
          `A device to bail out whenever stuck. In short, ${topic} is another name for “Emergency exit from boredom”.`
      },
      {
        title: "Band-aid for motivation",
        desc:
          `Not a cure, but you can move now. That is exactly what people expect from ${topic}.`
      }
    ];
  },
  ja(topic = "それ") {
    return [
      {
        title: "人間用の再起動ボタン",
        desc:
          `朝に押さないと、一日じゅうフリーズする。— ${topic}がその役をやっているだけ。`
      },
      {
        title: "退屈の非常口",
        desc:
          `困ったらそこから脱出できる装置。要するに${topic}は「退屈の非常口」の別名。`
      },
      {
        title: "やる気の絆創膏",
        desc:
          `根本治療はしないが、今は動けるようにする。${topic}に期待されているのは、だいたいこれ。`
      }
    ];
  }
};

// --- OpenAI で生成 ---
async function generateWithOpenAI({ topic, lang }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const sys = (l) => {
    if (l === "ja") {
      return "入力された言葉について、意外性と納得感がある言い換えを出力して。3件だけ出力。各件はJSONの {title, desc}。タイトルは8〜20字、説明は20〜40字で、最後に短い追い文を付けて含意を明確化する。句読点と表記は日本語規範に従う。";
    }
    // default: English
    return "You are a concise copywriter. Output must be in English, written style, declarative tone. Return exactly 3 items as JSON objects {title, desc}. Titles are crisp (3–8 words). Descriptions are 25–90 words and end with a short clarifying tail that links back to the topic.";
  };

  const user = (l) => {
    if (l === "ja") {
      return `トピック: ${topic}\n
要件:
- 言語: 日本語か英語
- 文体: 書き言葉・断定調（です/ますを避ける）
- 「${topic}」の性質を比喩で表現し、タイトルと説明を作る
- JSON配列のみを返す（余計な文字やマークダウンを含めない）`;
    }
    return `Topic: ${topic}
Requirements:
- Language: English (strict)
- Style: written, declarative
- Express the nature of "${topic}" via metaphors; produce title and description
- Return JSON array only (no extra text, no markdown)`;
  };

  const messages = [
    { role: "system", content: sys(lang) },
    { role: "user", content: user(lang) }
  ];

  // gpt-4o-mini など軽量モデル（環境変数優先）
  const model = process.env.OPENAI_MODEL || "gpt-5";

  const res = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.8,
    max_tokens: 500,
    response_format: { type: "json_object" } // JSON強制
  });

  // 期待: { "items": [ {title, desc}, ... ] } or [ ... ]
  const text = res.choices?.[0]?.message?.content ?? "";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // モデルがJSONで返していない場合に備えた再解釈
    // JSON配列のみがきた時も対応
    if (text.trim().startsWith("[")) {
      parsed = { items: JSON.parse(text) };
    } else {
      throw new Error("Invalid JSON from model");
    }
  }

  const items = Array.isArray(parsed) ? parsed : parsed.items;
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error("Empty items");
  }
  // 3件に揃える（多ければ切る・少なければ落とす）
  return items.slice(0, 3).map(({ title, desc }) => ({
    title: String(title ?? "").trim(),
    desc: String(desc ?? "").trim()
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { topic = "", lang = "auto" } = (await readJson(req)) ?? {};

    // ★ 追加: lang=auto のときだけ Accept-Language を補助判定に利用
    const headerHint = lang === "auto" ? pickLangFromHeader(req.headers["accept-language"]) : null;
    const langHint = headerHint || lang;

    const targetLang = decideLang(topic, langHint);

    if (!process.env.OPENAI_API_KEY) {
      // フォールバック（言語厳守）
      const items = (fallback[targetLang] ?? fallback.en)(topic || (targetLang === "ja" ? "それ" : "it"));
      return res.status(200).json({ items, source: "fallback" });
    }

    try {
      const items = await generateWithOpenAI({ topic, lang: targetLang });
      return res.status(200).json({ items, source: "openai" });
    } catch (e) {
      const items = (fallback[targetLang] ?? fallback.en)(topic || (targetLang === "ja" ? "それ" : "it"));
      return res.status(200).json({ items, source: "fallback_model_error" });
    }
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: "Bad Request" });
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}