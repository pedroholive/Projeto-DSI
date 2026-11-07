
import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  listarAlertasMedico,
  type AlertaMedico,
  type GravidadeAlerta,
} from '../services/alertasService';

const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  primarySoft: '#E8F2F0',
  text: '#333E3C',
  muted: '#7B8F8B',
  border: '#E0EAE8',
  danger: '#D94B57',
  dangerSoft: '#FDE8EA',
  warning: '#B7791F',
  warningSoft: '#FFF3D6',
};

function obterParametro(
  valor: string | string[] | undefined
): string {
  return Array.isArray(valor)
    ? valor[0] ?? ''
    : valor ?? '';
}

function configurarGravidade(
  gravidade: GravidadeAlerta
) {
  if (gravidade === 'critico') {
    return {
      nome: 'Crítico',
      cor: C.danger,
      fundo: C.dangerSoft,
      icone: 'alert-circle-outline' as const,
    };
  }

  if (gravidade === 'alto') {
    return {
      nome: 'Alto',
      cor: C.warning,
      fundo: C.warningSoft,
      icone: 'warning-outline' as const,
    };
  }

  return {
    nome: 'Atenção',
    cor: C.primary,
    fundo: C.primarySoft,
    icone: 'information-circle-outline' as const,
  };
}

function formatarData(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return 'Data indisponível';
  }

  return new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function obterMensagemErro(erro: unknown): string {
  if (
    typeof erro === 'object' &&
    erro !== null &&
    'code' in erro &&
    String(erro.code).includes('permission-denied')
  ) {
    return 'Não foi possível consultar os dados. Confira se o vínculo com o paciente continua ativo.';
  }

  return erro instanceof Error
    ? erro.message
    : 'Não foi possível carregar os detalhes do alerta.';
}

export default function DetalhesAlertaMedicoScreen() {
  const router = useRouter();

  const parametros = useLocalSearchParams<{
    alertaId?: string;
    pacienteId?: string;
  }>();

  const alertaId = obterParametro(
    parametros.alertaId
  );

  const pacienteId = obterParametro(
    parametros.pacienteId
  );

  const [alerta, setAlerta] =
    useState<AlertaMedico | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] = useState('');

  const [recarregar, setRecarregar] =
    useState(0);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregar() {
        setCarregando(true);
        setErro('');
        setAlerta(null);

        if (!alertaId || !pacienteId) {
          setErro('Identificação do alerta inválida.');
          setCarregando(false);
          return;
        }

        try {
          const alertas = await listarAlertasMedico();

          if (!ativo) {
            return;
          }

          const encontrado = alertas.find(
            (item) =>
              item.id === alertaId &&
              item.pacienteId === pacienteId
          );

          if (!encontrado) {
            setErro(
              'Este alerta não está mais disponível. A medição pode ter sido atualizada, o alerta pode ter expirado ou o vínculo com o paciente pode não estar mais ativo.'
            );
            return;
          }

          setAlerta(encontrado);
        } catch (error) {
          if (ativo) {
            setErro(obterMensagemErro(error));
          }
        } finally {
          if (ativo) {
            setCarregando(false);
          }
        }
      }

      void carregar();

      return () => {
        ativo = false;
      };
    }, [alertaId, pacienteId, recarregar])
  );

  const configuracao = alerta
    ? configurarGravidade(alerta.gravidade)
    : null;

  const nomeIndicador =
    alerta?.tipo === 'glicemia'
      ? 'Glicemia'
      : 'Pressão arterial';

  const iconeIndicador =
    alerta?.tipo === 'glicemia'
      ? 'water-outline'
      : 'heart-outline';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.voltar}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar aos alertas"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={C.primary}
          />

          <Text style={styles.voltarTexto}>
            Voltar aos alertas
          </Text>
        </Pressable>

        <View style={styles.cabecalho}>
          <View style={styles.iconeCabecalho}>
            <Ionicons
              name="document-text-outline"
              size={26}
              color={C.primary}
            />
          </View>

          <View style={styles.cabecalhoTexto}>
            <Text style={styles.titulo}>
              Detalhes do alerta
            </Text>

            <Text style={styles.subtitulo}>
              Acompanhamento do paciente
            </Text>
          </View>
        </View>

        {carregando ? (
          <View style={styles.estado}>
            <ActivityIndicator
              size="large"
              color={C.primary}
            />

            <Text style={styles.estadoTexto}>
              Consultando dados atualizados...
            </Text>
          </View>
        ) : erro || !alerta || !configuracao ? (
          <View style={styles.estado}>
            <Ionicons
              name="alert-circle-outline"
              size={44}
              color={C.warning}
            />

            <Text style={styles.estadoTitulo}>
              Alerta indisponível
            </Text>

            <Text style={styles.estadoTexto}>
              {erro ||
                'Não foi possível localizar este alerta.'}
            </Text>

            <Pressable
              style={styles.botao}
              onPress={() =>
                setRecarregar((valor) => valor + 1)
              }
              accessibilityRole="button"
            >
              <Text style={styles.botaoTexto}>
                Tentar novamente
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.pacienteCard}>
              <View style={styles.pacienteAvatar}>
                <Ionicons
                  name="person-outline"
                  size={29}
                  color={C.primary}
                />
              </View>

              <Text style={styles.rotulo}>
                Paciente vinculado
              </Text>

              <Text style={styles.nomePaciente}>
                {alerta.pacienteNome}
              </Text>

              <View style={styles.vinculoRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={C.primary}
                />

                <Text style={styles.vinculoTexto}>
                  Vínculo ativo no momento da consulta
                </Text>
              </View>
            </View>

            <View style={styles.medicaoCard}>
              <View style={styles.medicaoTopo}>
                <View style={styles.indicadorRow}>
                  <Ionicons
                    name={iconeIndicador}
                    size={20}
                    color={C.primary}
                  />

                  <Text style={styles.indicadorTexto}>
                    {nomeIndicador}
                  </Text>
                </View>

                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        configuracao.fundo,
                    },
                  ]}
                >
                  <Ionicons
                    name={configuracao.icone}
                    size={15}
                    color={configuracao.cor}
                  />

                  <Text
                    style={[
                      styles.badgeTexto,
                      { color: configuracao.cor },
                    ]}
                  >
                    {configuracao.nome}
                  </Text>
                </View>
              </View>

              <View style={styles.divisor} />

              <Text style={styles.medicaoTitulo}>
                {alerta.titulo}
              </Text>

              <Text
                style={[
                  styles.medicaoValor,
                  { color: configuracao.cor },
                ]}
              >
                {alerta.valor}
              </Text>

              <View style={styles.dataRow}>
                <Ionicons
                  name="time-outline"
                  size={17}
                  color={C.muted}
                />

                <Text style={styles.dataTexto}>
                  {formatarData(alerta.dataMedicao)}
                </Text>
              </View>

              {alerta.contexto ? (
                <View style={styles.contexto}>
                  <Text style={styles.contextoRotulo}>
                    Contexto da medição
                  </Text>

                  <Text style={styles.contextoValor}>
                    {alerta.contexto}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.orientacaoCard}>
              <View style={styles.orientacaoTituloRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={C.primary}
                />

                <Text style={styles.orientacaoTitulo}>
                  Informações para avaliação
                </Text>
              </View>

              <Text style={styles.orientacaoTexto}>
                {alerta.descricao}
              </Text>
            </View>

            <View style={styles.avisoCard}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={C.primary}
              />

              <Text style={styles.avisoTexto}>
                Este alerta é baseado em valores de
                referência e nas medições registradas.
                Não representa diagnóstico, prescrição
                ou substituição da avaliação clínica
                realizada pelo profissional.
              </Text>
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
    paddingBottom: 45,
  },
  voltar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  voltarTexto: {
    color: C.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 22,
  },
  iconeCabecalho: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cabecalhoTexto: {
    flex: 1,
  },
  titulo: {
    fontSize: 25,
    fontWeight: '800',
    color: C.text,
  },
  subtitulo: {
    fontSize: 13,
    color: C.muted,
    marginTop: 4,
  },
  estado: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    gap: 16,
  },
  estadoTitulo: {
    color: C.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  estadoTexto: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  botao: {
    backgroundColor: C.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  botaoTexto: {
    color: C.card,
    fontWeight: '700',
    fontSize: 13,
  },
  pacienteCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 15,
  },
  pacienteAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rotulo: {
    color: C.muted,
    fontSize: 12,
  },
  nomePaciente: {
    color: C.text,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 5,
  },
  vinculoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  vinculoTexto: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  medicaoCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 15,
  },
  medicaoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  indicadorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicadorTexto: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeTexto: {
    fontSize: 12,
    fontWeight: '800',
  },
  divisor: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 20,
  },
  medicaoTitulo: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
  },
  medicaoValor: {
    fontSize: 36,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 15,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataTexto: {
    color: C.muted,
    fontSize: 13,
  },
  contexto: {
    backgroundColor: C.background,
    borderRadius: 12,
    padding: 13,
    marginTop: 18,
    gap: 5,
  },
  contextoRotulo: {
    color: C.muted,
    fontSize: 11,
  },
  contextoValor: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
  orientacaoCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 20,
    marginBottom: 15,
  },
  orientacaoTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 13,
  },
  orientacaoTitulo: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
  },
  orientacaoTexto: {
    color: C.text,
    fontSize: 14,
    lineHeight: 22,
  },
  avisoCard: {
    backgroundColor: C.primarySoft,
    borderRadius: 15,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  avisoTexto: {
    flex: 1,
    color: C.primary,
    fontSize: 12,
    lineHeight: 20,
  },
});
