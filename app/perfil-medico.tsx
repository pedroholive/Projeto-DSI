import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { MensagemModal } from '@/components/medicamentos/mensagem-modal';
import { auth, db } from '@/firebaseConfig';
import {
  atualizarPerfilMedico,
  ESPECIALIDADES,
  excluirContaMedico,
  mascaraTelefone,
} from '@/services/perfilService';

const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
  danger: '#D94B57',
  dangerSoft: '#FDE8EA',
  warning: '#B7791F',
  warningSoft: '#FFF3D6',
};

interface DadosPerfil {
  nome: string;
  email: string;
  telefone: string;
  especialidade: string;
  crm: string;
  verificado: boolean;
}

const perfilVazio: DadosPerfil = {
  nome: '',
  email: '',
  telefone: '',
  especialidade: '',
  crm: '',
  verificado: false,
};

export default function PerfilMedicoScreen() {
  const router = useRouter();

  const [perfil, setPerfil] = useState<DadosPerfil | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<DadosPerfil>(perfilVazio);

  const [salvando, setSalvando] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro';
    titulo: string;
    descricao: string;
  } | null>(null);

  useEffect(() => {
    async function carregar() {
      const usuario = auth.currentUser;

      if (!usuario) {
        setCarregando(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'usuarios', usuario.uid));
        const d = snap.exists() ? snap.data() : {};

        const dados: DadosPerfil = {
          nome: d.nome ?? 'Médico',
          email: usuario.email ?? d.email ?? '',
          telefone: d.telefone ?? '',
          especialidade: d.especialidade ?? 'Médico',
          crm: d.crm ?? '',
          verificado: d.verificado === true,
        };

        setPerfil(dados);
        setForm(dados);
      } catch (e) {
        console.error('Erro ao carregar perfil:', e);
        setFeedback({
          tipo: 'erro',
          titulo: 'Perfil indisponível',
          descricao:
            'Não foi possível carregar seus dados. Tente novamente.',
        });
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  function iniciarEdicao() {
    if (perfil) {
      setForm(perfil);
    }
    setEditando(true);
  }

  function cancelarEdicao() {
    if (perfil) {
      setForm(perfil);
    }
    setEditando(false);
  }

  async function salvar() {
    const usuario = auth.currentUser;

    if (!usuario || salvando) {
      return;
    }

    setSalvando(true);

    try {
      await atualizarPerfilMedico(usuario.uid, {
        nome: form.nome,
        telefone: form.telefone,
        especialidade: form.especialidade,
        crm: form.crm,
      });

      const atualizado: DadosPerfil = {
        ...form,
        nome: form.nome.trim(),
        telefone: mascaraTelefone(form.telefone),
        especialidade: form.especialidade.trim(),
        crm: form.crm.trim().toUpperCase(),
      };

      setPerfil(atualizado);
      setForm(atualizado);
      setEditando(false);
      setFeedback({
        tipo: 'sucesso',
        titulo: 'Perfil atualizado',
        descricao: 'Suas informações foram salvas com sucesso.',
      });
    } catch (e) {
      setFeedback({
        tipo: 'erro',
        titulo: 'Não foi possível salvar',
        descricao:
          e instanceof Error
            ? e.message
            : 'Ocorreu um erro inesperado. Tente novamente.',
      });
    } finally {
      setSalvando(false);
    }
  }

  async function sair() {
    if (saindo) return;
    setSaindo(true);
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (e) {
      console.error('Erro ao sair:', e);
      setSaindo(false);
    }
  }

  async function excluirConta() {
    if (excluindo) return;
    setExcluindo(true);

    try {
      await excluirContaMedico();
      setConfirmarExclusao(false);
      router.replace('/login');
    } catch (e) {
      console.error('Erro ao excluir conta:', e);
      setConfirmarExclusao(false);
      setFeedback({
        tipo: 'erro',
        titulo: 'Não foi possível excluir',
        descricao:
          (e as { code?: string })?.code ===
          'auth/requires-recent-login'
            ? 'Por segurança, saia da conta, faça login novamente e repita a exclusão.'
            : 'Ocorreu um erro ao excluir sua conta. Tente novamente.',
      });
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.voltar} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
          <Text style={styles.voltarTexto}>Voltar</Text>
        </Pressable>

        <Text style={styles.titulo}>Perfil</Text>

        {carregando ? (
          <ActivityIndicator
            size="large"
            color={C.primary}
            style={{ marginTop: 30 }}
          />
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={36} color={C.primary} />
              </View>
              <Text style={styles.nome}>{perfil?.nome ?? 'Médico'}</Text>
              <Text style={styles.email}>{perfil?.email}</Text>

              {editando ? (
                <View style={styles.formulario}>
                  <View style={styles.campo}>
                    <Text style={styles.rotuloCampo}>Nome</Text>
                    <TextInput
                      style={styles.input}
                      value={form.nome}
                      onChangeText={(v) =>
                        setForm((f) => ({ ...f, nome: v }))
                      }
                      placeholder="Seu nome completo"
                      placeholderTextColor={C.muted}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.campo}>
                    <Text style={styles.rotuloCampo}>Telefone</Text>
                    <TextInput
                      style={styles.input}
                      value={form.telefone}
                      onChangeText={(v) =>
                        setForm((f) => ({
                          ...f,
                          telefone: mascaraTelefone(v),
                        }))
                      }
                      placeholder="(00) 00000-0000"
                      placeholderTextColor={C.muted}
                      keyboardType="phone-pad"
                      maxLength={15}
                    />
                  </View>

                  <View style={styles.campo}>
                    <Text style={styles.rotuloCampo}>
                      Especialidade
                    </Text>
                    <View style={styles.opcoes}>
                      {ESPECIALIDADES.map((opcao) => {
                        const selecionada =
                          form.especialidade === opcao;

                        return (
                          <Pressable
                            key={opcao}
                            style={[
                              styles.chip,
                              selecionada && styles.chipAtivo,
                            ]}
                            onPress={() =>
                              setForm((f) => ({
                                ...f,
                                especialidade: opcao,
                              }))
                            }
                          >
                            <Text
                              style={[
                                styles.chipTexto,
                                selecionada &&
                                  styles.chipTextoAtivo,
                              ]}
                            >
                              {opcao}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {form.especialidade !== 'Médico' && (
                      <View style={styles.aviso}>
                        <Ionicons
                          name="warning-outline"
                          size={16}
                          color={C.warning}
                        />
                        <Text style={styles.avisoTexto}>
                          Ao salvar outra especialidade, você perde
                          o acesso aos recursos exclusivos de
                          médicos verificados (vínculos e alertas
                          de pacientes).
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.campo}>
                    <Text style={styles.rotuloCampo}>CRM</Text>
                    <TextInput
                      style={styles.input}
                      value={form.crm}
                      onChangeText={(v) =>
                        setForm((f) => ({
                          ...f,
                          crm: v.toUpperCase(),
                        }))
                      }
                      placeholder="Ex.: 123456-SP"
                      placeholderTextColor={C.muted}
                      autoCapitalize="characters"
                      maxLength={20}
                    />
                  </View>

                  <Pressable
                    style={[
                      styles.botaoPrimario,
                      salvando && styles.botaoDesabilitado,
                    ]}
                    onPress={salvar}
                    disabled={salvando}
                  >
                    {salvando ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text style={styles.botaoPrimarioTexto}>
                          Salvar alterações
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={[
                      styles.botaoSecundario,
                      salvando && styles.botaoDesabilitado,
                    ]}
                    onPress={cancelarEdicao}
                    disabled={salvando}
                  >
                    <Text style={styles.botaoSecundarioTexto}>
                      Cancelar
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.linha}>
                    <Text style={styles.rotulo}>Telefone</Text>
                    <Text style={styles.valor}>
                      {perfil?.telefone || 'Não informado'}
                    </Text>
                  </View>
                  <View style={styles.linha}>
                    <Text style={styles.rotulo}>Especialidade</Text>
                    <Text style={styles.valor}>
                      {perfil?.especialidade}
                    </Text>
                  </View>
                  <View style={styles.linha}>
                    <Text style={styles.rotulo}>CRM</Text>
                    <Text style={styles.valor}>
                      {perfil?.crm || 'Não informado'}
                    </Text>
                  </View>
                  <View style={styles.linha}>
                    <Text style={styles.rotulo}>Conta</Text>
                    <Text style={styles.valor}>
                      {perfil?.verificado
                        ? 'Verificada'
                        : 'Aguardando verificação'}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {!editando && (
              <>
                <Pressable
                  style={styles.botaoPrimario}
                  onPress={iniciarEdicao}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.botaoPrimarioTexto}>
                    Editar perfil
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.sair, saindo && { opacity: 0.5 }]}
                  onPress={sair}
                  disabled={saindo}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={20}
                    color={C.danger}
                  />
                  <Text style={styles.sairTexto}>Sair da conta</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.excluir,
                    excluindo && styles.botaoDesabilitado,
                  ]}
                  onPress={() => setConfirmarExclusao(true)}
                  disabled={excluindo}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={C.danger}
                  />
                  <Text style={styles.excluirTexto}>
                    Excluir conta
                  </Text>
                </Pressable>
              </>
            )}
          </>
        )}
      </ScrollView>

      <MensagemModal
        visivel={confirmarExclusao}
        tipo="confirmacao"
        destrutiva
        titulo="Excluir conta?"
        descricao="Seus dados de acesso e de perfil serão removidos permanentemente. Essa ação não pode ser desfeita."
        textoConfirmar="Excluir conta"
        carregando={excluindo}
        onFechar={() => {
          if (!excluindo) setConfirmarExclusao(false);
        }}
        onConfirmar={excluirConta}
      />

      <MensagemModal
        visivel={feedback !== null}
        tipo={feedback?.tipo ?? 'erro'}
        titulo={feedback?.titulo ?? ''}
        descricao={feedback?.descricao ?? ''}
        onFechar={() => setFeedback(null)}
      />
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
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: C.text,
    marginBottom: 20,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E3F3F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  nome: { fontSize: 20, fontWeight: '700', color: C.text },
  email: {
    fontSize: 14,
    color: C.muted,
    marginTop: 4,
    marginBottom: 18,
  },
  linha: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  rotulo: { color: C.muted, fontSize: 14 },
  valor: { color: C.text, fontSize: 14, fontWeight: '600' },
  formulario: {
    alignSelf: 'stretch',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 16,
  },
  campo: { marginBottom: 14 },
  rotuloCampo: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 13,
    color: C.text,
    fontSize: 15,
  },
  opcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  chipAtivo: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipTexto: { color: C.text, fontSize: 13, fontWeight: '600' },
  chipTextoAtivo: { color: '#FFFFFF' },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.warningSoft,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  avisoTexto: {
    flex: 1,
    color: C.warning,
    fontSize: 12,
    lineHeight: 17,
  },
  botaoPrimario: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  botaoPrimarioTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  botaoSecundario: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  botaoSecundarioTexto: {
    color: C.text,
    fontSize: 16,
    fontWeight: '600',
  },
  botaoDesabilitado: { opacity: 0.6 },
  sair: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.danger,
  },
  sairTexto: { color: C.danger, fontSize: 16, fontWeight: '700' },
  excluir: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 15,
    borderRadius: 12,
    backgroundColor: C.dangerSoft,
    marginTop: 12,
  },
  excluirTexto: { color: C.danger, fontSize: 16, fontWeight: '700' },
});
