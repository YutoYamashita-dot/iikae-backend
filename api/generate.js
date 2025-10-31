// api/generate.js
// Node.js (Vercel Serverless Function / Node Runtime)

import OpenAI from "openai";

export const config = {
  runtime: "nodejs"
};

// --- サポート言語（トップ20） ---
const SUPPORTED = new Set([
  "auto","en","ja","zh","hi","es","fr","ar","bn","pt","ru","ur","id","de","sw","mr","te","tr","ta","vi","ko"
]);

// 地域付き → ベースコード正規化
function normalizeLang(code = "") {
  const c = String(code).toLowerCase().replace("_","-");
  const base = c.split("-")[0];
  return SUPPORTED.has(base) ? base : (SUPPORTED.has(c) ? c : null);
}

// --- 簡易言語判定（日本語文字を含むかで判定、なければ英語扱い） ---
function isJapanese(text) {
  if (!text) return false;
  return /[\u3040-\u30FF\u4E00-\u9FFF\uFF66-\uFF9D]/.test(text);
}

function decideLang(topic, lang) {
  const n = normalizeLang(lang);
  if (n && n !== "auto") return n;
  if (isJapanese(topic)) return "ja";
  return "en";
}

// ★ Accept-Language ヘッダーからの簡易推定（auto 時のみの補助）
function pickLangFromHeader(acceptLanguage = "") {
  const v = String(acceptLanguage || "").toLowerCase();
  if (!v) return null;
  for (const code of ["ja","en","zh","hi","es","fr","ar","bn","pt","ru","ur","id","de","sw","mr","te","tr","ta","vi","ko"]) {
    if (v.includes(code)) return code;
  }
  return null;
}

// --- フォールバック（テンプレ） ---
const fallback = {
  en(topic = "it") {
    return [
      { title: "Reboot button for humans", desc: `If you don’t press it in the morning, your day freezes. — ${topic} is just playing that role.` },
      { title: "Emergency exit from boredom", desc: `A device to bail out whenever stuck. In short, ${topic} is another name for “Emergency exit from boredom”.` },
      { title: "Band-aid for motivation", desc: `Not a cure, but you can move now. That is exactly what people expect from ${topic}.` }
    ];
  },
  ja(topic = "それ") {
    return [
      { title: "人間用の再起動ボタン", desc: `朝に押さないと、一日じゅうフリーズする。— ${topic}がその役をやっているだけ。` },
      { title: "退屈の非常口", desc: `困ったらそこから脱出できる装置。要するに${topic}は「退屈の非常口」の別名。` },
      { title: "やる気の絆創膏", desc: `根本治療はしないが、今は動けるようにする。${topic}に期待されているのは、だいたいこれ。` }
    ];
  },
  zh(topic = "它") {
    return [
      { title: "人类的重启按钮", desc: `早上不按，一天就卡住——${topic}只是在扮演这个角色。` },
      { title: "无聊的紧急出口", desc: `卡住时的逃生装置。简而言之，${topic}就是“无聊的紧急出口”的别名。` },
      { title: "动力的创可贴", desc: `不是根治，但能先动起来。人们对${topic}的期待大致如此。` }
    ];
  },
  hi(topic = "यह") {
    return [
      { title: "मानवों का रीबूट बटन", desc: `सुबह इसे न दबाओ तो दिन फ्रीज़ हो जाता है — ${topic} बस वही किरदार निभाता है।` },
      { title: "ऊब का इमरजेंसी एग्ज़िट", desc: `फँसने पर बाहर निकलने का यंत्र। संक्षेप में, ${topic} इसी का दूसरा नाम है।` },
      { title: "मोटिवेशन की पट्टी", desc: `इलाज नहीं, पर अभी चल पड़ने लायक बनाता है। ${topic} से यही अपेक्षा रहती है।` }
    ];
  },
  es(topic = "eso") {
    return [
      { title: "Botón de reinicio humano", desc: `Si no lo pulsas por la mañana, el día se cuelga — ${topic} solo cumple ese papel.` },
      { title: "Salida de emergencia del aburrimiento", desc: `Un dispositivo para escapar cuando te atascas. En resumen, ${topic} es otro nombre de ello.` },
      { title: "Tirita de motivación", desc: `No cura, pero te pone en marcha. Eso es lo que se espera de ${topic}.` }
    ];
  },
  fr(topic = "ça") {
    return [
      { title: "Bouton de redémarrage humain", desc: `Sans appuyer le matin, la journée se fige — ${topic} ne fait que jouer ce rôle.` },
      { title: "Issue de secours contre l’ennui", desc: `Un dispositif pour s’échapper quand on bloque. En bref, ${topic} en est l’autre nom.` },
      { title: "Pansement de motivation", desc: `Pas un remède, mais ça remet en mouvement. C’est ce qu’on attend de ${topic}.` }
    ];
  },
  ar(topic = "ذلك") {
    return [
      { title: "زر إعادة تشغيل للبشر", desc: `إن لم تضغطه صباحاً تتجمّد يومك — ${topic} يقوم بهذا الدور فحسب.` },
      { title: "مخرج طوارئ من الملل", desc: `جهاز للهروب عند التعطّل. باختصار، ${topic} اسم آخر له.` },
      { title: "ضمادة للدافعية", desc: `ليس علاجاً جذرياً لكنه يجعلك تتحرّك الآن. هذا ما يُتوقّع من ${topic}.` }
    ];
  },
  bn(topic = "ওটা") {
    return [
      { title: "মানুষের রিবুট বোতাম", desc: `সকালে না চাপলে দিন হ্যাং হয় — ${topic} শুধু সেই ভূমিকাই করছে।` },
      { title: "একঘেয়েমির জরুরি বহির্গমন", desc: `আটকে গেলে বেরিয়ে আসার যন্ত্র। সংক্ষেপে, ${topic} এরই আরেক নাম।` },
      { title: "মোটিভেশনের ব্যান্ড-এড", desc: `আরোগ্য নয়, এখন চলতে সাহায্য করে। ${topic} থেকে এটিই প্রত্যাশা।` }
    ];
  },
  pt(topic = "isso") {
    return [
      { title: "Botão de reinício humano", desc: `Se não apertar de manhã, o dia trava — ${topic} só faz esse papel.` },
      { title: "Saída de emergência do tédio", desc: `Um dispositivo para escapar quando trava. Em resumo, ${topic} é outro nome disso.` },
      { title: "Curativo de motivação", desc: `Não cura, mas te coloca em movimento. É isso que se espera de ${topic}.` }
    ];
  },
  ru(topic = "это") {
    return [
      { title: "Кнопка перезагрузки для людей", desc: `Если утром не нажать — день зависнет. ${topic} лишь играет эту роль.` },
      { title: "Аварийный выход из скуки", desc: `Устройство для побега, когда застрял. Проще говоря, ${topic} — другое название этого.` },
      { title: "Пластырь мотивации", desc: `Не лечит, но заставляет двигаться. Этого и ждут от ${topic}.` }
    ];
  },
  ur(topic = "یہ") {
    return [
      { title: "انسانوں کا ری بوٹ بٹن", desc: `صبح نہ دباؤ تو دن جم جاتا ہے — ${topic} بس یہی کردار ادا کرتا ہے۔` },
      { title: "بوریت کا ایمرجنسی ایگزٹ", desc: `اٹکنے پر نکلنے کی ترکیب۔ مختصراً، ${topic} اسی کا دوسرا نام ہے۔` },
      { title: "حوصلہ افزائی کی پٹی", desc: `علاج نہیں مگر ابھی حرکت دلاتی ہے۔ ${topic} سے یہی توقع ہے۔` }
    ];
  },
  id(topic = "itu") {
    return [
      { title: "Tombol reboot manusia", desc: `Kalau pagi tidak ditekan, seharian nge-freeze — ${topic} cuma berperan seperti itu.` },
      { title: "Pintu darurat dari bosan", desc: `Perangkat untuk kabur saat buntu. Singkatnya, ${topic} adalah nama lain dari itu.` },
      { title: "Plester motivasi", desc: `Bukan obat tuntas, tapi bikin bergerak sekarang. Itulah yang diharapkan dari ${topic}.` }
    ];
  },
  de(topic = "das") {
    return [
      { title: "Neustartknopf für Menschen", desc: `Drückst du ihn morgens nicht, friert der Tag ein — ${topic} erfüllt nur diese Rolle.` },
      { title: "Notausgang aus der Langeweile", desc: `Ein Gerät zum Aussteigen, wenn man feststeckt. Kurz: ${topic} ist ein anderer Name dafür.` },
      { title: "Motivations-Pflaster", desc: `Keine Heilung, aber man kommt in Gang. Das erwartet man von ${topic}.` }
    ];
  },
  sw(topic = "hicho") {
    return [
      { title: "Kitufe cha kuwasha upya binadamu", desc: `Usipokibonyeza asubuhi, siku inagandia — ${topic} hufanya tu jukumu hilo.` },
      { title: "Mlango wa dharura kutoka kwenye kuchoka", desc: `Kifaa cha kutoroka unapokwama. Kwa kifupi, ${topic} ni jina lingine la hilo.` },
      { title: "Plasta ya motisha", desc: `Si tiba, lakini inakuweka uwanjani sasa. Hicho ndicho kinachotarajiwa kutoka kwa ${topic}.` }
    ];
  },
  mr(topic = "ते") {
    return [
      { title: "माणसांचा रिबूट बटण", desc: `सकाळी दाबलं नाही तर दिवस हँग होतो — ${topic} फक्त तीच भूमिका बजावतो.` },
      { title: "कंटाळ्याचा इमर्जन्सी एक्झिट", desc: `अडकले की बाहेर काढणारे साधन. थोडक्यात, ${topic} त्याचं दुसरं नाव.` },
      { title: "मोटिवेशनची पट्टी", desc: `उपचार नाही, पण आत्ता चालना देते. ${topic} कडून हेच अपेक्षित.` }
    ];
  },
  te(topic = "అది") {
    return [
      { title: "మనుషుల రీబూట్ బటన్", desc: `ఉదయం నొక్కకపోతే రోజు ఫ్రీజ్ అవుతుంది — ${topic} ఆ పాత్రనే పోషిస్తుంది.` },
      { title: "బోర్‌కు ఎమర్జెన్సీ ఎగ్జిట్", desc: `అరుస్తే బయటకు లాగే పరికరం. మొత్తం మీద, ${topic} అదే పేరుకు మరో రూపం.` },
      { title: "మోటివేషన్ ప్లాస్టర్", desc: `చికిత్స కాదు, ఇప్పుడే కదలిస్తుంది. ${topic} నుండి అదే ఆశిస్తారు.` }
    ];
  },
  tr(topic = "o") {
    return [
      { title: "İnsanlar için yeniden başlatma düğmesi", desc: `Sabah basmazsan gün donar — ${topic} sadece bu rolü oynar.` },
      { title: "Sıkıntıdan acil çıkış", desc: `Sıkışınca kaçış aygıtı. Kısacası, ${topic} bunun başka adıdır.` },
      { title: "Motivasyon bandı", desc: `Tedavi değil ama harekete geçirir. ${topic}’den beklenen budur.` }
    ];
  },
  ta(topic = "அது") {
    return [
      { title: "மனிதருக்கான ரீபூட் பொத்தான்", desc: `காலை அழுத்தாவிட்டால் நாள் உறையும் — ${topic} அந்த வேடம்தான் செய்கிறது.` },
      { title: "சலிப்பிலிருந்து அவசர வெளியேறு", desc: `சிக்கும்போது தப்பிக்கச் செய்கிறது. சுருக்கமாக, ${topic} அதற்கே இன்னொரு பெயர்.` },
      { title: "மோட்டிவேஷன் பேண்ட்ஏய்ட்", desc: `சிகிச்சை அல்ல, இப்போது நகர்த்தும். ${topic} மீது இதுவே எதிர்பார்ப்பு.` }
    ];
  },
  vi(topic = "nó") {
    return [
      { title: "Nút khởi động lại cho con người", desc: `Sáng không bấm là cả ngày đứng hình — ${topic} chỉ đang đóng vai ấy thôi.` },
      { title: "Lối thoát khẩn cấp khỏi buồn chán", desc: `Thiết bị để thoát ra khi mắc kẹt. Nói ngắn gọn, ${topic} là tên gọi khác của nó.` },
      { title: "Băng dán động lực", desc: `Không chữa dứt điểm, nhưng giúp chạy ngay. Người ta mong ở ${topic} điều đó.` }
    ];
  },
  ko(topic = "그것") {
    return [
      { title: "사람을 위한 재부팅 버튼", desc: `아침에 누르지 않으면 하루가 얼어붙는다 — ${topic}는 그 역할만 한다.` },
      { title: "지루함의 비상구", desc: `막힐 때 빠져나오는 장치. 한마디로, ${topic}의 다른 이름이다.` },
      { title: "동기부여 반창고", desc: `치료는 아니지만 지금 움직이게 한다. ${topic}에 기대하는 바가 그것.` }
    ];
  }
};

// --- OpenAI で生成 ---
// 言語別の system / user テンプレート（なければ英語にフォールバック）
const SYS = {
  ja: "入力された言葉について、意外性と納得感と少しの風刺を含んだ言い換えを出力して。3件だけ出力。各件はJSONの {title, desc}。タイトルは6〜16字、説明は20〜50字とする。JSONのみ返す。",
  en: "You are a concise copywriter. Output must be in the requested language, written style, declarative tone. Return exactly 3 items as JSON objects {title, desc}. Titles are crisp (3–8 words). Descriptions are 25–120 words and end with a short clarifying tail. Return JSON only."
};
const USER = {
  ja: (topic) => `トピック: ${topic}
要件:
- 言語: 入力された言語
- 文体: 書き言葉・断定調（です/ますを避ける）
- 「${topic}」の性質を意外性と納得感があるラベリングで表現し、タイトルと説明を作る
- JSON配列のみを返す（余計な文字やマークダウンを含めない）`,
  en: (topic) => `Topic: ${topic}
Requirements:
- Language: the requested target language (strict)
- Style: written, declarative
- Express the nature of "${topic}" via metaphors / metaphorical labeling; produce title and description
- Return JSON array only (no extra text, no markdown)`
};

// 他言語は system=EN を使い、user 側で「出力言語はXX」と明示する
function buildMessages(targetLang, topic) {
  const sys = SYS[targetLang] ?? SYS.en;
  if (targetLang === "ja") {
    return [
      { role: "system", content: sys },
      { role: "user", content: USER.ja(topic) }
    ];
  }
  const langName = {
    en:"English", ja:"Japanese", zh:"Chinese", hi:"Hindi", es:"Spanish", fr:"French", ar:"Arabic", bn:"Bengali",
    pt:"Portuguese", ru:"Russian", ur:"Urdu", id:"Indonesian", de:"German", sw:"Swahili", mr:"Marathi",
    te:"Telugu", tr:"Turkish", ta:"Tamil", vi:"Vietnamese", ko:"Korean"
  }[targetLang] || "English";

  const user = `Topic: ${topic}
Requirements:
- Output language: ${langName} (STRICT)
- Style: written, declarative
- Produce exactly 3 items as JSON array of objects {title, desc}
- Titles: short and punchy; Descriptions: compact but clear and end with a short clarifying tail
- Return JSON array only (no extra text, no markdown)`;
  return [
    { role: "system", content: SYS.en },
    { role: "user", content: user }
  ];
}

// ★★★ 追加：モデルがJSON以外やMarkdownで返しても安全に拾う抽出器 ★★★
function extractFirstJson(text = "") {
  // 1) まず配列 [ ... ] を優先抽出
  const arrMatch = text.match(/\[\s*{[\s\S]*}\s*\]/);
  if (arrMatch) {
    try { return { items: JSON.parse(arrMatch[0]) }; } catch {}
  }
  // 2) 次にオブジェクト { ... } を抽出
  const objMatch = text.match(/\{\s*"(?:items|title|desc)":[\s\S]*\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]);
      if (Array.isArray(obj)) return { items: obj };
      if (Array.isArray(obj.items)) return { items: obj.items };
    } catch {}
  }
  // 3) そのままJSONとして試す
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return { items: parsed };
    if (Array.isArray(parsed?.items)) return { items: parsed.items };
  } catch {}
  throw new Error("Invalid JSON from model");
}
// ★★★ ここまで ★★★

async function generateWithOpenAI({ topic, lang }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // ★ 環境変数が空/不正ならデフォルトへ
  const envModel = (process.env.OPENAI_MODEL || "").trim();
  const model = envModel || "gpt-5";

  const messages = buildMessages(lang, topic);

  try {
    const res = await client.chat.completions.create({
      model,
      messages,
      
  
      // ※ response_format は外す（非対応モデルでも動く）
    });

    const text = res.choices?.[0]?.message?.content ?? "";
    const parsed = extractFirstJson(text); // ★ 堅牢抽出
    const items = parsed.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Empty items");
    }
    return items.slice(0, 3).map(({ title, desc }) => ({
      title: String(title ?? "").trim(),
      desc: String(desc ?? "").trim()
    }));
  } catch (e) {
    console.error("[OpenAI ERROR]", {
      status: e?.status,
      code: e?.code,
      message: e?.message
    });
    throw e;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { topic = "", lang = "auto" } = (await readJson(req)) ?? {};

    // lang=auto のときだけ Accept-Language を補助判定に利用
    const headerHint = lang === "auto" ? pickLangFromHeader(req.headers["accept-language"]) : null;
    const hintOrLang = headerHint || lang;
    const targetLang = decideLang(topic, hintOrLang);

    // ★ APIキー未設定なら明示ログ（運用時の見落とし防止）
    if (!process.env.OPENAI_API_KEY) {
      console.warn("[WARN] OPENAI_API_KEY is not set. Falling back.");
      const fb = fallback[targetLang] ?? fallback.en;
      const topicFallback = topic || (targetLang === "ja" ? "それ" : (targetLang === "zh" ? "它" : "it"));
      const items = fb(topicFallback);
      return res.status(200).json({ items, source: "fallback" });
    }

    try {
      const items = await generateWithOpenAI({ topic, lang: targetLang });
      return res.status(200).json({ items, source: "openai" });
    } catch (e) {
      // OpenAI 側失敗時は 200 + fallback（HTTPエラーでフロントを止めない）
      const fb = fallback[targetLang] ?? fallback.en;
      const topicFallback = topic || (targetLang === "ja" ? "それ" : (targetLang === "zh" ? "它" : "it"));
      const items = fb(topicFallback);
      return res.status(200).json({ items, source: "fallback_model_error" });
    }
  } catch (e) {
    console.error("[HANDLER ERROR]", e);
    return res.status(400).json({ error: "Bad Request" });
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}