import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';

interface Props {
  latitude?: number;
  longitude?: number;
  endereco?: string; // usado quando não há coordenadas
}

export default function BotaoAbrirRota({ latitude, longitude, endereco }: Props) {
  const destino =
    latitude !== undefined && longitude !== undefined
      ? `${latitude},${longitude}`
      : (endereco ?? '').trim();

  if (!destino) return null;

  function abrir() {
    const url =
      'https://www.google.com/maps/dir/?api=1&destination=' +
      encodeURIComponent(destino);

    Linking.openURL(url).catch((erro) =>
      console.warn('Não foi possível abrir a rota:', erro)
    );
  }

  return (
    <Pressable style={styles.botao} onPress={abrir} accessibilityLabel="Abrir rota">
      <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
      <Text style={styles.texto}>Abrir rota</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0E766D',
    padding: 13,
    borderRadius: 12,
    marginTop: 10,
  },
  texto: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});