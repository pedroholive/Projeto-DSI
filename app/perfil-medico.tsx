import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, db } from '@/firebaseConfig';

const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
  danger: '#D94B57',
};

interface DadosPerfil {
  nome: string;
  email: string;
  especialidade: string;
  verificado: boolean;
}

export default function PerfilMedicoScreen() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<DadosPerfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    async function carregar() {
      const usuario = auth.currentUser;
      if (!usuario) {
        setCarregando(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'usuarios', usuario.uid));
        const d = snap.exists() ? snap.data() : {};
        setPerfil({
          nome: d.nome ?? 'Médico',
          email: usuario.email ?? d.email ?? '',
          especialidade: d.especialidade ?? 'Médico',
          verificado: d.verificado === true,
        });
      } catch (e) {
        console.error('Erro ao carregar perfil:', e);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  async function sair() {
    if (saindo) return;
    setSaindo(true);
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (e) {
      console.error('Erro ao sair:', e);
      setSaindo(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.voltar} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
          <Text style={styles.voltarTexto}>Voltar</Text>
        </Pressable>

        <Text style={styles.titulo}>Perfil</Text>

        {carregando ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={36} color={C.primary} />
            </View>
            <Text style={styles.nome}>{perfil?.nome ?? 'Médico'}</Text>
            <Text style={styles.email}>{perfil?.email}</Text>

            <View style={styles.linha}>
              <Text style={styles.rotulo}>Especialidade</Text>
              <Text style={styles.valor}>{perfil?.especialidade}</Text>
            </View>
            <View style={styles.linha}>
              <Text style={styles.rotulo}>Conta</Text>
              <Text style={styles.valor}>
                {perfil?.verificado ? 'Verificada' : 'Aguardando verificação'}
              </Text>
            </View>
          </View>
        )}

        <Pressable
          style={[styles.sair, saindo && { opacity: 0.5 }]}
          onPress={sair}
          disabled={saindo}
        >
          <Ionicons name="log-out-outline" size={20} color={C.danger} />
          <Text style={styles.sairTexto}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: { padding: 20, paddingBottom: 40 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  voltarTexto: { color: C.primary, fontSize: 16, fontWeight: '600' },
  titulo: { fontSize: 28, fontWeight: '700', color: C.text, marginBottom: 20 },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E3F3F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  nome: { fontSize: 20, fontWeight: '700', color: C.text },
  email: { fontSize: 14, color: C.muted, marginTop: 4, marginBottom: 18 },
  linha: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  rotulo: { color: C.muted, fontSize: 14 },
  valor: { color: C.text, fontSize: 14, fontWeight: '600' },
  sair: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.danger,
  },
  sairTexto: { color: C.danger, fontSize: 16, fontWeight: '700' },
});
