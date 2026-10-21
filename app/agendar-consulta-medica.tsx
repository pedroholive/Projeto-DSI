import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';

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

// Cores do HealthSync (mesmas de meus-pacientes.tsx)
const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
  danger: '#D94B57',
};

// Máscara DD/MM/AAAA
function mascaraData(texto: string): string {
  const n = texto.replace(/\D/g, '').slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

// Máscara HH:MM
function mascaraHorario(texto: string): string {
  const n = texto.replace(/\D/g, '').slice(0, 4);
  if (n.length <= 2) return n;
  return `${n.slice(0, 2)}:${n.slice(2)}`;
}

// Valida data real e não passada
function dataValida(valor: string): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
  if (!m) return false;

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
  if (!m) return false;
  return Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

export default function AgendarConsultaMedicaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pacienteId?: string;
    pacienteNome?: string;
  }>();

  // Paciente pode vir da navegação (Meus Pacientes / Home) ou ser escolhido aqui
  const pacienteFixo = !!params.pacienteId;
  const [pacienteId, setPacienteId] = useState(params.pacienteId ?? '');
  const [pacienteNome, setPacienteNome] = useState(
    params.pacienteNome ?? ''
  );
  const [pacientes, setPacientes] = useState<
    { id: string; nome: string }[]
  >([]);
  const [carregandoPacientes, setCarregandoPacientes] = useState(
    !params.pacienteId
  );

  // Carrega os pacientes com vínculo ativo quando nenhum foi informado
  useEffect(() => {
    if (pacienteFixo) return;

    const cancelar = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) return;

      try {
        const lista = await listarPacientesVinculados();

        setPacientes(
          [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        );
      } catch (e) {
        console.error('Erro ao carregar pacientes:', e);
        setErro('Não foi possível carregar seus pacientes.');
      } finally {
        setCarregandoPacientes(false);
      }
    });

    return cancelar;
  }, [pacienteFixo]);

  const [especialidade, setEspecialidade] = useState('Clínica geral');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [local, setLocal] = useState('');
  const [observacao, setObservacao] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const formularioValido =
    !!pacienteId &&
    especialidade.trim() !== '' &&
    dataValida(data) &&
    horarioValido(horario) &&
    local.trim() !== '';

  async function agendar() {
    if (enviando) return;

    if (!dataValida(data)) {
      setErro('Informe uma data válida (DD/MM/AAAA), a partir de hoje.');
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
      });

      if (Platform.OS === 'web') {
        router.back();
      } else {
        Alert.alert(
          'Consulta solicitada',
          'O paciente poderá confirmar ou recusar a consulta.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (e: unknown) {
      console.error('Erro ao agendar consulta:', e);
      setErro(
        e instanceof Error
          ? e.message
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.voltar} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={C.primary} />
            <Text style={styles.voltarTexto}>Voltar</Text>
          </Pressable>

          <Text style={styles.titulo}>Agendar consulta</Text>
          <Text style={styles.subtitulo}>
            O paciente receberá a solicitação e poderá confirmar ou recusar.
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
                  <Text style={styles.pacienteInfo}>Vínculo ativo</Text>
                </View>
              </View>
            ) : (
              <View style={styles.seletor}>
                <Text style={styles.label}>Paciente *</Text>

                {carregandoPacientes ? (
                  <ActivityIndicator color={C.primary} />
                ) : pacientes.length === 0 ? (
                  <Text style={styles.semPacientes}>
                    Você ainda não possui pacientes com vínculo ativo.
                  </Text>
                ) : (
                  pacientes.map((p) => {
                    const ativo = p.id === pacienteId;
                    return (
                      <Pressable
                        key={p.id}
                        style={[
                          styles.pacienteOpcao,
                          ativo && styles.pacienteOpcaoAtiva,
                        ]}
                        onPress={() => {
                          setPacienteId(p.id);
                          setPacienteNome(p.nome);
                          setErro('');
                        }}
                        disabled={enviando}
                      >
                        <Ionicons
                          name={ativo ? 'radio-button-on' : 'radio-button-off'}
                          size={22}
                          color={ativo ? C.primary : C.muted}
                        />
                        <Text style={styles.pacienteOpcaoTexto}>{p.nome}</Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}

            <Text style={styles.label}>Especialidade *</Text>
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
                <Text style={styles.label}>Data *</Text>
                <TextInput
                  style={styles.input}
                  value={data}
                  onChangeText={(t) => setData(mascaraData(t))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={C.muted}
                  keyboardType="number-pad"
                  maxLength={10}
                  editable={!enviando}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Horário *</Text>
                <TextInput
                  style={styles.input}
                  value={horario}
                  onChangeText={(t) => setHorario(mascaraHorario(t))}
                  placeholder="HH:MM"
                  placeholderTextColor={C.muted}
                  keyboardType="number-pad"
                  maxLength={5}
                  editable={!enviando}
                />
              </View>
            </View>

            <Text style={styles.label}>Local *</Text>
            <TextInput
              style={styles.input}
              value={local}
              onChangeText={setLocal}
              placeholder="Consultório ou hospital"
              placeholderTextColor={C.muted}
              editable={!enviando}
            />

            <Text style={styles.label}>Observações (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultilinha]}
              value={observacao}
              onChangeText={setObservacao}
              placeholder="Informações adicionais..."
              placeholderTextColor={C.muted}
              multiline
              editable={!enviando}
            />

            {erro !== '' && <Text style={styles.erro}>{erro}</Text>}

            <Pressable
              style={[
                styles.botao,
                (!formularioValido || enviando) && styles.botaoDesabilitado,
              ]}
              onPress={agendar}
              disabled={!formularioValido || enviando}
            >
              {enviando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.botaoTexto}>Solicitar consulta</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: { padding: 20, paddingBottom: 40 },
  voltar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  voltarTexto: { color: C.primary, fontSize: 16, fontWeight: '600' },
  titulo: { fontSize: 28, fontWeight: '700', color: C.text },
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
  semPacientes: { color: C.muted, fontSize: 14, lineHeight: 20, marginBottom: 8 },
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
  pacienteOpcaoAtiva: { borderColor: C.primary, backgroundColor: '#E8F2F0' },
  pacienteOpcaoTexto: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
  pacienteNome: { fontSize: 16, fontWeight: '700', color: C.text },
  pacienteInfo: { fontSize: 13, color: C.primary, marginTop: 2 },
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
  inputMultilinha: { minHeight: 90, textAlignVertical: 'top' },
  linha: { flexDirection: 'row', gap: 12 },
  erro: { color: C.danger, fontSize: 14, marginBottom: 16, lineHeight: 20 },
  botao: {
    backgroundColor: C.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  botaoDesabilitado: { opacity: 0.5 },
  botaoTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});