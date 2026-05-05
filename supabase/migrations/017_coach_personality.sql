-- Coach personality preset selection.
-- Two independent axes:
--   coach_tone: how the coach speaks
--   coach_style: how the coach pushes the user
-- Both default to balanced/neutral choices so existing users see no change
-- in behavior until they explicitly pick a preset.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS coach_tone TEXT
    CHECK (coach_tone IN ('sereno', 'cercano', 'directo', 'academico'))
    DEFAULT 'sereno';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS coach_style TEXT
    CHECK (coach_style IN ('estricto', 'equilibrado', 'animador'))
    DEFAULT 'equilibrado';
