
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  acompanharConsultasMedico,
  type ConsultaMedico,
  type StatusConsulta,
} from '@/services/consultaService';

const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  primarySoft: '#E8F2F0',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
  warning: '#B7791F',
  warningBg: '#FBF3E0',
  danger: '#D94B57',
  dangerBg: '#FCE9EB',
  okBg: '#E3F3F1',
  neutralBg: '#EEF2F1',
};

type Filtro = 'todas' | StatusConsulta;

type Coordenadas = {
  latitude: number;
  longitude: number;
};

const FILTROS: {
  chave: Filtro;
  rotulo: string;
}[] = [
  { chave: 'todas', rotulo: 'Todas' },
  {
    chave: 'aguardando_confirmacao',
    rotulo: 'Aguardando',
  },
  {
    chave: 'confirmada',
    rotulo: 'Confirmadas',
  },
  {
    chave: 'recusada',
    rotulo: 'Recusadas',
  },
];

const STATUS_INFO: Record<
  string,
  {
    texto: string;
    cor: string;
    fundo: string;
  }
> = {
  aguardando_confirmacao: {
    texto: 'Aguardando paciente',
    cor: C.warning,
    fundo: C.warningBg,
  },
  confirmada: {
    texto: 'Confirmada',
    cor: C.primary,
    fundo: C.okBg,
  },
  recusada: {
    texto: 'Recusada',
    cor: C.danger,
    fundo: C.dangerBg,
  },
  cancelada: {
    texto: 'Cancelada',
    cor: C.muted,
    fundo: C.neutralBg,
  },
};

function paraTimestamp(
  data: string,
  horario: string
): number {
  const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  const h = /^(\d{2}):(\d{2})$/.exec(horario);

  if (!d) {
    return 0;
  }

  return new Date(
    Number(d[3]),
    Number(d[2]) - 1,
    Number(d[1]),
    h ? Number(h[1]) : 0,
    h ? Number(h[2]) : 0
  ).getTime();
}

function obterCoordenadas(
  consulta: ConsultaMedico
): Coordenadas | null {
  const { latitude, longitude } = consulta;

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
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

  return {
    latitude,
    longitude,
  };
}

function temDestino(
  consulta: ConsultaMedico
): boolean {
  return (
    (typeof consulta.local === 'string' &&
      consulta.local.trim().length > 0) ||
    obterCoordenadas(consulta) !== null
  );
}

async function abrirEndereco(
  url: string
): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      'Não foi possível abrir o mapa',
      'Verifique sua conexão com a internet e tente novamente.'
    );
  }
}

async function abrirRota(
  consulta: ConsultaMedico
): Promise<void> {
  const coordenadas = obterCoordenadas(consulta);

  const destino = coordenadas
    ? `${coordenadas.latitude},${coordenadas.longitude}`
    : typeof consulta.local === 'string'
      ? consulta.local.trim()
      : '';

  if (!destino) {
    Alert.alert(
      'Destino indisponível',
      'Esta consulta não possui um endereço válido.'
    );
    return;
  }

  const url =
    'https://www.google.com/maps/dir/?api=1' +
    `&destination=${encodeURIComponent(destino)}` +
    '&travelmode=driving';

  await abrirEndereco(url);
}

function BotoesLocalizacao({
  consulta,
  onVerMapa,
}: {
  consulta: ConsultaMedico;
  onVerMapa: () => void;
}) {
  if (!temDestino(consulta)) {
    return null;
  }

  return (
    <View style={styles.acoesLocalizacao}>
      <Pressable
        style={({ pressed }) => [
          styles.botaoMapa,
          pressed && styles.botaoPressionado,
        ]}
        onPress={(evento) => {
          evento.stopPropagation();
          onVerMapa();
        }}
        accessibilityRole="button"
        accessibilityLabel="Ver localização da consulta dentro do aplicativo"
      >
        <Ionicons
          name="map-outline"
          size={18}
          color={C.primary}
        />

        <Text style={styles.botaoMapaTexto}>
          Ver no mapa
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.botaoRota,
          pressed && styles.botaoPressionado,
        ]}
        onPress={(evento) => {
          evento.stopPropagation();
          void abrirRota(consulta);
        }}
        accessibilityRole="button"
        accessibilityLabel="Abrir rota até a consulta"
      >
        <Ionicons
          name="navigate-outline"
          size={18}
          color="#FFFFFF"
        />

        <Text style={styles.botaoRotaTexto}>
          Abrir rota
        </Text>
      </Pressable>
    </View>
  );
}

export default function ConsultasMedicoScreen() {
  const router = useRouter();

  const [consultas, setConsultas] =
    useState<ConsultaMedico[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState('');

  const [filtro, setFiltro] =
    useState<Filtro>('todas');

  useEffect(() => {
    const cancelar = acompanharConsultasMedico(
      (dados) => {
        setConsultas(dados);
        setErro('');
        setCarregando(false);
      },
      () => {
        setErro(
          'Não foi possível carregar suas consultas.'
        );
        setCarregando(false);
      }
    );

    return cancelar;
  }, []);

  const lista = useMemo(() => {
    const filtradas =
      filtro === 'todas'
        ? consultas
        : consultas.filter(
            (consulta) =>
              consulta.status === filtro
          );

    return [...filtradas].sort(
      (a, b) =>
        paraTimestamp(a.data, a.horario) -
        paraTimestamp(b.data, b.horario)
    );
  }, [consultas, filtro]);

  function contar(chave: Filtro): number {
    return chave === 'todas'
      ? consultas.length
      : consultas.filter(
          (consulta) =>
            consulta.status === chave
        ).length;
  }

  function abrirDetalhes(
    consulta: ConsultaMedico
  ): void {
    if (!consulta.id) {
      Alert.alert(
        'Consulta indisponível',
        'Não foi possível identificar esta consulta.'
      );
      return;
    }

    router.push({
      pathname: '/detalhe-consulta-medico',
      params: {
        id: consulta.id,
      },
    } as Href);
  }

  function verMapa(
    consulta: ConsultaMedico
  ): void {
    const coordenadas = obterCoordenadas(consulta);

    router.push({
      pathname: '/mapa-consulta',
      params: {
        local: consulta.local || '',
        ...(coordenadas
          ? {
              latitude: String(
                coordenadas.latitude
              ),
              longitude: String(
                coordenadas.longitude
              ),
            }
          : {}),
      },
    } as Href);
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
          accessibilityLabel="Voltar"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={C.primary}
          />

          <Text style={styles.voltarTexto}>
            Voltar
          </Text>
        </Pressable>

        <Text style={styles.titulo}>
          Consultas
        </Text>

        <Text style={styles.subtitulo}>
          Consultas que você agendou e a resposta
          de cada paciente.
        </Text>

        <Pressable
          style={styles.botao}
          onPress={() =>
            router.push('/agendar-consulta-medica')
          }
          accessibilityRole="button"
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color="#FFFFFF"
          />

          <Text style={styles.botaoTexto}>
            Agendar nova consulta
          </Text>
        </Pressable>

        <Text style={styles.ajuda}>
          Você escolhe o paciente vinculado
          na próxima tela. Toque em uma consulta
          para ver os detalhes, reagendar,
          cancelar ou excluir.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtros}
        >
          {FILTROS.map((item) => {
            const ativo = filtro === item.chave;

            return (
              <Pressable
                key={item.chave}
                style={[
                  styles.chip,
                  ativo && styles.chipAtivo,
                ]}
                onPress={() =>
                  setFiltro(item.chave)
                }
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.chipTexto,
                    ativo && styles.chipTextoAtivo,
                  ]}
                >
                  {item.rotulo} ({contar(item.chave)})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {carregando ? (
          <View style={styles.centro}>
            <ActivityIndicator
              size="large"
              color={C.primary}
            />
          </View>
        ) : erro !== '' ? (
          <Text style={styles.erro}>
            {erro}
          </Text>
        ) : lista.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.vazio}>
              {consultas.length === 0
                ? 'Você ainda não agendou nenhuma consulta.'
                : 'Nenhuma consulta com esse status.'}
            </Text>
          </View>
        ) : (
          lista.map((consulta) => {
            const info =
              STATUS_INFO[
                consulta.status ??
                  'aguardando_confirmacao'
              ] ??
              STATUS_INFO.aguardando_confirmacao;

            return (
              <Pressable
                key={consulta.id}
                style={({ pressed }) => [
                  styles.card,
                  pressed &&
                    styles.cartaoPressionado,
                ]}
                onPress={() =>
                  abrirDetalhes(consulta)
                }
                accessibilityRole="button"
                accessibilityLabel={`Abrir detalhes da consulta de ${
                  consulta.pacienteNome ?? 'Paciente'
                }`}
              >
                <View style={styles.linhaTopo}>
                  <Text
                    style={styles.paciente}
                    numberOfLines={1}
                  >
                    {consulta.pacienteNome ??
                      'Paciente'}
                  </Text>

                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          info.fundo,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeTexto,
                        {
                          color: info.cor,
                        },
                      ]}
                    >
                      {info.texto}
                    </Text>
                  </View>
                </View>

                <Text style={styles.especialidade}>
                  {consulta.especialidade}
                </Text>

                <View style={styles.detalhe}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={C.muted}
                  />

                  <Text style={styles.detalheTexto}>
                    {consulta.data} às{' '}
                    {consulta.horario}
                  </Text>
                </View>

                <View style={styles.detalhe}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={C.muted}
                  />

                  <Text style={styles.detalheTexto}>
                    {consulta.local}
                  </Text>
                </View>

                {!!consulta.observacao && (
                  <Text style={styles.obs}>
                    {consulta.observacao}
                  </Text>
                )}

                <BotoesLocalizacao
                  consulta={consulta}
                  onVerMapa={() =>
                    verMapa(consulta)
                  }
                />
              </Pressable>
            );
          })
        )}

        <Text style={styles.creditosMapa}>
          Dados cartográficos: © colaboradores
          do OpenStreetMap.
        </Text>
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
    paddingBottom: 40,
  },
  voltar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  voltarTexto: {
    color: C.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: C.text,
  },
  subtitulo: {
    fontSize: 15,
    color: C.muted,
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 22,
  },
  botao: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    padding: 15,
    borderRadius: 12,
  },
  botaoTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  ajuda: {
    color: C.muted,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 18,
    lineHeight: 19,
  },
  filtros: {
    gap: 8,
    paddingBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipAtivo: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipTexto: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextoAtivo: {
    color: '#FFFFFF',
  },
  centro: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  erro: {
    color: C.danger,
    fontSize: 14,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  cartaoPressionado: {
    opacity: 0.88,
  },
  vazio: {
    color: C.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  paciente: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgeTexto: {
    fontSize: 12,
    fontWeight: '700',
  },
  especialidade: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 10,
  },
  detalhe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  detalheTexto: {
    color: C.text,
    fontSize: 14,
    flex: 1,
  },
  obs: {
    color: C.muted,
    fontSize: 13,
    marginTop: 10,
    lineHeight: 19,
  },
  acoesLocalizacao: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  botaoMapa: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  botaoMapaTexto: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  botaoRota: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: C.primary,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  botaoRotaTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  botaoPressionado: {
    opacity: 0.75,
  },
  creditosMapa: {
    color: C.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 17,
  },
});
