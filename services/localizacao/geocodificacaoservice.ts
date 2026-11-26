import { Platform } from 'react-native';

export interface Coordenadas {
  latitude: number;
  longitude: number;
}

// O Nominatim (OpenStreetMap) pede no máximo 1 chamada por segundo.
let ultimaChamada = 0;

async function respeitarIntervalo() {
  const espera = ultimaChamada + 1100 - Date.now();
  if (espera > 0) {
    await new Promise((resolve) => setTimeout(resolve, espera));
  }
  ultimaChamada = Date.now();
}

/**
 * Converte um endereço em latitude e longitude.
 * Devolve null se não achar ou se a busca falhar: quem chama deve salvar a
 * consulta mesmo assim, sem coordenadas.
 */
export async function geocodificarEndereco(
  endereco: string
): Promise<Coordenadas | null> {
  const texto = endereco.trim();
  if (texto.length < 4) return null;

  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 8000);

  try {
    await respeitarIntervalo();

    const url =
      'https://nominatim.openstreetmap.org/search' +
      `?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(texto)}`;

    const headers: Record<string, string> = { 'Accept-Language': 'pt-BR' };

    // No navegador o User-Agent é proibido (o navegador envia o Referer).
    if (Platform.OS !== 'web') {
      headers['User-Agent'] = 'HealthSync-PISI3 (projeto academico)';
    }

    const resposta = await fetch(url, { headers, signal: controle.signal });
    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as { lat?: string; lon?: string }[];
    const primeiro = dados?.[0];
    if (!primeiro?.lat || !primeiro?.lon) return null;

    const latitude = Number(primeiro.lat);
    const longitude = Number(primeiro.lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    return { latitude, longitude };
  } catch (erro) {
    console.warn('Falha ao buscar o endereço:', erro);
    return null;
  } finally {
    clearTimeout(limite);
  }
}