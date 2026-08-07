import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const distDir = "dist-admin";
const adminHtml = join(distDir, "src", "admin.html");
const indexHtml = join(distDir, "index.html");

mkdirSync(dirname(indexHtml), { recursive: true });
copyFileSync(adminHtml, indexHtml);

console.log("Prepared Cloudflare admin build at dist-admin/");
