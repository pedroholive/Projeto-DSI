
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface LocalizacaoConsulta {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
}

interface ResultadoNominatim {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface CacheLocalizacao {
  salvoEm: number;
  resultados: LocalizacaoConsulta[];
}

const CACHE_PREFIXO = '@healthsync:localizacao:';
const DURACAO_CACHE_MS = 30 * 24 * 60 * 60 * 1000;
const INTERVALO_BUSCA_MS = 1200;

let ultimaBuscaEm = 0;
let filaBuscas: Promise<unknown> = Promise.resolve();

function normalizarBusca(texto: string): string {
  return texto
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}

function coordenadasValidas(
  latitude: number,
  longitude: number
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function aguardar(milisegundos: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milisegundos);
  });
}

async function consultarCache(
  chave: string
): Promise<LocalizacaoConsulta[] | null> {
  try {
    const armazenado = await AsyncStorage.getItem(
      CACHE_PREFIXO + chave
    );

    if (!armazenado) {
      return null;
    }

    const dados = JSON.parse(
      armazenado
    ) as CacheLocalizacao;

    if (
      !dados ||
      typeof dados.salvoEm !== 'number' ||
      !Array.isArray(dados.resultados)
    ) {
      return null;
    }

    if (
      Date.now() - dados.salvoEm >
      DURACAO_CACHE_MS
    ) {
      return null;
    }

    if (
      !dados.resultados.every(
        (item) =>
          typeof item.id === 'string' &&
          typeof item.nome === 'string' &&
          coordenadasValidas(
            item.latitude,
            item.longitude
          )
      )
    ) {
      return null;
    }

    return dados.resultados;
  } catch {
    return null;
  }
}

async function salvarCache(
  chave: string,
  resultados: LocalizacaoConsulta[]
): Promise<void> {
  try {
    const dados: CacheLocalizacao = {
      salvoEm: Date.now(),
      resultados,
    };

    await AsyncStorage.setItem(
      CACHE_PREFIXO + chave,
      JSON.stringify(dados)
    );
  } catch {
    return;
  }
}

async function executarConsulta(
  endereco: string
): Promise<LocalizacaoConsulta[]> {
  const tempoDesdeUltimaBusca =
    Date.now() - ultimaBuscaEm;

  if (tempoDesdeUltimaBusca < INTERVALO_BUSCA_MS) {
    await aguardar(
      INTERVALO_BUSCA_MS - tempoDesdeUltimaBusca
    );
  }

  ultimaBuscaEm = Date.now();

  const parametros = new URLSearchParams({
    q: endereco,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'br',
  });

  const resposta = await fetch(
    `https://nominatim.openstreetmap.org/search?${parametros.toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!resposta.ok) {
    if (resposta.status === 429) {
      throw new Error(
        'O serviço de localização está temporariamente ocupado. Tente novamente mais tarde.'
      );
    }

    throw new Error(
      'Não foi possível consultar o serviço de localização.'
    );
  }

  const dados: unknown = await resposta.json();

  if (!Array.isArray(dados)) {
    throw new Error(
      'O serviço retornou dados de localização inválidos.'
    );
  }

  return (dados as ResultadoNominatim[])
    .filter((item) => {
      const latitude = Number(item.lat);
      const longitude = Number(item.lon);

      return (
        typeof item.display_name === 'string' &&
        item.display_name.trim().length > 0 &&
        coordenadasValidas(latitude, longitude)
      );
    })
    .map((item) => ({
      id: String(item.place_id),
      nome: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    }));
}

export async function buscarLocalizacoesConsulta(
  endereco: string
): Promise<LocalizacaoConsulta[]> {
  const busca = normalizarBusca(endereco);

  if (busca.length < 3) {
    throw new Error(
      'Informe pelo menos 3 caracteres para buscar uma localização.'
    );
  }

  if (Platform.OS !== 'web') {
    throw new Error(
      'A busca integrada de localização está disponível apenas na versão web de testes.'
    );
  }

  const cache = await consultarCache(busca);

  if (cache !== null) {
    return cache;
  }

  const executar = async () => {
    const cacheAtual = await consultarCache(busca);

    if (cacheAtual !== null) {
      return cacheAtual;
    }

    const resultados = await executarConsulta(busca);

    await salvarCache(busca, resultados);

    return resultados;
  };

  const operacao = filaBuscas.then(
    executar,
    executar
  );

  filaBuscas = operacao.then(
    () => undefined,
    () => undefined
  );

  return operacao;
}
