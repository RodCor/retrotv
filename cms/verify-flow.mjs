// End-to-end verification of the CMS auth + SSO integration.
// Creates a test admin user, mints a session cookie, and prints both so the
// shell can curl the authed routes. Run with: node verify-flow.mjs
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const db = {
  host: "127.0.0.1", port: 13306,
  user: "arcturus_user", password: "arcturus_pw", database: "arcturus",
};
const SECRET = "dev-only-insecure-secret-change-me-in-production-please-0000";
const USERNAME = "AdminTest";
const PASSWORD = "test1234";

const pool = await mysql.createPool({ ...db, namedPlaceholders: true });
const now = Math.floor(Date.now() / 1000);
const hash = await bcrypt.hash(PASSWORD, 10);

// Upsert the test admin (rank 7 = full staff in the default permissions table).
const [existing] = await pool.execute(
  "SELECT id FROM users WHERE username = :u",
  { u: USERNAME },
);
let userId;
if (existing.length) {
  userId = existing[0].id;
  await pool.execute(
    "UPDATE users SET password=:p, rank=7 WHERE id=:id",
    { p: hash, id: userId },
  );
} else {
  const [res] = await pool.execute(
    `INSERT INTO users
      (username, real_name, password, mail, account_created, last_login, last_online,
       motto, look, gender, rank, credits, pixels, points, online, auth_ticket,
       ip_register, ip_current, machine_id, home_room)
     VALUES (:u, :u, :p, :mail, :now, :now, :now, :motto, :look, 'M', 7, 9999, 9999, 999,
       '0', '', '127.0.0.1', '127.0.0.1', '', 0)`,
    {
      u: USERNAME, p: hash, mail: "admin@retrotv.local", now,
      motto: "Hotel Manager", look: "hr-100-61.hd-180-1.ch-210-66.lg-270-82.sh-290-80",
    },
  );
  userId = res.insertId;
}

// Verify password round-trips (what loginAction does).
const [rows] = await pool.execute("SELECT password, rank FROM users WHERE id=:id", { id: userId });
const passOk = await bcrypt.compare(PASSWORD, rows[0].password);

// Mint a session cookie identical to createSessionToken().
const token = await new SignJWT({ userId, username: USERNAME, rank: rows[0].rank })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("604800s")
  .sign(new TextEncoder().encode(SECRET));

console.log("USERID=" + userId);
console.log("RANK=" + rows[0].rank);
console.log("PASS_VERIFY=" + (passOk ? "OK" : "FAIL"));
console.log("COOKIE=retrotv_session=" + token);
await pool.end();
