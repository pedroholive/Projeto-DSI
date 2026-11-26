import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LinkEnviadoScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.iconeContainer}>
        <Ionicons name="checkmark-circle-outline" size={40} color="#0E766D" />
      </View>

      <Text style={styles.titulo}>Link enviado!</Text>
      <Text style={styles.subtitulo}>
        Se houver uma conta cadastrada com{' '}
        <Text style={styles.emailDestaque}>{email || 'esse e-mail'}</Text>, você vai receber um
        link para criar uma nova senha.
      </Text>

      <View style={styles.dicaContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#0E766D" />
        <Text style={styles.dicaTexto}>
          Não encontrou o e-mail? Verifique também sua caixa de spam ou lixo eletrônico.
        </Text>
      </View>

      <Pressable style={styles.botao} onPress={() => router.replace('/login')}>
        <Text style={styles.botaoTexto}>Voltar para o login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F4F8F7',
  },
  iconeContainer: {
    backgroundColor: '#DCEAE7',
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A2422',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitulo: {
    fontSize: 15,
    color: '#8A9A96',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emailDestaque: {
    color: '#333E3C',
    fontWeight: '600',
  },
  dicaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F2F0',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 32,
  },
  dicaTexto: {
    color: '#0E766D',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  botao: {
    backgroundColor: '#0E766D',
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
