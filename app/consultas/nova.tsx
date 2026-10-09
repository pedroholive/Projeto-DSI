import React, { useState } from 'react';
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
import { criarConsulta } from '@/services/consultaService';

export default function NovaConsultaScreen() {
  const router = useRouter();

  const [especialidade, setEspecialidade] = useState('');
  const [medico, setMedico] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [local, setLocal] = useState('');
  const [observacao, setObservacao] = useState('');

  const [salvando, setSalvando] = useState(false);

  async function salvarConsulta() {
    if (
      !especialidade.trim() ||
      !medico.trim() ||
      !data.trim() ||
      !horario.trim() ||
      !local.trim()
    ) {
      Alert.alert(
        'Campos obrigatórios',
        'Preencha todos os campos obrigatórios.'
      );
      return;
    }

    const usuario = auth.currentUser;

    if (!usuario) {
      Alert.alert(
        'Erro',
        'Nenhum usuário autenticado.'
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

      Alert.alert(
        'Sucesso',
        'Consulta cadastrada com sucesso.'
      );

      router.back();
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Erro',
        'Não foi possível cadastrar a consulta.'
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              style={styles.voltar}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color="#263330"
              />
            </Pressable>

            <Text style={styles.titulo}>
              Nova consulta
            </Text>
          </View>

          <Text style={styles.label}>
            Especialidade *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ex.: Endocrinologia"
            placeholderTextColor="#9CA3AF"
            value={especialidade}
            onChangeText={setEspecialidade}
          />

          <Text style={styles.label}>
            Médico *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ex.: Dr. João Silva"
            placeholderTextColor="#9CA3AF"
            value={medico}
            onChangeText={setMedico}
          />

          <Text style={styles.label}>
            Data *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#9CA3AF"
            value={data}
            onChangeText={setData}
            keyboardType="numeric"
            maxLength={10}
          />

          <Text style={styles.label}>
            Horário *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="HH:MM"
            placeholderTextColor="#9CA3AF"
            value={horario}
            onChangeText={setHorario}
            keyboardType="numeric"
            maxLength={5}
          />

          <Text style={styles.label}>
            Local *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ex.: Clínica Saúde"
            placeholderTextColor="#9CA3AF"
            value={local}
            onChangeText={setLocal}
          />

          <Text style={styles.label}>
            Observação
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.textArea,
            ]}
            placeholder="Ex.: Levar os últimos exames"
            placeholderTextColor="#9CA3AF"
            value={observacao}
            onChangeText={setObservacao}
            multiline
            textAlignVertical="top"
          />

          <Pressable
            style={[
              styles.botaoSalvar,
              salvando && styles.botaoDesabilitado,
            ]}
            onPress={salvarConsulta}
            disabled={salvando}
          >
            <Text style={styles.botaoSalvarTexto}>
              {salvando
                ? 'Salvando...'
                : 'Salvar consulta'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAF9',
  },

  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },

  voltar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E6EEEB',
  },

  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#263330',
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263330',
    marginBottom: 7,
    marginTop: 14,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5E2',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    color: '#263330',
  },

  textArea: {
    height: 100,
    paddingTop: 14,
  },

  botaoSalvar: {
    backgroundColor: '#0E766D',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },

  botaoDesabilitado: {
    opacity: 0.6,
  },

  botaoSalvarTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});