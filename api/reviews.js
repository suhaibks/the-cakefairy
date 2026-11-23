import { createClerkClient } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";

const { CLERK_SECRET_KEY, DATABASE_URL } = process.env;
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? process.env.CLERK_PUBLISHABLE_KEY;
const clerk = publishableKey && CLERK_SECRET_KEY
  ? createClerkClient({ publishableKey, secretKey: CLERK_SECRET_KEY })
  : null;
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;
const pageSize = 12;

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", ...headers },
  });
}

async function listReviews(authorId, url) {
  const page = Number(url.searchParams.get("page") ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) {
    return json({ error: "Invalid review page." }, 400);
  }

  const queries = [
    sql`SELECT id, display_name AS "displayName", rating, review, updated_at AS "updatedAt"
        FROM customer_reviews ORDER BY updated_at DESC, id DESC
        LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}`,
    sql`SELECT COUNT(*)::integer AS count, AVG(rating)::double precision AS average FROM customer_reviews`,
  ];
  if (authorId) {
    queries.push(sql`SELECT id, display_name AS "displayName", rating, review, updated_at AS "updatedAt"
                     FROM customer_reviews WHERE author_id = ${authorId}`);
  }

  const [reviews, [summary], ownReviews] = await sql.transaction(queries, {
    isolationLevel: "RepeatableRead",
    readOnly: true,
  });
  return json({
    reviews: reviews.slice(0, pageSize).map(review => ({ ...review, updatedAt: Number(review.updatedAt) })),
    hasMore: reviews.length > pageSize,
    ...summary,
    canReview: Boolean(authorId),
    ownReview: ownReviews?.[0] ?? null,
    clerkPublishableKey: clerk ? publishableKey : null,
  });
}

async function saveReview(request, authorId, url) {
  if (!authorId) return json({ error: "Sign in to write a review." }, 401);
  if (request.headers.get("Origin") !== url.origin) {
    return json({ error: "Submit your review on this site." }, 403);
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("Content-Type") ?? "")) {
    return json({ error: "Expected a JSON review." }, 415);
  }
  if (Number(request.headers.get("Content-Length")) > 8192) {
    return json({ error: "This review is too long." }, 413);
  }

  const body = await request.text();
  if (body.length > 8192) return json({ error: "This review is too long." }, 413);

  let input;
  try {
    input = JSON.parse(body);
  } catch {
    return json({ error: "This review could not be read." }, 400);
  }
  const displayName = typeof input?.displayName === "string" ? input.displayName.trim() : "";
  const review = typeof input?.review === "string" ? input.review.trim() : "";
  const rating = input?.rating;
  if (!displayName || displayName.length > 40 || !review || review.length > 600
    || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json({ error: "Enter a display name, a rating from 1 to 5, and a review of up to 600 characters." }, 400);
  }

  await sql`INSERT INTO customer_reviews (id, author_id, display_name, rating, review, updated_at)
    VALUES (${crypto.randomUUID()}, ${authorId}, ${displayName}, ${rating}, ${review}, ${Date.now()})
    ON CONFLICT (author_id) DO UPDATE SET
      display_name = excluded.display_name,
      rating = excluded.rating,
      review = excluded.review,
      updated_at = excluded.updated_at`;
  return json({ saved: true });
}

export default {
  async fetch(request) {
    const { method } = request;
    if (method !== "GET" && method !== "POST") {
      return json({ error: "Method not allowed." }, 405, { Allow: "GET, POST" });
    }
    if (!sql) return json({ error: "Reviews are temporarily unavailable." }, 503);

    const url = new URL(request.url);
    try {
      const authorization = request.headers.get("Authorization");
      const session = clerk && authorization
        ? (await clerk.authenticateRequest(new Request(request.url, { headers: { Authorization: authorization } }), {
          authorizedParties: [url.origin],
          acceptsToken: "session_token",
        })).toAuth()
        : null;
      const authorId = session?.sessionClaims?.azp === url.origin ? session.userId : null;
      return method === "GET" ? await listReviews(authorId, url) : await saveReview(request, authorId, url);
    } catch (error) {
      console.error("Customer reviews request failed", error.name, error.code);
      return json({ error: "Reviews are temporarily unavailable." }, 503);
    }
  },
};
