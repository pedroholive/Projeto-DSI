
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  solicitarVinculoPorCodigo,
} from '../services/vinculosService';

export default function VincularPacienteScreen() {
  const router = useRouter();

  const [codigo, setCodigo] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviarSolicitacao() {
    const codigoLimpo = codigo.trim().toLowerCase();

    if (!codigoLimpo) {
      Alert.alert(
        'Código obrigatório',
        'Digite o código fornecido pelo paciente.'
      );
      return;
    }

    if (!/^[a-f0-9]{64}$/.test(codigoLimpo)) {
      Alert.alert(
        'Código inválido',
        'O código deve conter 64 caracteres. Confira se foi copiado completamente.'
      );
      return;
    }

    if (carregando) return;

    try {
      setCarregando(true);

      await solicitarVinculoPorCodigo(codigoLimpo);

      Alert.alert(
        'Solicitação enviada!',
        'O paciente precisa aceitar a solicitação para autorizar o acesso aos seus dados.',
        [
          {
            text: 'Entendi',
            onPress: () => router.back(),
          },
        ]
      );

      setCodigo('');
    } catch (erro: any) {
      console.error('Erro ao solicitar vínculo:', erro);

      Alert.alert(
        'Não foi possível solicitar o vínculo',
        erro?.message ||
          'Verifique o código e tente novamente.'
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.voltar}
          onPress={() => router.back()}
        >
          <Text style={styles.voltarTexto}>← Voltar</Text>
        </TouchableOpacity>

        <View style={styles.iconeContainer}>
          <Text style={styles.icone}>🔗</Text>
        </View>

        <Text style={styles.titulo}>
          Vincular paciente
        </Text>

        <Text style={styles.descricao}>
          Solicite ao paciente um código temporário
          de vinculação. Insira o código abaixo para
          enviar sua solicitação.
        </Text>

        <View style={styles.cartao}>
          <Text style={styles.label}>
            Código de vinculação
          </Text>

          <TextInput
            style={styles.input}
            value={codigo}
            onChangeText={setCodigo}
            placeholder="Cole o código do paciente"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!carregando}
            multiline
            textAlignVertical="top"
            maxLength={64}
          />

          <Text style={styles.contador}>
            {codigo.trim().length}/64 caracteres
          </Text>

          <TouchableOpacity
            style={[
              styles.botao,
              carregando && styles.botaoDesabilitado,
            ]}
            onPress={enviarSolicitacao}
            disabled={carregando}
          >
            {carregando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.botaoTexto}>
                Enviar solicitação
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.aviso}>
          <Text style={styles.avisoTitulo}>
            Como funciona?
          </Text>

          <Text style={styles.avisoTexto}>
            1. O paciente gera um código na área
            Meus Médicos.
          </Text>

          <Text style={styles.avisoTexto}>
            2. O paciente compartilha o código
            com você.
          </Text>

          <Text style={styles.avisoTexto}>
            3. Você envia a solicitação utilizando
            o código.
          </Text>

          <Text style={styles.avisoTexto}>
            4. O paciente aceita a solicitação.
            Somente após a aprovação o vínculo
            fica ativo.
          </Text>
        </View>

        <Text style={styles.rodape}>
          O código expira em 10 minutos e pode
          ser utilizado apenas uma vez.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },

  conteudo: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 48,
    paddingBottom: 36,
  },

  voltar: {
    alignSelf: 'flex-start',
    marginBottom: 30,
  },

  voltarTexto: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },

  iconeContainer: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  icone: {
    fontSize: 36,
  },

  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#172554',
    marginBottom: 12,
  },

  descricao: {
    fontSize: 15,
    lineHeight: 23,
    color: '#64748B',
    marginBottom: 28,
  },

  cartao: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 22,
  },

  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },

  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },

  contador: {
    textAlign: 'right',
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 20,
  },

  botao: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },

  botaoDesabilitado: {
    opacity: 0.65,
  },

  botaoTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  aviso: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    marginBottom: 20,
  },

  avisoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 14,
  },

  avisoTexto: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    marginBottom: 10,
  },

  rodape: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
});
