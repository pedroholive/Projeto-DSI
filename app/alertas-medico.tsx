import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
};

// Versão inicial: estado vazio. Será conectada às medições de glicemia
// dos pacientes vinculados quando a lógica de alertas estiver definida.
export default function AlertasMedicoScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Pressable style={styles.voltar} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
          <Text style={styles.voltarTexto}>Voltar</Text>
        </Pressable>

        <Text style={styles.titulo}>Alertas</Text>

        <View style={styles.card}>
          <Ionicons name="notifications-outline" size={40} color={C.muted} />
          <Text style={styles.cardTitulo}>Nenhum alerta no momento</Text>
          <Text style={styles.cardTexto}>
            Os alertas de medições fora da faixa dos seus pacientes
            vinculados aparecerão aqui.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: { padding: 20 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  voltarTexto: { color: C.primary, fontSize: 16, fontWeight: '600' },
  titulo: { fontSize: 28, fontWeight: '700', color: C.text, marginBottom: 20 },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    gap: 10,
  },
  cardTitulo: { fontSize: 17, fontWeight: '700', color: C.text },
  cardTexto: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21 },
});
