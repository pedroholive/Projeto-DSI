import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '@/firebaseConfig';
import {
  type Consulta,
  listarConsultas,
  responderConsulta,
} from '@/services/consultaService';

const C = {
  bg: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E9F8C',
  primaryDark: '#0E766D',
  primarySoft: '#E7F8F4',
  text: '#273331',
  muted: '#7E8D89',
  border: '#E0EAE8',
  danger: '#D94B57',
  dangerSoft: '#FDE8EA',
  warning: '#B7791F',
  warningSoft: '#FFF3D6',
};

function converterDataHora(data: string, horario: string): Date | null {
  const dataLimpa = data.trim();
  const horarioLimpo = horario.trim();

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataLimpa)) return null;
  if (!/^\d{2}:\d{2}$/.test(horarioLimpo)) return null;

  const [dia, mes, ano] = dataLimpa.split('/').map(Number);
  const [hora, minuto] = horarioLimpo.split(':').map(Number);

  if (
    ano < 1900 ||
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    hora < 0 ||
    hora > 23 ||
    minuto < 0 ||
    minuto > 59
  ) {
    return null;
  }

  const resultado = new Date(ano, mes - 1, dia, hora, minuto, 0, 0);

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

function gerarSemana(dataReferencia: Date) {
  const inicio = new Date(dataReferencia);
  const diaSemana = inicio.getDay();

  inicio.setDate(inicio.getDate() - ((diaSemana + 6) % 7));

  const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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

// Consulta marcada pelo médico que ainda depende da resposta do paciente
function aguardandoResposta(consulta: Consulta) {
  return (
    consulta.origem === 'medico' &&
    consulta.status === 'aguardando_confirmacao'
  );
}

function obterStatusConsulta(consulta: Consulta, anterior: boolean) {
  if (
    anterior &&
    consulta.status !== 'recusada' &&
    consulta.status !== 'cancelada' &&
    consulta.status !== 'aguardando_confirmacao'
  ) {
    return {
      texto: 'Realizada',
      cor: C.muted,
      fundo: '#EEF3F2',
    };
  }

  switch (consulta.status) {
    case 'aguardando_confirmacao':
      return {
        texto: 'Aguardando',
        cor: C.warning,
        fundo: C.warningSoft,
      };

    case 'confirmada':
      return {
        texto: 'Confirmada',
        cor: C.primaryDark,
        fundo: C.primarySoft,
      };

    case 'recusada':
      return {
        texto: 'Recusada',
        cor: C.danger,
        fundo: C.dangerSoft,
      };

    case 'cancelada':
      return {
        texto: 'Cancelada',
        cor: C.danger,
        fundo: C.dangerSoft,
      };

    default:
      return {
        texto: 'Agendada',
        cor: C.primaryDark,
        fundo: C.primarySoft,
      };
  }
}

function DiaCalendario({
  semana,
  dia,
  selecionado = false,
}: {
  semana: string;
  dia: string;
  selecionado?: boolean;
}) {
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

function BotoesResposta({
  onResponder,
  carregando,
}: {
  onResponder: (resposta: 'confirmada' | 'recusada') => void;
  carregando: boolean;
}) {
  return (
    <View style={styles.botoesResposta}>
      <Pressable
        style={[
          styles.botaoRecusar,
          carregando && styles.botaoRespostaDesabilitado,
        ]}
        disabled={carregando}
        onPress={() => onResponder('recusada')}
        accessibilityLabel="Recusar consulta"
      >
        <Text style={styles.botaoRecusarTexto}>Recusar</Text>
      </Pressable>

      <Pressable
        style={[
          styles.botaoConfirmar,
          carregando && styles.botaoRespostaDesabilitado,
        ]}
        disabled={carregando}
        onPress={() => onResponder('confirmada')}
        accessibilityLabel="Confirmar consulta"
      >
        {carregando ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.botaoConfirmarTexto}>Confirmar</Text>
        )}
      </Pressable>
    </View>
  );
}

function CardConsulta({
  consulta,
  anterior = false,
  invalida = false,
  onPress,
  onResponder,
  respondendo = false,
}: {
  consulta: Consulta;
  anterior?: boolean;
  invalida?: boolean;
  onPress: () => void;
  onResponder?: (resposta: 'confirmada' | 'recusada') => void;
  respondendo?: boolean;
}) {
  const status = invalida
    ? {
        texto: 'Revisar',
        cor: C.danger,
        fundo: C.dangerSoft,
      }
    : obterStatusConsulta(consulta, anterior);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardConsulta,
        pressed && styles.cardPressionado,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.cardConsultaIcone,
          anterior && styles.cardConsultaIconeAnterior,
          invalida && styles.cardConsultaIconeInvalida,
        ]}
      >
        <Ionicons
          name={
            invalida
              ? 'alert-circle-outline'
              : anterior
              ? 'time-outline'
              : 'calendar-outline'
          }
          size={21}
          color={
            invalida
              ? C.danger
              : anterior
              ? C.muted
              : C.primaryDark
          }
        />
      </View>

      <View style={styles.cardConsultaConteudo}>
        <View style={styles.cardConsultaTopo}>
          <View style={styles.cardTituloArea}>
            <Text style={styles.cardEspecialidade}>
              {consulta.especialidade}
            </Text>

            <Text style={styles.cardMedico}>
              {consulta.medico}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: status.fundo },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeTexto,
                { color: status.cor },
              ]}
            >
              {status.texto}
            </Text>
          </View>
        </View>

        <View style={styles.cardInformacao}>
          <Ionicons name="time-outline" size={14} color={C.muted} />
          <Text style={styles.cardInformacaoTexto}>
            {consulta.data} • {consulta.horario}
          </Text>
        </View>

        <View style={styles.cardInformacao}>
          <Ionicons name="location-outline" size={14} color={C.muted} />
          <Text style={styles.cardInformacaoTexto}>
            {consulta.local}
          </Text>
        </View>

        {!!consulta.observacao && (
          <View style={styles.cardInformacao}>
            <Ionicons
              name="document-text-outline"
              size={14}
              color={C.muted}
            />

            <Text
              style={styles.cardInformacaoTexto}
              numberOfLines={2}
            >
              {consulta.observacao}
            </Text>
          </View>
        )}

        {onResponder && aguardandoResposta(consulta) && !invalida && (
          <BotoesResposta
            onResponder={onResponder}
            carregando={respondendo}
          />
        )}
      </View>

      {consulta.origem !== 'medico' && (
        <Ionicons
          name="chevron-forward"
          size={19}
          color="#A4B0AD"
        />
      )}
    </Pressable>
  );
}

export default function ConsultasScreen() {
  const router = useRouter();

  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [agora, setAgora] = useState(() => new Date());
  const [respondendoId, setRespondendoId] = useState<string | null>(null);
  const [avisoResposta, setAvisoResposta] = useState('');

  async function responder(
    consulta: Consulta,
    resposta: 'confirmada' | 'recusada'
  ) {
    if (!consulta.id || respondendoId) return;

    setRespondendoId(consulta.id);
    setAvisoResposta('');

    try {
      await responderConsulta(consulta.id, resposta);

      setConsultas((atuais) =>
        atuais.map((item) =>
          item.id === consulta.id
            ? { ...item, status: resposta }
            : item
        )
      );

      setAvisoResposta(
        resposta === 'confirmada'
          ? 'Consulta confirmada.'
          : 'Consulta recusada.'
      );
    } catch (error) {
      console.error('Erro ao responder consulta:', error);

      setAvisoResposta(
        error instanceof Error
          ? error.message
          : 'Não foi possível responder à consulta.'
      );
    } finally {
      setRespondendoId(null);
    }
  }

  function abrirEdicao(consulta: Consulta) {
    // Consultas marcadas pelo médico não podem ser editadas pelo paciente
    if (consulta.origem === 'medico') return;

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
              setErro('Faça login para visualizar suas consultas.');
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

      void carregarConsultas();

      return () => {
        ativo = false;
      };
    }, [])
  );

  const semanaAtual = useMemo(
    () => gerarSemana(agora),
    [agora]
  );

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

  const totalFuturas =
    (proximaConsulta ? 1 : 0) +
    outrasConsultas.length;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable
              style={styles.botaoVoltar}
              onPress={() => router.back()}
              accessibilityLabel="Voltar"
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={C.text}
              />
            </Pressable>

            <View style={styles.headerTexto}>
              <Text style={styles.titulo}>Consultas</Text>
              <Text style={styles.subtitulo}>
                Organize seus próximos compromissos.
              </Text>
            </View>

            <Pressable
              style={styles.botaoAdicionar}
              onPress={() => router.push('/consultas/nova')}
              accessibilityLabel="Nova consulta"
            >
              <Ionicons
                name="add"
                size={25}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          <View style={styles.calendarioCard}>
            <View style={styles.calendarioHeader}>
              <View>
                <Text style={styles.calendarioTitulo}>
                  Esta semana
                </Text>
                <Text style={styles.calendarioDescricao}>
                  {totalFuturas === 0
                    ? 'Nenhuma consulta futura'
                    : `${totalFuturas} ${
                        totalFuturas === 1
                          ? 'consulta futura'
                          : 'consultas futuras'
                      }`}
                </Text>
              </View>

              <View style={styles.calendarioIcone}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={C.primaryDark}
                />
              </View>
            </View>

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
          </View>

          {avisoResposta !== '' && (
            <Text style={styles.avisoResposta}>{avisoResposta}</Text>
          )}

          {carregando ? (
            <View style={styles.carregando}>
              <ActivityIndicator
                size="small"
                color={C.primary}
              />

              <Text style={styles.carregandoTexto}>
                Carregando consultas...
              </Text>
            </View>
          ) : erro ? (
            <View style={styles.estadoVazio}>
              <View style={styles.iconeVazio}>
                <Ionicons
                  name="alert-circle-outline"
                  size={32}
                  color={C.primaryDark}
                />
              </View>

              <Text style={styles.vazioTitulo}>
                Não foi possível carregar
              </Text>

              <Text style={styles.vazioDescricao}>
                {erro}
              </Text>
            </View>
          ) : consultas.length === 0 ? (
            <View style={styles.estadoVazio}>
              <View style={styles.iconeVazio}>
                <Ionicons
                  name="calendar-outline"
                  size={34}
                  color={C.primaryDark}
                />
              </View>

              <Text style={styles.vazioTitulo}>
                Nenhuma consulta cadastrada
              </Text>

              <Text style={styles.vazioDescricao}>
                Adicione sua primeira consulta para acompanhar seus compromissos.
              </Text>

              <Pressable
                style={styles.botaoNovaConsulta}
                onPress={() => router.push('/consultas/nova')}
              >
                <Ionicons
                  name="add"
                  size={19}
                  color="#FFFFFF"
                />

                <Text style={styles.botaoNovaConsultaTexto}>
                  Nova consulta
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.secaoCabecalho}>
                <Text style={styles.secaoTitulo}>
                  Próxima consulta
                </Text>
              </View>

              {proximaConsulta ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.proximaCard,
                    pressed && styles.cardPressionado,
                  ]}
                  onPress={() =>
                    abrirEdicao(proximaConsulta)
                  }
                >
                  <View style={styles.proximaTopo}>
                    <View style={styles.proximaTag}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={C.primaryDark}
                      />
                      <Text style={styles.proximaTagTexto}>
                        Próxima
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            obterStatusConsulta(
                              proximaConsulta,
                              false
                            ).fundo,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeTexto,
                          {
                            color:
                              obterStatusConsulta(
                                proximaConsulta,
                                false
                              ).cor,
                          },
                        ]}
                      >
                        {
                          obterStatusConsulta(
                            proximaConsulta,
                            false
                          ).texto
                        }
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.proximaEspecialidade}>
                    {proximaConsulta.especialidade}
                  </Text>

                  <Text style={styles.proximaMedico}>
                    {proximaConsulta.medico}
                  </Text>

                  <View style={styles.proximaInfoLinha}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={C.muted}
                    />

                    <Text style={styles.proximaInfoTexto}>
                      {proximaConsulta.data} •{' '}
                      {proximaConsulta.horario}
                    </Text>
                  </View>

                  <View style={styles.proximaInfoLinha}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={C.muted}
                    />

                    <Text style={styles.proximaInfoTexto}>
                      {proximaConsulta.local}
                    </Text>
                  </View>

                  {!!proximaConsulta.observacao && (
                    <View style={styles.observacao}>
                      <Ionicons
                        name="document-text-outline"
                        size={16}
                        color={C.muted}
                      />

                      <Text style={styles.observacaoTexto}>
                        {proximaConsulta.observacao}
                      </Text>
                    </View>
                  )}

                  {aguardandoResposta(proximaConsulta) ? (
                    <BotoesResposta
                      onResponder={(resposta) =>
                        responder(proximaConsulta, resposta)
                      }
                      carregando={
                        respondendoId === proximaConsulta.id
                      }
                    />
                  ) : proximaConsulta.origem === 'medico' ? null : (
                    <View style={styles.editarHint}>
                      <Text style={styles.editarHintTexto}>
                        Toque para ver ou editar
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={17}
                        color={C.primaryDark}
                      />
                    </View>
                  )}
                </Pressable>
              ) : (
                <View style={styles.semFuturasCard}>
                  <Ionicons
                    name="calendar-clear-outline"
                    size={27}
                    color="#A9B5B2"
                  />

                  <Text style={styles.semFuturasTitulo}>
                    Nenhuma consulta futura
                  </Text>

                  <Text style={styles.semFuturasTexto}>
                    Você pode adicionar uma nova consulta pelo botão +.
                  </Text>
                </View>
              )}

              {outrasConsultas.length > 0 && (
                <View style={styles.secao}>
                  <View style={styles.secaoCabecalho}>
                    <Text style={styles.secaoTitulo}>
                      Outras consultas
                    </Text>

                    <Text style={styles.secaoContagem}>
                      {outrasConsultas.length}
                    </Text>
                  </View>

                  <View style={styles.lista}>
                    {outrasConsultas.map(
                      (consulta, indice) => (
                        <CardConsulta
                          key={
                            consulta.id ??
                            `futura-${indice}`
                          }
                          consulta={consulta}
                          onPress={() =>
                            abrirEdicao(consulta)
                          }
                          onResponder={(resposta) =>
                            responder(consulta, resposta)
                          }
                          respondendo={
                            respondendoId === consulta.id
                          }
                        />
                      )
                    )}
                  </View>
                </View>
              )}

              {consultasAnteriores.length > 0 && (
                <View style={styles.secao}>
                  <View style={styles.secaoCabecalho}>
                    <Text style={styles.secaoTitulo}>
                      Consultas anteriores
                    </Text>

                    <Text style={styles.secaoContagem}>
                      {consultasAnteriores.length}
                    </Text>
                  </View>

                  <View style={styles.lista}>
                    {consultasAnteriores.map(
                      (consulta, indice) => (
                        <CardConsulta
                          key={
                            consulta.id ??
                            `anterior-${indice}`
                          }
                          consulta={consulta}
                          anterior
                          onPress={() =>
                            abrirEdicao(consulta)
                          }
                        />
                      )
                    )}
                  </View>
                </View>
              )}

              {consultasInvalidas.length > 0 && (
                <View style={styles.secao}>
                  <View style={styles.avisoInvalidas}>
                    <Ionicons
                      name="warning-outline"
                      size={20}
                      color={C.danger}
                    />

                    <View style={{ flex: 1 }}>
                      <Text style={styles.avisoInvalidasTitulo}>
                        Registros que precisam de revisão
                      </Text>

                      <Text style={styles.avisoInvalidasTexto}>
                        Estas consultas foram salvas com data ou horário em formato inválido. Toque nelas para corrigir.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.lista}>
                    {consultasInvalidas.map(
                      (consulta, indice) => (
                        <CardConsulta
                          key={
                            consulta.id ??
                            `invalida-${indice}`
                          }
                          consulta={consulta}
                          invalida
                          onPress={() =>
                            abrirEdicao(consulta)
                          }
                        />
                      )
                    )}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },

  content: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  botaoVoltar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerTexto: {
    flex: 1,
  },

  titulo: {
    fontSize: 25,
    fontWeight: '700',
    color: C.text,
  },

  subtitulo: {
    fontSize: 12,
    color: C.muted,
    marginTop: 3,
  },

  botaoAdicionar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarioCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8EFED',
    padding: 16,
    marginBottom: 18,
  },

  calendarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  calendarioTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },

  calendarioDescricao: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
  },

  calendarioIcone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendario: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 3,
  },

  diaCalendario: {
    flex: 1,
    minWidth: 0,
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  diaSelecionado: {
    backgroundColor: C.primary,
  },

  semanaTexto: {
    fontSize: 10,
    color: C.muted,
    marginBottom: 3,
  },

  diaTexto: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },

  textoSelecionado: {
    color: '#FFFFFF',
  },

  carregando: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  carregandoTexto: {
    fontSize: 13,
    color: C.muted,
  },

  estadoVazio: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8EFED',
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  iconeVazio: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  vazioTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginTop: 15,
    textAlign: 'center',
  },

  vazioDescricao: {
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
    marginTop: 6,
    textAlign: 'center',
  },

  botaoNovaConsulta: {
    height: 46,
    borderRadius: 12,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 17,
    gap: 6,
    marginTop: 18,
  },

  botaoNovaConsultaTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  secao: {
    marginTop: 20,
  },

  secaoCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  secaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },

  secaoContagem: {
    minWidth: 25,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#E9F0EE',
    color: C.muted,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  proximaCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8EFED',
    padding: 18,
    marginBottom: 6,
  },

  proximaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  proximaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  proximaTagTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primaryDark,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
  },

  statusBadgeTexto: {
    fontSize: 9,
    fontWeight: '700',
  },

  proximaEspecialidade: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginTop: 18,
  },

  proximaMedico: {
    fontSize: 13,
    color: C.muted,
    marginTop: 3,
    marginBottom: 11,
  },

  proximaInfoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 7,
  },

  proximaInfoTexto: {
    flex: 1,
    fontSize: 12,
    color: '#52615E',
  },

  observacao: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: '#F7FAF9',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },

  observacaoTexto: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: '#52615E',
  },

  editarHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F1',
  },

  editarHintTexto: {
    fontSize: 10,
    color: C.primaryDark,
    fontWeight: '600',
  },

  semFuturasCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EFED',
    padding: 22,
    alignItems: 'center',
  },

  semFuturasTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginTop: 8,
  },

  semFuturasTexto: {
    fontSize: 11,
    color: C.muted,
    marginTop: 4,
    textAlign: 'center',
  },

  lista: {
    gap: 10,
  },

  cardConsulta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EFED',
    padding: 14,
  },

  cardPressionado: {
    opacity: 0.78,
  },

  cardConsultaIcone: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  cardConsultaIconeAnterior: {
    backgroundColor: '#EEF3F2',
  },

  cardConsultaIconeInvalida: {
    backgroundColor: C.dangerSoft,
  },

  cardConsultaConteudo: {
    flex: 1,
  },

  cardConsultaTopo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  cardTituloArea: {
    flex: 1,
  },

  cardEspecialidade: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },

  cardMedico: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },

  cardInformacao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },

  cardInformacaoTexto: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: C.muted,
  },

  avisoResposta: {
    fontSize: 12,
    color: C.primaryDark,
    backgroundColor: C.primarySoft,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },

  botoesResposta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  botaoConfirmar: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoConfirmarTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  botaoRecusar: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.danger,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoRecusarTexto: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '700',
  },

  botaoRespostaDesabilitado: {
    opacity: 0.5,
  },

  avisoInvalidas: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 12,
    borderRadius: 14,
    backgroundColor: C.dangerSoft,
    marginBottom: 10,
  },

  avisoInvalidasTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: C.danger,
  },

  avisoInvalidasTexto: {
    fontSize: 10,
    lineHeight: 15,
    color: '#8D4A51',
    marginTop: 3,
  },
});