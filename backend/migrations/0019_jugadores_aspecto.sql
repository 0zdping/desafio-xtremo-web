-- 0019: el aspecto de cada jugador para su perfil en 3D (skin real, capa de Minecraft y capa DX).
-- Lo manda el proxy (DX Login) en la actividad de cada 5 minutos. Solo URL de texturas de
-- Mojang (textures.minecraft.net) o de nuestras skins (media.desafioxtremo.site/skins/...).
ALTER TABLE jugadores ADD COLUMN skin_url TEXT;
ALTER TABLE jugadores ADD COLUMN capa_mojang TEXT;
ALTER TABLE jugadores ADD COLUMN capa_dx TEXT;
ALTER TABLE jugadores ADD COLUMN aspecto_at TEXT;
