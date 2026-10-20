
import { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  gerarCodigoVinculo,
  listarVinculosPaciente,
  responderVinculo,
  revogarVinculo,
  type Vinculo,
} from '@/services/vinculosService';

export default function MeusMedicosScreen() {
  const router = useRouter();

  const [codigo, setCodigo] = useState<string | null>(null);
  const [expiraEm, setExpiraEm] = useState<number | null>(null);
  const [gerando, setGerando] = useState(false);

  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [respondendoId, setRespondendoId] = useState<string | null>(null);
  const [revogandoId, setRevogandoId] = useState<string | null>(null);

  const carregarVinculos = useCallback(async () => {
    try {
      const resultado = await listarVinculosPaciente();
      setVinculos(resultado);
    } catch (erro) {
      console.error('Erro ao listar vínculos:', erro);
      Alert.alert('Erro', 'Não foi possível carregar seus vínculos.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarVinculos();
  }, [carregarVinculos]);

  async function handleGerarCodigo() {
    if (gerando) return;

    setGerando(true);

    try {
      const resultado = await gerarCodigoVinculo();

      setCodigo(resultado.codigo);
      setExpiraEm(resultado.expiraEm);
    } catch (erro: any) {
      console.error('Erro ao gerar código:', erro);
      console.error('Código do erro:', erro?.code);
      console.error('Mensagem do erro:', erro?.message);

      Alert.alert(
        'Erro ao gerar código',
        `Código: ${erro?.code ?? 'desconhecido'}\nMensagem: ${
          erro?.message ?? 'Erro desconhecido'
        }`
      );
    } finally {
      setGerando(false);
    }
  }

  async function handleResponder(
    vinculoId: string,
    aceitar: boolean
  ) {
    if (respondendoId || revogandoId) return;

    setRespondendoId(vinculoId);

    try {
      await responderVinculo(vinculoId, aceitar);
      await carregarVinculos();

      Alert.alert(
        'Solicitação atualizada',
        aceitar
          ? 'O vínculo com o médico foi aceito.'
          : 'A solicitação foi recusada.'
      );
    } catch (erro) {
      console.error('Erro ao responder vínculo:', erro);
      Alert.alert(
        'Erro',
        'Não foi possível responder à solicitação.'
      );
    } finally {
      setRespondendoId(null);
    }
  }

  async function executarRevogacao(vinculoId: string) {
    if (revogandoId || respondendoId) return;

    setRevogandoId(vinculoId);

    try {
      await revogarVinculo(vinculoId);
      await carregarVinculos();

      Alert.alert(
        'Vínculo revogado',
        'O médico não possui mais autorização para acessar seus dados de saúde.'
      );
    } catch (erro: any) {
      console.error('Erro ao revogar vínculo:', erro);

      Alert.alert(
        'Erro ao desvincular médico',
        erro?.message ??
          'Não foi possível revogar o vínculo. Tente novamente.'
      );
    } finally {
      setRevogandoId(null);
    }
  }

  function confirmarRevogacao(vinculoId: string) {
    // Na versão Web, Alert.alert pode não exibir
    // botões de confirmação em alguns navegadores.
    if (typeof window !== 'undefined' && window.confirm) {
      const confirmou = window.confirm(
        'Deseja desvincular este médico?\n\nEle perderá a autorização para acessar seus dados de saúde.'
      );

      if (confirmou) {
        executarRevogacao(vinculoId);
      }

      return;
    }

    Alert.alert(
      'Desvincular médico',
      'Deseja realmente remover a autorização deste médico para acessar seus dados de saúde?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: () => executarRevogacao(vinculoId),
        },
      ]
    );
  }

  const pendentes = vinculos.filter(
    (vinculo) => vinculo.status === 'pendente'
  );

  const ativos = vinculos.filter(
    (vinculo) => vinculo.status === 'ativo'
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.conteudo}
    >
      <Pressable
        style={styles.voltar}
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back"
          size={24}
          color="#273331"
        />
        <Text style={styles.voltarTexto}>Voltar</Text>
      </Pressable>

      <Text style={styles.titulo}>Meus médicos</Text>

      <Text style={styles.descricao}>
        Gerencie seus vínculos com profissionais de saúde.
      </Text>

      {/* CÓDIGO DE VÍNCULO */}

      <View style={styles.card}>
        <View style={styles.cardCabecalho}>
          <Ionicons
            name="shield-checkmark-outline"
            size={24}
            color="#0E766D"
          />

          <Text style={styles.cardTitulo}>
            Código de vínculo
          </Text>
        </View>

        <Text style={styles.cardDescricao}>
          Gere um código temporário e compartilhe com seu médico.
          Ele poderá solicitar um vínculo com sua conta.
        </Text>

        <View style={styles.codigoContainer}>
          <Text selectable style={styles.codigoTexto}>
            {codigo ?? 'Nenhum código gerado'}
          </Text>
        </View>

        {expiraEm !== null && (
          <Text style={styles.validade}>
            Validade: {new Date(expiraEm).toLocaleTimeString('pt-BR')}
          </Text>
        )}

        <Pressable
          style={[
            styles.botaoPrincipal,
            gerando && styles.botaoDesabilitado,
          ]}
          onPress={handleGerarCodigo}
          disabled={gerando}
        >
          {gerando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.botaoPrincipalTexto}>
              Gerar código de vínculo
            </Text>
          )}
        </Pressable>

        <Text style={styles.aviso}>
          O código expira em 10 minutos e pode ser utilizado
          apenas uma vez.
        </Text>
      </View>

      {/* SOLICITAÇÕES PENDENTES */}

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>
          Solicitações pendentes
        </Text>

        {carregando ? (
          <ActivityIndicator
            color="#0E766D"
            style={styles.loading}
          />
        ) : pendentes.length === 0 ? (
          <Text style={styles.cardDescricao}>
            Você não possui solicitações pendentes.
          </Text>
        ) : (
          pendentes.map((vinculo) => (
            <View key={vinculo.id} style={styles.vinculo}>
              <Text style={styles.vinculoTitulo}>
                Solicitação de profissional
              </Text>

              <Text style={styles.vinculoDescricao}>
                Identificador: {vinculo.profissionalId}
              </Text>

              <View style={styles.acoes}>
                <Pressable
                  style={[
                    styles.botaoAceitar,
                    respondendoId !== null &&
                      styles.botaoDesabilitado,
                  ]}
                  disabled={
                    respondendoId !== null ||
                    revogandoId !== null
                  }
                  onPress={() => {
                    if (vinculo.id) {
                      handleResponder(vinculo.id, true);
                    }
                  }}
                >
                  {respondendoId === vinculo.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.botaoAcaoTexto}>
                      Aceitar
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.botaoRecusar}
                  disabled={
                    respondendoId !== null ||
                    revogandoId !== null
                  }
                  onPress={() => {
                    if (vinculo.id) {
                      handleResponder(vinculo.id, false);
                    }
                  }}
                >
                  <Text style={styles.botaoRecusarTexto}>
                    Recusar
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      {/* VÍNCULOS ATIVOS */}

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>
          Vínculos ativos
        </Text>

        {carregando ? (
          <ActivityIndicator
            color="#0E766D"
            style={styles.loading}
          />
        ) : ativos.length === 0 ? (
          <Text style={styles.cardDescricao}>
            Você ainda não possui médicos vinculados.
          </Text>
        ) : (
          ativos.map((vinculo) => (
            <View key={vinculo.id} style={styles.vinculo}>
              <Text style={styles.vinculoTitulo}>
                Médico vinculado
              </Text>

              <Text style={styles.vinculoDescricao}>
                Identificador: {vinculo.profissionalId}
              </Text>

              <View style={styles.statusContainer}>
                <Ionicons
                  name="checkmark-circle"
                  size={17}
                  color="#0E766D"
                />
                <Text style={styles.statusAtivo}>
                  Vínculo ativo
                </Text>
              </View>

              <Pressable
                style={[
                  styles.botaoDesvincular,
                  revogandoId === vinculo.id &&
                    styles.botaoDesabilitado,
                ]}
                disabled={
                  revogandoId !== null ||
                  respondendoId !== null
                }
                onPress={() => {
                  if (vinculo.id) {
                    confirmarRevogacao(vinculo.id);
                  }
                }}
              >
                {revogandoId === vinculo.id ? (
                  <ActivityIndicator color="#B91C1C" />
                ) : (
                  <>
                    <Ionicons
                      name="unlink-outline"
                      size={18}
                      color="#B91C1C"
                    />
                    <Text style={styles.botaoDesvincularTexto}>
                      Desvincular médico
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* ATUALIZAR */}

      <Pressable
        style={styles.atualizar}
        onPress={() => {
          setCarregando(true);
          carregarVinculos();
        }}
      >
        <Ionicons
          name="refresh-outline"
          size={18}
          color="#0E766D"
        />
        <Text style={styles.atualizarTexto}>
          Atualizar solicitações
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8F7',
  },

  conteudo: {
    padding: 20,
    paddingBottom: 40,
  },

  voltar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },

  voltarTexto: {
    fontSize: 15,
    color: '#273331',
  },

  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#273331',
  },

  descricao: {
    fontSize: 14,
    color: '#7E8D89',
    marginTop: 6,
    marginBottom: 24,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6EEEB',
  },

  cardCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  cardTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#273331',
    marginBottom: 8,
  },

  cardDescricao: {
    fontSize: 14,
    color: '#7E8D89',
    lineHeight: 21,
    marginBottom: 12,
  },

  codigoContainer: {
    backgroundColor: '#F4F8F7',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginVertical: 12,
  },

  codigoTexto: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0E766D',
    letterSpacing: 2,
    textAlign: 'center',
  },

  validade: {
    fontSize: 13,
    color: '#7E8D89',
    textAlign: 'center',
    marginBottom: 12,
  },

  botaoPrincipal: {
    backgroundColor: '#0E766D',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
  },

  botaoDesabilitado: {
    opacity: 0.6,
  },

  botaoPrincipalTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  aviso: {
    fontSize: 12,
    color: '#7E8D89',
    marginTop: 12,
    lineHeight: 18,
  },

  loading: {
    marginVertical: 16,
  },

  vinculo: {
    borderTopWidth: 1,
    borderTopColor: '#E6EEEB',
    paddingVertical: 14,
  },

  vinculoTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#273331',
  },

  vinculoDescricao: {
    fontSize: 12,
    color: '#7E8D89',
    marginTop: 5,
  },

  acoes: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  botaoAceitar: {
    flex: 1,
    backgroundColor: '#0E766D',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },

  botaoRecusar: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4DEDA',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },

  botaoAcaoTexto: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  botaoRecusarTexto: {
    color: '#273331',
    fontWeight: '600',
  },

  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },

  statusAtivo: {
    color: '#0E766D',
    fontWeight: '600',
  },

  botaoDesvincular: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 13,
    marginTop: 16,
  },

  botaoDesvincularTexto: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 14,
  },

  atualizar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },

  atualizarTexto: {
    color: '#0E766D',
    fontWeight: '600',
  },
});
