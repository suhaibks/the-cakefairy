CREATE TABLE IF NOT EXISTS customer_reviews (
  id text PRIMARY KEY,
  author_id text NOT NULL UNIQUE,
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 40),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text NOT NULL CHECK (length(review) BETWEEN 1 AND 600),
  updated_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS customer_reviews_recent
  ON customer_reviews (updated_at DESC, id DESC);
