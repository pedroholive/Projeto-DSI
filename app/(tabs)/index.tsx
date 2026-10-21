import React, { useCallback, useState } from 'react';

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

import {
  useFocusEffect,
  useRouter,
} from 'expo-router';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';

import { auth, db } from '../../firebaseConfig';


type UltimaGlicemia = {
  id: string;
  valor: number;
  data: string;
  horario: string;
  contexto: string;
};

type UltimaPressao = {
  id: string;
  sistolica: number;
  diastolica: number;
  dataMedicao: Timestamp | null;
};


export default function HomeScreen() {
  const router = useRouter();

  const [nomePaciente, setNomePaciente] =
    useState('Paciente');

  const [ultimaGlicemia, setUltimaGlicemia] =
    useState<UltimaGlicemia | null>(null);

  const [ultimaPressao, setUltimaPressao] =
    useState<UltimaPressao | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const [agora, setAgora] =
    useState(new Date());


  // =========================================================
  // CONVERTE DATA DA GLICEMIA PARA TIMESTAMP
  // =========================================================

  function timestampGlicemia(
    data: string,
    horario: string
  ) {
    const [dia, mes, ano] =
      data.split('/').map(Number);

    const [hora, minuto] =
      horario.split(':').map(Number);

    return new Date(
      ano,
      mes - 1,
      dia,
      hora || 0,
      minuto || 0
    ).getTime();
  }


  // =========================================================
  // CARREGA DADOS REAIS DO USUÁRIO
  // =========================================================

  const carregarDados =
    useCallback(async () => {

      const usuario = auth.currentUser;

      if (!usuario) {
        setCarregando(false);
        router.replace('/login');
        return;
      }

      setCarregando(true);

      try {

        // =====================================================
        // PERFIL
        // =====================================================

        const perfilRef = doc(
          db,
          'usuarios',
          usuario.uid
        );

        const perfilSnapshot =
          await getDoc(perfilRef);

        if (perfilSnapshot.exists()) {

          const perfil =
            perfilSnapshot.data();

          if (perfil.nome) {
            setNomePaciente(perfil.nome);
          }

        } else if (usuario.displayName) {
          setNomePaciente(
            usuario.displayName
          );
        }


        // =====================================================
        // ÚLTIMA GLICEMIA
        // =====================================================

        const glicemiaQuery = query(
          collection(db, 'glicemias'),
          where(
            'userId',
            '==',
            usuario.uid
          )
        );

        const glicemiaSnapshot =
          await getDocs(glicemiaQuery);

        const glicemias =
          glicemiaSnapshot.docs.map(
            documento => {

              const dados =
                documento.data();

              return {
                id: documento.id,

                valor:
                  Number(dados.valor),

                data:
                  dados.data ?? '',

                horario:
                  dados.horario ?? '',

                contexto:
                  dados.contexto ?? '',
              };
            }
          );

        glicemias.sort(
          (a, b) =>
            timestampGlicemia(
              b.data,
              b.horario
            ) -
            timestampGlicemia(
              a.data,
              a.horario
            )
        );

        setUltimaGlicemia(
          glicemias[0] ?? null
        );


        // =====================================================
        // ÚLTIMA PRESSÃO
        // =====================================================

        const pressaoRef =
          collection(
            db,
            'usuarios',
            usuario.uid,
            'registrosPressao'
          );

        const pressaoQuery =
          query(
            pressaoRef,
            orderBy(
              'dataMedicao',
              'desc'
            ),
            limit(1)
          );

        const pressaoSnapshot =
          await getDocs(pressaoQuery);

        if (
          pressaoSnapshot.empty
        ) {

          setUltimaPressao(null);

        } else {

          const documento =
            pressaoSnapshot.docs[0];

          const dados =
            documento.data();

          setUltimaPressao({
            id: documento.id,

            sistolica:
              Number(
                dados.sistolica
              ),

            diastolica:
              Number(
                dados.diastolica
              ),

            dataMedicao:
              dados.dataMedicao
                instanceof Timestamp
                ? dados.dataMedicao
                : null,
          });
        }

      } catch (error) {

        console.error(
          'Erro ao carregar dados da Home:',
          error
        );

      } finally {

        setCarregando(false);
      }

    }, [router]);


  // =========================================================
  // ATUALIZA AO VOLTAR PARA A HOME
  // =========================================================

  useFocusEffect(
    useCallback(() => {

      setAgora(new Date());

      carregarDados();

      const intervalo =
        setInterval(() => {
          setAgora(new Date());
        }, 60000);

      return () =>
        clearInterval(intervalo);

    }, [carregarDados])
  );


  // =========================================================
  // FORMATA DATA DA HOME
  // =========================================================

  const dataAtual =
    agora.toLocaleDateString(
      'pt-BR',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }
    );

  const horaAtual =
    agora.toLocaleTimeString(
      'pt-BR',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );

  const dataFormatada =
    dataAtual.charAt(0).toUpperCase() +
    dataAtual.slice(1);


  // =========================================================
  // FORMATA MOMENTO DA PRESSÃO
  // =========================================================

  function formatarMomentoPressao(
    timestamp: Timestamp | null
  ) {

    if (!timestamp) {
      return 'Data indisponível';
    }

    const data =
      timestamp.toDate();

    const hoje =
      new Date();

    const mesmoDia =
      data.getDate() ===
        hoje.getDate() &&
      data.getMonth() ===
        hoje.getMonth() &&
      data.getFullYear() ===
        hoje.getFullYear();

    const horario =
      data.toLocaleTimeString(
        'pt-BR',
        {
          hour: '2-digit',
          minute: '2-digit',
        }
      );

    if (mesmoDia) {
      return `Hoje • ${horario}`;
    }

    const dataFormatada =
      data.toLocaleDateString(
        'pt-BR'
      );

    return `${dataFormatada} • ${horario}`;
  }


  return (

    <SafeAreaView
      style={styles.container}
    >

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        <View
          style={styles.content}
        >


          {/* =====================================================
              CABEÇALHO
          ===================================================== */}

          <View style={styles.header}>

            <View style={styles.headerTexto}>

              <Text
                style={styles.saudacao}
              >
                Olá, {nomePaciente}!
              </Text>

              <Text
                style={styles.data}
              >
                {dataFormatada} • {horaAtual}
              </Text>

            </View>


            <Pressable
              style={styles.perfilBtn}
              onPress={() =>
                router.push('/mais')
              }
            >

              <Ionicons
                name="person-outline"
                size={21}
                color="#0E766D"
              />

            </Pressable>

          </View>


          {/* =====================================================
              CARREGAMENTO
          ===================================================== */}

          {carregando ? (

            <View
              style={
                styles.loadingContainer
              }
            >

              <ActivityIndicator
                size="small"
                color="#0E9F8C"
              />

              <Text
                style={
                  styles.loadingTexto
                }
              >
                Carregando seus dados...
              </Text>

            </View>

          ) : (

            <>


              {/* =================================================
                  GLICOSE E PRESSÃO
              ================================================= */}

              <View
                style={styles.metricasRow}
              >


                {/* GLICOSE */}

                <Pressable
                  style={styles.metricaCard}
                  onPress={() =>
                    router.push('/glicose')
                  }
                >

                  <View
                    style={
                      styles.metricaHeader
                    }
                  >

                    <Text
                      style={
                        styles.metricaTitulo
                      }
                    >
                      Glicose
                    </Text>


                    {ultimaGlicemia && (

                      <View
                        style={
                          styles.tagVerde
                        }
                      >

                        <Text
                          style={
                            styles.tagVerdeTexto
                          }
                        >
                          {ultimaGlicemia.contexto ||
                            'Medição'}
                        </Text>

                      </View>

                    )}

                  </View>


                  {ultimaGlicemia ? (

                    <>

                      <View
                        style={
                          styles.valorRow
                        }
                      >

                        <Text
                          style={
                            styles.glicoseValor
                          }
                        >
                          {
                            ultimaGlicemia.valor
                          }
                        </Text>

                        <Text
                          style={
                            styles.unidade
                          }
                        >
                          mg/dL
                        </Text>

                      </View>


                      <View
                        style={
                          styles.statusRow
                        }
                      >

                        <Ionicons
                          name="time-outline"
                          size={15}
                          color="#0E9F8C"
                        />

                        <Text
                          style={
                            styles.statusVerde
                          }
                        >
                          {ultimaGlicemia.data}
                          {' • '}
                          {ultimaGlicemia.horario}
                        </Text>

                      </View>

                    </>

                  ) : (

                    <View
                      style={
                        styles.estadoVazio
                      }
                    >

                      <Text
                        style={
                          styles.valorVazio
                        }
                      >
                        —
                      </Text>

                      <Text
                        style={
                          styles.estadoVazioTexto
                        }
                      >
                        Nenhuma medição
                      </Text>

                    </View>

                  )}

                </Pressable>


                {/* PRESSÃO */}

                <Pressable
                  style={styles.metricaCard}
                  onPress={() =>
                    router.push('/pressao')
                  }
                >

                  <View
                    style={
                      styles.metricaHeader
                    }
                  >

                    <Text
                      style={
                        styles.metricaTitulo
                      }
                    >
                      Pressão
                    </Text>


                    {ultimaPressao && (

                      <View
                        style={
                          styles.tagNeutra
                        }
                      >

                        <Text
                          style={
                            styles.tagNeutraTexto
                          }
                        >
                          Última
                        </Text>

                      </View>

                    )}

                  </View>


                  {ultimaPressao ? (

                    <>

                      <View
                        style={
                          styles.valorRow
                        }
                      >

                        <Text
                          style={
                            styles.pressaoValor
                          }
                        >
                          {
                            ultimaPressao.sistolica
                          }
                          /
                          {
                            ultimaPressao.diastolica
                          }
                        </Text>

                        <Text
                          style={
                            styles.unidade
                          }
                        >
                          mmHg
                        </Text>

                      </View>


                      <View
                        style={
                          styles.statusRow
                        }
                      >

                        <Ionicons
                          name="time-outline"
                          size={15}
                          color="#7E8D89"
                        />

                        <Text
                          style={
                            styles.statusSecundario
                          }
                        >
                          {
                            formatarMomentoPressao(
                              ultimaPressao.dataMedicao
                            )
                          }
                        </Text>

                      </View>

                    </>

                  ) : (

                    <View
                      style={
                        styles.estadoVazio
                      }
                    >

                      <Text
                        style={
                          styles.valorVazio
                        }
                      >
                        —
                      </Text>

                      <Text
                        style={
                          styles.estadoVazioTexto
                        }
                      >
                        Nenhuma aferição
                      </Text>

                    </View>

                  )}

                </Pressable>

              </View>


              {/* =================================================
                  NOVO REGISTRO
              ================================================= */}

              <Pressable
                style={
                  styles.novoRegistroCard
                }
                onPress={() =>
                  router.push(
                    '/novo-registro'
                  )
                }
              >

                <View
                  style={
                    styles.novoRegistroIcone
                  }
                >

                  <Ionicons
                    name="add"
                    size={24}
                    color="#0E9F8C"
                  />

                </View>


                <View
                  style={
                    styles.novoRegistroConteudo
                  }
                >

                  <Text
                    style={
                      styles.novoRegistroTitulo
                    }
                  >
                    Novo registro
                  </Text>

                  <Text
                    style={
                      styles.novoRegistroDescricao
                    }
                  >
                    Registre uma nova
                    medição de glicose ou
                    pressão arterial.
                  </Text>

                </View>


                <View
                  style={
                    styles.novoRegistroBotao
                  }
                >

                  <Text
                    style={
                      styles.novoRegistroBotaoTexto
                    }
                  >
                    Adicionar
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color="#FFFFFF"
                  />

                </View>

              </Pressable>


              {/* =================================================
                  DICA DE SAÚDE
              ================================================= */}

              <View
                style={styles.dicaCard}
              >

                <View
                  style={styles.dicaIcone}
                >

                  <Ionicons
                    name="heart-outline"
                    size={24}
                    color="#EF476F"
                  />

                </View>


                <View
                  style={
                    styles.dicaConteudo
                  }
                >

                  <Text
                    style={
                      styles.dicaTitulo
                    }
                  >
                    Dica de Saúde
                  </Text>

                  <Text
                    style={
                      styles.dicaTexto
                    }
                  >
                    Registrar suas medições
                    regularmente ajuda a
                    acompanhar seu histórico
                    de saúde.
                  </Text>

                </View>

              </View>

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
    backgroundColor: '#F4F8F7',
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
    paddingBottom: 32,
  },


  // =========================================================
  // CABEÇALHO
  // =========================================================

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    marginBottom: 22,
  },

  headerTexto: {
    flex: 1,
    paddingRight: 12,
  },

  saudacao: {
    fontSize: 25,
    fontWeight: '700',
    color: '#273331',
  },

  data: {
    marginTop: 4,

    fontSize: 14,
    color: '#7E8D89',
  },

  perfilBtn: {
    width: 42,
    height: 42,

    borderRadius: 21,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#E0EAE8',

    alignItems: 'center',
    justifyContent: 'center',
  },


  // =========================================================
  // CARREGAMENTO
  // =========================================================

  loadingContainer: {
    minHeight: 200,

    alignItems: 'center',
    justifyContent: 'center',

    gap: 10,
  },

  loadingTexto: {
    fontSize: 13,
    color: '#7E8D89',
  },


  // =========================================================
  // CARDS DE GLICOSE E PRESSÃO
  // =========================================================

  metricasRow: {
    flexDirection: 'row',

    gap: 12,

    marginBottom: 14,
  },

  metricaCard: {
    flex: 1,

    minHeight: 138,

    backgroundColor: '#FFFFFF',

    borderRadius: 22,

    padding: 17,

    borderWidth: 1,
    borderColor: '#E8EFED',

    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 2,
  },

  metricaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    marginBottom: 12,
  },

  metricaTitulo: {
    fontSize: 14,
    color: '#6F7C79',
  },


  // =========================================================
  // TAGS
  // =========================================================

  tagVerde: {
    maxWidth: '60%',

    backgroundColor: '#E7FAF5',

    borderRadius: 12,

    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  tagVerdeTexto: {
    color: '#0E9F8C',

    fontSize: 10,
    fontWeight: '600',
  },

  tagNeutra: {
    backgroundColor: '#EEF3F2',

    borderRadius: 12,

    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  tagNeutraTexto: {
    color: '#6F7C79',

    fontSize: 10,
    fontWeight: '600',
  },


  // =========================================================
  // VALORES
  // =========================================================

  valorRow: {
    flexDirection: 'row',
    alignItems: 'baseline',

    gap: 4,
  },

  glicoseValor: {
    fontSize: 29,
    fontWeight: '700',

    color: '#0E9F8C',
  },

  pressaoValor: {
    fontSize: 25,
    fontWeight: '700',

    color: '#273331',
  },

  unidade: {
    fontSize: 11,
    color: '#7E8D89',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 5,

    marginTop: 8,
  },

  statusVerde: {
    flex: 1,

    fontSize: 10,
    color: '#0E9F8C',
  },

  statusSecundario: {
    flex: 1,

    fontSize: 10,
    color: '#7E8D89',
  },


  // =========================================================
  // ESTADO VAZIO
  // =========================================================

  estadoVazio: {
    flex: 1,
    justifyContent: 'center',
  },

  valorVazio: {
    fontSize: 29,
    fontWeight: '700',
    color: '#B6C0BD',
  },

  estadoVazioTexto: {
    marginTop: 5,

    fontSize: 11,
    color: '#7E8D89',
  },


  // =========================================================
  // NOVO REGISTRO
  // =========================================================

  novoRegistroCard: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: '#FFFFFF',

    borderRadius: 22,

    padding: 16,

    borderWidth: 1,
    borderColor: '#E8EFED',

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

  novoRegistroIcone: {
    width: 48,
    height: 48,

    borderRadius: 15,

    backgroundColor: '#E7F8F4',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 13,
  },

  novoRegistroConteudo: {
    flex: 1,
    paddingRight: 10,
  },

  novoRegistroTitulo: {
    fontSize: 15,
    fontWeight: '700',

    color: '#273331',
  },

  novoRegistroDescricao: {
    marginTop: 3,

    fontSize: 12,

    color: '#7E8D89',

    lineHeight: 17,
  },

  novoRegistroBotao: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 3,

    backgroundColor: '#0E9F8C',

    paddingHorizontal: 13,
    paddingVertical: 9,

    borderRadius: 18,
  },

  novoRegistroBotaoTexto: {
    fontSize: 12,
    fontWeight: '700',

    color: '#FFFFFF',
  },


  // =========================================================
  // DICA DE SAÚDE
  // =========================================================

  dicaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    backgroundColor: '#FFFFFF',

    borderRadius: 22,

    padding: 18,

    borderWidth: 1,
    borderColor: '#E8EFED',

    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 2,
  },

  dicaIcone: {
    width: 48,
    height: 48,

    borderRadius: 14,

    backgroundColor: '#FFE8ED',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 14,
  },

  dicaConteudo: {
    flex: 1,
  },

  dicaTitulo: {
    marginBottom: 5,

    fontSize: 13,
    fontWeight: '700',

    color: '#EF476F',
  },

  dicaTexto: {
    fontSize: 14,

    color: '#273331',

    lineHeight: 20,
  },

});