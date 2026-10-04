import React, { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
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
  Consulta,
  listarConsultas,
} from '@/services/consultaService';

export default function ConsultasScreen() {
  const router = useRouter();

  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [carregando, setCarregando] = useState(true);

  // ---------------------------------------------------------
  // CARREGAR CONSULTAS DO USUÁRIO
  // ---------------------------------------------------------

  async function carregarConsultas() {
    const usuario = auth.currentUser;

    if (!usuario) {
      setConsultas([]);
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);

      const dados = await listarConsultas(usuario.uid);

      setConsultas(dados);
    } catch (error) {
      console.error('Erro ao carregar consultas:', error);
    } finally {
      setCarregando(false);
    }
  }

  // Atualiza a lista sempre que a tela volta a ficar em foco.
  useFocusEffect(
    useCallback(() => {
      carregarConsultas();
    }, [])
  );

  // ---------------------------------------------------------
  // FUNÇÕES AUXILIARES
  // ---------------------------------------------------------

  function converterData(data: string) {
    const partes = data.split('/');

    if (partes.length !== 3) {
      return new Date(0);
    }

    const dia = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    const ano = Number(partes[2]);

    return new Date(ano, mes, dia);
  }

  // Ordena as consultas pela data.
  const consultasOrdenadas = useMemo(() => {
    return [...consultas].sort((a, b) => {
      const dataA = converterData(a.data);
      const dataB = converterData(b.data);

      return dataA.getTime() - dataB.getTime();
    });
  }, [consultas]);

  // Primeira consulta da lista ordenada.
  const proximaConsulta =
    consultasOrdenadas.length > 0
      ? consultasOrdenadas[0]
      : null;

  // Todas as outras consultas.
  const outrasConsultas =
    consultasOrdenadas.length > 1
      ? consultasOrdenadas.slice(1)
      : [];

  // ---------------------------------------------------------
  // INTERFACE
  // ---------------------------------------------------------

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

        {/* CALENDÁRIO */}

        <View style={styles.calendario}>
          <DiaCalendario
            semana="Qui"
            dia="22"
          />

          <DiaCalendario
            semana="Sex"
            dia="23"
          />

          <DiaCalendario
            semana="Sáb"
            dia="24"
          />

          <DiaCalendario
            semana="Dom"
            dia="25"
          />

          <DiaCalendario
            semana="Seg"
            dia="26"
            selecionado
          />

          <DiaCalendario
            semana="Ter"
            dia="27"
          />

          <DiaCalendario
            semana="Qua"
            dia="28"
          />
        </View>

        {/* CARREGANDO */}

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
              Adicione sua primeira consulta para acompanhar seus
              compromissos.
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

            {proximaConsulta && (
              <View style={styles.cardPrincipal}>
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
                      Confirmada
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
              </View>
            )}

            {/* OUTRAS CONSULTAS */}

            {outrasConsultas.length > 0 && (
              <>
                <Text style={styles.secaoTitulo}>
                  Outras Consultas
                </Text>

                {outrasConsultas.map((consulta) => (
                  <View
                    key={consulta.id}
                    style={styles.cardConsulta}
                  >
                    <View style={styles.cardConsultaIcone}>
                      <Ionicons
                        name="calendar-outline"
                        size={22}
                        color="#0E766D"
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
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={21}
                      color="#A0AAA7"
                    />
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------
// COMPONENTE DO CALENDÁRIO
// ---------------------------------------------------------

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

// ---------------------------------------------------------
// ESTILOS
// ---------------------------------------------------------

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
    width: 43,
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

  // OUTRAS CONSULTAS

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
    paddingHorizontal: 30,
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