
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  solicitarVinculoPorCodigo,
  listarVinculosProfissional,
  type Vinculo,
} from '@/services/vinculosService';

// Cores do HealthSync
const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
  warning: '#B7791F',
  danger: '#D94B57',
};

export default function MeusPacientesScreen() {
  const router = useRouter();

  // Estados da solicitação
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  // Estados da listagem
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroListagem, setErroListagem] = useState('');

  // Validação do código hexadecimal de 12 caracteres
  const codigoValido = /^[A-F0-9]{12}$/.test(codigo);

  // Busca os vínculos ao abrir ou retornar à tela
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregarVinculos() {
        setCarregando(true);
        setErroListagem('');

        try {
          const dados = await listarVinculosProfissional();

          if (ativo) {
            setVinculos(dados);
          }
        } catch (error: unknown) {
            console.error('Erro ao listar vínculos:', error);

            const mensagemErro =
                error instanceof Error
                ? error.message
                : String(error);

            if (ativo) {
                setVinculos([]);
                setErroListagem(`Erro ao carregar pacientes: ${mensagemErro}`);
            }
            
        } finally {
          if (ativo) {
            setCarregando(false);
          }
        }
      }

      carregarVinculos();

      return () => {
        ativo = false;
      };
    }, [])
  );

  // Separa os vínculos pelo status
  const vinculosPendentes = vinculos.filter(
    (vinculo) => vinculo.status === 'pendente'
  );

  const vinculosAtivos = vinculos.filter(
    (vinculo) => vinculo.status === 'ativo'
  );

  // Envia a solicitação de vínculo
  async function solicitarVinculo() {
    if (!codigoValido || enviando) {
      return;
    }

    Keyboard.dismiss();
    setEnviando(true);
    setMensagem('');

    try {
      await solicitarVinculoPorCodigo(codigo);

      // Atualiza a lista após enviar a solicitação
      try {
        const dadosAtualizados =
          await listarVinculosProfissional();

        setVinculos(dadosAtualizados);
        setErroListagem('');
      } catch (error) {
        console.error(
          'Erro ao atualizar vínculos:',
          error
        );

        setErroListagem(
          'Solicitação enviada, mas não foi possível atualizar a lista.'
        );
      }

      setCodigo('');

      setMensagem(
        'Solicitação enviada! Aguarde a autorização do paciente.'
      );

      if (Platform.OS !== 'web') {
        Alert.alert(
          'Solicitação enviada',
          'O paciente poderá aceitar ou recusar o vínculo.'
        );
      }
    } catch (error: unknown) {
      console.error('Erro ao solicitar vínculo:', error);

      const mensagemErro =
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar a solicitação.';

      if (Platform.OS === 'web') {
        setMensagem(`Erro: ${mensagemErro}`);
      } else {
        Alert.alert(
          'Erro na solicitação',
          mensagemErro
        );
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Botão voltar */}
        <Pressable
          style={styles.voltar}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={C.primary}
          />

          <Text style={styles.voltarTexto}>
            Voltar
          </Text>
        </Pressable>

        {/* Cabeçalho */}
        <Text style={styles.titulo}>
          Meus Pacientes
        </Text>

        <Text style={styles.subtitulo}>
          Gerencie suas solicitações de acompanhamento.
        </Text>

        {/* Solicitação de vínculo */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons
              name="link-outline"
              size={24}
              color={C.primary}
            />

            <Text style={styles.cardTitulo}>
              Solicitar vínculo
            </Text>
          </View>

          <Text style={styles.descricao}>
            Solicite ao paciente o código de vínculo
            gerado no aplicativo HealthSync.
          </Text>

          <Text style={styles.label}>
            Código do paciente
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ex.: A1B2C3D4E5F6"
            placeholderTextColor={C.muted}
            value={codigo}
            onChangeText={(texto) =>
              setCodigo(
                texto
                  .toUpperCase()
                  .replace(/[^A-F0-9]/g, '')
                  .slice(0, 12)
              )
            }
            maxLength={12}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!enviando}
          />

          <Text style={styles.ajuda}>
            O código possui 12 caracteres e expira
            após 10 minutos.
          </Text>

          <Pressable
            style={[
              styles.botao,
              (!codigoValido || enviando) &&
                styles.botaoDesabilitado,
            ]}
            onPress={solicitarVinculo}
            disabled={!codigoValido || enviando}
          >
            {enviando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.botaoTexto}>
                Enviar solicitação
              </Text>
            )}
          </Pressable>

          {mensagem !== '' && (
            <Text
              style={[
                styles.mensagem,
                mensagem.startsWith('Erro:') &&
                  styles.mensagemErro,
              ]}
            >
              {mensagem}
            </Text>
          )}
        </View>

        {/* Listagem de vínculos */}
        {carregando ? (
          <View style={styles.carregamento}>
            <ActivityIndicator
              size="large"
              color={C.primary}
            />

            <Text style={styles.descricao}>
              Carregando pacientes...
            </Text>
          </View>
        ) : (
          <>
            {/* Erro ao carregar a listagem */}
            {erroListagem !== '' && (
              <Text style={styles.mensagemErro}>
                {erroListagem}
              </Text>
            )}

            {/* Solicitações pendentes */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name="time-outline"
                  size={23}
                  color={C.warning}
                />

                <Text style={styles.cardTitulo}>
                  Solicitações pendentes
                  {' '}({vinculosPendentes.length})
                </Text>
              </View>

              {vinculosPendentes.length === 0 ? (
                <Text style={styles.descricao}>
                  Nenhuma solicitação pendente.
                </Text>
              ) : (
                vinculosPendentes.map((vinculo) => (
                  <View
                    key={vinculo.id}
                    style={styles.itemVinculo}
                  >
                    <Ionicons
                      name="person-outline"
                      size={27}
                      color={C.warning}
                    />

                    <View style={styles.itemInformacoes}>
                      <Text style={styles.itemTitulo}>
                        Paciente:{' '}
                        {vinculo.pacienteId.slice(0, 8)}...
                      </Text>

                      <Text style={styles.itemStatus}>
                        Aguardando autorização
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Pacientes vinculados */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name="people-outline"
                  size={24}
                  color={C.primary}
                />

                <Text style={styles.cardTitulo}>
                  Pacientes vinculados
                  {' '}({vinculosAtivos.length})
                </Text>
              </View>

              {vinculosAtivos.length === 0 ? (
                <Text style={styles.descricao}>
                  Você ainda não possui pacientes vinculados.
                </Text>
              ) : (
                vinculosAtivos.map((vinculo) => (
                  <View
                    key={vinculo.id}
                    style={styles.itemVinculo}
                  >
                    <Ionicons
                      name="person-circle-outline"
                      size={32}
                      color={C.primary}
                    />

                    <View style={styles.itemInformacoes}>
                      <Text style={styles.itemTitulo}>
                        Paciente:{' '}
                        {vinculo.pacienteId.slice(0, 8)}...
                      </Text>

                      <Text style={styles.itemStatusAtivo}>
                        Vínculo ativo
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  voltar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },

  voltarTexto: {
    color: C.primary,
    fontSize: 16,
    fontWeight: '600',
  },

  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: C.text,
  },

  subtitulo: {
    fontSize: 15,
    color: C.muted,
    marginTop: 8,
    marginBottom: 24,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },

  cardTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    flexShrink: 1,
  },

  descricao: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 16,
  },

  label: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 17,
    letterSpacing: 2,
    color: C.text,
    backgroundColor: C.background,
  },

  ajuda: {
    color: C.muted,
    fontSize: 12,
    marginTop: 10,
    marginBottom: 20,
  },

  botao: {
    backgroundColor: C.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  botaoDesabilitado: {
    opacity: 0.5,
  },

  botaoTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  mensagem: {
    color: C.primary,
    fontSize: 14,
    marginTop: 16,
    lineHeight: 20,
  },

  mensagemErro: {
    color: C.danger,
    fontSize: 14,
    marginBottom: 16,
  },

  carregamento: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },

  itemVinculo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },

  itemInformacoes: {
    flex: 1,
  },

  itemTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },

  itemStatus: {
    fontSize: 13,
    color: C.warning,
    marginTop: 4,
  },

  itemStatusAtivo: {
    fontSize: 13,
    color: C.primary,
    marginTop: 4,
  },
});
