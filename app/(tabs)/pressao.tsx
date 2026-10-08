import React from 'react';
import { useRouter } from 'expo-router';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';


export default function PressaoScreen() {

  /*
    Dados temporários apenas para montar a interface.

    Depois estes valores serão substituídos pelos
    registros reais vindos do Firebase.
  */
  
  const router = useRouter();
  const dadosSemana = [
    { dia: 'Ter', sistolica: 126, diastolica: 82 },
    { dia: 'Qua', sistolica: 122, diastolica: 79 },
    { dia: 'Qui', sistolica: 128, diastolica: 83 },
    { dia: 'Sex', sistolica: 123, diastolica: 80 },
    { dia: 'Sáb', sistolica: 120, diastolica: 78 },
    { dia: 'Dom', sistolica: 121, diastolica: 77 },
    { dia: 'Seg', sistolica: 122, diastolica: 80 },
  ];

  const historico = [
    {
      id: '1',
      sistolica: 122,
      diastolica: 80,
      momento: 'Hoje • 07:15',
    },
    {
      id: '2',
      sistolica: 120,
      diastolica: 78,
      momento: 'Ontem • 19:40',
    },
    {
      id: '3',
      sistolica: 124,
      diastolica: 81,
      momento: '01/10 • 08:10',
    },
  ];


  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.content}>


          {/* =====================================================
              CABEÇALHO
          ===================================================== */}

          <View style={styles.header}>

            <View style={styles.headerIcon}>
              <Ionicons
                name="heart-outline"
                size={24}
                color="#0E9F8C"
              />
            </View>

            <View>
              <Text style={styles.titulo}>
                Pressão Arterial
              </Text>

              <Text style={styles.subtitulo}>
                Acompanhe suas aferições ao longo do tempo.
              </Text>
            </View>

          </View>


          {/* =====================================================
              ÚLTIMA MEDIÇÃO
          ===================================================== */}

          <View style={styles.card}>

            <Text style={styles.cardLabel}>
              Última Medição
            </Text>

            <View style={styles.ultimaMedicaoRow}>

              <View style={styles.valorContainer}>

                <Text style={styles.valorPrincipal}>
                  122
                </Text>

                <Text style={styles.separador}>
                  /
                </Text>

                <Text style={styles.valorPrincipal}>
                  80
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
                color="#7E8D89"
              />

              <Text style={styles.medicaoInfoTexto}>
                Aferido hoje às 07:15
              </Text>

            </View>

          </View>

{/* =====================================================
    REGISTRAR PRESSÃO
===================================================== */}

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
      color="#0E9F8C"
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

          {/* =====================================================
              TENDÊNCIA SEMANAL
          ===================================================== */}

          <View style={styles.card}>

            <View style={styles.tendenciaHeader}>

              <Text style={styles.cardTitulo}>
                Tendência Semanal
              </Text>


              <View style={styles.legenda}>

                <View style={styles.legendaItem}>
                  <View
                    style={[
                      styles.legendaPonto,
                      styles.pontoSistolica,
                    ]}
                  />

                  <Text style={styles.legendaTexto}>
                    Sist.
                  </Text>
                </View>


                <View style={styles.legendaItem}>
                  <View
                    style={[
                      styles.legendaPonto,
                      styles.pontoDiastolica,
                    ]}
                  />

                  <Text style={styles.legendaTexto}>
                    Diast.
                  </Text>
                </View>

              </View>

            </View>


            {/* Representação simples da tendência.
                Posteriormente podemos substituir por gráfico real. */}

            <View style={styles.graficoContainer}>

              {dadosSemana.map((item) => (

                <View
                  key={item.dia}
                  style={styles.graficoColuna}
                >

                  <View style={styles.barrasContainer}>

                    <View
                      style={[
                        styles.barra,
                        styles.barraSistolica,
                        {
                          height:
                            Math.max(
                              20,
                              item.sistolica - 85
                            ),
                        },
                      ]}
                    />

                    <View
                      style={[
                        styles.barra,
                        styles.barraDiastolica,
                        {
                          height:
                            Math.max(
                              14,
                              item.diastolica - 50
                            ),
                        },
                      ]}
                    />

                  </View>

                  <Text style={styles.graficoDia}>
                    {item.dia}
                  </Text>

                </View>

              ))}

            </View>

          </View>


          {/* =====================================================
              RESUMO
          ===================================================== */}

          <View style={styles.resumoCard}>

            <View style={styles.resumoIcone}>
              <Ionicons
                name="checkmark"
                size={21}
                color="#0E9F8C"
              />
            </View>


            <View style={styles.resumoConteudo}>

              <Text style={styles.resumoTitulo}>
                Acompanhamento
              </Text>

              <Text style={styles.resumoTexto}>
                Continue registrando suas aferições para
                acompanhar a evolução da pressão arterial
                ao longo do tempo.
              </Text>

            </View>

          </View>


          {/* =====================================================
              HISTÓRICO
          ===================================================== */}

          <Text style={styles.secaoTitulo}>
            Aferições recentes
          </Text>


          <View style={styles.historicoCard}>

            {historico.map((item, index) => (

              <View
                key={item.id}
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
                    color="#0E9F8C"
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
                    {item.momento}
                  </Text>

                </View>


                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#A0AAA7"
                />

              </View>

            ))}

          </View>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}



const styles = StyleSheet.create({

  // =========================================================
  // ESTRUTURA
  // =========================================================

  container: {
    flex: 1,

    backgroundColor: '#F4F6F7',
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


  // =========================================================
  // CABEÇALHO
  // =========================================================

  header: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 20,
  },


  headerIcon: {
    width: 48,
    height: 48,

    borderRadius: 15,

    backgroundColor: '#E7F8F4',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 13,
  },


  titulo: {
    fontSize: 24,

    fontWeight: '700',

    color: '#273331',
  },


  subtitulo: {
    marginTop: 3,

    fontSize: 13,

    color: '#7E8D89',
  },


  // =========================================================
  // CARDS
  // =========================================================

  card: {
    backgroundColor: '#FFFFFF',

    borderRadius: 22,

    padding: 18,

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


  cardLabel: {
    fontSize: 12,

    color: '#7E8D89',

    marginBottom: 8,
  },


  cardTitulo: {
    fontSize: 15,

    fontWeight: '700',

    color: '#273331',
  },


  // =========================================================
  // ÚLTIMA MEDIÇÃO
  // =========================================================

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

    color: '#273331',
  },


  separador: {
    fontSize: 28,

    color: '#7E8D89',

    marginHorizontal: 4,
  },


  unidade: {
    marginLeft: 6,

    fontSize: 11,

    color: '#7E8D89',
  },


  tagRegistro: {
    backgroundColor: '#E7F8F4',

    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 12,
  },


  tagRegistroTexto: {
    fontSize: 11,

    fontWeight: '600',

    color: '#0E9F8C',
  },


  medicaoInfo: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 5,

    marginTop: 12,
  },


  medicaoInfoTexto: {
    fontSize: 12,

    color: '#7E8D89',
  },


  // =========================================================
  // TENDÊNCIA
  // =========================================================

  tendenciaHeader: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    marginBottom: 20,
  },


  legenda: {
    flexDirection: 'row',

    gap: 10,
  },


  legendaItem: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,
  },


  legendaPonto: {
    width: 7,
    height: 7,

    borderRadius: 4,
  },


  pontoSistolica: {
    backgroundColor: '#EF476F',
  },


  pontoDiastolica: {
    backgroundColor: '#3B82F6',
  },


  legendaTexto: {
    fontSize: 10,

    color: '#7E8D89',
  },


  graficoContainer: {
    height: 110,

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'flex-end',
  },


  graficoColuna: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'flex-end',
  },


  barrasContainer: {
    height: 82,

    flexDirection: 'row',

    alignItems: 'flex-end',

    gap: 3,
  },


  barra: {
    width: 6,

    borderRadius: 4,
  },


  barraSistolica: {
    backgroundColor: '#EF476F',
  },


  barraDiastolica: {
    backgroundColor: '#3B82F6',
  },


  graficoDia: {
    marginTop: 7,

    fontSize: 10,

    color: '#8A9693',
  },


  // =========================================================
  // RESUMO
  // =========================================================

  resumoCard: {
    flexDirection: 'row',

    alignItems: 'flex-start',

    backgroundColor: '#EAF8F5',

    borderRadius: 18,

    padding: 16,

    marginBottom: 22,
  },


  resumoIcone: {
    width: 38,
    height: 38,

    borderRadius: 12,

    backgroundColor: '#FFFFFF',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 12,
  },


  resumoConteudo: {
    flex: 1,
  },


  resumoTitulo: {
    fontSize: 13,

    fontWeight: '700',

    color: '#0E766D',

    marginBottom: 4,
  },


  resumoTexto: {
    fontSize: 12,

    color: '#52615E',

    lineHeight: 18,
  },


  // =========================================================
  // HISTÓRICO
  // =========================================================

  secaoTitulo: {
    fontSize: 15,

    fontWeight: '700',

    color: '#273331',

    marginBottom: 10,
  },


  historicoCard: {
    backgroundColor: '#FFFFFF',

    borderRadius: 18,

    borderWidth: 1,

    borderColor: '#E8EFED',

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

    backgroundColor: '#E7F8F4',

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

    color: '#273331',
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
  
  // =========================================================
// REGISTRAR PRESSÃO
// =========================================================

registrarCard: {
  flexDirection: 'row',
  alignItems: 'center',

  backgroundColor: '#FFFFFF',

  borderRadius: 18,

  padding: 15,

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

registrarIcone: {
  width: 42,
  height: 42,

  borderRadius: 13,

  backgroundColor: '#E7F8F4',

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

  color: '#273331',
},

registrarDescricao: {
  marginTop: 3,

  fontSize: 11,

  color: '#7E8D89',
},

registrarBotao: {
  flexDirection: 'row',

  alignItems: 'center',

  gap: 3,

  backgroundColor: '#0E9F8C',

  paddingHorizontal: 12,
  paddingVertical: 9,

  borderRadius: 17,
},

registrarBotaoTexto: {
  fontSize: 11,

  fontWeight: '700',

  color: '#FFFFFF',
},

});