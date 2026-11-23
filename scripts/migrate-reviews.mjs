import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Set DATABASE_URL before running the review migration.");
  process.exit(1);
}

const exportPath = process.argv[2];
const reviews = exportPath ? JSON.parse(await readFile(exportPath, "utf8")) : [];
if (!Array.isArray(reviews) || reviews.some(review =>
  typeof review?.id !== "string" || !review.id ||
  typeof review.displayName !== "string" || !review.displayName.trim() || review.displayName.length > 40 ||
  typeof review.review !== "string" || !review.review.trim() || review.review.length > 600 ||
  !Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5 ||
  !Number.isSafeInteger(review.updatedAt)
)) {
  console.error("Expected an array of valid customer reviews.");
  process.exit(1);
}

const sql = neon(connectionString);
const schema = await readFile(new URL("../db/001_customer_reviews.sql", import.meta.url), "utf8");
const statements = schema.split(";").map(statement => statement.trim()).filter(Boolean);
await sql.transaction(statements.map(statement => sql.query(statement)));

const batchSize = 50;
let imported = 0;
for (let offset = 0; offset < reviews.length; offset += batchSize) {
  const batch = reviews.slice(offset, offset + batchSize);
  const results = await sql.transaction(batch.map(({ id, displayName, rating, review, updatedAt }) => sql`
    INSERT INTO customer_reviews (id, author_id, display_name, rating, review, updated_at)
    VALUES (${id}, ${"legacy:" + id}, ${displayName}, ${rating}, ${review}, ${updatedAt})
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `));
  for (const rows of results) imported += rows.length;
}
console.log(`Review schema is ready. Imported ${imported} reviews.`);
