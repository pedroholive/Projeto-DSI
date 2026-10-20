import React, { useEffect, useState } from 'react';
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

import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../../firebaseConfig';


export default function HomeScreen() {
  const router = useRouter();
  const [nomePaciente, setNomePaciente] = useState('Paciente');
  const [agora, setAgora] = useState(new Date());


  // =========================================================
  // ATUALIZA DATA E HORÁRIO
  // =========================================================

  useEffect(() => {
    const intervalo = setInterval(() => {
      setAgora(new Date());
    }, 60000);

    return () => clearInterval(intervalo);
  }, []);


  // =========================================================
  // BUSCA O NOME DO USUÁRIO LOGADO
  // =========================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          return;
        }

        try {
          const perfilRef = doc(
            db,
            'usuarios',
            currentUser.uid
          );

          const perfilSnapshot = await getDoc(perfilRef);

          if (perfilSnapshot.exists()) {
            const perfil = perfilSnapshot.data();

            if (perfil.nome) {
              setNomePaciente(perfil.nome);
              return;
            }
          }

          // Caso não encontre o nome no Firestore,
          // tenta utilizar o displayName do Authentication.
          if (currentUser.displayName) {
            setNomePaciente(currentUser.displayName);
          }

        } catch (error) {
          console.error(
            'Erro ao carregar nome do paciente:',
            error
          );
        }
      }
    );

    return unsubscribe;
  }, []);


  // =========================================================
  // FORMATAÇÃO DA DATA E HORÁRIO
  // =========================================================

  const dataAtual = agora.toLocaleDateString(
    'pt-BR',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }
  );

  const horaAtual = agora.toLocaleTimeString(
    'pt-BR',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  const dataFormatada =
    dataAtual.charAt(0).toUpperCase() +
    dataAtual.slice(1);


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
            <View>
              <Text style={styles.saudacao}>
                Olá, {nomePaciente}!
              </Text>

              <Text style={styles.data}>
                {dataFormatada} • {horaAtual}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable style={styles.iconButton}>
                <Ionicons
                  name="notifications-outline"
                  size={21}
                  color="#0E766D"
                />
              </Pressable>

              <Pressable style={styles.perfilBtn}>
                <Ionicons
                  name="person-outline"
                  size={21}
                  color="#0E766D"
                />
              </Pressable>
            </View>
          </View>


          {/* =====================================================
              GLICOSE E PRESSÃO
          ===================================================== */}

          <View style={styles.metricasRow}>

            {/* Glicose */}

            <View style={styles.metricaCard}>
              <View style={styles.metricaHeader}>
                <Text style={styles.metricaTitulo}>
                  Glicose
                </Text>

                <View style={styles.tagJejum}>
                  <Text style={styles.tagJejumTexto}>
                    Jejum
                  </Text>
                </View>
              </View>

              <View style={styles.valorRow}>
                <Text style={styles.glicoseValor}>
                  98
                </Text>

                <Text style={styles.unidade}>
                  mg/dL
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Ionicons
                  name="trending-down-outline"
                  size={16}
                  color="#0E9F8C"
                />

                <Text style={styles.statusVerde}>
                  Estável • Há 1h
                </Text>
              </View>
            </View>


            {/* Pressão */}

            <View style={styles.metricaCard}>
              <View style={styles.metricaHeader}>
                <Text style={styles.metricaTitulo}>
                  Pressão
                </Text>

                <View style={styles.tagNormal}>
                  <Text style={styles.tagNormalTexto}>
                    Normal
                  </Text>
                </View>
              </View>

              <View style={styles.valorRow}>
                <Text style={styles.pressaoValor}>
                  120/80
                </Text>

                <Text style={styles.unidade}>
                  mmHg
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color="#0E9F8C"
                />

                <Text style={styles.statusSecundario}>
                  Aferida hoje
                </Text>
              </View>
            </View>

          </View>

          {/* =====================================================
    NOVO REGISTRO
===================================================== */}

<Pressable
  style={styles.novoRegistroCard}
  onPress={() => router.push('/novo-registro')}
>
  <View style={styles.novoRegistroIcone}>
    <Ionicons
      name="add"
      size={24}
      color="#0E9F8C"
    />
  </View>

  <View style={styles.novoRegistroConteudo}>
    <Text style={styles.novoRegistroTitulo}>
      Novo registro
    </Text>

    <Text style={styles.novoRegistroDescricao}>
      Registre uma nova medição de glicose ou pressão arterial.
    </Text>
  </View>

  <View style={styles.novoRegistroBotao}>
    <Text style={styles.novoRegistroBotaoTexto}>
      Adicionar
    </Text>

    <Ionicons
      name="chevron-forward"
      size={17}
      color="#FFFFFF"
    />
  </View>
</Pressable>


          {/* =====================================================
              ADESÃO AOS MEDICAMENTOS
          ===================================================== */}

          <View style={styles.adesaoCard}>

            <View style={styles.progresso}>
              <Text style={styles.progressoTexto}>
                85%
              </Text>
            </View>

            <View style={styles.adesaoConteudo}>
              <Text style={styles.cardTitulo}>
                Adesão aos Medicamentos
              </Text>

              <Text style={styles.cardDescricao}>
                Você tomou 3 de 4 doses programadas para hoje.
              </Text>
            </View>

          </View>


          {/* =====================================================
              PRÓXIMA MEDICAÇÃO
          ===================================================== */}

          <View style={styles.medicacaoCard}>

            <View style={styles.medicacaoHeader}>
              <View style={styles.medicacaoHorario}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color="#0E766D"
                />

                <Text style={styles.medicacaoHorarioTexto}>
                  Próxima medicação às 20:00
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#0E766D"
              />
            </View>

            <View style={styles.medicacaoConteudo}>

              <View style={styles.medicacaoInfo}>
                <Text style={styles.medicacaoNome}>
                  Cloridrato de Metformina
                </Text>

                <Text style={styles.medicacaoDose}>
                  850 mg • 1 comprimido com jantar
                </Text>
              </View>

              <Pressable style={styles.botaoTomar}>
                <Text style={styles.botaoTomarTexto}>
                  Tomar
                </Text>
              </Pressable>

            </View>

          </View>


          {/* =====================================================
              DICA DE SAÚDE
          ===================================================== */}

          <View style={styles.dicaCard}>

            <View style={styles.dicaIcone}>
              <Ionicons
                name="heart-outline"
                size={24}
                color="#EF476F"
              />
            </View>

            <View style={styles.dicaConteudo}>
              <Text style={styles.dicaTitulo}>
                Dica de Saúde
              </Text>

              <Text style={styles.dicaTexto}>
                A caminhada leve após a refeição pode ajudar
                no acompanhamento da glicemia.
              </Text>
            </View>

          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  // =========================================================
  // ESTRUTURA GERAL
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

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 8,
  },

  iconButton: {
    width: 42,
    height: 42,

    borderRadius: 21,

    backgroundColor: '#E6F4F1',

    alignItems: 'center',
    justifyContent: 'center',
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

  tagJejum: {
    backgroundColor: '#E7FAF5',

    borderRadius: 12,

    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  tagJejumTexto: {
    color: '#0E9F8C',

    fontSize: 11,
    fontWeight: '600',
  },

  tagNormal: {
    backgroundColor: '#FFE8EE',

    borderRadius: 12,

    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  tagNormalTexto: {
    color: '#EF476F',

    fontSize: 11,
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
    fontSize: 11,
    color: '#0E9F8C',
  },

  statusSecundario: {
    fontSize: 11,
    color: '#7E8D89',
  },


  // =========================================================
  // ADESÃO AOS MEDICAMENTOS
  // =========================================================

  adesaoCard: {
    flexDirection: 'row',
    alignItems: 'center',

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

  progresso: {
    width: 72,
    height: 72,

    borderRadius: 36,

    borderWidth: 7,
    borderColor: '#0E9F8C',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 16,
  },

  progressoTexto: {
    fontSize: 16,
    fontWeight: '700',

    color: '#273331',
  },

  adesaoConteudo: {
    flex: 1,
  },

  cardTitulo: {
    fontSize: 16,
    fontWeight: '700',

    color: '#273331',

    marginBottom: 5,
  },

  cardDescricao: {
    fontSize: 13,

    color: '#6F7C79',

    lineHeight: 19,
  },


  // =========================================================
  // PRÓXIMA MEDICAÇÃO
  // =========================================================

  medicacaoCard: {
    backgroundColor: '#ECFAF6',

    borderWidth: 1,
    borderColor: '#C8EEE5',

    borderRadius: 22,

    padding: 18,

    marginBottom: 14,
  },

  medicacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    marginBottom: 16,
  },

  medicacaoHorario: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 8,
  },

  medicacaoHorarioTexto: {
    fontSize: 13,
    fontWeight: '600',

    color: '#0E766D',
  },

  medicacaoConteudo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  medicacaoInfo: {
    flex: 1,

    paddingRight: 10,
  },

  medicacaoNome: {
    fontSize: 15,
    fontWeight: '700',

    color: '#273331',
  },

  medicacaoDose: {
    marginTop: 4,

    fontSize: 12,

    color: '#6F7C79',
  },

  botaoTomar: {
    backgroundColor: '#0E8F83',

    paddingHorizontal: 20,
    paddingVertical: 10,

    borderRadius: 18,
  },

  botaoTomarTexto: {
    color: '#FFFFFF',

    fontSize: 13,
    fontWeight: '600',
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

});