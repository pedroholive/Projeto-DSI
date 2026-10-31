import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { auth } from '@/firebaseConfig';
import ModalConsultaFeedback, {
  type ResumoConsulta,
} from '@/components/Modalconsultafeedback';
import { criarConsulta } from '@/services/consultaService';

const C = {
  bg: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E9F8C',
  primaryDark: '#0E766D',
  primarySoft: '#E7F8F4',
  text: '#273331',
  muted: '#7E8D89',
  border: '#E0EAE8',
  danger: '#D94B57',
  dangerSoft: '#FDE8EA',
};

function mascararData(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 8);

  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 4) {
    return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  }

  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
}

function mascararHorario(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 4);

  if (numeros.length <= 2) return numeros;

  return `${numeros.slice(0, 2)}:${numeros.slice(2)}`;
}

function converterDataHora(data: string, horario: string): Date | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) return null;
  if (!/^\d{2}:\d{2}$/.test(horario)) return null;

  const [dia, mes, ano] = data.split('/').map(Number);
  const [hora, minuto] = horario.split(':').map(Number);

  if (
    ano < 1900 ||
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    hora < 0 ||
    hora > 23 ||
    minuto < 0 ||
    minuto > 59
  ) {
    return null;
  }

  const resultado = new Date(ano, mes - 1, dia, hora, minuto, 0, 0);

  if (
    resultado.getFullYear() !== ano ||
    resultado.getMonth() !== mes - 1 ||
    resultado.getDate() !== dia ||
    resultado.getHours() !== hora ||
    resultado.getMinutes() !== minuto
  ) {
    return null;
  }

  return resultado;
}

function mensagem(titulo: string, texto: string) {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${texto}`);
    return;
  }

  Alert.alert(titulo, texto);
}

export default function NovaConsultaScreen() {
  const router = useRouter();

  const [especialidade, setEspecialidade] = useState('');
  const [medico, setMedico] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [local, setLocal] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [registrada, setRegistrada] = useState<ResumoConsulta | null>(null);

  function limparFormulario() {
    setEspecialidade('');
    setMedico('');
    setData('');
    setHorario('');
    setLocal('');
    setObservacao('');
  }

  const dataHoraInformada = useMemo(
    () => converterDataHora(data, horario),
    [data, horario]
  );

  const formularioCompleto =
    especialidade.trim().length > 0 &&
    medico.trim().length > 0 &&
    data.length === 10 &&
    horario.length === 5 &&
    local.trim().length > 0;

  async function salvarConsulta() {
    if (
      !especialidade.trim() ||
      !medico.trim() ||
      !data.trim() ||
      !horario.trim() ||
      !local.trim()
    ) {
      mensagem(
        'Campos obrigatórios',
        'Preencha especialidade, médico, data, horário e local.'
      );
      return;
    }

    const dataHora = converterDataHora(data, horario);

    if (!dataHora) {
      mensagem(
        'Data ou horário inválido',
        'Informe uma data no formato DD/MM/AAAA e um horário no formato HH:MM.'
      );
      return;
    }

    if (dataHora.getTime() <= Date.now()) {
      mensagem(
        'Consulta no passado',
        'Escolha uma data e um horário futuros para a consulta.'
      );
      return;
    }

    const usuario = auth.currentUser;

    if (!usuario) {
      mensagem(
        'Sessão indisponível',
        'Faça login novamente para cadastrar uma consulta.'
      );
      return;
    }

    try {
      setSalvando(true);

      await criarConsulta({
        userId: usuario.uid,
        especialidade: especialidade.trim(),
        medico: medico.trim(),
        data: data.trim(),
        horario: horario.trim(),
        local: local.trim(),
        observacao: observacao.trim(),
      });

      setRegistrada({
        especialidade: especialidade.trim(),
        medico: medico.trim(),
        data: data.trim(),
        horario: horario.trim(),
        local: local.trim(),
      });
    } catch (error) {
      console.error('Erro ao cadastrar consulta:', error);

      mensagem(
        'Erro',
        'Não foi possível cadastrar a consulta. Tente novamente.'
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Pressable
                style={styles.voltar}
                onPress={() => router.back()}
                accessibilityLabel="Voltar"
              >
                <Ionicons name="chevron-back" size={22} color={C.text} />
              </Pressable>

              <View style={styles.headerTexto}>
                <Text style={styles.titulo}>Nova consulta</Text>
                <Text style={styles.subtitulo}>
                  Adicione um compromisso à sua agenda.
                </Text>
              </View>

              <View style={styles.headerIcone}>
                <Ionicons name="calendar-outline" size={22} color={C.primaryDark} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.secaoTitulo}>Informações da consulta</Text>
              <Text style={styles.secaoDescricao}>
                Os campos marcados com * são obrigatórios.
              </Text>

              <Text style={styles.label}>Especialidade *</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="medical-outline"
                  size={19}
                  color={C.muted}
                  style={styles.inputIcone}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ex.: Cardiologia"
                  placeholderTextColor="#A7B2AF"
                  value={especialidade}
                  onChangeText={setEspecialidade}
                  returnKeyType="next"
                  maxLength={60}
                />
              </View>

              <Text style={styles.label}>Médico *</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={19}
                  color={C.muted}
                  style={styles.inputIcone}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ex.: Dr. João Silva"
                  placeholderTextColor="#A7B2AF"
                  value={medico}
                  onChangeText={setMedico}
                  returnKeyType="next"
                  maxLength={80}
                />
              </View>

              <View style={styles.camposRow}>
                <View style={styles.campoMetade}>
                  <Text style={styles.label}>Data *</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="calendar-clear-outline"
                      size={19}
                      color={C.muted}
                      style={styles.inputIcone}
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor="#A7B2AF"
                      value={data}
                      onChangeText={(valor) => setData(mascararData(valor))}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                </View>

                <View style={styles.campoMetade}>
                  <Text style={styles.label}>Horário *</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="time-outline"
                      size={19}
                      color={C.muted}
                      style={styles.inputIcone}
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="HH:MM"
                      placeholderTextColor="#A7B2AF"
                      value={horario}
                      onChangeText={(valor) => setHorario(mascararHorario(valor))}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                </View>
              </View>

              {(data.length === 10 || horario.length === 5) &&
                !dataHoraInformada && (
                  <View style={styles.erroInline}>
                    <Ionicons name="alert-circle-outline" size={17} color={C.danger} />
                    <Text style={styles.erroInlineTexto}>
                      Confira a data e o horário informados.
                    </Text>
                  </View>
                )}

              {dataHoraInformada && dataHoraInformada.getTime() <= Date.now() && (
                <View style={styles.erroInline}>
                  <Ionicons name="alert-circle-outline" size={17} color={C.danger} />
                  <Text style={styles.erroInlineTexto}>
                    A consulta precisa estar marcada para uma data futura.
                  </Text>
                </View>
              )}

              <Text style={styles.label}>Local *</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="location-outline"
                  size={19}
                  color={C.muted}
                  style={styles.inputIcone}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ex.: Clínica Saúde"
                  placeholderTextColor="#A7B2AF"
                  value={local}
                  onChangeText={setLocal}
                  maxLength={100}
                />
              </View>

              <Text style={styles.label}>
                Observação <Text style={styles.opcional}>(opcional)</Text>
              </Text>

              <TextInput
                style={styles.textArea}
                placeholder="Ex.: Levar os últimos exames"
                placeholderTextColor="#A7B2AF"
                value={observacao}
                onChangeText={setObservacao}
                multiline
                textAlignVertical="top"
                maxLength={300}
              />

              <Text style={styles.contador}>
                {observacao.length}/300
              </Text>
            </View>

            <Pressable
              style={[
                styles.botaoSalvar,
                (!formularioCompleto || salvando) && styles.botaoDesabilitado,
              ]}
              onPress={salvarConsulta}
              disabled={salvando}
            >
              {salvando ? (
                <Text style={styles.botaoSalvarTexto}>Salvando...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.botaoSalvarTexto}>Salvar consulta</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={styles.botaoCancelar}
              onPress={() => router.back()}
              disabled={salvando}
            >
              <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ModalConsultaFeedback
        visible={registrada !== null}
        tipo="registrada"
        consulta={registrada}
        onConcluir={() => {
          setRegistrada(null);
          router.replace('/consultas');
        }}
        textoSecundario="Registrar outra"
        onSecundario={() => {
          setRegistrada(null);
          limparFormulario();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },

  content: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  voltar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  headerTexto: {
    flex: 1,
  },

  titulo: {
    fontSize: 25,
    fontWeight: '700',
    color: C.text,
  },

  subtitulo: {
    fontSize: 12,
    color: C.muted,
    marginTop: 3,
  },

  headerIcone: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8EFED',
    padding: 18,
  },

  secaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },

  secaoDescricao: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
    marginBottom: 8,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#52615E',
    marginTop: 15,
    marginBottom: 6,
  },

  opcional: {
    fontWeight: '400',
    color: C.muted,
  },

  inputContainer: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#F8FAFA',
  },

  inputIcone: {
    marginLeft: 13,
  },

  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 11,
    fontSize: 14,
    color: C.text,
    outlineStyle: 'none' as any,
  },

  camposRow: {
    flexDirection: 'row',
    gap: 10,
  },

  campoMetade: {
    flex: 1,
  },

  erroInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: C.dangerSoft,
  },

  erroInlineTexto: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: C.danger,
  },

  textArea: {
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#F8FAFA',
    padding: 13,
    fontSize: 14,
    color: C.text,
    outlineStyle: 'none' as any,
  },

  contador: {
    alignSelf: 'flex-end',
    marginTop: 5,
    fontSize: 10,
    color: C.muted,
  },

  botaoSalvar: {
    height: 52,
    borderRadius: 12,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 14,
  },

  botaoDesabilitado: {
    opacity: 0.55,
  },

  botaoSalvarTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  botaoCancelar: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },

  botaoCancelarTexto: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
});