-- Permite que la página pública de reservas (/agendar/[id]) lea el perfil
-- del nutriólogo sin sesión. Solo expone practitioners activos.
-- Sin esta política, auth.uid() = NULL en la página pública y RLS bloquea todo.

CREATE POLICY "Public can view active practitioners"
  ON practitioners FOR SELECT
  USING (active = true);
