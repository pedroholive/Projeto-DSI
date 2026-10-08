import React, { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams,} from 'expo-router';

import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { auth, db } from '../firebaseConfig';

type TipoRegistro = 'glicose' | 'pressao';

function somenteNumeros(
  texto: string,
  maxDigitos: number
) {
  return texto
    .replace(/\D/g, '')
    .slice(0, maxDigitos);
}

export default function NovoRegistroScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{tipo?: string;}>();

  const [tipoRegistro, setTipoRegistro] =
  useState<TipoRegistro>(
    params.tipo === 'pressao'
      ? 'pressao'
      : 'glicose');

  const [salvando, setSalvando] = useState(false);
  const [glicose, setGlicose] = useState('');

  const [sistolica, setSistolica] = useState('');
  const [diastolica, setDiastolica] = useState('');

  const [momentoGlicose, setMomentoGlicose] =
    useState<'jejum' | 'pos-prandial'>('jejum');

  const [observacao, setObservacao] = useState('');

  const agora = new Date();

  const dataAtual = agora.toLocaleDateString('pt-BR');

  const horaAtual = agora.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  async function handleSalvar() {

  if (tipoRegistro === 'glicose') {
  if (!glicose.trim()) {
    Alert.alert(
      'Atenção',
      'Informe o valor da glicose.'
    );

    return;
  }

  const valorGlicose = Number(glicose);

  if (
    !Number.isInteger(valorGlicose) ||
    valorGlicose < 20 ||
    valorGlicose > 600
  ) {
    Alert.alert(
      'Valor inválido',
      'Informe um valor de glicose entre 20 e 600 mg/dL.'
    );

    return;
  }

  Alert.alert(
    'Em desenvolvimento',
    'O salvamento da glicose será implementado posteriormente.'
  );

  return;
}


  // Identifica o usuário atualmente logado.
  const usuario = auth.currentUser;

  if (!usuario) {
    Alert.alert(
      'Erro',
      'Não foi possível identificar o usuário logado.'
    );

    return;
  }


  // Verifica se os campos foram preenchidos.
  if (!sistolica.trim() || !diastolica.trim()) {
    Alert.alert(
      'Atenção',
      'Informe os valores da pressão sistólica e diastólica.'
    );

    return;
  }


  const valorSistolica = Number(sistolica);
  const valorDiastolica = Number(diastolica);
  
  // Tratamento de valores fora do intervalo esperado para pressão arterial.
  if (
  valorSistolica < 50 ||
  valorSistolica > 300
) {
  Alert.alert(
    'Valor inválido',
    'A pressão sistólica deve estar entre 50 e 300 mmHg.'
  );

  return;
}

if (
  valorDiastolica < 30 ||
  valorDiastolica > 200
) {
  Alert.alert(
    'Valor inválido',
    'A pressão diastólica deve estar entre 30 e 200 mmHg.'
  );

  return;
}

if (valorSistolica <= valorDiastolica) {
  Alert.alert(
    'Valor inválido',
    'A pressão sistólica deve ser maior que a diastólica.'
  );

  return;
}

  // Validação dos números.
  if (
    !Number.isFinite(valorSistolica) ||
    !Number.isFinite(valorDiastolica) ||
    valorSistolica <= 0 ||
    valorDiastolica <= 0
  ) {
    Alert.alert(
      'Atenção',
      'Informe valores válidos para a pressão arterial.'
    );

    return;
  }


  // Não queremos salvar valores decimais de pressão.
  if (
    !Number.isInteger(valorSistolica) ||
    !Number.isInteger(valorDiastolica)
  ) {
    Alert.alert(
      'Atenção',
      'Informe valores inteiros para a pressão arterial.'
    );

    return;
  }


  // Validação lógica básica.
  if (valorSistolica <= valorDiastolica) {
    Alert.alert(
      'Atenção',
      'A pressão sistólica deve ser maior que a diastólica.'
    );

    return;
  }


  try {

    setSalvando(true);

    const dataMedicao = new Date();


    await addDoc(
      collection(
        db,
        'usuarios',
        usuario.uid,
        'registrosPressao'
      ),
      {
        sistolica: valorSistolica,

        diastolica: valorDiastolica,

        unidade: 'mmHg',

        observacao: observacao.trim(),

        dataMedicao: Timestamp.fromDate(
          dataMedicao
        ),

        criadoEm: serverTimestamp(),
      }
    );


    // Limpa os campos.
    setSistolica('');
    setDiastolica('');
    setObservacao('');


    Alert.alert(
      'Registro salvo',
      'A aferição de pressão arterial foi registrada com sucesso.'
    );


    // Após salvar, volta para a tela de Pressão.
    router.replace('/pressao');


  } catch (error) {

    console.error(
      'Erro ao salvar pressão:',
      error
    );


    Alert.alert(
      'Erro',
      'Não foi possível salvar a aferição. Tente novamente.'
    );


  } finally {

    setSalvando(false);

  }
}

  

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>

          {/* CABEÇALHO */}

          <View style={styles.header}>
            <Text style={styles.titulo}>
              Novo Registro
            </Text>

            <Pressable
              style={styles.fecharButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="close"
                size={22}
                color="#273331"
              />
            </Pressable>
          </View>


          {/* TIPO DE REGISTRO */}

          <View style={styles.tipoContainer}>
            <Pressable
              style={[
                styles.tipoButton,
                tipoRegistro === 'glicose' &&
                  styles.tipoButtonAtivo,
              ]}
              onPress={() =>
                setTipoRegistro('glicose')
              }
            >
              <Ionicons
                name="water"
                size={15}
                color={
                  tipoRegistro === 'glicose'
                    ? '#0E9F8C'
                    : '#7E8D89'
                }
              />

              <Text
                style={[
                  styles.tipoTexto,
                  tipoRegistro === 'glicose' &&
                    styles.tipoTextoAtivo,
                ]}
              >
                Glicose
              </Text>
            </Pressable>


            <Pressable
              style={[
                styles.tipoButton,
                tipoRegistro === 'pressao' &&
                  styles.tipoButtonAtivo,
              ]}
              onPress={() =>
                setTipoRegistro('pressao')
              }
            >
              <Ionicons
                name="heart"
                size={15}
                color={
                  tipoRegistro === 'pressao'
                    ? '#0E9F8C'
                    : '#7E8D89'
                }
              />

              <Text
                style={[
                  styles.tipoTexto,
                  tipoRegistro === 'pressao' &&
                    styles.tipoTextoAtivo,
                ]}
              >
                Pressão
              </Text>
            </Pressable>
          </View>


          {/* FORMULÁRIO GLICOSE */}

          {tipoRegistro === 'glicose' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>
                  Digite o valor medido
                </Text>

                <View style={styles.valorContainer}>
                  <TextInput
                   value={glicose}
                   onChangeText={(texto) =>
                     setGlicose(somenteNumeros(texto, 3))
                     }
                      placeholder="112"
                      placeholderTextColor="#B6C0BD"
                      keyboardType="numeric"
                      maxLength={3}
                      style={styles.valorInput}
/>

                  <Text style={styles.unidade}>
                    mg/dL
                  </Text>
                </View>
              </View>


              <View style={styles.card}>
                <Text style={styles.secaoTitulo}>
                  Momento da Medição
                </Text>

                <View style={styles.momentoRow}>
                  <Pressable
                    style={[
                      styles.momentoButton,
                      momentoGlicose === 'jejum' &&
                        styles.momentoButtonAtivo,
                    ]}
                    onPress={() =>
                      setMomentoGlicose('jejum')
                    }
                  >
                    <Text
                      style={[
                        styles.momentoTexto,
                        momentoGlicose === 'jejum' &&
                          styles.momentoTextoAtivo,
                      ]}
                    >
                      Em jejum
                    </Text>
                  </Pressable>


                  <Pressable
                    style={[
                      styles.momentoButton,
                      momentoGlicose ===
                        'pos-prandial' &&
                        styles.momentoButtonAtivo,
                    ]}
                    onPress={() =>
                      setMomentoGlicose(
                        'pos-prandial'
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.momentoTexto,
                        momentoGlicose ===
                          'pos-prandial' &&
                          styles.momentoTextoAtivo,
                      ]}
                    >
                      Pós-Prandial
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}


          {/* FORMULÁRIO PRESSÃO */}

          {tipoRegistro === 'pressao' && (
            <View style={styles.card}>
              <Text style={styles.secaoTitulo}>
                Pressão Arterial
              </Text>

              <Text style={styles.cardDescricao}>
                Informe os valores da aferição.
              </Text>


              <View style={styles.pressaoRow}>

                <View style={styles.pressaoCampo}>
                  <Text style={styles.campoLabel}>
                    Sistólica
                  </Text>

                  <View style={styles.inputComUnidade}>
                    <TextInput
                     value={sistolica}
                      onChangeText={(texto) =>
                      setSistolica(somenteNumeros(texto, 3))
                       }
                       placeholder="120"
                       placeholderTextColor="#B6C0BD"
                       keyboardType="numeric"
                       maxLength={3}
                      style={styles.pressaoInput}
/>

                    <Text style={styles.unidadePressao}>
                      mmHg
                    </Text>
                  </View>
                </View>


                <View style={styles.pressaoCampo}>
                  <Text style={styles.campoLabel}>
                    Diastólica
                  </Text>

                  <View style={styles.inputComUnidade}>
                    <TextInput
                      value={diastolica}
                       onChangeText={(texto) =>
                      setDiastolica(somenteNumeros(texto, 3))
                       }
                       placeholder="80"
                       placeholderTextColor="#B6C0BD"
                        keyboardType="numeric"
                        maxLength={3}
                        style={styles.pressaoInput}
/>

                    <Text style={styles.unidadePressao}>
                      mmHg
                    </Text>
                  </View>
                </View>

              </View>
            </View>
          )}


          {/* DATA E HORÁRIO */}

          <View style={styles.card}>
            <Text style={styles.secaoTitulo}>
              Data e horário
            </Text>

            <View style={styles.dataHoraRow}>
              <View style={styles.dataHoraItem}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color="#0E766D"
                />

                <Text style={styles.dataHoraTexto}>
                  {dataAtual}
                </Text>
              </View>

              <View style={styles.dataHoraItem}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color="#0E766D"
                />

                <Text style={styles.dataHoraTexto}>
                  {horaAtual}
                </Text>
              </View>
            </View>
          </View>


          {/* OBSERVAÇÃO */}

          <View style={styles.card}>
            <Text style={styles.secaoTitulo}>
              Anotações
              <Text style={styles.opcional}>
                {' '} (Opcional)
              </Text>
            </Text>

            <TextInput
              value={observacao}
              onChangeText={setObservacao}
              placeholder="Adicione alguma observação sobre a medição..."
              placeholderTextColor="#9BA7A4"
              multiline
              textAlignVertical="top"
              style={styles.observacaoInput}
            />
          </View>


          {/* SALVAR */}

          <Pressable
  style={[
    styles.salvarButton,
    salvando && styles.salvarButtonDesabilitado,  ]}
    onPress={handleSalvar}
    disabled={salvando}
>
   <Text style={styles.salvarTexto}>
    {salvando
      ? 'Salvando...'
      : 'Salvar Registro'}
        </Text>
        </Pressable>

          {/* CANCELAR */}

          <Pressable
            style={styles.cancelarButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelarTexto}>
              Cancelar
            </Text>
          </Pressable>

        </View>
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
    flexGrow: 1,
    alignItems: 'center',
  },

  content: {
    width: '100%',
    maxWidth: 520,

    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 36,
  },


  // CABEÇALHO

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginBottom: 14,
  },

  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#273331',
  },

  fecharButton: {
    width: 36,
    height: 36,

    borderRadius: 18,

    alignItems: 'center',
    justifyContent: 'center',
  },


  // TIPO

  tipoContainer: {
    flexDirection: 'row',

    backgroundColor: '#FFFFFF',

    borderRadius: 14,

    padding: 4,

    marginBottom: 12,
  },

  tipoButton: {
    flex: 1,

    height: 38,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 6,

    borderRadius: 11,
  },

  tipoButtonAtivo: {
    backgroundColor: '#E7F8F4',
  },

  tipoTexto: {
    fontSize: 13,
    color: '#7E8D89',
    fontWeight: '500',
  },

  tipoTextoAtivo: {
    color: '#0E766D',
    fontWeight: '700',
  },


  // CARDS

  card: {
    backgroundColor: '#FFFFFF',

    borderRadius: 18,

    padding: 16,

    marginBottom: 12,

    borderWidth: 1,
    borderColor: '#EEF2F1',
  },

  cardLabel: {
    textAlign: 'center',

    color: '#7E8D89',

    fontSize: 12,

    marginBottom: 8,
  },

  cardDescricao: {
    fontSize: 12,
    color: '#7E8D89',

    marginTop: 3,
    marginBottom: 15,
  },

  secaoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#35413F',

    marginBottom: 12,
  },


  // GLICOSE

  valorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
  },

  valorInput: {
    minWidth: 90,

    fontSize: 42,
    fontWeight: '700',

    color: '#0E9F8C',

    textAlign: 'center',

    padding: 0,
  },

  unidade: {
    color: '#7E8D89',
    fontSize: 12,
  },

  momentoRow: {
    flexDirection: 'row',
    gap: 8,
  },

  momentoButton: {
    flex: 1,

    paddingVertical: 10,

    backgroundColor: '#F4F6F7',

    borderRadius: 18,

    alignItems: 'center',

    borderWidth: 1,
    borderColor: 'transparent',
  },

  momentoButtonAtivo: {
    backgroundColor: '#E9F8F5',
    borderColor: '#0E9F8C',
  },

  momentoTexto: {
    color: '#8B9693',
    fontSize: 12,
  },

  momentoTextoAtivo: {
    color: '#0E766D',
    fontWeight: '600',
  },


  // PRESSÃO

  pressaoRow: {
    flexDirection: 'row',

    gap: 12,
  },

  pressaoCampo: {
    flex: 1,
  },

  campoLabel: {
    fontSize: 12,
    fontWeight: '600',

    color: '#62706D',

    marginBottom: 7,
  },

  inputComUnidade: {
    backgroundColor: '#F5F7F7',

    borderWidth: 1,
    borderColor: '#E1E8E6',

    borderRadius: 13,

    paddingHorizontal: 10,
    paddingVertical: 10,

    alignItems: 'center',
  },

  pressaoInput: {
    width: '100%',

    textAlign: 'center',

    fontSize: 27,
    fontWeight: '700',

    color: '#273331',

    padding: 0,
  },

  unidadePressao: {
    fontSize: 10,
    color: '#8A9693',

    marginTop: 2,
  },


  // DATA/HORA

  dataHoraRow: {
    flexDirection: 'row',

    gap: 10,
  },

  dataHoraItem: {
    flex: 1,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 7,

    backgroundColor: '#F5F8F7',

    padding: 12,

    borderRadius: 12,
  },

  dataHoraTexto: {
    fontSize: 13,
    color: '#52615E',
  },


  // OBSERVAÇÃO

  opcional: {
    fontWeight: '400',
    color: '#8C9794',
  },

  observacaoInput: {
    minHeight: 90,

    backgroundColor: '#F4F6F7',

    borderRadius: 12,

    padding: 13,

    fontSize: 13,

    color: '#35413F',
  },


  // BOTÕES

salvarButton: {
  height: 52,
  backgroundColor: '#0E9F8C',
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 2,
},
 
salvarButtonDesabilitado: {
  opacity: 0.6,
},

  salvarTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  cancelarButton: {
    height: 48,

    borderWidth: 1,
    borderColor: '#87918F',

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 10,
  },

  cancelarTexto: {
    color: '#45514F',

    fontSize: 13,
    fontWeight: '600',
  },

});