
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '@/firebaseConfig';
import { criarConsultaMedica } from '@/services/consultaService';
import { listarPacientesVinculados } from '@/services/pacientesVinculadosService';

import {
  buscarLocalizacoesConsulta,
  type LocalizacaoConsulta,
} from '@/services/localizacaoConsultaService';

const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  primarySoft: '#E8F2F0',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
  danger: '#D94B57',
  warning: '#B7791F',
};

function mascaraData(texto: string): string {
  const n = texto.replace(/\D/g, '').slice(0, 8);

  if (n.length <= 2) {
    return n;
  }

  if (n.length <= 4) {
    return `${n.slice(0, 2)}/${n.slice(2)}`;
  }

  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

function mascaraHorario(texto: string): string {
  const n = texto.replace(/\D/g, '').slice(0, 4);

  if (n.length <= 2) {
    return n;
  }

  return `${n.slice(0, 2)}:${n.slice(2)}`;
}

function dataValida(valor: string): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);

  if (!m) {
    return false;
  }

  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = Number(m[3]);

  const data = new Date(ano, mes - 1, dia);

  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return false;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return data >= hoje;
}

function horarioValido(valor: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(valor);

  if (!m) {
    return false;
  }

  return Number(m[1]) <= 23 &&
    Number(m[2]) <= 59;
}

export default function AgendarConsultaMedicaScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    pacienteId?: string;
    pacienteNome?: string;
  }>();

  const pacienteFixo = !!params.pacienteId;

  const [pacienteId, setPacienteId] = useState(
    params.pacienteId ?? ''
  );

  const [pacienteNome, setPacienteNome] = useState(
    params.pacienteNome ?? ''
  );

  const [pacientes, setPacientes] = useState<
    { id: string; nome: string }[]
  >([]);

  const [carregandoPacientes, setCarregandoPacientes] =
    useState(!params.pacienteId);

  const [especialidade, setEspecialidade] =
    useState('Clínica geral');

  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [local, setLocal] = useState('');
  const [observacao, setObservacao] = useState('');

  const [resultadosLocalizacao, setResultadosLocalizacao] =
    useState<LocalizacaoConsulta[]>([]);

  const [localizacaoSelecionada, setLocalizacaoSelecionada] =
    useState<LocalizacaoConsulta | null>(null);

  const [buscandoLocalizacao, setBuscandoLocalizacao] =
    useState(false);

  const [erroLocalizacao, setErroLocalizacao] =
    useState('');

  const [buscaRealizada, setBuscaRealizada] =
    useState(false);

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const versaoLocal = useRef(0);

  useEffect(() => {
    if (pacienteFixo) {
      return;
    }

    let ativo = true;

    const cancelar = onAuthStateChanged(
      auth,
      async (usuario) => {
        if (!usuario) {
          if (ativo) {
            setCarregandoPacientes(false);
          }
          return;
        }

        try {
          const lista = await listarPacientesVinculados();

          if (ativo) {
            setPacientes(
              [...lista].sort((a, b) =>
                a.nome.localeCompare(b.nome, 'pt-BR')
              )
            );
          }
        } catch (error) {
          console.error(
            'Erro ao carregar pacientes:',
            error
          );

          if (ativo) {
            setErro(
              'Não foi possível carregar seus pacientes.'
            );
          }
        } finally {
          if (ativo) {
            setCarregandoPacientes(false);
          }
        }
      }
    );

    return () => {
      ativo = false;
      cancelar();
    };
  }, [pacienteFixo]);

  const formularioValido =
    !!pacienteId &&
    especialidade.trim() !== '' &&
    dataValida(data) &&
    horarioValido(horario) &&
    local.trim() !== '';

  function alterarLocal(texto: string) {
    versaoLocal.current += 1;
    setLocal(texto);
    setLocalizacaoSelecionada(null);
    setResultadosLocalizacao([]);
    setErroLocalizacao('');
    setBuscaRealizada(false);
  }

  async function buscarLocalizacao() {
    if (buscandoLocalizacao || enviando) {
      return;
    }

    if (local.trim().length < 3) {
      setErroLocalizacao(
        'Informe pelo menos 3 caracteres para buscar.'
      );
      return;
    }

    const enderecoPesquisado = local.trim();
    const versaoBusca = versaoLocal.current;

    Keyboard.dismiss();

    setBuscandoLocalizacao(true);
    setErroLocalizacao('');
    setResultadosLocalizacao([]);
    setBuscaRealizada(false);

    try {
      const encontrados =
        await buscarLocalizacoesConsulta(
          enderecoPesquisado
        );

      if (versaoBusca !== versaoLocal.current) {
        return;
      }

      if (encontrados.length === 0) {
        setErroLocalizacao(
          'Nenhuma localização encontrada. Tente informar o nome do estabelecimento com a cidade e o estado.'
        );
      }

      setResultadosLocalizacao(encontrados);
      setBuscaRealizada(true);
    } catch (error) {
      if (versaoBusca !== versaoLocal.current) {
        return;
      }

      console.error(
        'Erro ao buscar localização:',
        error
      );

      setErroLocalizacao(
        error instanceof Error
          ? error.message
          : 'Não foi possível buscar a localização.'
      );
    } finally {
      setBuscandoLocalizacao(false);
    }
  }

  function selecionarLocalizacao(
    resultado: LocalizacaoConsulta
  ) {
    versaoLocal.current += 1;
    setLocal(resultado.nome);
    setLocalizacaoSelecionada(resultado);
    setResultadosLocalizacao([]);
    setErroLocalizacao('');
    setBuscaRealizada(true);
    Keyboard.dismiss();
  }

  function removerLocalizacaoSelecionada() {
    versaoLocal.current += 1;
    setLocalizacaoSelecionada(null);
    setBuscaRealizada(false);
    setResultadosLocalizacao([]);
    setErroLocalizacao('');
  }

  async function agendar() {
    if (enviando) {
      return;
    }

    if (!dataValida(data)) {
      setErro(
        'Informe uma data válida (DD/MM/AAAA), a partir de hoje.'
      );
      return;
    }

    if (!horarioValido(horario)) {
      setErro('Informe um horário válido (HH:MM).');
      return;
    }

    if (!pacienteId) {
      setErro('Selecione o paciente.');
      return;
    }

    if (!formularioValido) {
      setErro('Preencha os campos obrigatórios.');
      return;
    }

    Keyboard.dismiss();
    setErro('');
    setEnviando(true);

    try {
      await criarConsultaMedica({
        pacienteId,
        especialidade,
        data,
        horario,
        local,
        observacao,
        ...(localizacaoSelecionada
          ? {
              latitude:
                localizacaoSelecionada.latitude,
              longitude:
                localizacaoSelecionada.longitude,
            }
          : {}),
      });

      if (Platform.OS === 'web') {
        router.back();
      } else {
        Alert.alert(
          'Consulta solicitada',
          'O paciente poderá confirmar ou recusar a consulta.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (error: unknown) {
      console.error(
        'Erro ao agendar consulta:',
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível agendar a consulta.'
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={styles.voltar}
            onPress={() => router.back()}
            accessibilityRole="button"
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

          <Text style={styles.titulo}>
            Agendar consulta
          </Text>

          <Text style={styles.subtitulo}>
            O paciente receberá a solicitação e
            poderá confirmar ou recusar.
          </Text>

          <View style={styles.card}>
            {pacienteFixo ? (
              <View style={styles.pacienteLinha}>
                <Ionicons
                  name="person-circle-outline"
                  size={36}
                  color={C.primary}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.pacienteNome}>
                    {pacienteNome ||
                      `Paciente ${String(pacienteId).slice(0, 8)}...`}
                  </Text>

                  <Text style={styles.pacienteInfo}>
                    Vínculo ativo
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.seletor}>
                <Text style={styles.label}>
                  Paciente *
                </Text>

                {carregandoPacientes ? (
                  <ActivityIndicator
                    color={C.primary}
                  />
                ) : pacientes.length === 0 ? (
                  <Text style={styles.semPacientes}>
                    Você ainda não possui pacientes
                    com vínculo ativo.
                  </Text>
                ) : (
                  pacientes.map((paciente) => {
                    const ativo =
                      paciente.id === pacienteId;

                    return (
                      <Pressable
                        key={paciente.id}
                        style={[
                          styles.pacienteOpcao,
                          ativo &&
                            styles.pacienteOpcaoAtiva,
                        ]}
                        onPress={() => {
                          setPacienteId(paciente.id);
                          setPacienteNome(paciente.nome);
                          setErro('');
                        }}
                        disabled={enviando}
                        accessibilityRole="button"
                      >
                        <Ionicons
                          name={
                            ativo
                              ? 'radio-button-on'
                              : 'radio-button-off'
                          }
                          size={22}
                          color={
                            ativo
                              ? C.primary
                              : C.muted
                          }
                        />

                        <Text
                          style={styles.pacienteOpcaoTexto}
                        >
                          {paciente.nome}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}

            <Text style={styles.label}>
              Especialidade *
            </Text>

            <TextInput
              style={styles.input}
              value={especialidade}
              onChangeText={setEspecialidade}
              placeholder="Ex.: Endocrinologia"
              placeholderTextColor={C.muted}
              editable={!enviando}
            />

            <View style={styles.linha}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  Data *
                </Text>

                <TextInput
                  style={styles.input}
                  value={data}
                  onChangeText={(texto) =>
                    setData(mascaraData(texto))
                  }
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={C.muted}
                  keyboardType="number-pad"
                  maxLength={10}
                  editable={!enviando}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  Horário *
                </Text>

                <TextInput
                  style={styles.input}
                  value={horario}
                  onChangeText={(texto) =>
                    setHorario(mascaraHorario(texto))
                  }
                  placeholder="HH:MM"
                  placeholderTextColor={C.muted}
                  keyboardType="number-pad"
                  maxLength={5}
                  editable={!enviando}
                />
              </View>
            </View>

            <View style={styles.localTitulo}>
              <Ionicons
                name="location-outline"
                size={21}
                color={C.primary}
              />

              <Text style={styles.localTituloTexto}>
                Localização da consulta
              </Text>
            </View>

            <Text style={styles.label}>
              Local *
            </Text>

            <TextInput
              style={styles.input}
              value={local}
              onChangeText={alterarLocal}
              placeholder="Hospital, consultório ou endereço"
              placeholderTextColor={C.muted}
              editable={!enviando}
              autoCapitalize="words"
            />

            <Pressable
              style={[
                styles.botaoBuscar,
                (
                  buscandoLocalizacao ||
                  enviando ||
                  local.trim().length < 3
                ) && styles.botaoBuscarDesabilitado,
              ]}
              onPress={() =>
                void buscarLocalizacao()
              }
              disabled={
                buscandoLocalizacao ||
                enviando ||
                local.trim().length < 3
              }
              accessibilityRole="button"
            >
              {buscandoLocalizacao ? (
                <ActivityIndicator
                  size="small"
                  color={C.primary}
                />
              ) : (
                <Ionicons
                  name="search-outline"
                  size={19}
                  color={C.primary}
                />
              )}

              <Text style={styles.botaoBuscarTexto}>
                {buscandoLocalizacao
                  ? 'Buscando localização...'
                  : 'Buscar localização'}
              </Text>
            </Pressable>

            {erroLocalizacao !== '' && (
              <View style={styles.avisoLocalizacao}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={C.warning}
                />

                <Text
                  style={styles.avisoLocalizacaoTexto}
                >
                  {erroLocalizacao}
                </Text>
              </View>
            )}

            {resultadosLocalizacao.length > 0 && (
              <View style={styles.resultados}>
                <Text style={styles.resultadosTitulo}>
                  Selecione o local correto
                </Text>

                {resultadosLocalizacao.map(
                  (resultado) => (
                    <Pressable
                      key={resultado.id}
                      style={({ pressed }) => [
                        styles.resultadoItem,
                        pressed &&
                          styles.resultadoPressionado,
                      ]}
                      onPress={() =>
                        selecionarLocalizacao(
                          resultado
                        )
                      }
                      disabled={enviando}
                      accessibilityRole="button"
                      accessibilityLabel={
                        `Selecionar ${resultado.nome}`
                      }
                    >
                      <View
                        style={styles.resultadoIcone}
                      >
                        <Ionicons
                          name="location-outline"
                          size={20}
                          color={C.primary}
                        />
                      </View>

                      <View
                        style={styles.resultadoConteudo}
                      >
                        <Text
                          style={styles.resultadoNome}
                        >
                          {resultado.nome}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={19}
                        color={C.primary}
                      />
                    </Pressable>
                  )
                )}
              </View>
            )}

            {localizacaoSelecionada && (
              <View style={styles.localConfirmado}>
                <View style={styles.confirmadoCabecalho}>
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={C.primary}
                  />

                  <Text
                    style={styles.confirmadoTitulo}
                  >
                    Localização selecionada
                  </Text>
                </View>

                <Text style={styles.confirmadoNome}>
                  {localizacaoSelecionada.nome}
                </Text>

                <Text
                  style={styles.confirmadoCoordenadas}
                >
                  Latitude:{' '}
                  {localizacaoSelecionada.latitude.toFixed(6)}
                </Text>

                <Text
                  style={styles.confirmadoCoordenadas}
                >
                  Longitude:{' '}
                  {localizacaoSelecionada.longitude.toFixed(6)}
                </Text>

                <Pressable
                  style={styles.trocarLocal}
                  onPress={removerLocalizacaoSelecionada}
                  disabled={enviando}
                  accessibilityRole="button"
                >
                  <Text style={styles.trocarLocalTexto}>
                    Escolher outro local
                  </Text>
                </Pressable>
              </View>
            )}

            {buscaRealizada &&
              !localizacaoSelecionada &&
              resultadosLocalizacao.length === 0 &&
              erroLocalizacao === '' && (
                <Text style={styles.localAjuda}>
                  Não há um local selecionado.
                </Text>
              )}

            <Text style={styles.localAjuda}>
              Confira a cidade, o endereço e o nome
              do estabelecimento antes de selecionar.
              A busca de localização está disponível
              na versão web de testes.
            </Text>

            <Text style={styles.label}>
              Observações (opcional)
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.inputMultilinha,
              ]}
              value={observacao}
              onChangeText={setObservacao}
              placeholder="Informações adicionais..."
              placeholderTextColor={C.muted}
              multiline
              editable={!enviando}
            />

            {erro !== '' && (
              <Text style={styles.erro}>
                {erro}
              </Text>
            )}

            <Pressable
              style={[
                styles.botao,
                (
                  !formularioValido ||
                  enviando ||
                  buscandoLocalizacao
                ) && styles.botaoDesabilitado,
              ]}
              onPress={() => void agendar()}
              disabled={
                !formularioValido ||
                enviando ||
                buscandoLocalizacao
              }
              accessibilityRole="button"
            >
              {enviando ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text style={styles.botaoTexto}>
                  Solicitar consulta
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    lineHeight: 22,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  pacienteLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  seletor: {
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  semPacientes: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  pacienteOpcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.background,
    marginBottom: 8,
  },
  pacienteOpcaoAtiva: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  pacienteOpcaoTexto: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  pacienteNome: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  pacienteInfo: {
    fontSize: 13,
    color: C.primary,
    marginTop: 2,
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
    padding: 14,
    fontSize: 16,
    color: C.text,
    backgroundColor: C.background,
    marginBottom: 16,
  },
  inputMultilinha: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  linha: {
    flexDirection: 'row',
    gap: 12,
  },
  localTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    marginTop: 4,
  },
  localTituloTexto: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  botaoBuscar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: 12,
    marginTop: -3,
    marginBottom: 16,
  },
  botaoBuscarDesabilitado: {
    opacity: 0.5,
  },
  botaoBuscarTexto: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  avisoLocalizacao: {
    backgroundColor: '#FBF3E0',
    padding: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  avisoLocalizacaoTexto: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: C.warning,
  },
  resultados: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  resultadosTitulo: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  resultadoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: C.background,
    gap: 10,
  },
  resultadoPressionado: {
    opacity: 0.75,
  },
  resultadoIcone: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultadoConteudo: {
    flex: 1,
  },
  resultadoNome: {
    color: C.text,
    fontSize: 13,
    lineHeight: 19,
  },
  localConfirmado: {
    padding: 15,
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: 14,
    marginBottom: 16,
  },
  confirmadoCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
  },
  confirmadoTitulo: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmadoNome: {
    fontSize: 13,
    color: C.text,
    lineHeight: 20,
    marginBottom: 10,
  },
  confirmadoCoordenadas: {
    color: C.muted,
    fontSize: 12,
    marginBottom: 3,
  },
  trocarLocal: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginTop: 7,
  },
  trocarLocalTexto: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  localAjuda: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 18,
  },
  erro: {
    color: C.danger,
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
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
});
