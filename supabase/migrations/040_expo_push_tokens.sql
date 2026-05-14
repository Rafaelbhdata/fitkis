-- Migration 040: tabla expo_push_tokens
--
-- El paciente registra su token de Expo Push al hacer login en mobile.
-- El backend lo usa para mandar notificaciones de invitaciones de
-- nutriólogas (Bloque 5 del flujo practitioner-patient).
--
-- Un usuario puede tener N tokens (un device por cada install). La
-- limpieza de tokens stale (uninstall, expired) se hace pasivamente
-- cuando Expo Push devuelve DeviceNotRegistered.

CREATE TABLE IF NOT EXISTS expo_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_expo_push_tokens_user
  ON expo_push_tokens(user_id);

ALTER TABLE expo_push_tokens ENABLE ROW LEVEL SECURITY;

-- El paciente solo ve y mantiene SUS tokens.
CREATE POLICY "Users can manage own push tokens" ON expo_push_tokens
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- El service role (usado desde /api/invite-patient) puede leer todos
-- los tokens para mandar push. No hay policy explícita necesaria
-- porque service_role bypasses RLS, pero documentamos aquí para que
-- quede claro que ese es el path autorizado de lectura cruzada.
