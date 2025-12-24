import engines from "./assets/engines.json";

const bangs = new Map(engines.flatMap(e => [e.t, ...(e.ts || [])].map(bang => [bang, { url: e.u, domain: e.d, subs: new Map(e.sb?.map(sb => [sb.b, sb])), fmt: e.fmt || [] }])));

function resolve(query) {
  if (!query?.trim()) return null;

  let primary = null;

  const words = query.split(/\s+/);
  const search = [];
  const params = new Map();

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const name = word.replace(/^!|!$/g, "").toLowerCase();

    if (!word.startsWith("!") && !word.endsWith("!")) {
      search.push(word);
      continue;
    }

    if (!primary && bangs.has(name)) {
      primary = name;
      continue;
    }

    if (primary) {
      const engine = bangs.get(primary);

      const sub = engine.subs.get(name);
      if (!sub) continue;

      let value;
      if (sub.l === -1) {
        value = words.slice(i + 1).join(" ");
        i = words.length;
      } else if (sub.l > 0) {
        value = words.slice(i + 1, i + 1 + sub.l).join(" ");
        i += sub.l;
      } else value = sub.v || sub.d || "";

      params.set(name, value);
    }
  }

  if (!primary) return null;

  const engine = bangs.get(primary);

  if (search.length === 0 && params.size === 0) return `https://${engine.domain}`;

  const url = new URL(engine.url.replace("{{{s}}}", "placeholder"));

  params.forEach((value, key) => {
    const sub = engine.subs.get(key);
    if (sub?.u) url.searchParams.set(sub.u, value);
  });

  return url
    .toString()
    .replace(
      "placeholder",
      encodeURIComponent(search.join(" "))
        .replace(engine.fmt.includes("url_encode_placeholder") ? "" : /%2F/g, "/")
        .replace(engine.fmt.includes("url_encode_space_to_plus") ? /%20/g : "", "+")
    );
}

function fill(template, query) {
  if (!template) return query;

  return template.includes("%s") ? template.replace(/%s/g, query) : template + query;
}

async function getEngine(input) {
  let templates = input;

  if (typeof templates === "string") {
    try {
      templates = JSON.parse(templates);
    } catch {}
  }

  if (!Array.isArray(templates)) return templates;

  for (const template of templates) {
    try {
      const url = new URL(template);

      const response = await fetch(url.origin, { method: "GET", redirect: "manual" });
      if (response?.status === 200) return template;
    } catch {}
  }

  return templates[0];
}

export default {
  async fetch(request, env, ctx) {
    const context = new URL(request.url);
    const path = context.pathname;

    if (path === "/s" || path === "/c") {
      const search = context.searchParams.get("q");
      const custom = context.searchParams.get("s");

      const encoded = encodeURIComponent(search || "");

      if (path === "/c") {
        const target = fill(custom || await getEngine(env.DEFAULT_COMPLETE), encoded);
        return Response.redirect(target, 302);
      }

      if (path === "/s") {
        const target = resolve(search) || fill(custom || await getEngine(env.DEFAULT_SEARCH), encoded);
        return Response.redirect(target, 302);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
