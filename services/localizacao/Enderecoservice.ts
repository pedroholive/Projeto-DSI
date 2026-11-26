// Sugestões de endereço enquanto o usuário digita.
// Usa o Photon (komoot), serviço gratuito sobre dados do OpenStreetMap feito
// para autocompletar. (O Nominatim público não permite autocompletar.)

export interface SugestaoEndereco {
  id: string;
  titulo: string; // linha principal (nome do lugar ou rua)
  subtitulo: string; // linha secundária (bairro, cidade, estado)
  textoCompleto: string; // o que vai para o campo Local
  latitude: number;
  longitude: number;
}

// Caixa que cobre o Brasil: oeste, sul, leste, norte
const BBOX_BRASIL = '-74.0,-34.0,-34.0,5.5';

// Preferência por resultados perto do Recife (troque se quiser outra região)
const VIES = { lat: -8.05, lon: -34.9 };

interface FeaturePhoton {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    locality?: string;
    city?: string;
    county?: string;
    state?: string;
  };
}

function unicos(partes: (string | undefined)[]): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const p of partes) {
    const t = (p ?? '').trim();
    if (!t || vistos.has(t.toLowerCase())) continue;
    vistos.add(t.toLowerCase());
    saida.push(t);
  }
  return saida;
}

export async function buscarSugestoesEndereco(
  texto: string,
  sinal?: AbortSignal
): Promise<SugestaoEndereco[]> {
  const consulta = texto.trim();
  if (consulta.length < 3) return [];

  const url =
    'https://photon.komoot.io/api/' +
    `?q=${encodeURIComponent(consulta)}` +
    '&limit=5' +
    `&bbox=${BBOX_BRASIL}` +
    `&lat=${VIES.lat}&lon=${VIES.lon}`;

  const resposta = await fetch(url, { signal: sinal });
  if (!resposta.ok) return [];

  const json = (await resposta.json()) as { features?: FeaturePhoton[] };
  const resultado: SugestaoEndereco[] = [];

  for (const f of json.features ?? []) {
    const p = f.properties ?? {};
    const coord = f.geometry?.coordinates;
    if (!coord || coord.length < 2) continue;

    const longitude = Number(coord[0]);
    const latitude = Number(coord[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const rua = [p.street, p.housenumber].filter(Boolean).join(', ');
    const nomeOuRua = p.name || rua;
    if (!nomeOuRua) continue;

    const bairro = p.district || p.locality;
    const cidade = p.city || p.county;

    const titulo = nomeOuRua;
    const subtitulo = unicos([
      p.name ? rua : undefined,
      bairro,
      cidade,
      p.state,
    ]).join(', ');

    const textoCompleto = unicos([p.name, rua, bairro, cidade]).join(', ');

    resultado.push({
      id: `${p.osm_type ?? 'x'}${p.osm_id ?? resultado.length}`,
      titulo,
      subtitulo,
      textoCompleto: textoCompleto || titulo,
      latitude,
      longitude,
    });
  }

  return resultado;
}