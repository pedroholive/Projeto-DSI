import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo ao Health Sync</Text>
      
      <Link href="/login" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Acessar Conta</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E6F4F1' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1C7C6E', marginBottom: 20 },
  button: { backgroundColor: '#1C7C6E', padding: 15, borderRadius: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});