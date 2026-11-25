
import { Ionicons } from '@expo/vector-icons';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import FiltrosMapaConsultas, {
  FILTROS_INICIAIS,
  filtrarConsultasMapa,
  type FiltrosMapa,
} from '@/components/FiltrosMapaConsultas';

import MapaConsultas from '@/components/mapaconsultas';
import type { MarcadorMapa } from '@/components/mapaconsultas.types';

import { auth } from '@/firebaseConfig';

import {
  acompanharConsultasMedico,
  listarConsultas,
  type Consulta,
  type ConsultaMedico,
} from '@/services/consultaService';

const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  primarySoft: '#E8F2F0',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
};

const CORES = [
  '#D94B57',
  '#2F6FDE',
  '#E59F1A',
  '#8250DF',
  '#0E9F8C',
  '#E0578F',
  '#6B7280',
  '#7A4B2A',
];

interface LocalConsulta {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  cor: string;
  consultas: Consulta[];
}

function parametro(
  valor: string | string[] | undefined
): string {
  return Array.isArray(valor)
    ? valor[0] ?? ''
    : valor ?? '';
}

function coordenadasValidas(
  consulta: Consulta
): boolean {
  const { latitude, longitude } = consulta;

  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function chaveOrdenacao(
  consulta: Consulta
): string {
  const partes = consulta.data.split('/');

  if (partes.length !== 3) {
    return consulta.data + consulta.horario;
  }

  return (
    [...partes].reverse().join('') +
    consulta.horario
  );
}

function descricaoConsulta(
  consulta: Consulta
): string {
  const pessoa =
    (consulta as ConsultaMedico).pacienteNome ||
    consulta.medico ||
    consulta.especialidade;

  return `${consulta.data} às ${consulta.horario} · ${pessoa}`;
}

function agruparPorLocal(
  consultas: Consulta[]
): LocalConsulta[] {
  const grupos = new Map<string, LocalConsulta>();

  [...consultas]
    .filter(coordenadasValidas)
    .sort((a, b) =>
      chaveOrdenacao(a).localeCompare(chaveOrdenacao(b))
    )
    .forEach((consulta) => {
      const latitude = consulta.latitude as number;
      const longitude = consulta.longitude as number;

      const chave =
        latitude.toFixed(5) +
        ',' +
        longitude.toFixed(5);

      const existente = grupos.get(chave);

      if (existente) {
        existente.consultas.push(consulta);
        return;
      }

      grupos.set(chave, {
        id: chave,
        nome:
          consulta.local.trim() ||
          'Local sem nome',
        latitude,
        longitude,
        cor: CORES[grupos.size % CORES.length],
        consultas: [consulta],
      });
    });

  return Array.from(grupos.values());
}

async function abrirRota(local: LocalConsulta) {
  const url =
    'https://www.google.com/maps/dir/?api=1' +
    `&destination=${local.latitude},${local.longitude}` +
    '&travelmode=driving';

  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error(
      '[Mapa] Não foi possível abrir a rota:',
      error
    );
  }
}

function mensagemDoErro(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Não foi possível recuperar os dados.';
}

export default function MapaConsultasScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    perfil?: string;
  }>();

  const ehMedico =
    parametro(params.perfil) === 'medico';

  const perfil = ehMedico
    ? 'medico'
    : 'paciente';

  const [consultas, setConsultas] =
    useState<Consulta[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState<string | null>(null);

  const [tentativa, setTentativa] =
    useState(0);

  const [filtros, setFiltros] =
    useState<FiltrosMapa>({
      ...FILTROS_INICIAIS,
    });

  // ===================================================
  // AUTENTICAÇÃO E CARREGAMENTO
  // ===================================================

  useEffect(() => {
    let ativo = true;
    let cancelarConsultas: (() => void) | undefined;

    setCarregando(true);
    setErro(null);

    // Aguarda o Firebase recuperar a sessão.
    const cancelarAuth = onAuthStateChanged(
      auth,

      (usuario) => {
        cancelarConsultas?.();
        cancelarConsultas = undefined;

        if (!ativo) {
          return;
        }

        if (!usuario) {
          setConsultas([]);
          setErro(
            'Sessão não encontrada. Entre novamente no aplicativo.'
          );
          setCarregando(false);
          return;
        }

        console.log(
          '[Mapa] Usuário autenticado:',
          usuario.uid
        );

        setErro(null);
        setCarregando(true);

        if (ehMedico) {
          // Médico: listener em tempo real.
          cancelarConsultas = acompanharConsultasMedico(
            (lista) => {
              if (!ativo) {
                return;
              }

              console.log(
                '[Mapa] Consultas médicas carregadas:',
                lista.length
              );

              setConsultas(lista);
              setErro(null);
              setCarregando(false);
            },

            (error) => {
              if (!ativo) {
                return;
              }

              console.error(
                '[Mapa] Erro no Firestore:',
                error
              );

              setErro(mensagemDoErro(error));
              setCarregando(false);
            }
          );

          return;
        }

        // Paciente: consulta da conta autenticada.
        listarConsultas(usuario.uid)
          .then((lista) => {
            if (!ativo) {
              return;
            }

            console.log(
              '[Mapa] Consultas do paciente carregadas:',
              lista.length
            );

            setConsultas(lista);
            setErro(null);
            setCarregando(false);
          })
          .catch((error) => {
            if (!ativo) {
              return;
            }

            console.error(
              '[Mapa] Erro ao buscar consultas:',
              error
            );

            setErro(mensagemDoErro(error));
            setCarregando(false);
          });
      },

      (error) => {
        if (!ativo) {
          return;
        }

        console.error(
          '[Mapa] Erro de autenticação:',
          error
        );

        setErro(mensagemDoErro(error));
        setCarregando(false);
      }
    );

    return () => {
      ativo = false;
      cancelarConsultas?.();
      cancelarAuth();
    };
  }, [ehMedico, tentativa]);

  // ===================================================
  // FILTROS
  // ===================================================

  const consultasFiltradas = useMemo(
    () =>
      filtrarConsultasMapa(
        consultas,
        filtros,
        perfil
      ),
    [consultas, filtros, perfil]
  );

  const locais = useMemo(
    () => agruparPorLocal(consultasFiltradas),
    [consultasFiltradas]
  );

  const marcadores: MarcadorMapa[] = useMemo(
    () =>
      locais.map((local) => ({
        id: local.id,
        latitude: local.latitude,
        longitude: local.longitude,
        titulo: local.nome,
        descricao: local.consultas
          .map(descricaoConsulta)
          .join('\n'),
        cor: local.cor,
      })),
    [locais]
  );

  const semLocalizacao = useMemo(
    () =>
      consultasFiltradas.filter(
        (consulta) => !coordenadasValidas(consulta)
      ).length,
    [consultasFiltradas]
  );

  const totalNoMapa =
    consultasFiltradas.length - semLocalizacao;

  const possuiFiltrosAtivos =
    filtros.periodo !== FILTROS_INICIAIS.periodo ||
    filtros.status !== FILTROS_INICIAIS.status ||
    filtros.paciente.trim() !== '' ||
    filtros.local.trim() !== '';

  function limparFiltros() {
    setFiltros({
      ...FILTROS_INICIAIS,
    });
  }

  function tentarNovamente() {
    setTentativa((valor) => valor + 1);
  }

  // ===================================================
  // TELA
  // ===================================================

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.voltar}
          onPress={() => router.back()}
          accessibilityRole="button"
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
              Mapa das consultas
            </Text>

            <Text style={styles.subtitulo}>
              Um marcador para cada local de atendimento
            </Text>
          </View>
        </View>

        {carregando ? (
          <View style={styles.estado}>
            <ActivityIndicator
              size="large"
              color={C.primary}
            />

            <Text style={styles.estadoTexto}>
              Carregando consultas...
            </Text>
          </View>
        ) : erro ? (
          <View style={styles.estado}>
            <Ionicons
              name="alert-circle-outline"
              size={36}
              color={C.primary}
            />

            <Text style={styles.estadoTitulo}>
              Não foi possível carregar as consultas
            </Text>

            <Text style={styles.estadoTexto}>
              {erro}
            </Text>

            <Pressable
              style={styles.botaoPrincipal}
              onPress={tentarNovamente}
              accessibilityRole="button"
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color="#FFFFFF"
              />

              <Text style={styles.botaoPrincipalTexto}>
                Tentar novamente
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <FiltrosMapaConsultas
              filtros={filtros}
              onChange={setFiltros}
              perfil={perfil}
              total={consultas.length}
              exibidas={consultasFiltradas.length}
            />

            <View style={styles.resumo}>
              <View style={styles.resumoInfo}>
                <Ionicons
                  name="location-outline"
                  size={17}
                  color={C.primary}
                />

                <Text style={styles.resumoTexto}>
                  {totalNoMapa}{' '}
                  {totalNoMapa === 1
                    ? 'consulta no mapa'
                    : 'consultas no mapa'}
                </Text>
              </View>

              <Text style={styles.resumoSecundario}>
                {locais.length}{' '}
                {locais.length === 1
                  ? 'local'
                  : 'locais'}
              </Text>
            </View>

            {consultasFiltradas.length === 0 ? (
              <View style={styles.estado}>
                <Ionicons
                  name="filter-outline"
                  size={36}
                  color={C.muted}
                />

                <Text style={styles.estadoTitulo}>
                  Nenhuma consulta encontrada
                </Text>

                <Text style={styles.estadoTexto}>
                  Não existem consultas correspondentes
                  aos filtros selecionados.
                </Text>

                {possuiFiltrosAtivos && (
                  <Pressable
                    style={styles.botaoPrincipal}
                    onPress={limparFiltros}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text style={styles.botaoPrincipalTexto}>
                      Limpar filtros
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : locais.length === 0 ? (
              <View style={styles.estado}>
                <Ionicons
                  name="location-outline"
                  size={36}
                  color={C.muted}
                />

                <Text style={styles.estadoTitulo}>
                  Nenhuma consulta com localização
                </Text>

                <Text style={styles.estadoTexto}>
                  As consultas correspondentes aos filtros
                  ainda não possuem coordenadas válidas.
                </Text>

                {semLocalizacao > 0 && (
                  <Text style={styles.aviso}>
                    {semLocalizacao}{' '}
                    {semLocalizacao === 1
                      ? 'consulta sem localização confirmada.'
                      : 'consultas sem localização confirmada.'}
                  </Text>
                )}
              </View>
            ) : (
              <>
                <View style={styles.mapaCard}>
                  <MapaConsultas
                    marcadores={marcadores}
                  />

                  <Text style={styles.creditos}>
                    Dados cartográficos: © colaboradores
                    do OpenStreetMap.
                  </Text>
                </View>

                <Text style={styles.secao}>
                  Locais ({locais.length})
                </Text>

                {locais.map((local) => (
                  <View
                    key={local.id}
                    style={styles.localCard}
                  >
                    <View style={styles.localCabecalho}>
                      <View
                        style={[
                          styles.pino,
                          { backgroundColor: local.cor },
                        ]}
                      />

                      <Text
                        style={styles.localNome}
                        numberOfLines={3}
                      >
                        {local.nome}
                      </Text>
                    </View>

                    {local.consultas.map((consulta) => (
                      <Text
                        key={
                          consulta.id ??
                          descricaoConsulta(consulta)
                        }
                        style={styles.localConsulta}
                      >
                        {descricaoConsulta(consulta)}
                      </Text>
                    ))}

                    <Pressable
                      style={({ pressed }) => [
                        styles.botaoRota,
                        pressed && styles.pressionado,
                      ]}
                      onPress={() =>
                        void abrirRota(local)
                      }
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name="navigate-outline"
                        size={18}
                        color={C.card}
                      />

                      <Text style={styles.botaoRotaTexto}>
                        Abrir rota
                      </Text>
                    </Pressable>
                  </View>
                ))}

                {semLocalizacao > 0 && (
                  <Text style={styles.aviso}>
                    {semLocalizacao}{' '}
                    {semLocalizacao === 1
                      ? 'consulta não aparece no mapa por estar sem localização confirmada.'
                      : 'consultas não aparecem no mapa por estarem sem localização confirmada.'}
                  </Text>
                )}
              </>
            )}
          </>
        )}
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

  estado: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 30,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    marginBottom: 14,
  },

  estadoTitulo: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  estadoTexto: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  botaoPrincipal: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },

  botaoPrincipalTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  resumo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 3,
  },

  resumoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  resumoTexto: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  resumoSecundario: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '600',
  },

  mapaCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },

  creditos: {
    color: C.muted,
    fontSize: 11,
    marginTop: 12,
    lineHeight: 17,
    textAlign: 'center',
  },

  secao: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },

  localCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    gap: 6,
  },

  localCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },

  pino: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    elevation: 2,
  },

  localNome: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },

  localConsulta: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 19,
    marginLeft: 26,
  },

  botaoRota: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
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
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
  },
});
