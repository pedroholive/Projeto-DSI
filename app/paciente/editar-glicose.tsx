
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '@/firebaseConfig';
import {
  buscarGlicemiaPorId,
  atualizarGlicemia,
  excluirGlicemia,
} from '@/services/glicemiaService';

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

const contextos = [
  'Em jejum',
  'Antes da refeição',
  'Após a refeição',
  'Antes de dormir',
  'Outro',
];

export default function EditarGlicoseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const [userId, setUserId] = useState('');

  const [valor, setValor] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [contexto, setContexto] = useState('');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    let ativo = true;

    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (!ativo) return;

      if (!usuario) {
        setUserId('');
        setCarregando(false);
        return;
      }

      setUserId(usuario.uid);

      if (!id || typeof id !== 'string') {
        setCarregando(false);
        mostrarAlerta('Erro', 'Identificador da medição não encontrado.');
        return;
      }

      try {
        setCarregando(true);

        const registro = await buscarGlicemiaPorId(id, usuario.uid);

        if (!ativo) return;

        if (!registro) {
          mostrarAlerta(
            'Registro não encontrado',
            'Essa medição não existe ou não pertence à sua conta.'
          );
          router.back();
          return;
        }

        setValor(String(registro.valor));
        setData(registro.data);
        setHorario(registro.horario);
        setContexto(registro.contexto);
        setObservacao(registro.observacao ?? '');
      } catch (error) {
        console.error('Erro ao buscar glicemia:', error);
        mostrarAlerta('Erro', 'Não foi possível carregar essa medição.');
      } finally {
        if (ativo) setCarregando(false);
      }
    });

    return () => {
      ativo = false;
      unsubscribe();
    };
  }, [id, router]);

  function mostrarAlerta(titulo: string, mensagem: string) {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n\n${mensagem}`);
      return;
    }

    Alert.alert(titulo, mensagem);
  }

  async function salvarAlteracoes() {
    if (!id || !userId) {
      mostrarAlerta('Erro', 'Não foi possível identificar o usuário ou a medição.');
      return;
    }

    const valorNumerico = Number(valor.replace(',', '.'));

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      mostrarAlerta('Atenção', 'Informe um valor de glicemia válido.');
      return;
    }

    if (!data.trim() || !horario.trim() || !contexto.trim()) {
      mostrarAlerta('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setSalvando(true);

      await atualizarGlicemia(id, userId, {
        valor: valorNumerico,
        data: data.trim(),
        horario: horario.trim(),
        contexto: contexto.trim(),
        observacao: observacao.trim(),
      });

      mostrarAlerta('Sucesso', 'Medição atualizada com sucesso.');
      router.back();
    } catch (error) {
      console.error('Erro ao atualizar glicemia:', error);
      mostrarAlerta(
        'Erro',
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar a medição.'
      );
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!id || !userId) {
      mostrarAlerta('Erro', 'Não foi possível identificar a medição.');
      return;
    }

    const excluir = async () => {
      try {
        setExcluindo(true);
        await excluirGlicemia(id, userId);

        mostrarAlerta('Sucesso', 'Medição excluída com sucesso.');
        router.back();
      } catch (error) {
        console.error('Erro ao excluir glicemia:', error);
        mostrarAlerta(
          'Erro',
          error instanceof Error
            ? error.message
            : 'Não foi possível excluir a medição.'
        );
      } finally {
        setExcluindo(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Tem certeza de que deseja excluir esta medição?')) {
        await excluir();
      }
      return;
    }

    Alert.alert(
      'Excluir medição',
      'Tem certeza de que deseja excluir esta medição? Essa ação não poderá ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void excluir();
          },
        },
      ]
    );
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingTexto}>Carregando medição...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingTexto}>
            Faça login para acessar esta medição.
          </Text>
          <Pressable style={styles.botaoVoltar} onPress={() => router.back()}>
            <Text style={styles.botaoTexto}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.voltar}
            >
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </Pressable>

            <View style={styles.headerTexto}>
              <Text style={styles.titulo}>Editar glicose</Text>
              <Text style={styles.descricao}>
                Atualize os dados da sua medição.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Valor da glicemia (mg/dL) *</Text>
            <TextInput
              style={styles.input}
              value={valor}
              onChangeText={setValor}
              placeholder="Ex.: 110"
              placeholderTextColor="#AAB5B2"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Data *</Text>
            <TextInput
              style={styles.input}
              value={data}
              onChangeText={setData}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#AAB5B2"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Horário *</Text>
            <TextInput
              style={styles.input}
              value={horario}
              onChangeText={setHorario}
              placeholder="HH:MM"
              placeholderTextColor="#AAB5B2"
            />

            <Text style={styles.label}>Contexto da medição *</Text>
            <View style={styles.contextos}>
              {contextos.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setContexto(item)}
                  style={[
                    styles.contextoBotao,
                    contexto === item && styles.contextoAtivo,
                  ]}
                >
                  <Text
                    style={[
                      styles.contextoTexto,
                      contexto === item && styles.contextoTextoAtivo,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Observação</Text>
            <TextInput
              style={[styles.input, styles.observacao]}
              value={observacao}
              onChangeText={setObservacao}
              placeholder="Adicione uma observação (opcional)"
              placeholderTextColor="#AAB5B2"
              multiline
              textAlignVertical="top"
            />
          </View>

          <Pressable
            style={[styles.botaoSalvar, salvando && styles.botaoDesabilitado]}
            onPress={salvarAlteracoes}
            disabled={salvando || excluindo}
          >
            {salvando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.botaoTexto}>Salvar alterações</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.botaoExcluir, excluindo && styles.botaoDesabilitado]}
            onPress={confirmarExclusao}
            disabled={salvando || excluindo}
          >
            {excluindo ? (
              <ActivityIndicator color={C.danger} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={19} color={C.danger} />
                <Text style={styles.botaoExcluirTexto}>Excluir medição</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
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
    padding: 20,
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingTexto: {
    color: C.muted,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    gap: 12,
  },
  voltar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexto: {
    flex: 1,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: C.text,
  },
  descricao: {
    fontSize: 13,
    color: C.muted,
    marginTop: 4,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  label: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#FAFCFB',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14,
  },
  contextos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contextoBotao: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: C.card,
  },
  contextoAtivo: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  contextoTexto: {
    fontSize: 12,
    color: C.text,
  },
  contextoTextoAtivo: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  observacao: {
    minHeight: 95,
  },
  botaoSalvar: {
    marginTop: 18,
    backgroundColor: C.primary,
    borderRadius: 14,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  botaoTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  botaoExcluir: {
    marginTop: 12,
    backgroundColor: C.dangerSoft,
    borderRadius: 14,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  botaoExcluirTexto: {
    color: C.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  botaoVoltar: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});
