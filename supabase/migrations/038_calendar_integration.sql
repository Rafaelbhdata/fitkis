-- Integración de calendario externo (Google Calendar) para nutriólogas.
-- Los tokens OAuth se guardan aquí y nunca se exponen al cliente.
-- Toda lectura/escritura de esta tabla debe usar SUPABASE_SERVICE_ROLE_KEY.

CREATE TABLE practitioner_calendar_connections (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id   UUID        NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  provider          TEXT        NOT NULL DEFAULT 'google',
  access_token      TEXT        NOT NULL,
  refresh_token     TEXT        NOT NULL,
  token_expiry      TIMESTAMPTZ NOT NULL,
  calendar_id       TEXT        NOT NULL DEFAULT 'primary',
  connected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (practitioner_id, provider)
);

-- Tokens de OAuth son datos sensibles: solo el service role puede acceder.
ALTER TABLE practitioner_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Sin políticas = nadie puede leer/escribir con anon o user key.
-- El service role bypass RLS automáticamente, que es el único acceso permitido.
