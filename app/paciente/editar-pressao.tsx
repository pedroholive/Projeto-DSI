import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import { auth, db } from '../firebaseConfig';


function somenteNumeros(
  texto: string,
  maxDigitos: number
) {
  return texto
    .replace(/\D/g, '')
    .slice(0, maxDigitos);
}


export default function EditarPressaoScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      id?: string;
    }>();

  const [sistolica, setSistolica] =
    useState('');

  const [diastolica, setDiastolica] =
    useState('');

  const [observacao, setObservacao] =
    useState('');

  const [carregando, setCarregando] =
    useState(true);

  const [processando, setProcessando] =
    useState(false);


  // =========================================================
  // CARREGAR REGISTRO
  // =========================================================

  useEffect(() => {
    async function carregarRegistro() {
      const usuario =
        auth.currentUser;

      if (
        !usuario ||
        !params.id
      ) {
        Alert.alert(
          'Erro',
          'Não foi possível localizar essa aferição.'
        );

        router.back();
        return;
      }

      try {
        const referencia = doc(
          db,
          'usuarios',
          usuario.uid,
          'registrosPressao',
          params.id
        );

        const snapshot =
          await getDoc(referencia);

        if (!snapshot.exists()) {
          Alert.alert(
            'Registro não encontrado',
            'Essa aferição não existe mais.'
          );

          router.back();
          return;
        }

        const dados =
          snapshot.data();

        setSistolica(
          String(
            dados.sistolica ?? ''
          )
        );

        setDiastolica(
          String(
            dados.diastolica ?? ''
          )
        );

        setObservacao(
          dados.observacao ?? ''
        );

      } catch (error) {
        console.error(
          'Erro ao carregar pressão:',
          error
        );

        Alert.alert(
          'Erro',
          'Não foi possível carregar a aferição.'
        );

      } finally {
        setCarregando(false);
      }
    }

    carregarRegistro();

  }, [params.id, router]);


  // =========================================================
  // UPDATE
  // =========================================================

  async function salvarAlteracoes() {
    const usuario =
      auth.currentUser;

    if (
      !usuario ||
      !params.id
    ) {
      return;
    }


    if (
      !sistolica.trim() ||
      !diastolica.trim()
    ) {
      Alert.alert(
        'Atenção',
        'Informe os valores da pressão sistólica e diastólica.'
      );

      return;
    }


    const valorSistolica =
      Number(sistolica);

    const valorDiastolica =
      Number(diastolica);


    if (
      !Number.isInteger(
        valorSistolica
      ) ||
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
      !Number.isInteger(
        valorDiastolica
      ) ||
      valorDiastolica < 30 ||
      valorDiastolica > 200
    ) {
      Alert.alert(
        'Valor inválido',
        'A pressão diastólica deve estar entre 30 e 200 mmHg.'
      );

      return;
    }


    if (
      valorSistolica <=
      valorDiastolica
    ) {
      Alert.alert(
        'Valor inválido',
        'A pressão sistólica deve ser maior que a diastólica.'
      );

      return;
    }


    try {
      setProcessando(true);

      const referencia = doc(
        db,
        'usuarios',
        usuario.uid,
        'registrosPressao',
        params.id
      );


      await updateDoc(
        referencia,
        {
          sistolica:
            valorSistolica,

          diastolica:
            valorDiastolica,

          observacao:
            observacao.trim(),
        }
      );


      console.log(
        '[PRESSAO] registro atualizado:',
        params.id
      );


      Alert.alert(
        'Registro atualizado',
        'A aferição foi atualizada com sucesso.'
      );


      router.back();

    } catch (error: any) {
      console.error(
        '[PRESSAO] erro ao atualizar:',
        error?.code,
        error?.message,
        error
      );

      Alert.alert(
        'Erro',
        'Não foi possível atualizar a aferição.'
      );

    } finally {
      setProcessando(false);
    }
  }


  // =========================================================
  // DELETE
  // =========================================================

  async function excluirRegistro() {
    const usuario =
      auth.currentUser;

    if (
      !usuario ||
      !params.id
    ) {
      return;
    }


    try {
      setProcessando(true);

      const referencia = doc(
        db,
        'usuarios',
        usuario.uid,
        'registrosPressao',
        params.id
      );


      await deleteDoc(
        referencia
      );


      console.log(
        '[PRESSAO] registro excluído:',
        params.id
      );


      if (
        Platform.OS !== 'web'
      ) {
        Alert.alert(
          'Registro excluído',
          'A aferição foi removida com sucesso.'
        );
      }


      router.back();

    } catch (error: any) {
      console.error(
        '[PRESSAO] erro ao excluir:',
        error?.code,
        error?.message,
        error
      );

      Alert.alert(
        'Erro',
        'Não foi possível excluir a aferição.'
      );

    } finally {
      setProcessando(false);
    }
  }


  function confirmarExclusao() {

    // No navegador usamos o confirm nativo,
    // porque o Alert com vários botões pode
    // se comportar diferente no React Native Web.

    if (
      Platform.OS === 'web'
    ) {
      const confirmou =
        window.confirm(
          'Tem certeza que deseja excluir esta aferição? Essa ação não poderá ser desfeita.'
        );

      if (confirmou) {
        excluirRegistro();
      }

      return;
    }


    Alert.alert(
      'Excluir aferição',
      'Tem certeza que deseja excluir esta aferição? Essa ação não poderá ser desfeita.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },

        {
          text: 'Excluir',
          style: 'destructive',
          onPress:
            excluirRegistro,
        },
      ]
    );
  }


  // =========================================================
  // LOADING
  // =========================================================

  if (carregando) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >

        <ActivityIndicator
          size="large"
          color="#0E9F8C"
        />

        <Text
          style={
            styles.loadingTexto
          }
        >
          Carregando aferição...
        </Text>

      </SafeAreaView>
    );
  }


  // =========================================================
  // INTERFACE
  // =========================================================

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

        <View style={styles.content}>


          {/* CABEÇALHO */}

          <View style={styles.header}>

            <Pressable
              style={
                styles.voltarButton
              }

              onPress={() =>
                router.back()
              }
            >

              <Ionicons
                name="arrow-back"
                size={22}
                color="#273331"
              />

            </Pressable>


            <Text style={styles.titulo}>
              Editar aferição
            </Text>


            <View
              style={
                styles.headerEspaco
              }
            />

          </View>


          {/* PRESSÃO */}

          <View style={styles.card}>

            <Text
              style={
                styles.cardTitulo
              }
            >
              Pressão Arterial
            </Text>


            <Text
              style={
                styles.cardDescricao
              }
            >
              Altere os valores da aferição.
            </Text>


            <View
              style={
                styles.pressaoRow
              }
            >

              {/* SISTÓLICA */}

              <View
                style={
                  styles.campo
                }
              >

                <Text
                  style={
                    styles.label
                  }
                >
                  Sistólica
                </Text>


                <View
                  style={
                    styles.inputContainer
                  }
                >

                  <TextInput
                    value={sistolica}

                    onChangeText={(
                      texto
                    ) =>
                      setSistolica(
                        somenteNumeros(
                          texto,
                          3
                        )
                      )
                    }

                    keyboardType="numeric"

                    maxLength={3}

                    style={
                      styles.input
                    }
                  />


                  <Text
                    style={
                      styles.unidade
                    }
                  >
                    mmHg
                  </Text>

                </View>

              </View>


              {/* DIASTÓLICA */}

              <View
                style={
                  styles.campo
                }
              >

                <Text
                  style={
                    styles.label
                  }
                >
                  Diastólica
                </Text>


                <View
                  style={
                    styles.inputContainer
                  }
                >

                  <TextInput
                    value={diastolica}

                    onChangeText={(
                      texto
                    ) =>
                      setDiastolica(
                        somenteNumeros(
                          texto,
                          3
                        )
                      )
                    }

                    keyboardType="numeric"

                    maxLength={3}

                    style={
                      styles.input
                    }
                  />


                  <Text
                    style={
                      styles.unidade
                    }
                  >
                    mmHg
                  </Text>

                </View>

              </View>

            </View>

          </View>


          {/* OBSERVAÇÃO */}

          <View style={styles.card}>

            <Text
              style={
                styles.cardTitulo
              }
            >
              Anotações

              <Text
                style={
                  styles.opcional
                }
              >
                {' '} (Opcional)
              </Text>
            </Text>


            <TextInput
              value={observacao}

              onChangeText={
                setObservacao
              }

              placeholder="Adicione alguma observação..."

              placeholderTextColor="#9BA7A4"

              multiline

              textAlignVertical="top"

              style={
                styles.observacaoInput
              }
            />

          </View>


          {/* SALVAR */}

          <Pressable
            style={[
              styles.salvarButton,

              processando &&
                styles.botaoDesabilitado,
            ]}

            disabled={
              processando
            }

            onPress={
              salvarAlteracoes
            }
          >

            <Text
              style={
                styles.salvarTexto
              }
            >
              {processando
                ? 'Salvando...'
                : 'Salvar alterações'}
            </Text>

          </Pressable>


          {/* EXCLUIR */}

          <Pressable
            style={[
              styles.excluirButton,

              processando &&
                styles.botaoDesabilitado,
            ]}

            disabled={
              processando
            }

            onPress={
              confirmarExclusao
            }
          >

            <Ionicons
              name="trash-outline"
              size={18}
              color="#D94B57"
            />


            <Text
              style={
                styles.excluirTexto
              }
            >
              Excluir aferição
            </Text>

          </Pressable>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}



const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        '#F4F6F7',
    },


    loadingContainer: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F4F6F7',

      gap: 12,
    },


    loadingTexto: {
      fontSize: 13,

      color:
        '#7E8D89',
    },


    scrollContent: {
      flexGrow: 1,

      alignItems:
        'center',
    },


    content: {
      width: '100%',

      maxWidth: 520,

      paddingHorizontal: 16,

      paddingTop: 18,

      paddingBottom: 36,
    },


    header: {
      flexDirection: 'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom: 18,
    },


    voltarButton: {
      width: 38,

      height: 38,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    headerEspaco: {
      width: 38,
    },


    titulo: {
      fontSize: 20,

      fontWeight:
        '700',

      color:
        '#273331',
    },


    card: {
      backgroundColor:
        '#FFFFFF',

      borderRadius: 18,

      padding: 16,

      borderWidth: 1,

      borderColor:
        '#E8EFED',

      marginBottom: 12,
    },


    cardTitulo: {
      fontSize: 14,

      fontWeight:
        '700',

      color:
        '#35413F',

      marginBottom: 5,
    },


    cardDescricao: {
      fontSize: 12,

      color:
        '#7E8D89',

      marginBottom: 15,
    },


    pressaoRow: {
      flexDirection: 'row',

      gap: 12,
    },


    campo: {
      flex: 1,
    },


    label: {
      fontSize: 12,

      fontWeight:
        '600',

      color:
        '#62706D',

      marginBottom: 7,
    },


    inputContainer: {
      backgroundColor:
        '#F5F7F7',

      borderWidth: 1,

      borderColor:
        '#E1E8E6',

      borderRadius: 13,

      paddingHorizontal: 10,

      paddingVertical: 10,

      alignItems:
        'center',
    },


    input: {
      width: '100%',

      textAlign:
        'center',

      fontSize: 27,

      fontWeight:
        '700',

      color:
        '#273331',

      padding: 0,
    },


    unidade: {
      fontSize: 10,

      color:
        '#8A9693',

      marginTop: 2,
    },


    opcional: {
      fontWeight:
        '400',

      color:
        '#8C9794',
    },


    observacaoInput: {
      minHeight: 90,

      backgroundColor:
        '#F4F6F7',

      borderRadius: 12,

      padding: 13,

      fontSize: 13,

      color:
        '#35413F',
    },


    salvarButton: {
      height: 52,

      backgroundColor:
        '#0E9F8C',

      borderRadius: 12,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    salvarTexto: {
      color:
        '#FFFFFF',

      fontSize: 14,

      fontWeight:
        '700',
    },


    excluirButton: {
      height: 50,

      marginTop: 10,

      borderRadius: 12,

      borderWidth: 1,

      borderColor:
        '#F1B7BD',

      backgroundColor:
        '#FFF5F6',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 7,
    },


    excluirTexto: {
      color:
        '#D94B57',

      fontSize: 13,

      fontWeight:
        '700',
    },


    botaoDesabilitado: {
      opacity: 0.6,
    },

  });