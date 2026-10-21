import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E9F8C',
  primaryDark: '#0E766D',
  primarySoft: '#E7F8F4',
  text: '#273331',
  muted: '#7E8D89',
  border: '#E0EAE8',
};

type OpcaoProps = {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
  onPress: () => void;
};

function Opcao({
  icone,
  titulo,
  descricao,
  onPress,
}: OpcaoProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.opcao,
        pressed && styles.opcaoPressionada,
      ]}
      onPress={onPress}
    >
      <View style={styles.iconeContainer}>
        <Ionicons
          name={icone}
          size={22}
          color={C.primaryDark}
        />
      </View>

      <View style={styles.textos}>
        <Text style={styles.opcaoTitulo}>
          {titulo}
        </Text>

        <Text style={styles.opcaoDescricao}>
          {descricao}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={21}
        color={C.muted}
      />
    </Pressable>
  );
}

export default function MaisScreen() {
  const router = useRouter();

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.titulo}>
                Mais
              </Text>

              <Text style={styles.descricao}>
                Outras opções do HealthSync.
              </Text>
            </View>

            <View style={styles.headerIcone}>
              <Ionicons
                name="menu-outline"
                size={23}
                color={C.primaryDark}
              />
            </View>
          </View>

          <View style={styles.opcoes}>
            <Opcao
              icone="calendar-outline"
              titulo="Consultas"
              descricao="Acompanhe e organize suas consultas"
              onPress={() => router.push('/consultas')}
            />

            <Opcao
              icone="medkit-outline"
              titulo="Medicamentos"
              descricao="Acompanhe seus medicamentos"
              onPress={() => router.push('/remedios')}
            />

            <Opcao
              icone="people-outline"
              titulo="Meus médicos"
              descricao="Gerencie seus vínculos com profissionais de saúde"
              onPress={() => router.push('/meus-medicos')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },

  content: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  titulo: {
    fontSize: 25,
    fontWeight: '700',
    color: C.text,
  },

  descricao: {
    fontSize: 13,
    color: C.muted,
    marginTop: 4,
  },

  headerIcone: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  opcoes: {
    gap: 12,
  },

  opcao: {
    minHeight: 82,
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  opcaoPressionada: {
    opacity: 0.78,
  },

  iconeContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  textos: {
    flex: 1,
    paddingRight: 10,
  },

  opcaoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },

  opcaoDescricao: {
    fontSize: 12,
    color: C.muted,
    marginTop: 3,
    lineHeight: 17,
  },
});

