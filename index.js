import engines from "./engines.json";
import main from "./main.html";

const bangs = new Map(engines.map((e) => [e.t, { url: e.u, domain: e.d, subs: new Map(e.sb?.map((sb) => [sb.b, sb])) } ]));

function resolveBang(query) {
  if (!query?.trim()) return null;

  let primary = null;

  const words = query.split(/\s+/);
  const search = [];
  const params = new Map();

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const name = word.replace(/^!|!$/g, "");

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

  const link = url
    .toString()
    .replace("placeholder", encodeURIComponent(search.join(" ")))
    .replace(/%2F/g, "/");

  return link;
}

export default {
  async fetch(request, env, ctx) {
    const search = new URL(request.url).searchParams.get("q");

    if (!search) return new Response(main, {
			headers: {
				"content-type": "text/html",
			},
		});

    const resolvedUrl = resolveBang(search) || `${env.DEFAULT_URL}${encodeURIComponent(search)}`;
    return Response.redirect(resolvedUrl, 302);
  },
};