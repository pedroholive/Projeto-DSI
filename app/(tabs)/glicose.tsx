import { View, Text, StyleSheet } from 'react-native';

export default function GlicoseScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Glicose</Text>

      <Text style={styles.descricao}>
        Acompanhamento dos registros de glicemia.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8F7',
    padding: 20,
  },

  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#273331',
  },

  descricao: {
    fontSize: 14,
    color: '#7E8D89',
    marginTop: 6,
  },
});