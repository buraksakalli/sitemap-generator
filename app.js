const fs = require("fs");

const globby = require("globby");
const prettier = require("prettier");

const firebase = require("firebase-admin");
const serviceAccount = require("./config/firebase.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const m = new Date();
const lastMod =
  m.getUTCFullYear() +
  "-" +
  (m.getUTCMonth() + 1 < 10 ? "0" + m.getUTCMonth() + 1 : m.getUTCMonth() + 1) +
  "-" +
  (m.getUTCDate() < 10 ? "0" + m.getUTCDate() : m.getUTCDate()) +
  "T" +
  (m.getUTCHours() < 10 ? "0" + m.getUTCHours() : m.getUTCHours()) +
  ":" +
  (m.getUTCMinutes() < 10 ? "0" + m.getUTCMinutes() : m.getUTCMinutes()) +
  ":" +
  (m.getUTCSeconds() < 10 ? "0" + m.getUTCSeconds() : m.getUTCSeconds()) +
  "Z";

(async () => {
  const [pageList] = await Promise.all([firebase.firestore().collection("faq").get()]);

  const page = pageList.docs.map((p) => ({
    id: p.id,
    ...p.data(),
  }));

  const prettierConfig = await prettier.resolveConfig("./.prettierrc.js");
  const pages = await globby([
    "pages/*.js",
    "pages/",
    "!pages/_*.js",
    "!pages/api",
  ]);

  const sitemap = `
        <?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            ${pages
              .map((page) => {
                const path = page
                  .replace("pages", "")
                  .replace("..", "")
                  .replace("/", "")
                  .replace("data", "")
                  .replace(".js", "")
                  .replace(".mdx", "");
                const route = path === "/index" ? "" : path;
                return `
                        <url>
                            <loc>${`https://buraksakalli.org/${route}`}</loc>
                            <lastmod>${lastMod}</lastmod>
                        </url>
                    `;
              })
              .join("")}
              ${page.map((p) => {
                return `
                        <url>
                            <loc>${`https://buraksakalli.org/${p.slug}`}</loc>
                            <lastmod>${lastMod}</lastmod>
                        </url>
                    `;
              })}
        </urlset>
    `;

  const formatted = prettier.format(sitemap, {
    ...prettierConfig,
    parser: "html",
  });

  fs.writeFileSync("public/sitemap.xml", formatted);
})();
