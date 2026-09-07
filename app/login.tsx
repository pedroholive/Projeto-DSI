import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter, Link } from 'expo-router';
import { auth } from '../firebaseConfig';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    if (!email || !senha) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      router.replace('/');;
    } catch (error: any) {
      Alert.alert('Erro ao entrar', traduzErro(error.code));
    } finally {
      setCarregando(false);
    }
  }

  function traduzErro(codigo: string): string {
    switch (codigo) {
      case 'auth/invalid-email':
        return 'E-mail inválido.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos.';
      default:
        return 'Não foi possível entrar. Tente novamente.';
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>HealthSync</Text>
      <Text style={styles.subtitulo}>Sua saúde em equilíbrio</Text>

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

      <Pressable style={styles.botao} onPress={handleLogin} disabled={carregando}>
        <Text style={styles.botaoTexto}>{carregando ? 'Entrando...' : 'Entrar no aplicativo'}</Text>
      </Pressable>

      <Link href="/cadastro" style={styles.link}>
        Não tem conta? Cadastre-se
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#E6F4F1' },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#1C7C6E', textAlign: 'center' },
  subtitulo: { fontSize: 14, color: '#4A6763', textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: 'white', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 15 },
  botao: { backgroundColor: '#1C7C6E', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  botaoTexto: { color: 'white', fontWeight: '600', fontSize: 15 },
  link: { textAlign: 'center', marginTop: 20, color: '#1C7C6E' },
});
