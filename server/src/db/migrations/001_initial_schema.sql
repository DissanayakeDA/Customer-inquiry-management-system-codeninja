-- InquiryDesk initial schema

CREATE TYPE user_role AS ENUM ('agent', 'admin');
CREATE TYPE inquiry_status AS ENUM ('new', 'in_progress', 'resolved');

CREATE TABLE users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(254) NOT NULL,
  password_hash TEXT         NOT NULL,
  role          user_role    NOT NULL DEFAULT 'agent',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Emails are matched case-insensitively.
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

-- Normalisation used to detect duplicate inquiries. Defined once here and used by both the
-- unique index below and the repository's "find the existing duplicate" query.
--   contact: case-insensitive, ignoring spaces, dashes and parentheses ("+94 77-123 4567" = "+94771234567")
--   subject: case-insensitive, ignoring surrounding/repeated whitespace
CREATE FUNCTION normalize_contact(value TEXT) RETURNS TEXT
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT lower(regexp_replace(value, '[\s()-]', '', 'g')) $$;

CREATE FUNCTION normalize_subject(value TEXT) RETURNS TEXT
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT lower(regexp_replace(btrim(value), '\s+', ' ', 'g')) $$;

CREATE TABLE inquiries (
  id            INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1001) PRIMARY KEY,
  customer_name VARCHAR(120)   NOT NULL CHECK (char_length(btrim(customer_name)) >= 2),
  contact       VARCHAR(120)   NOT NULL CHECK (char_length(btrim(contact)) >= 1),
  subject       VARCHAR(150)   NOT NULL CHECK (char_length(btrim(subject)) >= 3),
  description   VARCHAR(2000)  NOT NULL CHECK (char_length(btrim(description)) >= 10),
  status        inquiry_status NOT NULL DEFAULT 'new',
  created_by    INTEGER        NOT NULL REFERENCES users (id),
  -- The one additional field: who is responsible for following up (NULL = unassigned).
  assigned_to   INTEGER                 REFERENCES users (id),
  updated_by    INTEGER        NOT NULL REFERENCES users (id),
  -- Optimistic concurrency: every update must name the version it read; see PgInquiryRepository.update.
  version       INTEGER        NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Duplicate policy: at most one OPEN (not resolved) inquiry per contact + subject.
-- Enforced by the database so two simultaneous submissions cannot both succeed.
CREATE UNIQUE INDEX inquiries_open_duplicate_guard
  ON inquiries (normalize_contact(contact), normalize_subject(subject))
  WHERE status <> 'resolved';

-- List ordering ("recently updated first") and access scoping (created by / assigned to me).
CREATE INDEX inquiries_updated_at_idx ON inquiries (updated_at DESC, id DESC);
CREATE INDEX inquiries_created_by_idx ON inquiries (created_by);
CREATE INDEX inquiries_assigned_to_idx ON inquiries (assigned_to);
