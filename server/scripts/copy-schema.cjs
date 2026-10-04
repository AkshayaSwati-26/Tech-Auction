// The server reads its SQL schema files at startup; tsc does not copy non-TypeScript files.
const fs = require("node:fs");
const path = require("node:path");
for (const file of ["schema.sqlite.sql", "schema.pg.sql"]) {
  fs.copyFileSync(path.join(__dirname, "..", "src", "db", file), path.join(__dirname, "..", "dist", "db", file));
}
