/** Resolves a Minecraft username to its Mojang account UUID. Returns null
 *  (never throws) if the account doesn't exist or Mojang's API is
 *  unreachable/rate-limited — callers should treat that as "unknown" and
 *  keep going rather than fail the whole request. */
export async function resolveMinecraftUuid(nick) {
  try {
    const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(nick)}`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data && typeof data.id === 'string' ? data.id : null;
  } catch (err) {
    return null;
  }
}
