import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import BotaoAbrirRota from '@/components/botaoabrirrota';
import MapaConsulta from '@/components/mapaconsulta';
import {
  acompanharConsultasMedico,
  cancelarConsultaMedico,
  excluirConsultaMedico,
  reagendarConsultaMedico,
  type ConsultaMedico,
} from '@/services/consultaService';

const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
  warning: '#B7791F',
  warningBg: '#FBF3E0',
  danger: '#D94B57',
  dangerBg: '#FCE9EB',
  okBg: '#E3F3F1',
  neutralBg: '#EEF2F1',
};

const STATUS_INFO: Record<
  string,
  { texto: string; cor: string; fundo: string }
> = {
  aguardando_confirmacao: {
    texto: 'Aguardando paciente',
    cor: C.warning,
    fundo: C.warningBg,
  },
  confirmada: { texto: 'Confirmada', cor: C.primary, fundo: C.okBg },
  recusada: { texto: 'Recusada', cor: C.danger, fundo: C.dangerBg },
  cancelada: { texto: 'Cancelada', cor: C.muted, fundo: C.neutralBg },
};

// "DD/MM/AAAA" + "HH:MM" -> timestamp
function paraTimestamp(data: string, horario: string): number {
  const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  const h = /^(\d{2}):(\d{2})$/.exec(horario);
  if (!d) return 0;
  return new Date(
    Number(d[3]),
    Number(d[2]) - 1,
    Number(d[1]),
    h ? Number(h[1]) : 0,
    h ? Number(h[2]) : 0
  ).getTime();
}

// Valida o formato e exige data/hora futura
function validarDataHora(data: string, horario: string): string {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) return 'Use a data no formato DD/MM/AAAA.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) return 'Use o horário no formato HH:MM.';
  const ts = paraTimestamp(data, horario);
  const conferido = new Date(ts);
  if (
    conferido.getDate() !== Number(data.slice(0, 2)) ||
    conferido.getMonth() + 1 !== Number(data.slice(3, 5))
  ) {
    return 'Essa data não existe.';
  }
  if (ts <= Date.now()) return 'Escolha uma data e um horário futuros.';
  return '';
}

type Confirmacao = 'cancelar' | 'excluir' | null;

export default function DetalheConsultaMedicoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [consulta, setConsulta] = useState<ConsultaMedico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [erroForm, setErroForm] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [processando, setProcessando] = useState(false);
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);

  const formPreenchido = useRef(false);
  const saindo = useRef(false);

  useEffect(() => {
    const cancelar = acompanharConsultasMedico(
      (lista) => {
        const achada = lista.find((c) => c.id === id) ?? null;
        setConsulta(achada);

        if (achada && !formPreenchido.current) {
          setData(achada.data);
          setHorario(achada.horario);
          formPreenchido.current = true;
        }

        setErro('');
        setCarregando(false);
      },
      () => {
        setErro('Não foi possível carregar a consulta.');
        setCarregando(false);
      }
    );

    return cancelar;
  }, [id]);

  async function reagendar() {
    if (!consulta?.id) return;

    const problema = validarDataHora(data.trim(), horario.trim());
    if (problema) {
      setErroForm(problema);
      setSucesso('');
      return;
    }

    try {
      setProcessando(true);
      setErroForm('');
      await reagendarConsultaMedico(consulta.id, data.trim(), horario.trim());
      setSucesso('Consulta reagendada. O paciente precisa confirmar de novo.');
    } catch (e) {
      console.error('Erro ao reagendar:', e);
      setErroForm('Não foi possível reagendar. Tente novamente.');
      setSucesso('');
    } finally {
      setProcessando(false);
    }
  }

  async function executarConfirmacao() {
    if (!consulta?.id || !confirmacao) return;

    try {
      setProcessando(true);
      setErroForm('');

      if (confirmacao === 'cancelar') {
        await cancelarConsultaMedico(consulta.id);
        setSucesso('Consulta cancelada.');
        setConfirmacao(null);
      } else {
        saindo.current = true;
        await excluirConsultaMedico(consulta.id);
        setConfirmacao(null);
        router.back();
      }
    } catch (e) {
      console.error('Erro na ação da consulta:', e);
      saindo.current = false;
      setConfirmacao(null);
      setErroForm('Não foi possível concluir. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  }

  const info = consulta
    ? STATUS_INFO[consulta.status ?? 'aguardando_confirmacao'] ??
      STATUS_INFO.aguardando_confirmacao
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.voltar} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={C.primary} />
            <Text style={styles.voltarTexto}>Voltar</Text>
          </Pressable>

          <Text style={styles.titulo}>Consulta</Text>

          {carregando ? (
            <View style={styles.centro}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          ) : erro !== '' ? (
            <Text style={styles.erro}>{erro}</Text>
          ) : !consulta || !info ? (
            <View style={styles.card}>
              <Text style={styles.vazio}>
                {saindo.current
                  ? 'Excluindo...'
                  : 'Consulta não encontrada. Ela pode ter sido excluída.'}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <View style={styles.linhaTopo}>
                  <Text style={styles.paciente} numberOfLines={1}>
                    {consulta.pacienteNome ?? 'Paciente'}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: info.fundo }]}>
                    <Text style={[styles.badgeTexto, { color: info.cor }]}>
                      {info.texto}
                    </Text>
                  </View>
                </View>

                <Text style={styles.especialidade}>{consulta.especialidade}</Text>

                <View style={styles.detalhe}>
                  <Ionicons name="calendar-outline" size={16} color={C.muted} />
                  <Text style={styles.detalheTexto}>
                    {consulta.data} às {consulta.horario}
                  </Text>
                </View>

                <View style={styles.detalhe}>
                  <Ionicons name="location-outline" size={16} color={C.muted} />
                  <Text style={styles.detalheTexto}>{consulta.local}</Text>
                </View>

                {!!consulta.observacao && (
                  <Text style={styles.obs}>{consulta.observacao}</Text>
                )}

                {consulta.latitude !== undefined &&
                  consulta.longitude !== undefined && (
                    <View style={{ marginTop: 14 }}>
                      <MapaConsulta
                        latitude={consulta.latitude}
                        longitude={consulta.longitude}
                        titulo={consulta.local}
                      />
                    </View>
                  )}

                <BotaoAbrirRota
                  latitude={consulta.latitude}
                  longitude={consulta.longitude}
                  endereco={consulta.local}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.secao}>Reagendar</Text>
                <Text style={styles.secaoTexto}>
                  O paciente será avisado e precisará confirmar de novo.
                </Text>

                <Text style={styles.rotulo}>Data</Text>
                <TextInput
                  style={styles.input}
                  value={data}
                  onChangeText={setData}
                  placeholder="DD/MM/AAAA"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />

                <Text style={styles.rotulo}>Horário</Text>
                <TextInput
                  style={styles.input}
                  value={horario}
                  onChangeText={setHorario}
                  placeholder="HH:MM"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />

                {erroForm !== '' && <Text style={styles.erro}>{erroForm}</Text>}
                {sucesso !== '' && <Text style={styles.sucesso}>{sucesso}</Text>}

                <Pressable
                  style={[styles.botao, processando && { opacity: 0.6 }]}
                  onPress={reagendar}
                  disabled={processando}
                >
                  {processando && confirmacao === null ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="time-outline" size={19} color="#FFFFFF" />
                      <Text style={styles.botaoTexto}>Salvar novo horário</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {consulta.status !== 'cancelada' && (
                <Pressable
                  style={styles.botaoCancelar}
                  onPress={() => setConfirmacao('cancelar')}
                >
                  <Ionicons name="close-circle-outline" size={19} color={C.warning} />
                  <Text style={[styles.botaoSecundarioTexto, { color: C.warning }]}>
                    Cancelar consulta
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={styles.botaoExcluir}
                onPress={() => setConfirmacao('excluir')}
              >
                <Ionicons name="trash-outline" size={19} color={C.danger} />
                <Text style={[styles.botaoSecundarioTexto, { color: C.danger }]}>
                  Excluir consulta
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={confirmacao !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !processando && setConfirmacao(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitulo}>
              {confirmacao === 'cancelar' ? 'Cancelar consulta?' : 'Excluir consulta?'}
            </Text>
            <Text style={styles.modalTexto}>
              {confirmacao === 'cancelar'
                ? 'O paciente verá a consulta como cancelada.'
                : 'A consulta será apagada e some também para o paciente. Esta ação não pode ser desfeita.'}
            </Text>

            <View style={styles.modalBotoes}>
              <Pressable
                style={styles.modalSecundario}
                onPress={() => setConfirmacao(null)}
                disabled={processando}
              >
                <Text style={styles.modalSecundarioTexto}>Voltar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalPrimario,
                  confirmacao === 'excluir' && { backgroundColor: C.danger },
                ]}
                onPress={executarConfirmacao}
                disabled={processando}
              >
                {processando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimarioTexto}>Confirmar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: { padding: 20, paddingBottom: 40 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  voltarTexto: { color: C.primary, fontSize: 16, fontWeight: '600' },
  titulo: { fontSize: 28, fontWeight: '700', color: C.text, marginBottom: 18 },
  centro: { alignItems: 'center', paddingVertical: 30 },
  erro: { color: C.danger, fontSize: 14, marginTop: 6, marginBottom: 6 },
  sucesso: { color: C.primary, fontSize: 14, marginTop: 6, marginBottom: 6 },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  vazio: { color: C.muted, fontSize: 14, textAlign: 'center' },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  paciente: { flex: 1, fontSize: 17, fontWeight: '700', color: C.text },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  badgeTexto: { fontSize: 12, fontWeight: '700' },
  especialidade: { color: C.primary, fontSize: 14, fontWeight: '600', marginTop: 6, marginBottom: 10 },
  detalhe: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  detalheTexto: { color: C.text, fontSize: 14 },
  obs: { color: C.muted, fontSize: 13, marginTop: 10, lineHeight: 19 },
  secao: { fontSize: 17, fontWeight: '700', color: C.text },
  secaoTexto: { color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 12, lineHeight: 19 },
  rotulo: { color: C.text, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: C.text,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  botao: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    padding: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  botaoTexto: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  botaoCancelar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.warningBg,
    marginBottom: 10,
  },
  botaoExcluir: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.dangerBg,
  },
  botaoSecundarioTexto: { fontSize: 15, fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modal: { backgroundColor: C.card, borderRadius: 18, padding: 22 },
  modalTitulo: { fontSize: 19, fontWeight: '700', color: C.text },
  modalTexto: { color: C.muted, fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 14 },
  modalBotoes: { flexDirection: 'row', gap: 10, marginTop: 10 },
  modalSecundario: {
    flex: 1,
    alignItems: 'center',
    padding: 13,
    borderRadius: 12,
    backgroundColor: C.neutralBg,
  },
  modalSecundarioTexto: { color: C.text, fontWeight: '700' },
  modalPrimario: {
    flex: 1,
    alignItems: 'center',
    padding: 13,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  modalPrimarioTexto: { color: '#FFFFFF', fontWeight: '700' },
});