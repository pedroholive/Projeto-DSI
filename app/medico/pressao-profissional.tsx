
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Line,
  Polyline,
} from 'react-native-svg';

import { db } from '../firebaseConfig';

import {
  listarPacientesVinculados,
  type PacienteVinculado,
} from '../services/pacientesVinculadosService';

// =====================================================
// TIPOS
// =====================================================

type Periodo = 7 | 15 | 30 | 0;

type RegistroPressao = {
  id: string;
  sistolica: number;
  diastolica: number;
  observacao: string;
  dataMedicao: Timestamp;
};

// =====================================================
// CORES — MESMO PADRÃO DA GLICEMIA PROFISSIONAL
// =====================================================

const C = {
  background: '#F4F8F7',
  white: '#FFFFFF',
  primary: '#0E766D',
  primarySoft: '#E8F2F0',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
  danger: '#D94B57',
  sistolica: '#D94B57',
  diastolica: '#3B82F6',
};

// =====================================================
// TRATAMENTO DE ERROS
// =====================================================

function mensagemErro(error: unknown): string {
  const codigo =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? String(error.code)
      : '';

  if (codigo.includes('permission-denied')) {
    return 'Você não possui autorização para consultar esses dados. Verifique se o médico está validado e se o vínculo está ativo.';
  }

  if (codigo.includes('unauthenticated')) {
    return 'Sua sessão expirou. Faça login novamente.';
  }

  return error instanceof Error
    ? error.message
    : 'Não foi possível carregar as medições.';
}

// =====================================================
// CONSULTA DE PRESSÃO ARTERIAL
// =====================================================

async function listarPressoesPaciente(
  pacienteId: string
): Promise<RegistroPressao[]> {
  const referencia = collection(
    db,
    'usuarios',
    pacienteId,
    'registrosPressao'
  );

  const consulta = query(
    referencia,
    orderBy('dataMedicao', 'desc')
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.flatMap((documento) => {
    const dados = documento.data();

    const sistolica = Number(dados.sistolica);
    const diastolica = Number(dados.diastolica);

    if (
      !Number.isFinite(sistolica) ||
      !Number.isFinite(diastolica) ||
      sistolica <= 0 ||
      diastolica <= 0 ||
      !(dados.dataMedicao instanceof Timestamp)
    ) {
      return [];
    }

    return [{
      id: documento.id,
      sistolica,
      diastolica,
      observacao:
        typeof dados.observacao === 'string'
          ? dados.observacao
          : '',
      dataMedicao: dados.dataMedicao as Timestamp,
    }];
  });
}

// =====================================================
// FORMATAÇÃO DE DATA
// =====================================================

function formatarData(data: Timestamp): string {
  return data.toDate().toLocaleDateString('pt-BR');
}

function formatarHorario(data: Timestamp): string {
  return data.toDate().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =====================================================
// GRÁFICO DE PRESSÃO
// =====================================================

function GraficoPressao({
  registros,
}: {
  registros: RegistroPressao[];
}) {
  const dados = useMemo(
    () =>
      [...registros].sort(
        (a, b) =>
          a.dataMedicao.toMillis() -
          b.dataMedicao.toMillis()
      ),
    [registros]
  );

  if (dados.length === 0) {
    return (
      <Text style={styles.emptyText}>
        Não há medições válidas para exibir no gráfico.
      </Text>
    );
  }

  const largura = 320;
  const altura = 190;
  const margem = 28;

  const larguraUtil = largura - margem * 2;
  const alturaUtil = altura - margem * 2;

  const valores = dados.flatMap((item) => [
    item.sistolica,
    item.diastolica,
  ]);

  const minimo = Math.max(
    0,
    Math.min(...valores) - 20
  );

  const maximo = Math.max(...valores) + 20;
  const intervalo = Math.max(1, maximo - minimo);

  const pontos = dados.map((item, index) => {
    const x =
      dados.length === 1
        ? largura / 2
        : margem +
          (index / (dados.length - 1)) * larguraUtil;

    const yValor = (valor: number) =>
      margem +
      alturaUtil -
      ((valor - minimo) / intervalo) * alturaUtil;

    return {
      x,
      ySistolica: yValor(item.sistolica),
      yDiastolica: yValor(item.diastolica),
      item,
    };
  });

  return (
    <View style={styles.graphContainer}>
      <Svg
        width="100%"
        height={altura}
        viewBox={`0 0 ${largura} ${altura}`}
      >
        {[0, 1, 2, 3].map((indice) => {
          const y =
            margem + (indice / 3) * alturaUtil;

          return (
            <Line
              key={indice}
              x1={margem}
              y1={y}
              x2={largura - margem}
              y2={y}
              stroke={C.border}
              strokeWidth={1}
            />
          );
        })}

        {pontos.length > 1 && (
          <>
            <Polyline
              points={pontos
                .map(
                  ({ x, ySistolica }) =>
                    `${x},${ySistolica}`
                )
                .join(' ')}
              fill="none"
              stroke={C.sistolica}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            <Polyline
              points={pontos
                .map(
                  ({ x, yDiastolica }) =>
                    `${x},${yDiastolica}`
                )
                .join(' ')}
              fill="none"
              stroke={C.diastolica}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}

        {pontos.map(
          (
            { x, ySistolica, yDiastolica, item },
            index
          ) => (
            <ReactFragmentCirculos
              key={`${item.id}-${index}`}
              x={x}
              ySistolica={ySistolica}
              yDiastolica={yDiastolica}
            />
          )
        )}
      </Svg>

      <View style={styles.graphLegend}>
        <Text style={styles.legendSistolica}>
          ● Sistólica
        </Text>

        <Text style={styles.legendDiastolica}>
          ● Diastólica
        </Text>
      </View>

      <View style={styles.graphLegend}>
        <Text style={styles.smallText}>
          Primeira: {formatarData(dados[0].dataMedicao)}
        </Text>

        <Text style={styles.smallText}>
          Última: {formatarData(
            dados[dados.length - 1].dataMedicao
          )}
        </Text>
      </View>

      <Text style={styles.graphNote}>
        Valores em mmHg. O gráfico apresenta as
        medições registradas e não substitui
        avaliação clínica.
      </Text>
    </View>
  );
}

// Agrupa os dois pontos de uma mesma medição.
function ReactFragmentCirculos({
  x,
  ySistolica,
  yDiastolica,
}: {
  x: number;
  ySistolica: number;
  yDiastolica: number;
}) {
  return (
    <>
      <Circle
        cx={x}
        cy={ySistolica}
        r={4}
        fill={C.sistolica}
        stroke={C.white}
        strokeWidth={2}
      />

      <Circle
        cx={x}
        cy={yDiastolica}
        r={4}
        fill={C.diastolica}
        stroke={C.white}
        strokeWidth={2}
      />
    </>
  );
}

// =====================================================
// TELA PRINCIPAL
// =====================================================

export default function PressaoProfissionalScreen() {
  const router = useRouter();

  const [pacientes, setPacientes] =
    useState<PacienteVinculado[]>([]);

  const [pacienteSelecionado, setPacienteSelecionado] =
    useState<PacienteVinculado | null>(null);

  const [registros, setRegistros] =
    useState<RegistroPressao[]>([]);

  const [periodo, setPeriodo] = useState<Periodo>(30);

  const [carregandoPacientes, setCarregandoPacientes] =
    useState(true);

  const [carregandoPressoes, setCarregandoPressoes] =
    useState(false);

  const [atualizando, setAtualizando] =
    useState(false);

  // ===================================================
  // PACIENTES VINCULADOS
  // ===================================================

  const carregarPacientes = useCallback(async () => {
    const lista = await listarPacientesVinculados();

    setPacientes(lista);
    return lista;
  }, []);

  // ===================================================
  // SELEÇÃO DO PACIENTE
  // ===================================================

  const selecionarPaciente = useCallback(
    async (paciente: PacienteVinculado) => {
      setPacienteSelecionado(paciente);
      setRegistros([]);
      setPeriodo(30);
      setCarregandoPressoes(true);

      try {
        const dados =
          await listarPressoesPaciente(paciente.id);

        setRegistros(dados);
      } catch (error) {
        Alert.alert(
          'Erro ao consultar pressão',
          mensagemErro(error)
        );
      } finally {
        setCarregandoPressoes(false);
      }
    },
    []
  );

  // ===================================================
  // CARREGAMENTO INICIAL
  // ===================================================

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      try {
        const lista =
          await listarPacientesVinculados();

        if (ativo) {
          setPacientes(lista);
        }
      } catch (error) {
        if (ativo) {
          Alert.alert(
            'Erro ao carregar pacientes',
            mensagemErro(error)
          );
        }
      } finally {
        if (ativo) {
          setCarregandoPacientes(false);
        }
      }
    }

    void iniciar();

    return () => {
      ativo = false;
    };
  }, []);

  // ===================================================
  // ATUALIZAÇÃO DOS DADOS
  // ===================================================

  const atualizar = useCallback(async () => {
    setAtualizando(true);

    try {
      const lista = await carregarPacientes();

      if (pacienteSelecionado) {
        const aindaVinculado = lista.find(
          (paciente) =>
            paciente.id === pacienteSelecionado.id
        );

        if (!aindaVinculado) {
          setPacienteSelecionado(null);
          setRegistros([]);
        } else {
          const dados = await listarPressoesPaciente(
            aindaVinculado.id
          );

          setPacienteSelecionado(aindaVinculado);
          setRegistros(dados);
        }
      }
    } catch (error) {
      Alert.alert(
        'Erro ao atualizar',
        mensagemErro(error)
      );

      setPacienteSelecionado(null);
      setRegistros([]);
    } finally {
      setAtualizando(false);
    }
  }, [carregarPacientes, pacienteSelecionado]);

  // ===================================================
  // FILTROS POR PERÍODO
  // ===================================================

  const registrosFiltrados = useMemo(() => {
    const agora = Date.now();

    return [...registros]
      .filter((registro) => {
        const data = registro.dataMedicao.toMillis();

        if (!data || data > agora) return false;
        if (periodo === 0) return true;

        return (
          data >=
          agora - periodo * 24 * 60 * 60 * 1000
        );
      })
      .sort(
        (a, b) =>
          b.dataMedicao.toMillis() -
          a.dataMedicao.toMillis()
      );
  }, [registros, periodo]);

  // ===================================================
  // ESTATÍSTICAS
  // ===================================================

  const estatisticas = useMemo(() => {
    if (registrosFiltrados.length === 0) {
      return null;
    }

    const sistolicas = registrosFiltrados.map(
      (registro) => registro.sistolica
    );

    const diastolicas = registrosFiltrados.map(
      (registro) => registro.diastolica
    );

    const media = (valores: number[]) =>
      valores.reduce(
        (soma, valor) => soma + valor,
        0
      ) / valores.length;

    return {
      total: registrosFiltrados.length,
      mediaSistolica: media(sistolicas),
      mediaDiastolica: media(diastolicas),
      menorSistolica: Math.min(...sistolicas),
      maiorSistolica: Math.max(...sistolicas),
    };
  }, [registrosFiltrados]);

  // ===================================================
  // INTERFACE
  // ===================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (pacienteSelecionado) {
              setPacienteSelecionado(null);
              setRegistros([]);
            } else {
              router.back();
            }
          }}
          accessibilityLabel="Voltar"
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={C.primary}
          />
        </Pressable>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            Pressão dos pacientes
          </Text>

          <Text style={styles.headerSubtitle}>
            Acompanhamento profissional
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void atualizar()}
            tintColor={C.primary}
          />
        }
      >
        {!pacienteSelecionado ? (
          <>
            <Text style={styles.sectionTitle}>
              Pacientes vinculados
            </Text>

            <Text style={styles.description}>
              Selecione um paciente com vínculo ativo
              para consultar suas medições.
            </Text>

            {carregandoPacientes ? (
              <ActivityIndicator
                size="large"
                color={C.primary}
                style={styles.loader}
              />
            ) : pacientes.length === 0 ? (
              <View style={styles.card}>
                <Ionicons
                  name="people-outline"
                  size={34}
                  color={C.muted}
                />

                <Text style={styles.emptyTitle}>
                  Nenhum paciente vinculado
                </Text>

                <Text style={styles.emptyText}>
                  Os pacientes aparecerão aqui após
                  aceitarem o vínculo com o médico.
                </Text>
              </View>
            ) : (
              pacientes.map((paciente) => (
                <Pressable
                  key={paciente.id}
                  style={styles.patientCard}
                  onPress={() =>
                    void selecionarPaciente(paciente)
                  }
                >
                  <View style={styles.avatar}>
                    <Ionicons
                      name="person-outline"
                      size={25}
                      color={C.primary}
                    />
                  </View>

                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>
                      {paciente.nome}
                    </Text>

                    <Text style={styles.smallText}>
                      Consultar pressão
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={C.primary}
                  />
                </Pressable>
              ))
            )}
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.smallText}>
                Paciente selecionado
              </Text>

              <Text style={styles.selectedPatient}>
                {pacienteSelecionado.nome}
              </Text>

              <Pressable
                onPress={() => {
                  setPacienteSelecionado(null);
                  setRegistros([]);
                }}
              >
                <Text style={styles.link}>
                  Trocar paciente
                </Text>
              </Pressable>
            </View>

            {carregandoPressoes ? (
              <ActivityIndicator
                size="large"
                color={C.primary}
                style={styles.loader}
              />
            ) : (
              <>
                <Text style={styles.sectionTitle}>
                  Período de análise
                </Text>

                <View style={styles.periodRow}>
                  {(
                    [
                      { label: '7 dias', value: 7 },
                      { label: '15 dias', value: 15 },
                      { label: '30 dias', value: 30 },
                      { label: 'Todos', value: 0 },
                    ] as const
                  ).map((opcao) => (
                    <Pressable
                      key={opcao.value}
                      onPress={() =>
                        setPeriodo(opcao.value)
                      }
                      style={[
                        styles.periodButton,
                        periodo === opcao.value &&
                          styles.periodButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.periodText,
                          periodo === opcao.value &&
                            styles.periodTextActive,
                        ]}
                      >
                        {opcao.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>
                  Resumo das medições
                </Text>

                {estatisticas ? (
                  <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>
                        Média sistólica
                      </Text>

                      <Text style={styles.statValue}>
                        {estatisticas.mediaSistolica.toFixed(1)}
                      </Text>

                      <Text style={styles.smallText}>
                        mmHg
                      </Text>
                    </View>

                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>
                        Média diastólica
                      </Text>

                      <Text style={styles.statValue}>
                        {estatisticas.mediaDiastolica.toFixed(1)}
                      </Text>

                      <Text style={styles.smallText}>
                        mmHg
                      </Text>
                    </View>

                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>
                        Maior sistólica
                      </Text>

                      <Text style={styles.statValue}>
                        {estatisticas.maiorSistolica}
                      </Text>

                      <Text style={styles.smallText}>
                        mmHg
                      </Text>
                    </View>

                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>
                        Registros
                      </Text>

                      <Text style={styles.statValue}>
                        {estatisticas.total}
                      </Text>

                      <Text style={styles.smallText}>
                        medições
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.card}>
                    <Text style={styles.emptyText}>
                      Nenhuma medição encontrada neste
                      período.
                    </Text>
                  </View>
                )}

                <Text style={styles.sectionTitle}>
                  Evolução da pressão
                </Text>

                <View style={styles.card}>
                  <GraficoPressao
                    registros={registrosFiltrados}
                  />
                </View>

                <Text style={styles.sectionTitle}>
                  Histórico de medições
                </Text>

                {registrosFiltrados.length === 0 ? (
                  <View style={styles.card}>
                    <Text style={styles.emptyText}>
                      Não há registros para o período
                      selecionado.
                    </Text>
                  </View>
                ) : (
                  registrosFiltrados.map(
                    (registro) => (
                      <View
                        key={registro.id}
                        style={styles.recordCard}
                      >
                        <View style={styles.recordHeader}>
                          <Text style={styles.recordValue}>
                            {registro.sistolica}/
                            {registro.diastolica} mmHg
                          </Text>

                          <Text style={styles.smallText}>
                            {formatarData(
                              registro.dataMedicao
                            )}
                          </Text>
                        </View>

                        <Text style={styles.recordDetail}>
                          Horário:{' '}
                          {formatarHorario(
                            registro.dataMedicao
                          )}
                        </Text>

                        {registro.observacao ? (
                          <Text style={styles.recordDetail}>
                            Observação:{' '}
                            {registro.observacao}
                          </Text>
                        ) : null}
                      </View>
                    )
                  )
                )}

                <Text style={styles.disclaimer}>
                  Informações destinadas ao acompanhamento
                  profissional. A interpretação das
                  medições depende do contexto clínico
                  de cada paciente.
                </Text>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// ESTILOS — REPLICADOS DA TELA DE GLICEMIA
// =====================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },

  backButton: {
    padding: 6,
    marginRight: 10,
  },

  headerTitleContainer: {
    flex: 1,
  },

  headerTitle: {
    color: C.text,
    fontSize: 19,
    fontWeight: '700',
  },

  headerSubtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 3,
  },

  content: {
    padding: 20,
    paddingBottom: 45,
    gap: 14,
  },

  sectionTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 8,
  },

  description: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
  },

  loader: {
    marginTop: 35,
  },

  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },

  patientCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  patientInfo: {
    flex: 1,
    gap: 4,
  },

  patientName: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
  },

  selectedPatient: {
    color: C.text,
    fontSize: 22,
    fontWeight: '800',
  },

  link: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 5,
  },

  smallText: {
    color: C.muted,
    fontSize: 12,
  },

  emptyTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },

  emptyText: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
  },

  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  periodButton: {
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  periodButtonActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },

  periodText: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
  },

  periodTextActive: {
    color: C.white,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
    gap: 5,
  },

  statLabel: {
    color: C.muted,
    fontSize: 12,
  },

  statValue: {
    color: C.primary,
    fontSize: 25,
    fontWeight: '800',
  },

  graphContainer: {
    alignItems: 'center',
  },

  graphLegend: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  legendSistolica: {
    color: C.sistolica,
    fontSize: 12,
    fontWeight: '700',
  },

  legendDiastolica: {
    color: C.diastolica,
    fontSize: 12,
    fontWeight: '700',
  },

  graphNote: {
    color: C.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 17,
  },

  recordCard: {
    backgroundColor: C.white,
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 7,
  },

  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  recordValue: {
    color: C.primary,
    fontSize: 20,
    fontWeight: '800',
  },

  recordDetail: {
    color: C.text,
    fontSize: 13,
    lineHeight: 19,
  },

  disclaimer: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
});
