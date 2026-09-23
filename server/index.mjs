import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const production = process.env.NODE_ENV === "production";
if (
  production &&
  (!process.env.FAMILY_ACCESS_CODE ||
    !process.env.SESSION_SECRET ||
    !process.env.SITE_URL)
)
  throw new Error(
    "FAMILY_ACCESS_CODE, SESSION_SECRET, SITE_URL are required in production",
  );
const secret = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
const accessCode =
  process.env.FAMILY_ACCESS_CODE || randomBytes(9).toString("base64url");
if (!process.env.FAMILY_ACCESS_CODE) {
  const dataDir = path.join(root, "storage");
  await mkdir(dataDir, { recursive: true });
  await writeFile(path.join(dataDir, "local-access-code.txt"), accessCode, {
    mode: 0o600,
  });
  console.log(
    "Local access code saved to storage/local-access-code.txt. Set FAMILY_ACCESS_CODE for deployment.",
  );
}
const content = JSON.parse(
  await readFile(path.join(root, "data/trip.json"), "utf8"),
);
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "4kb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "geolocation=(self)");
  next();
});
const sign = (value) =>
  createHmac("sha256", secret).update(value).digest("base64url");
const same = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
function authenticated(req) {
  const [expires, sig] = (req.cookies.macao_session || "").split(".");
  return Number(expires) > Date.now() && same(sign(expires), sig);
}
function guard(req, res, next) {
  res.setHeader("Cache-Control", "no-store");
  if (!authenticated(req))
    return res.status(401).json({ error: "가족 접근코드를 입력해 주세요." });
  next();
}
function sameOrigin(req, res, next) {
  if (req.get("sec-fetch-site") === "cross-site")
    return res.status(403).json({ error: "허용되지 않은 요청입니다." });
  const origin = req.get("origin");
  if (
    origin &&
    ![
      process.env.SITE_URL,
      `http://localhost:${process.env.PORT || 3001}`,
      `http://127.0.0.1:${process.env.PORT || 3001}`,
      ...(production ? [] : ["http://localhost:5174", "http://127.0.0.1:5174"]),
    ].includes(origin)
  )
    return res.status(403).json({ error: "요청 출처를 확인해 주세요." });
  next();
}
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, service: "our-macao" }),
);
app.get("/api/session", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ authenticated: authenticated(req) });
});
app.post(
  "/api/login",
  sameOrigin,
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: production ? 15 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "시도가 많습니다. 15분 후 다시 시도해 주세요." },
  }),
  (req, res) => {
    if (!same(req.body.code, accessCode))
      return res.status(401).json({
        error: "접근코드가 맞지 않습니다. 가족에게 코드를 확인해 주세요.",
      });
    const expires = String(Date.now() + 30 * 86400000);
    res.cookie("macao_session", `${expires}.${sign(expires)}`, {
      httpOnly: true,
      sameSite: "strict",
      secure: production,
      maxAge: 30 * 86400000,
      path: "/",
    });
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true });
  },
);
app.post("/api/logout", sameOrigin, (_req, res) => {
  res.clearCookie("macao_session", { path: "/" });
  res.json({ ok: true });
});
app.get("/api/trip", guard, (_req, res) => res.json(content));
app.all("/api/profiles/:id", guard, (_req, res) =>
  res.status(405).json({ error: "이름과 소속 팀은 고정되어 있습니다." }),
);
app.use("/uploads", (_req, res) => res.sendStatus(404));
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "요청을 찾을 수 없습니다." }),
);
app.use(express.static(path.join(root, "dist"), { index: false }));
app.get("/{*path}", async (req, res, next) => {
  try {
    const site =
      process.env.SITE_URL || `http://localhost:${process.env.PORT || 3001}`;
    res
      .type("html")
      .send(
        (await readFile(path.join(root, "dist/index.html"), "utf8")).replaceAll(
          "__SITE_URL__",
          site.replace(/\/$/, ""),
        ),
      );
  } catch {
    next();
  }
});
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res
    .status(500)
    .json({ error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." });
});
app.listen(Number(process.env.PORT || 3001), "0.0.0.0", () =>
  console.log(`Macao ready on port ${process.env.PORT || 3001}`),
);
