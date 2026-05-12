-- Migración 029
-- Añade el estado 'rescheduling' al CHECK constraint de appointments.
-- Se usa cuando la nutrióloga solicita reagendar: la cita queda en este estado
-- hasta que el paciente elija un nuevo horario, momento en que se cancela.

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show','rescheduling'));
