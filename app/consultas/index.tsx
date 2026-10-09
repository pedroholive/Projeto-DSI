
import React, { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { auth } from '@/firebaseConfig';
import {
  type Consulta,
  listarConsultas,
} from '@/services/consultaService';

// Converte DD/MM/AAAA e HH:MM para uma data válida.
function converterDataHora(
  data: string,
  horario: string
): Date | null {
  const partesData = data.trim().split('/');
  const partesHorario = horario.trim().split(':');

  if (
    partesData.length !== 3 ||
    partesHorario.length !== 2 ||
    !/^\d{2}\/\d{2}\/\d{4}$/.test(data.trim()) ||
    !/^\d{2}:\d{2}$/.test(horario.trim())
  ) {
    return null;
  }

  const [dia, mes, ano] = partesData.map(Number);
  const [hora, minuto] = partesHorario.map(Number);

  if (
    ano < 1900 ||
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > 31 ||
    hora < 0 ||
    hora > 23 ||
    minuto < 0 ||
    minuto > 59
  ) {
    return null;
  }

  const resultado = new Date(
    ano,
    mes - 1,
    dia,
    hora,
    minuto
  );

  if (
    resultado.getFullYear() !== ano ||
    resultado.getMonth() !== mes - 1 ||
    resultado.getDate() !== dia ||
    resultado.getHours() !== hora ||
    resultado.getMinutes() !== minuto
  ) {
    return null;
  }

  return resultado;
}

// Gera os sete dias da semana atual.
function gerarSemana(dataReferencia: Date) {
  const inicio = new Date(dataReferencia);
  const diaSemana = inicio.getDay();

  // Segunda-feira como primeiro dia.
  inicio.setDate(
    inicio.getDate() - ((diaSemana + 6) % 7)
  );

  const nomes = [
    'Dom',
    'Seg',
    'Ter',
    'Qua',
    'Qui',
    'Sex',
    'Sáb',
  ];

  return Array.from({ length: 7 }, (_, indice) => {
    const data = new Date(inicio);
    data.setDate(inicio.getDate() + indice);

    return {
      chave: `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`,
      semana: nomes[data.getDay()],
      dia: String(data.getDate()),
      selecionado:
        data.getDate() === dataReferencia.getDate() &&
        data.getMonth() === dataReferencia.getMonth() &&
        data.getFullYear() === dataReferencia.getFullYear(),
    };
  });
}

interface DiaCalendarioProps {
  semana: string;
  dia: string;
  selecionado?: boolean;
}

function DiaCalendario({
  semana,
  dia,
  selecionado = false,
}: DiaCalendarioProps) {
  return (
    <View
      style={[
        styles.diaCalendario,
        selecionado && styles.diaSelecionado,
      ]}
    >
      <Text
        style={[
          styles.semanaTexto,
          selecionado && styles.textoSelecionado,
        ]}
      >
        {semana}
      </Text>

      <Text
        style={[
          styles.diaTexto,
          selecionado && styles.textoSelecionado,
        ]}
      >
        {dia}
      </Text>
    </View>
  );
}

// Card reutilizado nas listas de consultas.
function CardConsulta({
  consulta,
  anterior = false,
  onPress,
}: {
  consulta: Consulta;
  anterior?: boolean
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.cardConsulta} onPress={onPress}>
      <View
        style={[
          styles.cardConsultaIcone,
          anterior && styles.iconeAnterior,
        ]}
      >
        <Ionicons
          name={anterior ? 'time-outline' : 'calendar-outline'}
          size={22}
          color={anterior ? '#667572' : '#0E766D'}
        />
      </View>

      <View style={styles.cardConsultaConteudo}>
        <Text style={styles.cardEspecialidade}>
          {consulta.especialidade}
        </Text>

        <Text style={styles.cardMedico}>
          {consulta.medico}
        </Text>

        <View style={styles.cardInformacao}>
          <Ionicons
            name="time-outline"
            size={15}
            color="#667572"
          />

          <Text style={styles.cardInformacaoTexto}>
            {consulta.data} • {consulta.horario}
          </Text>
        </View>

        <View style={styles.cardInformacao}>
          <Ionicons
            name="location-outline"
            size={15}
            color="#667572"
          />

          <Text style={styles.cardInformacaoTexto}>
            {consulta.local}
          </Text>
        </View>

        {consulta.observacao ? (
          <View style={styles.cardInformacao}>
            <Ionicons
              name="document-text-outline"
              size={15}
              color="#667572"
            />

            <Text style={styles.cardInformacaoTexto}>
              {consulta.observacao}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}


export default function ConsultasScreen() {
  const router = useRouter();

  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [agora, setAgora] = useState(() => new Date());

  // ---------------------------------------------------------
  // ABRIR TELA DE EDIÇÃO
  // ---------------------------------------------------------

  function abrirEdicao(consulta: Consulta) {
    if (!consulta.id) {
      console.error('Não foi possível editar: consulta sem ID.');
      return;
    }

    router.push({
      pathname: '/consultas/editar',
      params: {
        id: consulta.id,
      },
    });
  }

  // ---------------------------------------------------------
  // CARREGAR CONSULTAS DO FIREBASE
  // ---------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregarConsultas() {
        if (ativo) {
          setCarregando(true);
          setErro('');
          setAgora(new Date());
        }

        try {
          const usuario = auth.currentUser;

          if (!usuario) {
            if (ativo) {
              setConsultas([]);
              setErro(
                'Faça login para visualizar suas consultas.'
              );
            }
            return;
          }

          const dados = await listarConsultas(usuario.uid);

          if (ativo) {
            setConsultas(dados);
          }
        } catch (error) {
          console.error('Erro ao carregar consultas:', error);

          if (ativo) {
            setConsultas([]);
            setErro(
              'Não foi possível carregar suas consultas. Tente novamente.'
            );
          }
        } finally {
          if (ativo) {
            setCarregando(false);
          }
        }
      }

      carregarConsultas();

      return () => {
        ativo = false;
      };
    }, [])
  );

  // ---------------------------------------------------------
  // CALENDÁRIO
  // ---------------------------------------------------------

  const semanaAtual = useMemo(
    () => gerarSemana(agora),
    [agora]
  );

  // ---------------------------------------------------------
  // ORGANIZAR CONSULTAS POR DATA
  // ---------------------------------------------------------

  const {
    proximaConsulta,
    outrasConsultas,
    consultasAnteriores,
    consultasInvalidas,
  } = useMemo(() => {
    const futuras: Array<Consulta & { dataHora: Date }> = [];
    const anteriores: Array<Consulta & { dataHora: Date }> = [];
    const invalidas: Consulta[] = [];

    consultas.forEach((consulta) => {
      const dataHora = converterDataHora(
        consulta.data,
        consulta.horario
      );

      if (!dataHora) {
        invalidas.push(consulta);
        return;
      }

      const consultaComData = {
        ...consulta,
        dataHora,
      };

      if (dataHora.getTime() >= agora.getTime()) {
        futuras.push(consultaComData);
      } else {
        anteriores.push(consultaComData);
      }
    });

    futuras.sort(
      (a, b) =>
        a.dataHora.getTime() - b.dataHora.getTime()
    );

    anteriores.sort(
      (a, b) =>
        b.dataHora.getTime() - a.dataHora.getTime()
    );

    return {
      proximaConsulta: futuras[0] ?? null,
      outrasConsultas: futuras.slice(1),
      consultasAnteriores: anteriores,
      consultasInvalidas: invalidas,
    };
  }, [consultas, agora]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            style={styles.botaoVoltar}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={26}
              color="#273331"
            />
          </Pressable>

          <Text style={styles.titulo}>
            Consultas
          </Text>

          <Pressable
            style={styles.botaoAdicionar}
            onPress={() => router.push('/consultas/nova')}
          >
            <Ionicons
              name="add"
              size={27}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        {/* CALENDÁRIO DINÂMICO */}

        <View style={styles.calendario}>
          {semanaAtual.map((dia) => (
            <DiaCalendario
              key={dia.chave}
              semana={dia.semana}
              dia={dia.dia}
              selecionado={dia.selecionado}
            />
          ))}
        </View>

        {/* CARREGAMENTO */}

        {carregando ? (
          <View style={styles.carregando}>
            <ActivityIndicator
              size="large"
              color="#0E766D"
            />

            <Text style={styles.carregandoTexto}>
              Carregando consultas...
            </Text>
          </View>
        ) : erro ? (
          <View style={styles.estadoVazio}>
            <Ionicons
              name="alert-circle-outline"
              size={42}
              color="#0E766D"
            />

            <Text style={styles.vazioDescricao}>
              {erro}
            </Text>
          </View>
        ) : consultas.length === 0 ? (
          /* NENHUMA CONSULTA */

          <View style={styles.estadoVazio}>
            <View style={styles.iconeVazio}>
              <Ionicons
                name="calendar-outline"
                size={38}
                color="#0E766D"
              />
            </View>

            <Text style={styles.vazioTitulo}>
              Nenhuma consulta cadastrada
            </Text>

            <Text style={styles.vazioDescricao}>
              Adicione sua primeira consulta para acompanhar
              seus compromissos.
            </Text>

            <Pressable
              style={styles.botaoNovaConsulta}
              onPress={() => router.push('/consultas/nova')}
            >
              <Ionicons
                name="add"
                size={20}
                color="#FFFFFF"
              />

              <Text style={styles.botaoNovaConsultaTexto}>
                Nova consulta
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* PRÓXIMA CONSULTA */}

            <Text style={styles.secaoTitulo}>
              Próxima Consulta
            </Text>

            {proximaConsulta ? (
                <Pressable
                  style={styles.cardPrincipal}
                  onPress={() => abrirEdicao(proximaConsulta)}
                >
                  <View style={styles.cardTopo}>
                    <View style={styles.consultaStatus}>
                      <Ionicons
                        name="calendar-outline"
                        size={19}
                        color="#0E9F8C"
                      />

                    <Text style={styles.consultaStatusTexto}>
                      Próxima consulta
                    </Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeTexto}>
                      Agendada
                    </Text>
                  </View>
                </View>

                <View style={styles.medicoContainer}>
                  <View style={styles.medicoIcone}>
                    <Ionicons
                      name="person-outline"
                      size={24}
                      color="#0E766D"
                    />
                  </View>

                  <View style={styles.medicoInformacoes}>
                    <Text style={styles.medicoNome}>
                      {proximaConsulta.medico}
                    </Text>

                    <Text style={styles.medicoDetalhes}>
                      {proximaConsulta.especialidade}
                      {' • '}
                      {proximaConsulta.local}
                    </Text>
                  </View>
                </View>

                <View style={styles.divisor} />

                <View style={styles.consultaRodape}>
                  <View style={styles.dataContainer}>
                    <Ionicons
                      name="time-outline"
                      size={17}
                      color="#667572"
                    />

                    <Text style={styles.dataTexto}>
                      {proximaConsulta.data}
                      {' • '}
                      {proximaConsulta.horario}
                    </Text>
                  </View>
                </View>

                {proximaConsulta.observacao ? (
                  <View style={styles.observacao}>
                    <Ionicons
                      name="document-text-outline"
                      size={17}
                      color="#667572"
                    />

                    <Text style={styles.observacaoTexto}>
                      {proximaConsulta.observacao}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ) : (
              <View style={styles.cardPrincipal}>
                <Text style={styles.vazioDescricao}>
                  Você não possui consultas futuras cadastradas.
                </Text>
              </View>
            )}

            {/* OUTRAS CONSULTAS FUTURAS */}

            {outrasConsultas.length > 0 && (
              <>
                <Text style={styles.secaoTitulo}>
                  Outras Consultas
                </Text>

                {outrasConsultas.map((consulta, indice) => (
                  <CardConsulta
                    key={consulta.id ?? `anterior-${indice}`}
                    consulta={consulta}
                    anterior
                    onPress={() => abrirEdicao(consulta)}
                  />
                ))}
              </>
            )}

            {/* CONSULTAS ANTERIORES */}

            {consultasAnteriores.length > 0 && (
              <>
                <Text style={styles.secaoTitulo}>
                  Consultas Anteriores
                </Text>

                {consultasAnteriores.map((consulta, indice) => (
                  <CardConsulta
                    key={consulta.id ?? `anterior-${indice}`}
                    consulta={consulta}
                    anterior
                    onPress={() => abrirEdicao(consulta)}
                  />
                ))}
              </>
            )}

            {/* CONSULTAS COM DATA INVÁLIDA */}

            {consultasInvalidas.length > 0 && (
              <>
                <Text style={styles.secaoTitulo}>
                  Consultas com data inválida
                </Text>

                <Text style={styles.avisoTexto}>
                  Confira a data e o horário destes registros.
                </Text>

                {consultasInvalidas.map((consulta, indice) => (
                  <CardConsulta
                    key={consulta.id ?? `anterior-${indice}`}
                    consulta={consulta}
                    anterior
                    onPress={() => abrirEdicao(consulta)}
                  />
                ))}
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
    backgroundColor: '#F4F6F7',
  },

  scrollContent: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // HEADER

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 25,
  },

  botaoVoltar: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },

  titulo: {
    fontSize: 23,
    fontWeight: '700',
    color: '#273331',
  },

  botaoAdicionar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#0E766D',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // CALENDÁRIO

  calendario: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },

  diaCalendario: {
    flex: 1,
    maxWidth: 46,
    height: 61,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  diaSelecionado: {
    backgroundColor: '#0E9F8C',
  },

  semanaTexto: {
    fontSize: 12,
    color: '#667572',
    marginBottom: 4,
  },

  diaTexto: {
    fontSize: 16,
    fontWeight: '700',
    color: '#273331',
  },

  textoSelecionado: {
    color: '#FFFFFF',
  },

  // SEÇÕES

  secaoTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#273331',
    marginBottom: 13,
  },

  avisoTexto: {
    fontSize: 13,
    color: '#667572',
    marginBottom: 12,
  },

  // CARD PRINCIPAL

  cardPrincipal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#EDF1F0',
  },

  cardTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  consultaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  consultaStatusTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0E9F8C',
  },

  statusBadge: {
    backgroundColor: '#E8F8F4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },

  statusBadgeTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0E766D',
  },

  medicoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },

  medicoIcone: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DDF3EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  medicoInformacoes: {
    flex: 1,
  },

  medicoNome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#273331',
  },

  medicoDetalhes: {
    fontSize: 13,
    color: '#667572',
    marginTop: 3,
  },

  divisor: {
    height: 1,
    backgroundColor: '#EDF1F0',
    marginVertical: 16,
  },

  consultaRodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  dataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  dataTexto: {
    fontSize: 13,
    color: '#667572',
  },

  observacao: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 13,
    backgroundColor: '#F7FAF9',
    borderRadius: 10,
    padding: 10,
  },

  observacaoTexto: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#667572',
  },

  // CARDS DE CONSULTAS

  cardConsulta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#EDF1F0',
  },

  cardConsultaIcone: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#E8F8F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  iconeAnterior: {
    backgroundColor: '#EEF1F0',
  },

  cardConsultaConteudo: {
    flex: 1,
  },

  cardEspecialidade: {
    fontSize: 15,
    fontWeight: '700',
    color: '#273331',
  },

  cardMedico: {
    fontSize: 13,
    color: '#667572',
    marginTop: 2,
    marginBottom: 7,
  },

  cardInformacao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },

  cardInformacaoTexto: {
    flex: 1,
    fontSize: 12,
    color: '#667572',
  },

  // CARREGAMENTO

  carregando: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },

  carregandoTexto: {
    marginTop: 10,
    fontSize: 14,
    color: '#667572',
  },

  // ESTADO VAZIO

  estadoVazio: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  iconeVazio: {
    width: 75,
    height: 75,
    borderRadius: 22,
    backgroundColor: '#DDF3EC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  vazioTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#273331',
    marginTop: 17,
    textAlign: 'center',
  },

  vazioDescricao: {
    fontSize: 14,
    color: '#667572',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 7,
  },

  botaoNovaConsulta: {
    height: 47,
    paddingHorizontal: 18,
    borderRadius: 13,
    backgroundColor: '#0E766D',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },

  botaoNovaConsultaTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
