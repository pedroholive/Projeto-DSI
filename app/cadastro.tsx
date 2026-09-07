import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter, Link } from 'expo-router';
import { auth } from '../firebaseConfig';

export default function CadastroScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function handleCadastro() {
    if (!nome || !email || !senha) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (senha.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setCarregando(true);
    try {
      await createUserWithEmailAndPassword(auth, email, senha);
      // TODO (próxima etapa): salvar o "nome" no Firestore, na coleção do usuário,
      // já que o Firebase Auth por si só não guarda esse campo.
      router.replace('/');;
    } catch (error: any) {
      Alert.alert('Erro ao cadastrar', traduzErro(error.code));
    } finally {
      setCarregando(false);
    }
  }

  function traduzErro(codigo: string): string {
    switch (codigo) {
      case 'auth/email-already-in-use':
        return 'Já existe uma conta com esse e-mail.';
      case 'auth/invalid-email':
        return 'E-mail inválido.';
      case 'auth/weak-password':
        return 'Senha muito fraca (mínimo 6 caracteres).';
      default:
        return 'Não foi possível cadastrar. Tente novamente.';
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Criar conta</Text>

      <TextInput style={styles.input} placeholder="Nome" value={nome} onChangeText={setNome} />
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
      />

      <Pressable style={styles.botao} onPress={handleCadastro} disabled={carregando}>
        <Text style={styles.botaoTexto}>{carregando ? 'Criando conta...' : 'Cadastrar'}</Text>
      </Pressable>

      <Link href="/login" style={styles.link}>
        Já tem conta? Entrar
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#E6F4F1' },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#1C7C6E', textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: 'white', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 15 },
  botao: { backgroundColor: '#1C7C6E', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  botaoTexto: { color: 'white', fontWeight: '600', fontSize: 15 },
  link: { textAlign: 'center', marginTop: 20, color: '#1C7C6E' },
});
