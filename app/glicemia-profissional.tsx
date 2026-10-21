
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import {
  listarPacientesVinculados,
  type PacienteVinculado,
} from '../services/pacientesVinculadosService';

import {
  listarGlicemias,
  type Glicemia,
} from '../services/glicemiaService';

const C = {
  background: '#F4F8F7',
  white: '#FFFFFF',
  primary: '#0E766D',
  primarySoft: '#E8F2F0',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
  danger: '#D94B57',
};

type Periodo = 7 | 15 | 30 | 0;

function dataDaMedicao(registro: Glicemia): number {
  const partes = registro.data.split(/[/-]/);

  if (partes.length !== 3) return 0;

  let ano: number;
  let mes: number;
  let dia: number;

  if (partes[0].length === 4) {
    ano = Number(partes[0]);
    mes = Number(partes[1]);
    dia = Number(partes[2]);
  } else {
    dia = Number(partes[0]);
    mes = Number(partes[1]);
    ano = Number(partes[2]);
  }

  const [hora = '0', minuto = '0'] =
    registro.horario.split(':');

  const data = new Date(
    ano,
    mes - 1,
    dia,
    Number(hora),
    Number(minuto)
  );

  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return 0;
  }

  return data.getTime();
}

function mensagemErro(error: unknown): string {
  const codigo =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';

  if (codigo.includes('permission-denied')) {
    return 'Você não possui autorização para consultar esses dados. Verifique se o médico está validado e se o vínculo está ativo.';
  }

  if (codigo.includes('unauthenticated')) {
    return 'Sua sessão expirou. Faça login novamente.';
  }

  if (codigo.includes('not-found')) {
    return 'A funcionalidade ainda não está disponível no servidor. Verifique se a Cloud Function foi publicada.';
  }

  return error instanceof Error
    ? error.message
    : 'Não foi possível carregar os dados.';
}

function GraficoGlicemia({
  registros,
}: {
  registros: Glicemia[];
}) {
  const dados = useMemo(
    () =>
      [...registros]
        .filter(
          (registro) =>
            Number.isFinite(registro.valor) &&
            registro.valor > 0 &&
            dataDaMedicao(registro) > 0
        )
        .sort(
          (a, b) =>
            dataDaMedicao(a) - dataDaMedicao(b)
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

  const valores = dados.map((item) => item.valor);
  const minimo = Math.max(0, Math.min(...valores) - 20);
  const maximo = Math.max(...valores) + 20;
  const intervalo = Math.max(1, maximo - minimo);

  const pontos = dados.map((item, index) => {
    const x =
      dados.length === 1
        ? largura / 2
        : margem +
          (index / (dados.length - 1)) * larguraUtil;

    const y =
      margem +
      alturaUtil -
      ((item.valor - minimo) / intervalo) * alturaUtil;

    return { x, y, item };
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
          <Polyline
            points={pontos
              .map(({ x, y }) => `${x},${y}`)
              .join(' ')}
            fill="none"
            stroke={C.primary}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {pontos.map(({ x, y, item }, index) => (
          <Circle
            key={`${item.id ?? index}-${index}`}
            cx={x}
            cy={y}
            r={4}
            fill={C.primary}
            stroke={C.white}
            strokeWidth={2}
          />
        ))}
      </Svg>

      <View style={styles.graphLegend}>
        <Text style={styles.smallText}>
          Primeira: {dados[0].data}
        </Text>
        <Text style={styles.smallText}>
          Última: {dados[dados.length - 1].data}
        </Text>
      </View>

      <Text style={styles.graphNote}>
        Valores em mg/dL. O gráfico apresenta as medições
        registradas e não substitui avaliação clínica.
      </Text>
    </View>
  );
}

export default function GlicemiaProfissionalScreen() {
  const router = useRouter();

  const [pacientes, setPacientes] =
    useState<PacienteVinculado[]>([]);

  const [pacienteSelecionado, setPacienteSelecionado] =
    useState<PacienteVinculado | null>(null);

  const [registros, setRegistros] =
    useState<Glicemia[]>([]);

  const [periodo, setPeriodo] = useState<Periodo>(30);

  const [carregandoPacientes, setCarregandoPacientes] =
    useState(true);

  const [carregandoGlicemias, setCarregandoGlicemias] =
    useState(false);

  const [atualizando, setAtualizando] = useState(false);

  const carregarPacientes = useCallback(async () => {
    const lista = await listarPacientesVinculados();
    setPacientes(lista);
    return lista;
  }, []);

  const selecionarPaciente = useCallback(
    async (paciente: PacienteVinculado) => {
      setPacienteSelecionado(paciente);
      setRegistros([]);
      setPeriodo(30);
      setCarregandoGlicemias(true);

      try {
        const dados = await listarGlicemias(paciente.id);
        setRegistros(dados);
      } catch (error) {
        Alert.alert('Erro ao consultar glicemia', mensagemErro(error));
      } finally {
        setCarregandoGlicemias(false);
      }
    },
    []
  );

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      try {
        const lista = await listarPacientesVinculados();

        if (ativo) {
          setPacientes(lista);
        }
      } catch (error) {
        if (ativo) {
          Alert.alert('Erro ao carregar pacientes', mensagemErro(error));
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
          const dados = await listarGlicemias(
            aindaVinculado.id
          );

          setPacienteSelecionado(aindaVinculado);
          setRegistros(dados);
        }
      }
    } catch (error) {
      Alert.alert('Erro ao atualizar', mensagemErro(error));
      setPacienteSelecionado(null);
      setRegistros([]);
    } finally {
      setAtualizando(false);
    }
  }, [carregarPacientes, pacienteSelecionado]);

  const registrosFiltrados = useMemo(() => {
    const agora = Date.now();

    return [...registros]
      .filter((registro) => {
        const data = dataDaMedicao(registro);

        if (!data || data > agora) return false;
        if (periodo === 0) return true;

        return (
          data >=
          agora - periodo * 24 * 60 * 60 * 1000
        );
      })
      .sort(
        (a, b) =>
          dataDaMedicao(b) - dataDaMedicao(a)
      );
  }, [registros, periodo]);

  const estatisticas = useMemo(() => {
    const valores = registrosFiltrados
      .map((registro) => registro.valor)
      .filter(
        (valor) =>
          Number.isFinite(valor) && valor > 0
      );

    if (valores.length === 0) return null;

    return {
      total: valores.length,
      media:
        valores.reduce((soma, valor) => soma + valor, 0) /
        valores.length,
      minimo: Math.min(...valores),
      maximo: Math.max(...valores),
    };
  }, [registrosFiltrados]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            pacienteSelecionado
              ? (setPacienteSelecionado(null),
                setRegistros([]))
              : router.back()
          }
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
            Glicemia dos pacientes
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
              Selecione um paciente com vínculo ativo para
              consultar suas medições.
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
                      Consultar glicemia
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

            {carregandoGlicemias ? (
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
                        Média
                      </Text>
                      <Text style={styles.statValue}>
                        {estatisticas.media.toFixed(1)}
                      </Text>
                      <Text style={styles.smallText}>
                        mg/dL
                      </Text>
                    </View>

                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>
                        Menor valor
                      </Text>
                      <Text style={styles.statValue}>
                        {estatisticas.minimo}
                      </Text>
                      <Text style={styles.smallText}>
                        mg/dL
                      </Text>
                    </View>

                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>
                        Maior valor
                      </Text>
                      <Text style={styles.statValue}>
                        {estatisticas.maximo}
                      </Text>
                      <Text style={styles.smallText}>
                        mg/dL
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
                  Evolução da glicemia
                </Text>

                <View style={styles.card}>
                  <GraficoGlicemia
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
                    (registro, index) => (
                      <View
                        key={registro.id ?? index}
                        style={styles.recordCard}
                      >
                        <View style={styles.recordHeader}>
                          <Text style={styles.recordValue}>
                            {registro.valor} mg/dL
                          </Text>

                          <Text style={styles.smallText}>
                            {registro.data}
                          </Text>
                        </View>

                        <Text style={styles.recordDetail}>
                          Horário: {registro.horario}
                        </Text>

                        <Text style={styles.recordDetail}>
                          Contexto: {registro.contexto}
                        </Text>

                        {registro.observacao ? (
                          <Text style={styles.recordDetail}>
                            Observação: {registro.observacao}
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
