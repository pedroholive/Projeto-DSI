import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function MaisScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Mais</Text>

      <Text style={styles.descricao}>
        Outras opções do HealthSync.
      </Text>

      <View style={styles.opcoes}>
        {/* Consultas */}
        <Pressable
          style={styles.opcao}
          onPress={() => router.push('/consultas')}
        >
          <View style={styles.iconeContainer}>
            <Ionicons
              name="calendar-outline"
              size={23}
              color="#0E766D"
            />
          </View>

          <View style={styles.textos}>
            <Text style={styles.opcaoTitulo}>
              Consultas
            </Text>

            <Text style={styles.opcaoDescricao}>
              Acompanhe suas consultas
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#7E8D89"
          />
        </Pressable>
      </View>
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

  opcoes: {
    marginTop: 28,
  },

  opcao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,

    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1,
    borderColor: '#E6EEEB',
  },

  iconeContainer: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#DDF3EC',

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: 14,
  },

  textos: {
    flex: 1,
  },

  opcaoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#273331',
  },

  opcaoDescricao: {
    fontSize: 13,
    color: '#7E8D89',
    marginTop: 3,
  },
});