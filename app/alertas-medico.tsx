
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '../firebaseConfig';

import {
  listarAlertasMedico,
  type AlertaMedico,
  type GravidadeAlerta,
} from '../services/alertasService';

import {
  marcarAlertasComoVisualizados,
} from '../services/alertasVisualizadosService';

const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  primarySoft: '#E8F2F0',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
  danger: '#D94B57',
  dangerSoft: '#FDE8EA',
  warning: '#B7791F',
  warningSoft: '#FFF3D6',
};

function nomeGravidade(
  gravidade: GravidadeAlerta
): string {
  switch (gravidade) {
    case 'critico':
      return 'Crítico';
    case 'alto':
      return 'Alto';
    case 'atencao':
      return 'Atenção';
  }
}

function corGravidade(
  gravidade: GravidadeAlerta
): string {
  switch (gravidade) {
    case 'critico':
      return C.danger;
    case 'alto':
      return C.warning;
    case 'atencao':
      return C.primary;
  }
}

function fundoGravidade(
  gravidade: GravidadeAlerta
): string {
  switch (gravidade) {
    case 'critico':
      return C.dangerSoft;
    case 'alto':
      return C.warningSoft;
    case 'atencao':
      return C.primarySoft;
  }
}

function formatarData(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return 'Data indisponível';
  }

  return new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mensagemErro(error: unknown): string {
  const codigo =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? String(error.code)
      : '';

  if (codigo.includes('permission-denied')) {
    return 'Não foi possível acessar todas as medições. Verifique as permissões do médico e os vínculos ativos.';
  }

  if (codigo.includes('unauthenticated')) {
    return 'Sua sessão expirou. Entre novamente no aplicativo.';
  }

  return error instanceof Error
    ? error.message
    : 'Não foi possível carregar os alertas.';
}

function CardAlerta({
  alerta,
  onPress,
}: {
  alerta: AlertaMedico;
  onPress: () => void;
}) {
  const cor = corGravidade(alerta.gravidade);
  const fundo = fundoGravidade(alerta.gravidade);

  const icone =
    alerta.tipo === 'glicemia'
      ? 'water-outline'
      : 'heart-outline';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardAlerta,
        pressed && styles.cardPressionado,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir alerta de ${alerta.tipo} do paciente ${alerta.pacienteNome}. Gravidade: ${nomeGravidade(alerta.gravidade)}.`}
      accessibilityHint="Abre os detalhes da medição do paciente"
    >
      <View style={styles.cardHeader}>
        <View style={styles.pacienteInfo}>
          <View style={styles.avatar}>
            <Ionicons
              name="person-outline"
              size={22}
              color={C.primary}
            />
          </View>

          <View style={styles.pacienteTexto}>
            <Text
              style={styles.pacienteNome}
              numberOfLines={2}
            >
              {alerta.pacienteNome}
            </Text>

            <Text style={styles.pacienteSubtitulo}>
              Paciente vinculado
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.gravidadeBadge,
            { backgroundColor: fundo },
          ]}
        >
          <Text
            style={[
              styles.gravidadeTexto,
              { color: cor },
            ]}
          >
            {nomeGravidade(alerta.gravidade)}
          </Text>
        </View>
      </View>

      <View style={styles.divisor} />

      <View style={styles.tipoRow}>
        <Ionicons
          name={icone}
          size={19}
          color={cor}
        />

        <Text style={styles.tipoTexto}>
          {alerta.tipo === 'glicemia'
            ? 'Glicemia'
            : 'Pressão arterial'}
        </Text>
      </View>

      <Text style={styles.alertaTitulo}>
        {alerta.titulo}
      </Text>

      <Text
        style={[
          styles.alertaValor,
          { color: cor },
        ]}
      >
        {alerta.valor}
      </Text>

      <Text style={styles.alertaDescricao}>
        {alerta.descricao}
      </Text>

      {alerta.contexto ? (
        <View style={styles.contextoArea}>
          <Text style={styles.contextoTexto}>
            Contexto: {alerta.contexto}
          </Text>
        </View>
      ) : null}

      <View style={styles.cardRodape}>
        <View style={styles.dataRow}>
          <Ionicons
            name="time-outline"
            size={15}
            color={C.muted}
          />

          <Text style={styles.dataTexto}>
            {formatarData(alerta.dataMedicao)}
          </Text>
        </View>

        <View style={styles.detalhesRow}>
          <Text style={styles.detalhesTexto}>
            Ver detalhes
          </Text>

          <Ionicons
            name="chevron-forward"
            size={17}
            color={C.primary}
          />
        </View>
      </View>
    </Pressable>
  );
}

export default function AlertasMedicoScreen() {
  const router = useRouter();

  const [alertas, setAlertas] =
    useState<AlertaMedico[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [atualizando, setAtualizando] =
    useState(false);

  const [erro, setErro] = useState('');

  const [avisoVisualizacao, setAvisoVisualizacao] =
    useState('');

  const [versaoAtualizacao, setVersaoAtualizacao] =
    useState(0);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregar() {
        setCarregando(true);
        setErro('');
        setAvisoVisualizacao('');

        try {
          const medicoId = auth.currentUser?.uid;

          if (!medicoId) {
            throw new Error('Médico não autenticado.');
          }

          const resultado = await listarAlertasMedico();

          if (!ativo) {
            return;
          }

          setAlertas(resultado);

          if (resultado.length > 0) {
            try {
              await marcarAlertasComoVisualizados(
                medicoId,
                resultado
              );
            } catch (error) {
              console.error(
                'Erro ao registrar visualização dos alertas:',
                error
              );

              if (ativo) {
                setAvisoVisualizacao(
                  'Os alertas foram carregados, mas não foi possível registrar a visualização neste dispositivo.'
                );
              }
            }
          }
        } catch (error) {
          if (ativo) {
            setErro(mensagemErro(error));
            setAlertas([]);
          }
        } finally {
          if (ativo) {
            setCarregando(false);
            setAtualizando(false);
          }
        }
      }

      void carregar();

      return () => {
        ativo = false;
      };
    }, [versaoAtualizacao])
  );

  const atualizar = useCallback(() => {
    if (carregando || atualizando) {
      return;
    }

    setAtualizando(true);
    setVersaoAtualizacao(
      (atual) => atual + 1
    );
  }, [carregando, atualizando]);

  const tentarNovamente = useCallback(() => {
    setVersaoAtualizacao(
      (atual) => atual + 1
    );
  }, []);

  const abrirAlerta = useCallback(
    (alerta: AlertaMedico) => {
      router.push({
        pathname: '/detalhes-alerta-medico',
        params: {
          alertaId: alerta.id,
          pacienteId: alerta.pacienteId,
        },
      });
    },
    [router]
  );

  const totalCriticos = alertas.filter(
    (alerta) => alerta.gravidade === 'critico'
  ).length;

  const totalAltos = alertas.filter(
    (alerta) => alerta.gravidade === 'alto'
  ).length;

  const totalAtencao = alertas.filter(
    (alerta) => alerta.gravidade === 'atencao'
  ).length;

  const carregamentoInicial =
    carregando && !atualizando;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizar}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        <Pressable
          style={styles.voltar}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
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

        <View style={styles.tituloRow}>
          <View style={styles.tituloIcone}>
            <Ionicons
              name="notifications-outline"
              size={26}
              color={C.primary}
            />
          </View>

          <View style={styles.tituloConteudo}>
            <Text style={styles.titulo}>
              Alertas
            </Text>

            <Text style={styles.subtitulo}>
              Acompanhamento dos pacientes vinculados
            </Text>
          </View>
        </View>

        <View style={styles.avisoCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={C.primary}
          />

          <Text style={styles.avisoTexto}>
            Os alertas utilizam valores de referência
            para auxiliar o acompanhamento profissional.
            Não representam diagnósticos e não
            substituem a avaliação clínica.
          </Text>
        </View>

        {carregamentoInicial ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator
              size="large"
              color={C.primary}
            />

            <Text style={styles.loadingTexto}>
              Analisando as medições dos pacientes...
            </Text>
          </View>
        ) : erro ? (
          <View style={styles.estadoCard}>
            <Ionicons
              name="alert-circle-outline"
              size={42}
              color={C.danger}
            />

            <Text style={styles.estadoTitulo}>
              Não foi possível carregar os alertas
            </Text>

            <Text style={styles.estadoTexto}>
              {erro}
            </Text>

            <Pressable
              style={styles.tentarNovamente}
              onPress={tentarNovamente}
              accessibilityRole="button"
            >
              <Text style={styles.tentarNovamenteTexto}>
                Tentar novamente
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {avisoVisualizacao !== '' && (
              <View style={styles.avisoErro}>
                <Ionicons
                  name="warning-outline"
                  size={19}
                  color={C.warning}
                />

                <Text style={styles.avisoErroTexto}>
                  {avisoVisualizacao}
                </Text>
              </View>
            )}

            <View style={styles.resumoCard}>
              <Text style={styles.resumoLabel}>
                Alertas identificados
              </Text>

              <Text style={styles.resumoTotal}>
                {alertas.length}
              </Text>

              <Text style={styles.resumoDescricao}>
                Medições mais recentes, considerando
                os últimos 30 dias.
              </Text>

              <View style={styles.resumoDivisor} />

              <View style={styles.resumoLinha}>
                <View style={styles.resumoItem}>
                  <Text
                    style={[
                      styles.resumoQuantidade,
                      { color: C.danger },
                    ]}
                  >
                    {totalCriticos}
                  </Text>

                  <Text style={styles.resumoItemLabel}>
                    Críticos
                  </Text>
                </View>

                <View style={styles.resumoItem}>
                  <Text
                    style={[
                      styles.resumoQuantidade,
                      { color: C.warning },
                    ]}
                  >
                    {totalAltos}
                  </Text>

                  <Text style={styles.resumoItemLabel}>
                    Altos
                  </Text>
                </View>

                <View style={styles.resumoItem}>
                  <Text
                    style={[
                      styles.resumoQuantidade,
                      { color: C.primary },
                    ]}
                  >
                    {totalAtencao}
                  </Text>

                  <Text style={styles.resumoItemLabel}>
                    Atenção
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.secaoHeader}>
              <Text style={styles.secaoTitulo}>
                Alertas dos pacientes
              </Text>

              <Text style={styles.ordenacaoTexto}>
                Por gravidade
              </Text>
            </View>

            {alertas.length === 0 ? (
              <View style={styles.estadoCard}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={44}
                  color={C.primary}
                />

                <Text style={styles.estadoTitulo}>
                  Nenhum alerta identificado
                </Text>

                <Text style={styles.estadoTexto}>
                  Não foram identificadas medições
                  recentes fora das referências
                  configuradas para os pacientes
                  vinculados.
                </Text>
              </View>
            ) : (
              alertas.map((alerta) => (
                <CardAlerta
                  key={alerta.id}
                  alerta={alerta}
                  onPress={() => abrirAlerta(alerta)}
                />
              ))
            )}

            <Text style={styles.rodapeTexto}>
              Os alertas são informativos e baseados
              nos registros disponíveis. A ausência
              de alertas não significa ausência de
              riscos à saúde.
            </Text>
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
    paddingBottom: 50,
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
  tituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 13,
  },
  tituloIcone: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloConteudo: {
    flex: 1,
  },
  titulo: {
    fontSize: 27,
    fontWeight: '800',
    color: C.text,
  },
  subtitulo: {
    fontSize: 13,
    color: C.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  avisoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.primarySoft,
    borderRadius: 15,
    padding: 15,
    gap: 10,
    marginBottom: 20,
  },
  avisoTexto: {
    flex: 1,
    color: C.primary,
    fontSize: 12,
    lineHeight: 19,
  },
  avisoErro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.warningSoft,
    borderRadius: 12,
    padding: 13,
    marginBottom: 15,
    gap: 9,
  },
  avisoErroTexto: {
    flex: 1,
    color: C.warning,
    fontSize: 12,
    lineHeight: 18,
  },
  loadingArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 65,
    gap: 16,
  },
  loadingTexto: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
  },
  estadoCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    gap: 12,
  },
  estadoTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
  },
  estadoTexto: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  tentarNovamente: {
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 5,
  },
  tentarNovamenteTexto: {
    color: C.card,
    fontWeight: '700',
    fontSize: 13,
  },
  resumoCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 25,
  },
  resumoLabel: {
    fontSize: 13,
    color: C.muted,
  },
  resumoTotal: {
    fontSize: 42,
    fontWeight: '800',
    color: C.primary,
    marginTop: 5,
  },
  resumoDescricao: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  resumoDivisor: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 17,
  },
  resumoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resumoItem: {
    alignItems: 'center',
    gap: 4,
  },
  resumoQuantidade: {
    fontSize: 23,
    fontWeight: '800',
  },
  resumoItemLabel: {
    fontSize: 11,
    color: C.muted,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  secaoTitulo: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
    flex: 1,
  },
  ordenacaoTexto: {
    fontSize: 11,
    color: C.muted,
  },
  cardAlerta: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    gap: 10,
  },
  cardPressionado: {
    opacity: 0.75,
    transform: [{ scale: 0.995 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  pacienteInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pacienteTexto: {
    flex: 1,
  },
  pacienteNome: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  pacienteSubtitulo: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
  },
  gravidadeBadge: {
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  gravidadeTexto: {
    fontSize: 11,
    fontWeight: '800',
  },
  divisor: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 3,
  },
  tipoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipoTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
  },
  alertaTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  alertaValor: {
    fontSize: 26,
    fontWeight: '800',
  },
  alertaDescricao: {
    fontSize: 13,
    color: C.text,
    lineHeight: 20,
  },
  contextoArea: {
    backgroundColor: C.background,
    borderRadius: 10,
    padding: 10,
  },
  contextoTexto: {
    fontSize: 12,
    color: C.muted,
  },
  cardRodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 5,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dataTexto: {
    fontSize: 11,
    color: C.muted,
  },
  detalhesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  detalhesTexto: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '700',
  },
  rodapeTexto: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
});
