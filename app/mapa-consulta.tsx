
import { Ionicons } from '@expo/vector-icons';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { createElement } from 'react';

import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  primarySoft: '#E8F2F0',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
  danger: '#D94B57',
};

type Coordenadas = {
  latitude: number;
  longitude: number;
};

function parametro(
  valor: string | string[] | undefined
): string {
  return Array.isArray(valor)
    ? valor[0] ?? ''
    : valor ?? '';
}

function obterCoordenadas(
  latitudeTexto: string,
  longitudeTexto: string
): Coordenadas | null {
  if (
    latitudeTexto.trim() === '' ||
    longitudeTexto.trim() === ''
  ) {
    return null;
  }

  const latitude = Number(latitudeTexto);
  const longitude = Number(longitudeTexto);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }

  return { latitude, longitude };
}

function urlMapaIntegrado(
  coordenadas: Coordenadas
): string {
  const { latitude, longitude } = coordenadas;

  const margemLatitude = 0.004;
  const margemLongitude = 0.006;

  const oeste = Math.max(
    -180,
    longitude - margemLongitude
  );

  const sul = Math.max(
    -90,
    latitude - margemLatitude
  );

  const leste = Math.min(
    180,
    longitude + margemLongitude
  );

  const norte = Math.min(
    90,
    latitude + margemLatitude
  );

  const bbox = [
    oeste,
    sul,
    leste,
    norte,
  ].join(',');

  const parametros = new URLSearchParams({
    bbox,
    layer: 'mapnik',
    marker: `${latitude},${longitude}`,
  });

  return (
    'https://www.openstreetmap.org/export/embed.html?' +
    parametros.toString()
  );
}

function urlOpenStreetMap(
  local: string,
  coordenadas: Coordenadas | null
): string {
  if (coordenadas) {
    const { latitude, longitude } = coordenadas;

    return (
      'https://www.openstreetmap.org/' +
      `?mlat=${latitude}&mlon=${longitude}` +
      `#map=17/${latitude}/${longitude}`
    );
  }

  return (
    'https://www.openstreetmap.org/search?query=' +
    encodeURIComponent(local)
  );
}

function urlRota(
  local: string,
  coordenadas: Coordenadas | null
): string {
  const destino = coordenadas
    ? `${coordenadas.latitude},${coordenadas.longitude}`
    : local;

  return (
    'https://www.google.com/maps/dir/?api=1' +
    `&destination=${encodeURIComponent(destino)}` +
    '&travelmode=driving'
  );
}

async function abrirLink(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      'Não foi possível abrir o mapa',
      'Verifique sua conexão com a internet e tente novamente.'
    );
  }
}

function MapaIncorporado({
  coordenadas,
}: {
  coordenadas: Coordenadas;
}) {
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.mapaIndisponivel}>
        <Ionicons
          name="map-outline"
          size={38}
          color={C.primary}
        />

        <Text style={styles.mapaIndisponivelTitulo}>
          Visualização externa disponível
        </Text>

        <Text style={styles.mapaIndisponivelTexto}>
          No dispositivo móvel, utilize o botão
          abaixo para abrir a localização no mapa.
        </Text>
      </View>
    );
  }

  return createElement('iframe', {
    title: 'Mapa da localização da consulta',
    src: urlMapaIntegrado(coordenadas),
    loading: 'lazy',
    referrerPolicy: 'strict-origin-when-cross-origin',
    style: {
      display: 'block',
      width: '100%',
      height: 380,
      border: 0,
      borderRadius: 14,
      backgroundColor: '#E8F2F0',
    },
  });
}

export default function MapaConsultaScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    local?: string;
    latitude?: string;
    longitude?: string;
  }>();

  const local = parametro(params.local).trim();

  const coordenadas = obterCoordenadas(
    parametro(params.latitude),
    parametro(params.longitude)
  );

  const temDestino =
    local.length > 0 ||
    coordenadas !== null;

  function abrirMapaExterno() {
    if (!temDestino) {
      return;
    }

    void abrirLink(
      urlOpenStreetMap(local, coordenadas)
    );
  }

  function abrirRota() {
    if (!temDestino) {
      return;
    }

    void abrirLink(
      urlRota(local, coordenadas)
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.voltar}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar às consultas"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={C.primary}
          />

          <Text style={styles.voltarTexto}>
            Voltar às consultas
          </Text>
        </Pressable>

        <View style={styles.cabecalho}>
          <View style={styles.iconeCabecalho}>
            <Ionicons
              name="map-outline"
              size={27}
              color={C.primary}
            />
          </View>

          <View style={styles.cabecalhoInfo}>
            <Text style={styles.titulo}>
              Local da consulta
            </Text>

            <Text style={styles.subtitulo}>
              Localização e rota até o atendimento
            </Text>
          </View>
        </View>

        <View style={styles.enderecoCard}>
          <View style={styles.enderecoLinha}>
            <Ionicons
              name="location-outline"
              size={21}
              color={C.primary}
            />

            <Text style={styles.enderecoTitulo}>
              Endereço do atendimento
            </Text>
          </View>

          <Text style={styles.enderecoTexto}>
            {local ||
              'Endereço não informado'}
          </Text>

          {coordenadas && (
            <Text style={styles.coordenadasTexto}>
              {coordenadas.latitude.toFixed(6)},
              {' '}
              {coordenadas.longitude.toFixed(6)}
            </Text>
          )}
        </View>

        <View style={styles.mapaCard}>
          <View style={styles.mapaCabecalho}>
            <Ionicons
              name="navigate-outline"
              size={19}
              color={C.primary}
            />

            <Text style={styles.mapaTitulo}>
              Mapa da localização
            </Text>
          </View>

          {coordenadas ? (
            <MapaIncorporado
              coordenadas={coordenadas}
            />
          ) : (
            <View style={styles.mapaIndisponivel}>
              <Ionicons
                name="location-outline"
                size={40}
                color={C.muted}
              />

              <Text
                style={styles.mapaIndisponivelTitulo}
              >
                Coordenadas indisponíveis
              </Text>

              <Text
                style={styles.mapaIndisponivelTexto}
              >
                Esta consulta não possui uma
                localização confirmada. Você pode
                pesquisar o endereço no OpenStreetMap
                utilizando o botão abaixo.
              </Text>
            </View>
          )}

          {coordenadas && Platform.OS === 'web' && (
            <Text style={styles.instrucaoMapa}>
              Utilize o mouse ou os controles do mapa
              para movimentar e ampliar a localização.
            </Text>
          )}

          <Text style={styles.creditos}>
            Dados cartográficos: © colaboradores
            do OpenStreetMap.
          </Text>
        </View>

        {temDestino && (
          <View style={styles.acoes}>
            <Pressable
              style={({ pressed }) => [
                styles.botaoExterno,
                pressed && styles.pressionado,
              ]}
              onPress={abrirMapaExterno}
              accessibilityRole="button"
            >
              <Ionicons
                name="open-outline"
                size={19}
                color={C.primary}
              />

              <Text style={styles.botaoExternoTexto}>
                Ver no OpenStreetMap
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.botaoRota,
                pressed && styles.pressionado,
              ]}
              onPress={abrirRota}
              accessibilityRole="button"
            >
              <Ionicons
                name="navigate-outline"
                size={19}
                color={C.card}
              />

              <Text style={styles.botaoRotaTexto}>
                Abrir rota
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.aviso}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={C.primary}
          />

          <Text style={styles.avisoTexto}>
            Confirme o endereço com o estabelecimento
            antes de sair. A localização apresentada
            depende dos dados cartográficos disponíveis.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    padding: 20,
    paddingBottom: 45,
  },
  voltar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  voltarTexto: {
    color: C.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 22,
  },
  iconeCabecalho: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cabecalhoInfo: {
    flex: 1,
  },
  titulo: {
    color: C.text,
    fontSize: 25,
    fontWeight: '800',
  },
  subtitulo: {
    color: C.muted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
  },
  enderecoCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 18,
    marginBottom: 15,
  },
  enderecoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  enderecoTitulo: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },
  enderecoTexto: {
    color: C.text,
    fontSize: 14,
    lineHeight: 22,
  },
  coordenadasTexto: {
    color: C.muted,
    fontSize: 12,
    marginTop: 10,
  },
  mapaCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
  },
  mapaCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 15,
  },
  mapaTitulo: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
  },
  mapaIndisponivel: {
    minHeight: 260,
    borderRadius: 14,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
    gap: 12,
  },
  mapaIndisponivelTitulo: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  mapaIndisponivelTexto: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  instrucaoMapa: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 12,
  },
  creditos: {
    color: C.muted,
    fontSize: 11,
    marginTop: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  acoes: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  botaoExterno: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  botaoExternoTexto: {
    flexShrink: 1,
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  botaoRota: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  botaoRotaTexto: {
    color: C.card,
    fontSize: 13,
    fontWeight: '700',
  },
  pressionado: {
    opacity: 0.75,
  },
  aviso: {
    backgroundColor: C.primarySoft,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  avisoTexto: {
    flex: 1,
    color: C.primary,
    fontSize: 12,
    lineHeight: 20,
  },
});
