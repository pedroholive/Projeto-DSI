
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

import { auth } from '@/firebaseConfig';
import {
  buscarGlicemiaPorId,
  excluirGlicemia,
} from '@/services/glicemiaService';
import type { Glicemia } from '@/services/glicemiaService';

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

export default function DetalhesGlicoseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [registro, setRegistro] = useState<Glicemia | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      const usuario = auth.currentUser;

      if (!usuario || !id || typeof id !== 'string') {
        throw new Error('Medição ou usuário não identificado.');
      }

      const resultado = await buscarGlicemiaPorId(id, usuario.uid);

      if (!resultado) {
        throw new Error('Medição não encontrada.');
      }

      setRegistro(resultado);
    } catch (error) {
      setRegistro(null);
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar a medição.'
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

  async function executarExclusao() {
    if (!id || excluindo) return;

    const usuario = auth.currentUser;

    if (!usuario) {
      Alert.alert('Erro', 'Você precisa estar autenticado.');
      return;
    }

    setExcluindo(true);

    try {
      await excluirGlicemia(id, usuario.uid);

      router.replace('/(tabs)/glicose');
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir a medição.';

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
        'Excluir medição?\n\nEsta ação não pode ser desfeita.'
      );

      if (confirmou) {
        void executarExclusao();
      }

      return;
    }

    Alert.alert(
      'Excluir medição?',
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

  function editar() {
    if (!id) return;

    router.push({
      pathname: '/editar-glicose',
      params: { id },
    });
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
            Detalhes da medição
          </Text>
        </Pressable>

        {carregando ? (
          <View style={styles.centro}>
            <ActivityIndicator
              color={C.verde}
              size="large"
            />
            <Text style={styles.auxiliar}>
              Carregando medição...
            </Text>
          </View>
        ) : erro || !registro ? (
          <View style={styles.card}>
            <Ionicons
              name="alert-circle-outline"
              size={28}
              color={C.vermelho}
            />
            <Text style={styles.erro}>
              {erro || 'Medição indisponível.'}
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
                    name="water-outline"
                    size={25}
                    color={C.verde}
                  />
                </View>

                <Text style={styles.destaqueTitulo}>
                  Registro de glicemia
                </Text>
              </View>

              <View style={styles.valorLinha}>
                <Text style={styles.valor}>
                  {registro.valor}
                </Text>

                <Text style={styles.unidade}>
                  mg/dL
                </Text>
              </View>

              <Text style={styles.destaqueDescricao}>
                Medição registrada no seu histórico
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.secaoTitulo}>
                Informações da medição
              </Text>

              <View style={styles.info}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={C.verdeEscuro}
                />
                <View style={styles.infoConteudo}>
                  <Text style={styles.rotulo}>Data</Text>
                  <Text style={styles.infoValor}>
                    {registro.data}
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
                    {registro.horario}
                  </Text>
                </View>
              </View>

              <View style={styles.info}>
                <Ionicons
                  name="restaurant-outline"
                  size={20}
                  color={C.verdeEscuro}
                />
                <View style={styles.infoConteudo}>
                  <Text style={styles.rotulo}>
                    Contexto da medição
                  </Text>
                  <Text style={styles.infoValor}>
                    {registro.contexto}
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
              Este registro é destinado ao acompanhamento
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
                Editar medição
              </Text>
            </Pressable>

            <Pressable
              style={styles.botaoExcluir}
              onPress={confirmarExclusao}
              disabled={excluindo}
            >
              {excluindo ? (
                <ActivityIndicator color={C.vermelho} />
              ) : (
                <>
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={C.vermelho}
                  />
                  <Text style={styles.botaoExcluirTexto}>
                    Excluir medição
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
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 20,
    padding: 20,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  destaqueTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  valorLinha: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    marginTop: 22,
  },
  valor: {
    fontSize: 43,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  unidade: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  destaqueDescricao: {
    fontSize: 12,
    color: '#E5F7F3',
    marginTop: 5,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: C.texto,
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
    fontSize: 12,
    color: C.secundario,
    marginBottom: 3,
  },
  infoValor: {
    fontSize: 15,
    fontWeight: '600',
    color: C.texto,
  },
  observacaoCard: {
    padding: 18,
    backgroundColor: C.verdeClaro,
    borderRadius: 17,
    marginBottom: 14,
  },
  observacao: {
    fontSize: 14,
    color: C.texto,
    lineHeight: 21,
  },
  aviso: {
    fontSize: 12,
    lineHeight: 18,
    color: C.secundario,
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
    fontWeight: '700',
    fontSize: 15,
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
    marginTop: 10,
    color: C.vermelho,
    fontSize: 14,
  },
  tentarNovamente: {
    marginTop: 14,
    color: C.verdeEscuro,
    fontWeight: '700',
  },
});
