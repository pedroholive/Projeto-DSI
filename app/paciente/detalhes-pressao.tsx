
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  deleteDoc,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';

import { auth, db } from '@/firebaseConfig';

type RegistroPressao = {
  id: string;
  sistolica: number;
  diastolica: number;
  observacao: string;
  dataMedicao: Timestamp | null;
};

const C = {
  fundo: '#F4F8F7',
  branco: '#FFFFFF',
  verde: '#0E9F8C',
  verdeEscuro: '#0E766D',
  verdeClaro: '#E7F8F4',
  texto: '#273331',
  secundario: '#7E8D89',
  borda: '#E0EAE8',
  vermelho: '#D94B57',
  vermelhoClaro: '#FDE8EA',
};

export default function DetalhesPressaoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [registro, setRegistro] =
    useState<RegistroPressao | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');

    const usuario = auth.currentUser;

    if (!usuario || !id || typeof id !== 'string') {
      setRegistro(null);
      setErro('Aferição ou usuário não identificado.');
      setCarregando(false);
      return;
    }

    try {
      const referencia = doc(
        db,
        'usuarios',
        usuario.uid,
        'registrosPressao',
        id
      );

      const snapshot = await getDoc(referencia);

      if (!snapshot.exists()) {
        throw new Error('Aferição não encontrada.');
      }

      const dados = snapshot.data();

      setRegistro({
        id: snapshot.id,
        sistolica: Number(dados.sistolica),
        diastolica: Number(dados.diastolica),
        observacao: dados.observacao ?? '',
        dataMedicao:
          dados.dataMedicao instanceof Timestamp
            ? dados.dataMedicao
            : null,
      });
    } catch (error) {
      setRegistro(null);

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar a aferição.'
      );
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  function formatarData() {
    if (!registro?.dataMedicao) {
      return 'Data não informada';
    }

    return registro.dataMedicao
      .toDate()
      .toLocaleDateString('pt-BR');
  }

  function formatarHorario() {
    if (!registro?.dataMedicao) {
      return 'Horário não informado';
    }

    return registro.dataMedicao
      .toDate()
      .toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
  }

  function editar() {
    if (!id) return;

    router.push({
      pathname: '/editar-pressao',
      params: { id },
    });
  }

  async function executarExclusao() {
    const usuario = auth.currentUser;

    if (!usuario || !id || excluindo) return;

    setExcluindo(true);

    try {
      await deleteDoc(
        doc(
          db,
          'usuarios',
          usuario.uid,
          'registrosPressao',
          id
        )
      );

      router.replace('/(tabs)/pressao');
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir a aferição.';

      if (Platform.OS === 'web') {
        window.alert(mensagem);
      } else {
        Alert.alert('Erro ao excluir', mensagem);
      }
    } finally {
      setExcluindo(false);
    }
  }

  function confirmarExclusao() {
    if (Platform.OS === 'web') {
      const confirmou = window.confirm(
        'Excluir aferição?\n\nEsta ação não pode ser desfeita.'
      );

      if (confirmou) {
        void executarExclusao();
      }

      return;
    }

    Alert.alert(
      'Excluir aferição?',
      'Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void executarExclusao();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.voltar}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={C.texto}
          />
          <Text style={styles.voltarTexto}>
            Detalhes da aferição
          </Text>
        </Pressable>

        {carregando ? (
          <View style={styles.centro}>
            <ActivityIndicator
              size="large"
              color={C.verde}
            />
            <Text style={styles.auxiliar}>
              Carregando aferição...
            </Text>
          </View>
        ) : erro || !registro ? (
          <View style={styles.card}>
            <Text style={styles.erro}>
              {erro || 'Aferição indisponível.'}
            </Text>
            <Pressable onPress={carregar}>
              <Text style={styles.tentarNovamente}>
                Tentar novamente
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.destaque}>
              <View style={styles.destaqueTopo}>
                <View style={styles.iconeDestaque}>
                  <Ionicons
                    name="heart-outline"
                    size={25}
                    color={C.verde}
                  />
                </View>

                <Text style={styles.destaqueTitulo}>
                  Registro de pressão arterial
                </Text>
              </View>

              <View style={styles.valorLinha}>
                <Text style={styles.valor}>
                  {registro.sistolica}/
                  {registro.diastolica}
                </Text>

                <Text style={styles.unidade}>
                  mmHg
                </Text>
              </View>

              <Text style={styles.destaqueDescricao}>
                Aferição registrada no seu histórico
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.secaoTitulo}>
                Informações da aferição
              </Text>

              <View style={styles.info}>
                <Ionicons
                  name="heart-outline"
                  size={20}
                  color={C.verdeEscuro}
                />
                <View style={styles.infoConteudo}>
                  <Text style={styles.rotulo}>
                    Pressão sistólica
                  </Text>
                  <Text style={styles.infoValor}>
                    {registro.sistolica} mmHg
                  </Text>
                </View>
              </View>

              <View style={styles.info}>
                <Ionicons
                  name="pulse-outline"
                  size={20}
                  color={C.verdeEscuro}
                />
                <View style={styles.infoConteudo}>
                  <Text style={styles.rotulo}>
                    Pressão diastólica
                  </Text>
                  <Text style={styles.infoValor}>
                    {registro.diastolica} mmHg
                  </Text>
                </View>
              </View>

              <View style={styles.info}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={C.verdeEscuro}
                />
                <View style={styles.infoConteudo}>
                  <Text style={styles.rotulo}>Data</Text>
                  <Text style={styles.infoValor}>
                    {formatarData()}
                  </Text>
                </View>
              </View>

              <View style={styles.info}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={C.verdeEscuro}
                />
                <View style={styles.infoConteudo}>
                  <Text style={styles.rotulo}>Horário</Text>
                  <Text style={styles.infoValor}>
                    {formatarHorario()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.observacaoCard}>
              <Text style={styles.secaoTitulo}>
                Observações
              </Text>

              <Text style={styles.observacao}>
                {registro.observacao?.trim() ||
                  'Nenhuma observação cadastrada.'}
              </Text>
            </View>

            <Text style={styles.aviso}>
              Esta aferição é destinada ao acompanhamento
              pessoal e não representa um diagnóstico.
            </Text>

            <Pressable
              style={styles.botaoEditar}
              onPress={editar}
              disabled={excluindo}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.botaoEditarTexto}>
                Editar aferição
              </Text>
            </Pressable>

            <Pressable
              style={styles.botaoExcluir}
              onPress={confirmarExclusao}
              disabled={excluindo}
            >
              {excluindo ? (
                <ActivityIndicator
                  color={C.vermelho}
                />
              ) : (
                <>
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={C.vermelho}
                  />
                  <Text style={styles.botaoExcluirTexto}>
                    Excluir aferição
                  </Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.fundo,
  },
  content: {
    padding: 16,
    paddingBottom: 45,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  voltar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
  },
  voltarTexto: {
    fontSize: 18,
    fontWeight: '700',
    color: C.texto,
  },
  centro: {
    minHeight: 250,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  auxiliar: {
    color: C.secundario,
  },
  card: {
    backgroundColor: C.branco,
    padding: 18,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.borda,
    marginBottom: 12,
  },
  destaque: {
    backgroundColor: C.verde,
    padding: 20,
    borderRadius: 20,
    marginBottom: 14,
  },
  destaqueTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconeDestaque: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destaqueTitulo: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  valorLinha: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 22,
  },
  valor: {
    color: '#FFFFFF',
    fontSize: 39,
    fontWeight: '800',
  },
  unidade: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  destaqueDescricao: {
    color: '#E5F7F3',
    fontSize: 12,
    marginTop: 6,
  },
  secaoTitulo: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 15,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 19,
  },
  infoConteudo: {
    flex: 1,
  },
  rotulo: {
    color: C.secundario,
    fontSize: 12,
    marginBottom: 3,
  },
  infoValor: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '600',
  },
  observacaoCard: {
    padding: 18,
    backgroundColor: C.verdeClaro,
    borderRadius: 17,
    marginBottom: 14,
  },
  observacao: {
    color: C.texto,
    fontSize: 14,
    lineHeight: 21,
  },
  aviso: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 22,
  },
  botaoEditar: {
    backgroundColor: C.verde,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  botaoEditarTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  botaoExcluir: {
    backgroundColor: C.vermelhoClaro,
    borderColor: '#F5BCC3',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  botaoExcluirTexto: {
    color: C.vermelho,
    fontSize: 15,
    fontWeight: '700',
  },
  erro: {
    color: C.vermelho,
    fontSize: 14,
  },
  tentarNovamente: {
    color: C.verdeEscuro,
    fontWeight: '700',
    marginTop: 12,
  },
});
