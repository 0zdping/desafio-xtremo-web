// GET /api/launcher/cosmeticos: quién tiene cada cosmético de airdrop (por nombre de Minecraft). Lo leen el launcher
// (para ofrecer los tuyos) y DX Models (para no enseñar a los demás uno que no es tuyo). Público, caché 2 min; el canje
// lo purga.
import { withQuotaHandling } from '../../../../backend/lib/http.js';
import { d1Select } from '../../../../backend/lib/db.js';
import { cachedPublicJson } from '../../../../backend/lib/edgeCache.js';
import { duenos } from '../../../../backend/lib/cosmeticos.js';

export const onRequestGet = withQuotaHandling(async (context) => {
  return cachedPublicJson(context, context.request.url, 120, async () => ({ cosmeticos: await duenos(context.env, d1Select) }));
});
