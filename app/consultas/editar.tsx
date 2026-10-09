import React, { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { auth } from '@/firebaseConfig';
import {
  buscarConsultaPorId,
  atualizarConsulta,
  excluirConsulta,
} from '@/services/consultaService';

type TipoMensagem = 'sucesso' | 'erro';
type AcaoMensagem = 'voltar' | 'fechar';

export default function EditarConsultaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [especialidade, setEspecialidade] = useState('');
  const [medico, setMedico] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [local, setLocal] = useState('');
  const [observacao, setObservacao] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [modalExcluirVisivel, setModalExcluirVisivel] = useState(false);
  const [mensagem, setMensagem] = useState<{
    titulo: string;
    descricao: string;
    tipo: TipoMensagem;
    acao: AcaoMensagem;
  } | null>(null);

  function mostrarErro(titulo: string, descricao: string, acao: AcaoMensagem = 'fechar') {
    setMensagem({ titulo, descricao, tipo: 'erro', acao });
  }

  function fecharMensagem() {
    if (!mensagem) return;
    const voltar = mensagem.acao === 'voltar';
    setMensagem(null);
    if (voltar) router.back();
  }

  useEffect(() => {
    let ativo = true;

    async function carregarConsulta() {
      try {
        const usuario = auth.currentUser;
        if (!usuario || !id) {
          throw new Error('Consulta ou usuário não encontrado.');
        }

        const consulta = await buscarConsultaPorId(id, usuario.uid);
        if (!consulta) {
          throw new Error('Consulta não encontrada ou acesso não autorizado.');
        }
        if (!ativo) return;

        setEspecialidade(consulta.especialidade);
        setMedico(consulta.medico);
        setData(consulta.data);
        setHorario(consulta.horario);
        setLocal(consulta.local);
        setObservacao(consulta.observacao ?? '');
      } catch (error) {
        if (!ativo) return;
        mostrarErro(
          'Não foi possível carregar',
          error instanceof Error ? error.message : 'Não foi possível carregar a consulta.',
          'voltar'
        );
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregarConsulta();
    return () => { ativo = false; };
  }, [id]);

  function dataValida(valor: string): boolean {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return false;
    const [dia, mes, ano] = valor.split('/').map(Number);
    if (ano < 1900) return false;
    const convertida = new Date(ano, mes - 1, dia);
    return (
      convertida.getFullYear() === ano &&
      convertida.getMonth() === mes - 1 &&
      convertida.getDate() === dia
    );
  }

  function horarioValido(valor: string): boolean {
    if (!/^\d{2}:\d{2}$/.test(valor)) return false;
    const [hora, minuto] = valor.split(':').map(Number);
    return hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59;
  }

  async function salvarAlteracoes() {
    if (salvando || excluindo) return;

    if (!especialidade.trim() || !medico.trim() || !data.trim() || !horario.trim() || !local.trim()) {
      mostrarErro('Campos obrigatórios', 'Preencha todos os campos obrigatórios.');
      return;
    }
    if (!dataValida(data.trim())) {
      mostrarErro('Data inválida', 'Informe uma data válida no formato DD/MM/AAAA.');
      return;
    }
    if (!horarioValido(horario.trim())) {
      mostrarErro('Horário inválido', 'Informe o horário no formato HH:MM.');
      return;
    }

    const usuario = auth.currentUser;
    if (!usuario || !id) {
      mostrarErro('Erro', 'Usuário ou consulta não encontrado.');
      return;
    }

    try {
      setSalvando(true);
      await atualizarConsulta(id, usuario.uid, {
        especialidade, medico, data, horario, local, observacao,
      });
      setMensagem({
        titulo: 'Consulta atualizada!',
        descricao: 'As alterações foram salvas com sucesso.',
        tipo: 'sucesso',
        acao: 'voltar',
      });
    } catch (error) {
      console.error('Erro ao atualizar consulta:', error);
      mostrarErro('Erro ao salvar', 'Não foi possível atualizar a consulta. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  function solicitarExclusao() {
    if (salvando || excluindo) return;
    setModalExcluirVisivel(true);
  }

  async function confirmarExclusao() {
    if (salvando || excluindo) return;
    const usuario = auth.currentUser;
    if (!usuario || !id) {
      setModalExcluirVisivel(false);
      mostrarErro('Erro', 'Usuário ou consulta não encontrado.');
      return;
    }

    try {
      setExcluindo(true);
      await excluirConsulta(id, usuario.uid);
      setModalExcluirVisivel(false);
      setMensagem({
        titulo: 'Consulta excluída!',
        descricao: 'Sua consulta foi excluída com sucesso.',
        tipo: 'sucesso',
        acao: 'voltar',
      });
    } catch (error) {
      console.error('Erro ao excluir consulta:', error);
      setModalExcluirVisivel(false);
      mostrarErro(
        'Erro ao excluir',
        error instanceof Error ? error.message : 'Não foi possível excluir a consulta.'
      );
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {carregando ? (
        <View style={styles.carregando}>
          <ActivityIndicator size="large" color="#0E766D" />
          <Text style={styles.textoCarregando}>Carregando consulta...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.conteudo}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Pressable onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={26} color="#273331" />
              </Pressable>
              <Text style={styles.titulo}>Editar Consulta</Text>
              <View style={{ width: 26 }} />
            </View>

            <Text style={styles.subtitulo}>
              Atualize as informações do seu agendamento.
            </Text>

            <View style={styles.formulario}>
              <Text style={styles.label}>Especialidade *</Text>
              <TextInput
                style={styles.input}
                value={especialidade}
                onChangeText={setEspecialidade}
                placeholder="Ex.: Cardiologia"
                placeholderTextColor="#A0AAA7"
              />

              <Text style={styles.label}>Médico(a) *</Text>
              <TextInput
                style={styles.input}
                value={medico}
                onChangeText={setMedico}
                placeholder="Nome do médico"
                placeholderTextColor="#A0AAA7"
              />

              <Text style={styles.label}>Data *</Text>
              <TextInput
                style={styles.input}
                value={data}
                onChangeText={setData}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#A0AAA7"
                keyboardType="numeric"
                maxLength={10}
              />

              <Text style={styles.label}>Horário *</Text>
              <TextInput
                style={styles.input}
                value={horario}
                onChangeText={setHorario}
                placeholder="HH:MM"
                placeholderTextColor="#A0AAA7"
                keyboardType="numeric"
                maxLength={5}
              />

              <Text style={styles.label}>Local *</Text>
              <TextInput
                style={styles.input}
                value={local}
                onChangeText={setLocal}
                placeholder="Clínica ou hospital"
                placeholderTextColor="#A0AAA7"
              />

              <Text style={styles.label}>Observações</Text>
              <TextInput
                style={[styles.input, styles.inputMultilinha]}
                value={observacao}
                onChangeText={setObservacao}
                placeholder="Informações adicionais (opcional)"
                placeholderTextColor="#A0AAA7"
                multiline
                textAlignVertical="top"
              />
            </View>

            <Pressable
              style={[styles.botaoSalvar, (salvando || excluindo) && styles.botaoDesabilitado]}
              onPress={salvarAlteracoes}
              disabled={salvando || excluindo}
            >
              {salvando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-outline" size={21} color="#FFFFFF" />
                  <Text style={styles.botaoSalvarTexto}>Salvar alterações</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.botaoExcluir, (salvando || excluindo) && styles.botaoDesabilitado]}
              onPress={solicitarExclusao}
              disabled={salvando || excluindo}
            >
              <Ionicons name="trash-outline" size={20} color="#C0392B" />
              <Text style={styles.botaoExcluirTexto}>Excluir consulta</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Confirmação de exclusão: substitui window.confirm */}
      <Modal
        visible={modalExcluirVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!excluindo) setModalExcluirVisivel(false); }}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalConteudo}>
            <View style={styles.modalIcone}>
              <Ionicons name="trash-outline" size={30} color="#C0392B" />
            </View>
            <Text style={styles.modalTitulo}>Excluir consulta?</Text>
            <Text style={styles.modalDescricao}>
              Tem certeza de que deseja excluir esta consulta? Essa ação é permanente e não poderá ser desfeita.
            </Text>
            <View style={styles.modalResumo}>
              <Text style={styles.modalEspecialidade}>{especialidade}</Text>
              <Text style={styles.modalData}>{data} às {horario}</Text>
            </View>
            <Pressable
              style={[styles.modalBotaoExcluir, excluindo && styles.botaoDesabilitado]}
              onPress={confirmarExclusao}
              disabled={excluindo}
            >
              {excluindo ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalBotaoExcluirTexto}>Sim, excluir consulta</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.modalBotaoCancelar, excluindo && styles.botaoDesabilitado]}
              onPress={() => setModalExcluirVisivel(false)}
              disabled={excluindo}
            >
              <Text style={styles.modalBotaoCancelarTexto}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    
      <Modal
        visible={mensagem !== null}
        transparent
        animationType="fade"
        onRequestClose={fecharMensagem}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalConteudo}>
            <View style={mensagem?.tipo === 'sucesso' ? styles.modalIconeSucesso : styles.modalIcone}>
              <Ionicons
                name={mensagem?.tipo === 'sucesso' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                size={36}
                color={mensagem?.tipo === 'sucesso' ? '#0E766D' : '#C0392B'}
              />
            </View>
            <Text style={styles.modalTitulo}>{mensagem?.titulo}</Text>
            <Text style={styles.modalDescricao}>{mensagem?.descricao}</Text>
            <Pressable
              style={mensagem?.tipo === 'sucesso' ? styles.modalBotaoSucesso : styles.modalBotaoExcluir}
              onPress={fecharMensagem}
            >
              <Text style={styles.modalBotaoExcluirTexto}>
                {mensagem?.acao === 'voltar' ? 'Entendi' : 'OK'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F7' },
  conteudo: {
    width: '100%', maxWidth: 520, alignSelf: 'center',
    paddingHorizontal: 20, paddingBottom: 40,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 15, paddingBottom: 15,
  },
  titulo: { fontSize: 22, fontWeight: '700', color: '#273331' },
  subtitulo: { fontSize: 14, color: '#667572', marginBottom: 25 },
  formulario: {
    backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20,
    borderWidth: 1, borderColor: '#EDF1F0',
  },
  label: {
    fontSize: 14, fontWeight: '600', color: '#273331',
    marginBottom: 7, marginTop: 14,
  },
  input: {
    minHeight: 48, borderWidth: 1, borderColor: '#DCE5E1',
    borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11,
    fontSize: 14, color: '#273331', backgroundColor: '#FFFFFF',
  },
  inputMultilinha: { minHeight: 100 },
  botaoSalvar: {
    backgroundColor: '#0E766D', height: 52, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginTop: 25,
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoSalvarTexto: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  carregando: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoCarregando: { marginTop: 12, color: '#667572' },
  botaoExcluir: {
    height: 52, borderRadius: 14, borderWidth: 1, borderColor: '#C0392B',
    backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8, marginTop: 12,
  },
  botaoExcluirTexto: { fontSize: 15, fontWeight: '700', color: '#C0392B' },
  modalFundo: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalConteudo: {
    width: '100%', maxWidth: 380, backgroundColor: '#FFFFFF',
    borderRadius: 24, padding: 24, alignItems: 'center',
  },
  modalIcone: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FCEAE8',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  modalIconeSucesso: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#DDF3EC',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  modalTitulo: {
    fontSize: 21, fontWeight: '700', color: '#273331',
    marginBottom: 10, textAlign: 'center',
  },
  modalDescricao: {
    fontSize: 14, color: '#667572', textAlign: 'center',
    lineHeight: 21, marginBottom: 20,
  },
  modalResumo: {
    width: '100%', backgroundColor: '#F4F8F7', borderRadius: 12,
    padding: 14, alignItems: 'center', marginBottom: 20,
  },
  modalEspecialidade: {
    fontSize: 15, fontWeight: '600', color: '#273331', marginBottom: 5,
  },
  modalData: { fontSize: 13, color: '#667572' },
  modalBotaoExcluir: {
    width: '100%', height: 50, borderRadius: 12,
    backgroundColor: '#C0392B', justifyContent: 'center',
    alignItems: 'center', marginBottom: 10,
  },
  modalBotaoExcluirTexto: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  modalBotaoCancelar: {
    width: '100%', height: 50, borderRadius: 12, borderWidth: 1,
    borderColor: '#DCE5E1', justifyContent: 'center', alignItems: 'center',
  },
  modalBotaoCancelarTexto: { fontSize: 15, fontWeight: '600', color: '#273331' },
  modalBotaoSucesso: {
    width: '100%', height: 50, borderRadius: 12,
    backgroundColor: '#0E766D', justifyContent: 'center', alignItems: 'center',
  },
});
