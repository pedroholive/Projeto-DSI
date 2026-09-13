import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import { Stack } from 'expo-router';

export default function RecuperarSenhaScreen() {

  const [email, setEmail] = useState('');
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function handleEnviarLink() {
    if (!email) {
      Alert.alert('Atenção', 'Informe seu e-mail.');
      return;
    }
    setCarregando(true);
    try {
      await sendPasswordResetEmail(auth, email);
      router.push({ pathname: '/link-enviado', params: { email } });
    } catch (error: any) {
      Alert.alert('Erro ao enviar', traduzErro(error.code));
    } finally {
      setCarregando(false);
    }
  }

  function traduzErro(codigo: string): string {
    switch (codigo) {
      case 'auth/invalid-email':
        return 'E-mail inválido.';
      case 'auth/user-not-found':
        return 'Não encontramos uma conta com esse e-mail.';
      default:
        return 'Não foi possível enviar o link. Tente novamente.';
    }
  }

  return (
    <>
    <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Botão de voltar */}
        <Pressable style={styles.botaoVoltar} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#333E3C" />
        </Pressable>

        {/* Bloco 1: Ícone e Textos de Apresentação */}
        <View style={styles.cabecalho}>
          <View style={styles.iconeContainer}>
            <Ionicons name="lock-closed-outline" size={30} color="#0E766D" />
          </View>
          <Text style={styles.titulo}>Esqueceu sua senha?</Text>
          <Text style={styles.subtitulo}>
            Sem problemas. Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
          </Text>
        </View>

        {/* Bloco 2: Formulário */}
        <Text style={styles.label}>E-mail</Text>
        <View style={styles.containerInput}>
          <Ionicons name="mail-outline" size={20} color="#8A9A96" style={styles.iconeInput} />
          <TextInput
            style={styles.inputInterno}
            placeholder="voce@exemplo.com"
            placeholderTextColor="#8A9A96"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Bloco 3: Botão de envio */}
        <Pressable style={styles.botao} onPress={handleEnviarLink} disabled={carregando}>
          <Text style={styles.botaoTexto}>
            {carregando ? 'Enviando...' : 'Enviar link de recuperação'}
          </Text>
          {!carregando && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
        </Pressable>

        {/* Bloco 4: Aviso de segurança */}
        <View style={styles.avisoContainer}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#0E766D" />
          <Text style={styles.avisoTexto}>Por segurança, o link expira em 30 minutos.</Text>
        </View>

        {/* Bloco 5: Rodapé */}
        <View style={styles.rodape}>
          <Text style={styles.textoNeutro}>Lembrou sua senha? </Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.textoDestaque}>Entrar</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    backgroundColor: '#F4F8F7',
  },

  botaoVoltar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  // Cabeçalho
  cabecalho: {
    marginBottom: 32,
  },
  iconeContainer: {
    backgroundColor: '#DCEAE7',
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1A2422',
    marginBottom: 12,
  },
  subtitulo: {
    fontSize: 15,
    color: '#8A9A96',
    lineHeight: 22,
  },

  // Formulário
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333E3C',
    marginBottom: 6,
  },
  containerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 52,
    borderColor: '#E0EAE8',
    borderWidth: 1,
    marginBottom: 24,
    paddingHorizontal: 14,
  },
  iconeInput: {
    marginRight: 8,
  },
  inputInterno: {
    flex: 1,
    fontSize: 15,
  },

  // Botão principal
  botao: {
    flexDirection: 'row',
    backgroundColor: '#0E766D',
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  botaoTexto: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },

  // Aviso de segurança
  avisoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F2F0',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  avisoTexto: {
    color: '#0E766D',
    fontSize: 13,
    flexShrink: 1,
  },

  // Rodapé
  rodape: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 40,
  },
  textoNeutro: {
    color: '#8A9A96',
    fontSize: 14,
  },
  textoDestaque: {
    color: '#0E766D',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
