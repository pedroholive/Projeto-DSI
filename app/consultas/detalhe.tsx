import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import BotaoAbrirRota from '@/components/botaoabrirrota';
import MapaConsulta from '@/components/mapaconsulta';
import { auth } from '@/firebaseConfig';
import { buscarConsultaPorId, type Consulta } from '@/services/consultaService';

const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
  warning: '#B7791F',
  warningBg: '#FBF3E0',
  danger: '#D94B57',
  dangerBg: '#FCE9EB',
  okBg: '#E3F3F1',
  neutralBg: '#EEF2F1',
};

const STATUS_INFO: Record<
  string,
  { texto: string; cor: string; fundo: string }
> = {
  aguardando_confirmacao: {
    texto: 'Aguardando sua resposta',
    cor: C.warning,
    fundo: C.warningBg,
  },
  confirmada: { texto: 'Confirmada', cor: C.primary, fundo: C.okBg },
  recusada: { texto: 'Recusada', cor: C.danger, fundo: C.dangerBg },
  cancelada: { texto: 'Cancelada pelo médico', cor: C.muted, fundo: C.neutralBg },
};

// Tela só de leitura para consultas agendadas pelo médico (o paciente não edita)
export default function DetalheConsultaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const usuario = auth.currentUser;
        if (!usuario || !id) {
          throw new Error('Consulta indisponível.');
        }

        const dados = await buscarConsultaPorId(id, usuario.uid);
        if (!ativo) return;

        if (!dados) {
          setErro('Consulta não encontrada.');
        } else {
          setConsulta(dados);
        }
      } catch (e) {
        if (!ativo) return;
        console.error('Erro ao carregar consulta:', e);
        setErro('Não foi possível carregar a consulta.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [id]);

  const info = consulta
    ? STATUS_INFO[consulta.status ?? ''] ?? {
        texto: 'Registro pessoal',
        cor: C.primary,
        fundo: C.okBg,
      }
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.voltar} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={C.primary} />
          <Text style={styles.voltarTexto}>Voltar</Text>
        </Pressable>

        <Text style={styles.titulo}>Consulta</Text>

        {carregando ? (
          <View style={styles.centro}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : erro !== '' || !consulta || !info ? (
          <Text style={styles.erro}>{erro || 'Consulta não encontrada.'}</Text>
        ) : (
          <View style={styles.card}>
            <View style={styles.linhaTopo}>
              <Text style={styles.especialidade}>{consulta.especialidade}</Text>
              <View style={[styles.badge, { backgroundColor: info.fundo }]}>
                <Text style={[styles.badgeTexto, { color: info.cor }]}>
                  {info.texto}
                </Text>
              </View>
            </View>

            <View style={styles.detalhe}>
              <Ionicons name="person-outline" size={16} color={C.muted} />
              <Text style={styles.detalheTexto}>{consulta.medico}</Text>
            </View>

            <View style={styles.detalhe}>
              <Ionicons name="calendar-outline" size={16} color={C.muted} />
              <Text style={styles.detalheTexto}>
                {consulta.data} às {consulta.horario}
              </Text>
            </View>

            <View style={styles.detalhe}>
              <Ionicons name="location-outline" size={16} color={C.muted} />
              <Text style={styles.detalheTexto}>{consulta.local}</Text>
            </View>

            {!!consulta.observacao && (
              <Text style={styles.obs}>{consulta.observacao}</Text>
            )}

            {consulta.latitude !== undefined &&
              consulta.longitude !== undefined && (
                <View style={{ marginTop: 14 }}>
                  <MapaConsulta
                    latitude={consulta.latitude}
                    longitude={consulta.longitude}
                    titulo={consulta.local}
                  />
                </View>
              )}

            <BotaoAbrirRota
              latitude={consulta.latitude}
              longitude={consulta.longitude}
              endereco={consulta.local}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content: { padding: 20, paddingBottom: 40 },
  voltar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  voltarTexto: { color: C.primary, fontSize: 16, fontWeight: '600' },
  titulo: { fontSize: 28, fontWeight: '700', color: C.text, marginBottom: 18 },
  centro: { alignItems: 'center', paddingVertical: 30 },
  erro: { color: C.danger, fontSize: 14 },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  especialidade: { flex: 1, color: C.primary, fontSize: 17, fontWeight: '700' },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  badgeTexto: { fontSize: 12, fontWeight: '700' },
  detalhe: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  detalheTexto: { color: C.text, fontSize: 14 },
  obs: { color: C.muted, fontSize: 13, marginTop: 10, lineHeight: 19 },
});