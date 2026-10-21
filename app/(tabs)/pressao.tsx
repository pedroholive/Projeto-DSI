import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Circle,
  Line,
  Polyline,
  Text as SvgText,
} from 'react-native-svg';

import { onAuthStateChanged } from 'firebase/auth';

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';

import { auth, db } from '../../firebaseConfig';


type RegistroPressao = {
  id: string;
  sistolica: number;
  diastolica: number;
  observacao: string;
  dataMedicao: Timestamp | null;
};


type PontoGrafico = {
  chave: string;
  dia: string;
  dataCurta: string;
  sistolica: number;
  diastolica: number;
  quantidade: number;
};


const CORES = {
  fundo: '#F4F6F7',
  card: '#FFFFFF',
  texto: '#273331',
  secundario: '#7E8D89',
  borda: '#E8EFED',
  primario: '#0E9F8C',
  primarioEscuro: '#0E766D',
  primarioSuave: '#E7F8F4',
  sistolica: '#EF476F',
  diastolica: '#3B82F6',
  grade: '#E7EEEC',
};


function inicioDoDia(data: Date) {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia;
}


function chaveDaData(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}


function nomeDiaSemana(data: Date) {
  const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return nomes[data.getDay()];
}


function media(valores: number[]) {
  if (valores.length === 0) {
    return 0;
  }

  return Math.round(
    valores.reduce((total, valor) => total + valor, 0) /
      valores.length
  );
}


function montarDadosGrafico(
  historico: RegistroPressao[]
): PontoGrafico[] {
  const hoje = inicioDoDia(new Date());
  const seteDiasAtras = new Date(hoje);
  seteDiasAtras.setDate(hoje.getDate() - 6);

  const porDia = new Map<
    string,
    {
      data: Date;
      sistolicas: number[];
      diastolicas: number[];
    }
  >();

  historico.forEach((registro) => {
    if (!registro.dataMedicao) {
      return;
    }

    const data = registro.dataMedicao.toDate();
    const dia = inicioDoDia(data);

    if (
      dia.getTime() < seteDiasAtras.getTime() ||
      dia.getTime() > hoje.getTime()
    ) {
      return;
    }

    const chave = chaveDaData(dia);
    const existente = porDia.get(chave);

    if (existente) {
      existente.sistolicas.push(registro.sistolica);
      existente.diastolicas.push(registro.diastolica);
      return;
    }

    porDia.set(chave, {
      data: dia,
      sistolicas: [registro.sistolica],
      diastolicas: [registro.diastolica],
    });
  });

  return Array.from(porDia.entries())
    .map(([chave, item]) => ({
      chave,
      dia: nomeDiaSemana(item.data),
      dataCurta: item.data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
      sistolica: media(item.sistolicas),
      diastolica: media(item.diastolicas),
      quantidade: item.sistolicas.length,
    }))
    .sort((a, b) => a.chave.localeCompare(b.chave));
}


function GraficoPressao({
  dados,
}: {
  dados: PontoGrafico[];
}) {
  const largura = 440;
  const altura = 205;
  const margemEsquerda = 38;
  const margemDireita = 14;
  const margemTopo = 20;
  const margemInferior = 38;

  const valores = dados.flatMap((item) => [
    item.sistolica,
    item.diastolica,
  ]);

  const menorValor = Math.min(...valores);
  const maiorValor = Math.max(...valores);

  const minimo = Math.max(
    20,
    Math.floor((menorValor - 15) / 10) * 10
  );

  const maximo = Math.ceil((maiorValor + 15) / 10) * 10;
  const faixa = Math.max(10, maximo - minimo);

  const larguraUtil =
    largura - margemEsquerda - margemDireita;

  const alturaUtil =
    altura - margemTopo - margemInferior;

  function xDoIndice(indice: number) {
    if (dados.length === 1) {
      return margemEsquerda + larguraUtil / 2;
    }

    return (
      margemEsquerda +
      (indice / (dados.length - 1)) * larguraUtil
    );
  }

  function yDoValor(valor: number) {
    return (
      margemTopo +
      ((maximo - valor) / faixa) * alturaUtil
    );
  }

  const pontosSistolica = dados
    .map(
      (item, indice) =>
        `${xDoIndice(indice)},${yDoValor(item.sistolica)}`
    )
    .join(' ');

  const pontosDiastolica = dados
    .map(
      (item, indice) =>
        `${xDoIndice(indice)},${yDoValor(item.diastolica)}`
    )
    .join(' ');

  const linhasGrade = 4;

  return (
    <View style={styles.graficoArea}>
      <Svg
        width="100%"
        height={altura}
        viewBox={`0 0 ${largura} ${altura}`}
      >
        {Array.from({ length: linhasGrade }, (_, indice) => {
          const proporcao = indice / (linhasGrade - 1);
          const y = margemTopo + proporcao * alturaUtil;
          const valor = Math.round(
            maximo - proporcao * faixa
          );

          return (
            <React.Fragment key={`grade-${indice}`}>
              <Line
                x1={margemEsquerda}
                y1={y}
                x2={largura - margemDireita}
                y2={y}
                stroke={CORES.grade}
                strokeWidth="1"
              />

              <SvgText
                x={margemEsquerda - 8}
                y={y + 4}
                fontSize="10"
                fill={CORES.secundario}
                textAnchor="end"
              >
                {valor}
              </SvgText>
            </React.Fragment>
          );
        })}

        {dados.length > 1 && (
          <>
            <Polyline
              points={pontosSistolica}
              fill="none"
              stroke={CORES.sistolica}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            <Polyline
              points={pontosDiastolica}
              fill="none"
              stroke={CORES.diastolica}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}

        {dados.map((item, indice) => {
          const x = xDoIndice(indice);
          const ySistolica = yDoValor(item.sistolica);
          const yDiastolica = yDoValor(item.diastolica);

          return (
            <React.Fragment key={item.chave}>
              <Circle
                cx={x}
                cy={ySistolica}
                r="5"
                fill={CORES.card}
                stroke={CORES.sistolica}
                strokeWidth="3"
              />

              <Circle
                cx={x}
                cy={yDiastolica}
                r="5"
                fill={CORES.card}
                stroke={CORES.diastolica}
                strokeWidth="3"
              />

              <SvgText
                x={x}
                y={ySistolica - 9}
                fontSize="9"
                fontWeight="700"
                fill={CORES.sistolica}
                textAnchor="middle"
              >
                {item.sistolica}
              </SvgText>

              <SvgText
                x={x}
                y={yDiastolica + 17}
                fontSize="9"
                fontWeight="700"
                fill={CORES.diastolica}
                textAnchor="middle"
              >
                {item.diastolica}
              </SvgText>

              <SvgText
                x={x}
                y={altura - 18}
                fontSize="10"
                fill={CORES.secundario}
                textAnchor="middle"
              >
                {item.dia}
              </SvgText>

              <SvgText
                x={x}
                y={altura - 5}
                fontSize="8"
                fill="#A1ACA9"
                textAnchor="middle"
              >
                {item.dataCurta}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}


export default function PressaoScreen() {
  const router = useRouter();

  const [historico, setHistorico] =
    useState<RegistroPressao[]>([]);

  const [carregando, setCarregando] =
    useState(true);


  useEffect(() => {
    let cancelarFirestore:
      | (() => void)
      | undefined;

    const cancelarAuth = onAuthStateChanged(
      auth,
      (usuario) => {
        if (cancelarFirestore) {
          cancelarFirestore();
          cancelarFirestore = undefined;
        }

        if (!usuario) {
          setHistorico([]);
          setCarregando(false);
          return;
        }

        setCarregando(true);

        const registrosRef = collection(
          db,
          'usuarios',
          usuario.uid,
          'registrosPressao'
        );

        const consulta = query(
          registrosRef,
          orderBy('dataMedicao', 'desc')
        );

        cancelarFirestore = onSnapshot(
          consulta,
          (snapshot) => {
            const registros = snapshot.docs.map(
              (documento) => {
                const dados = documento.data();

                return {
                  id: documento.id,
                  sistolica: Number(dados.sistolica),
                  diastolica: Number(dados.diastolica),
                  observacao: dados.observacao ?? '',
                  dataMedicao:
                    dados.dataMedicao instanceof Timestamp
                      ? dados.dataMedicao
                      : null,
                };
              }
            );

            setHistorico(registros);
            setCarregando(false);
          },
          (error) => {
            console.error(
              'Erro ao carregar aferições:',
              error
            );

            setCarregando(false);
          }
        );
      }
    );

    return () => {
      cancelarFirestore?.();
      cancelarAuth();
    };
  }, []);


  function formatarMomento(
    timestamp: Timestamp | null
  ) {
    if (!timestamp) {
      return 'Data indisponível';
    }

    const data = timestamp.toDate();

    const dataFormatada = data.toLocaleDateString(
      'pt-BR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }
    );

    const horaFormatada = data.toLocaleTimeString(
      'pt-BR',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );

    return `${dataFormatada} • ${horaFormatada}`;
  }


  const ultimaMedicao = historico[0];

  const dadosGrafico = useMemo(
    () => montarDadosGrafico(historico),
    [historico]
  );

  const mediaSistolica = useMemo(
    () => media(dadosGrafico.map((item) => item.sistolica)),
    [dadosGrafico]
  );

  const mediaDiastolica = useMemo(
    () => media(dadosGrafico.map((item) => item.diastolica)),
    [dadosGrafico]
  );

  const totalAfericoesGrafico = useMemo(
    () =>
      dadosGrafico.reduce(
        (total, item) => total + item.quantidade,
        0
      ),
    [dadosGrafico]
  );

  const possuiEvolucao = dadosGrafico.length >= 2;


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* CABEÇALHO */}

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="heart-outline"
                size={24}
                color={CORES.primario}
              />
            </View>

            <View style={styles.headerTexto}>
              <Text style={styles.titulo}>
                Pressão Arterial
              </Text>

              <Text style={styles.subtitulo}>
                Acompanhe suas aferições ao longo do tempo.
              </Text>
            </View>
          </View>


          {/* ÚLTIMA MEDIÇÃO */}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              Última Medição
            </Text>

            {carregando ? (
              <ActivityIndicator
                size="small"
                color={CORES.primario}
                style={styles.loadingUltimaMedicao}
              />
            ) : ultimaMedicao ? (
              <>
                <View style={styles.ultimaMedicaoRow}>
                  <View style={styles.valorContainer}>
                    <Text style={styles.valorPrincipal}>
                      {ultimaMedicao.sistolica}
                    </Text>

                    <Text style={styles.separador}>/</Text>

                    <Text style={styles.valorPrincipal}>
                      {ultimaMedicao.diastolica}
                    </Text>

                    <Text style={styles.unidade}>
                      mmHg
                    </Text>
                  </View>

                  <View style={styles.tagRegistro}>
                    <Text style={styles.tagRegistroTexto}>
                      Recente
                    </Text>
                  </View>
                </View>

                <View style={styles.medicaoInfo}>
                  <Ionicons
                    name="time-outline"
                    size={15}
                    color={CORES.secundario}
                  />

                  <Text style={styles.medicaoInfoTexto}>
                    {formatarMomento(
                      ultimaMedicao.dataMedicao
                    )}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.semRegistros}>
                Nenhuma aferição registrada ainda.
              </Text>
            )}
          </View>


          {/* REGISTRAR PRESSÃO */}

          <Pressable
            style={styles.registrarCard}
            onPress={() =>
              router.push({
                pathname: '/novo-registro',
                params: {
                  tipo: 'pressao',
                },
              })
            }
          >
            <View style={styles.registrarIcone}>
              <Ionicons
                name="add"
                size={22}
                color={CORES.primario}
              />
            </View>

            <View style={styles.registrarConteudo}>
              <Text style={styles.registrarTitulo}>
                Registrar Pressão
              </Text>

              <Text style={styles.registrarDescricao}>
                Adicione uma nova aferição rapidamente
              </Text>
            </View>

            <View style={styles.registrarBotao}>
              <Text style={styles.registrarBotaoTexto}>
                Adicionar
              </Text>

              <Ionicons
                name="chevron-forward"
                size={16}
                color="#FFFFFF"
              />
            </View>
          </Pressable>


          {/* EVOLUÇÃO DA PRESSÃO */}

          <View style={styles.card}>
            <View style={styles.evolucaoHeader}>
              <View style={styles.evolucaoTituloArea}>
                <Text style={styles.cardTitulo}>
                  Evolução da pressão
                </Text>

                <Text style={styles.evolucaoSubtitulo}>
                  Últimos 7 dias
                </Text>
              </View>

              {dadosGrafico.length > 0 && (
                <View style={styles.periodoBadge}>
                  <Text style={styles.periodoBadgeTexto}>
                    {totalAfericoesGrafico}{' '}
                    {totalAfericoesGrafico === 1
                      ? 'aferição'
                      : 'aferições'}
                  </Text>
                </View>
              )}
            </View>

            {carregando ? (
              <View style={styles.graficoLoading}>
                <ActivityIndicator
                  size="small"
                  color={CORES.primario}
                />
              </View>
            ) : dadosGrafico.length === 0 ? (
              <View style={styles.evolucaoVazia}>
                <View style={styles.evolucaoVaziaIcone}>
                  <Ionicons
                    name="analytics-outline"
                    size={26}
                    color={CORES.primarioEscuro}
                  />
                </View>

                <Text style={styles.evolucaoVaziaTitulo}>
                  Ainda não há dados para o gráfico
                </Text>

                <Text style={styles.evolucaoVaziaTexto}>
                  Registre pelo menos duas aferições em dias diferentes para visualizar sua evolução.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.resumoSemanaRow}>
                  <View style={styles.mediaCard}>
                    <Text style={styles.mediaLabel}>
                      Média do período
                    </Text>

                    <View style={styles.mediaValorRow}>
                      <Text style={styles.mediaValor}>
                        {mediaSistolica}/{mediaDiastolica}
                      </Text>

                      <Text style={styles.mediaUnidade}>
                        mmHg
                      </Text>
                    </View>
                  </View>

                  <View style={styles.legendaVertical}>
                    <View style={styles.legendaItem}>
                      <View
                        style={[
                          styles.legendaLinha,
                          styles.linhaSistolica,
                        ]}
                      />

                      <Text style={styles.legendaTexto}>
                        Sistólica
                      </Text>
                    </View>

                    <View style={styles.legendaItem}>
                      <View
                        style={[
                          styles.legendaLinha,
                          styles.linhaDiastolica,
                        ]}
                      />

                      <Text style={styles.legendaTexto}>
                        Diastólica
                      </Text>
                    </View>
                  </View>
                </View>

                <GraficoPressao dados={dadosGrafico} />

                {!possuiEvolucao && (
                  <View style={styles.avisoPoucosDados}>
                    <Ionicons
                      name="information-circle-outline"
                      size={17}
                      color={CORES.primarioEscuro}
                    />

                    <Text style={styles.avisoPoucosDadosTexto}>
                      Com mais um dia de aferição, o gráfico passa a mostrar a tendência entre os pontos.
                    </Text>
                  </View>
                )}

                <Text style={styles.notaMedia}>
                  Quando há mais de uma aferição no mesmo dia, o gráfico usa a média daquele dia.
                </Text>
              </>
            )}
          </View>


          {/* HISTÓRICO */}

          <Text style={styles.secaoTitulo}>
            Aferições recentes
          </Text>

          <View style={styles.historicoCard}>
            {carregando ? (
              <ActivityIndicator
                size="small"
                color={CORES.primario}
                style={styles.loadingHistorico}
              />
            ) : historico.length === 0 ? (
              <Text style={styles.historicoVazio}>
                Você ainda não possui aferições registradas.
              </Text>
            ) : (
              historico.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    router.push({
                      pathname: '/editar-pressao',
                      params: {
                        id: item.id,
                      },
                    })
                  }
                  style={[
                    styles.historicoItem,
                    index !== historico.length - 1 &&
                      styles.historicoItemBorda,
                  ]}
                >
                  <View style={styles.historicoIcone}>
                    <Ionicons
                      name="heart-outline"
                      size={18}
                      color={CORES.primario}
                    />
                  </View>

                  <View style={styles.historicoConteudo}>
                    <View style={styles.historicoValorRow}>
                      <Text style={styles.historicoValor}>
                        {item.sistolica}/{item.diastolica}
                      </Text>

                      <Text style={styles.historicoUnidade}>
                        mmHg
                      </Text>
                    </View>

                    <Text style={styles.historicoData}>
                      {formatarMomento(item.dataMedicao)}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#A0AAA7"
                  />
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CORES.fundo,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },

  content: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  headerTexto: {
    flex: 1,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: CORES.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: CORES.texto,
  },

  subtitulo: {
    marginTop: 3,
    fontSize: 13,
    color: CORES.secundario,
  },

  card: {
    backgroundColor: CORES.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: CORES.borda,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  cardLabel: {
    fontSize: 12,
    color: CORES.secundario,
    marginBottom: 8,
  },

  cardTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: CORES.texto,
  },

  ultimaMedicaoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  valorContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  valorPrincipal: {
    fontSize: 34,
    fontWeight: '700',
    color: CORES.texto,
  },

  separador: {
    fontSize: 28,
    color: CORES.secundario,
    marginHorizontal: 4,
  },

  unidade: {
    marginLeft: 6,
    fontSize: 11,
    color: CORES.secundario,
  },

  tagRegistro: {
    backgroundColor: CORES.primarioSuave,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },

  tagRegistroTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: CORES.primario,
  },

  medicaoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },

  medicaoInfoTexto: {
    fontSize: 12,
    color: CORES.secundario,
  },

  loadingUltimaMedicao: {
    marginVertical: 16,
  },

  semRegistros: {
    fontSize: 13,
    color: '#8A9693',
    paddingVertical: 14,
  },

  registrarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CORES.card,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: CORES.borda,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  registrarIcone: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: CORES.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  registrarConteudo: {
    flex: 1,
    paddingRight: 8,
  },

  registrarTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: CORES.texto,
  },

  registrarDescricao: {
    marginTop: 3,
    fontSize: 11,
    color: CORES.secundario,
  },

  registrarBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: CORES.primario,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 17,
  },

  registrarBotaoTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  evolucaoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  evolucaoTituloArea: {
    flex: 1,
  },

  evolucaoSubtitulo: {
    marginTop: 3,
    fontSize: 11,
    color: CORES.secundario,
  },

  periodoBadge: {
    backgroundColor: '#F1F6F5',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
  },

  periodoBadgeTexto: {
    fontSize: 9,
    fontWeight: '700',
    color: CORES.secundario,
  },

  graficoLoading: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },

  evolucaoVazia: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  evolucaoVaziaIcone: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: CORES.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },

  evolucaoVaziaTitulo: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: CORES.texto,
    textAlign: 'center',
  },

  evolucaoVaziaTexto: {
    marginTop: 5,
    maxWidth: 320,
    fontSize: 11,
    lineHeight: 17,
    color: CORES.secundario,
    textAlign: 'center',
  },

  resumoSemanaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 18,
    marginBottom: 4,
  },

  mediaCard: {
    flex: 1,
  },

  mediaLabel: {
    fontSize: 10,
    color: CORES.secundario,
  },

  mediaValorRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },

  mediaValor: {
    fontSize: 22,
    fontWeight: '800',
    color: CORES.texto,
  },

  mediaUnidade: {
    marginLeft: 5,
    fontSize: 9,
    color: CORES.secundario,
  },

  legendaVertical: {
    gap: 7,
    alignItems: 'flex-start',
  },

  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  legendaLinha: {
    width: 18,
    height: 3,
    borderRadius: 2,
  },

  linhaSistolica: {
    backgroundColor: CORES.sistolica,
  },

  linhaDiastolica: {
    backgroundColor: CORES.diastolica,
  },

  legendaTexto: {
    fontSize: 10,
    color: CORES.secundario,
  },

  graficoArea: {
    width: '100%',
    marginTop: 4,
    overflow: 'hidden',
  },

  avisoPoucosDados: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#EFF8F6',
  },

  avisoPoucosDadosTexto: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: '#52615E',
  },

  notaMedia: {
    marginTop: 7,
    fontSize: 9,
    lineHeight: 14,
    color: '#9AA5A2',
  },

  secaoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: CORES.texto,
    marginTop: 8,
    marginBottom: 10,
  },

  historicoCard: {
    backgroundColor: CORES.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CORES.borda,
    overflow: 'hidden',
  },

  historicoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },

  historicoItemBorda: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F1',
  },

  historicoIcone: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: CORES.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  historicoConteudo: {
    flex: 1,
  },

  historicoValorRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },

  historicoValor: {
    fontSize: 15,
    fontWeight: '700',
    color: CORES.texto,
  },

  historicoUnidade: {
    fontSize: 10,
    color: '#8A9693',
  },

  historicoData: {
    marginTop: 3,
    fontSize: 11,
    color: '#8A9693',
  },

  historicoVazio: {
    fontSize: 13,
    color: '#8A9693',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  loadingHistorico: {
    marginVertical: 24,
  },
});
