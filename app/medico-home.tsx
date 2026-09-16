import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, db } from '../firebaseConfig';

type DoctorProfile = {
  nome?: string;
  perfil?: 'patient' | 'professional';
  especialidade?: string | null;
  crm?: string | null;
};

type PatientAlert = {
  id: string;
  nome: string;
  idade: number;
  tempo: string;
  alerta: string;
  valor: string;
  unidade: string;
  nivel: 'critical' | 'warning';
};

const C = {
  background: '#F4F8F7',
  card: '#FFFFFF',
  primary: '#0E766D',
  primarySoft: '#DCEAE7',
  primaryPale: '#E8F2F0',
  text: '#333E3C',
  muted: '#8A9A96',
  border: '#E0EAE8',
  danger: '#D94B57',
  dangerSoft: '#FDE8EA',
  warning: '#B7791F',
  warningSoft: '#FFF3D6',
};

const alertas: PatientAlert[] = [
  {
    id: '5436', nome: 'Mariana Souza', idade: 54, tempo: 'Há 12 min',
    alerta: 'Glicose crítica', valor: '245', unidade: 'mg/dL', nivel: 'critical',
  },
  {
    id: '9587', nome: 'Roberto Alves', idade: 67, tempo: 'Há 35 min',
    alerta: 'P.A. limite', valor: '145/95', unidade: 'mmHg', nivel: 'warning',
  },
  {
    id: '4821', nome: 'Ana Julia Costa', idade: 29, tempo: 'Há 1h',
    alerta: 'Hipoglicemia', valor: '62', unidade: 'mg/dL', nivel: 'critical',
  },
  {
    id: '7291', nome: 'Marcos Pereira', idade: 71, tempo: 'Há 2h',
    alerta: 'Crise hipertensiva', valor: '180/110', unidade: 'mmHg', nivel: 'critical',
  },
];

function doctorDisplayName(profile: DoctorProfile | null, user: User | null) {
  const rawName = profile?.nome?.trim() || user?.displayName?.trim() || 'Profissional';
  return /^dr\.?\s|^dra\.?\s/i.test(rawName) ? rawName : `Dr(a). ${rawName}`;
}

export default function DoctorHomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        router.replace('/login');
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, 'usuarios', currentUser.uid));
        const data = snapshot.exists() ? snapshot.data() as DoctorProfile : null;

        if (data?.perfil && data.perfil !== 'professional') {
          router.replace('/(tabs)');
          return;
        }

        setProfile(data);
      } catch {
        Alert.alert(
          'Perfil indisponível',
          'Não foi possível carregar seus dados profissionais. Tente novamente.'
        );
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [router]);

  const filteredAlerts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return alertas;

    return alertas.filter(patient =>
      patient.nome.toLocaleLowerCase('pt-BR').includes(term) || patient.id.includes(term)
    );
  }, [search]);

  const handleLogout = () => {
    Alert.alert('Sair do aplicativo', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await signOut(auth);
          router.replace('/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.doctorIcon}>
            <Ionicons name="medical-outline" size={28} color={C.primary} />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.doctorName} numberOfLines={1}>
              {doctorDisplayName(profile, user)}
            </Text>
            <Text style={styles.specialty} numberOfLines={1}>
              {profile?.especialidade || 'Profissional de saúde'}
              {profile?.crm ? ` • CRM ${profile.crm}` : ''}
            </Text>
          </View>

          <Pressable style={styles.notificationButton} accessibilityLabel="Notificações">
            <Ionicons name="notifications-outline" size={24} color={C.primary} />
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={24} color={C.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar paciente por nome ou ID..."
            placeholderTextColor={C.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} accessibilityLabel="Limpar busca">
              <Ionicons name="close-circle" size={20} color={C.muted} />
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionTitle}>VISÃO GERAL DE HOJE</Text>

        <View style={styles.summaryRow}>
          <SummaryCard label="Pacientes" value="142" suffix="ativos" color={C.primary} />
          <SummaryCard label="Alertas" value="5" suffix="críticos" color={C.danger} badge="Ação" />
          <SummaryCard label="Consultas" value="8" suffix="agendadas" color={C.text} />
        </View>

        <View style={styles.alertTitleRow}>
          <Text style={styles.sectionTitle}>PACIENTES EM ALERTA</Text>
          <Pressable>
            <Text style={styles.seeAll}>Ver todos (5)</Text>
          </Pressable>
        </View>

        <View style={styles.alertList}>
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map(patient => <PatientCard key={patient.id} patient={patient} />)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={30} color={C.muted} />
              <Text style={styles.emptyTitle}>Nenhum paciente encontrado</Text>
              <Text style={styles.emptyText}>Confira o nome ou o ID informado.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <BottomItem icon="people-outline" label="Pacientes" active />
        <BottomItem icon="notifications-outline" label="Alertas" />
        <BottomItem icon="calendar-outline" label="Consultas" />
        <BottomItem icon="person-outline" label="Perfil" onPress={handleLogout} />
      </View>
    </SafeAreaView>
  );
}

function SummaryCard({
  label, value, suffix, color, badge,
}: {
  label: string;
  value: string;
  suffix: string;
  color: string;
  badge?: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryLabelRow}>
        <Text style={styles.summaryLabel}>{label}</Text>
        {badge && <Text style={styles.badge}>{badge}</Text>}
      </View>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summarySuffix}>{suffix}</Text>
    </View>
  );
}

function PatientCard({ patient }: { patient: PatientAlert }) {
  const isCritical = patient.nivel === 'critical';
  const accent = isCritical ? C.danger : C.warning;
  const accentSoft = isCritical ? C.dangerSoft : C.warningSoft;

  return (
    <Pressable style={({ pressed }) => [styles.patientCard, pressed && styles.cardPressed]}>
      <View style={styles.patientAvatar}>
        <Ionicons name="person-outline" size={27} color={C.muted} />
      </View>

      <View style={styles.patientInfo}>
        <View style={styles.patientHeading}>
          <Text style={styles.patientName} numberOfLines={1}>{patient.nome}</Text>
          <Text style={styles.patientTime}>{patient.tempo}</Text>
        </View>
        <Text style={styles.patientMeta}>{patient.idade} anos • ID: #{patient.id}</Text>
        <View style={styles.measureRow}>
          <Text style={[styles.alertBadge, { color: accent, backgroundColor: accentSoft }]}>
            {patient.alerta}
          </Text>
          <Text style={styles.measureValue}>{patient.valor}</Text>
          <Text style={styles.measureUnit}>{patient.unidade}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={24} color={C.primary} />
    </Pressable>
  );
}

function BottomItem({
  icon, label, active = false, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.bottomItem} onPress={onPress}>
      <Ionicons name={icon} size={24} color={active ? C.primary : C.muted} />
      <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.background },
  loading: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.background, gap: 12,
  },
  loadingText: { color: C.muted, fontSize: 14 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 118 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  doctorIcon: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: C.primaryPale,
    borderWidth: 1, borderColor: C.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1, marginHorizontal: 14 },
  doctorName: { color: C.text, fontSize: 22, fontWeight: '700' },
  specialty: { color: C.muted, fontSize: 13, marginTop: 3 },
  notificationButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.primaryPale,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    height: 56, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, marginBottom: 26,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 15, marginHorizontal: 10 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.25 },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 28 },
  summaryCard: {
    flex: 1, minHeight: 132, backgroundColor: C.card, borderRadius: 18,
    borderWidth: 1, borderColor: C.border, padding: 14,
  },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryLabel: { color: C.muted, fontSize: 12, fontWeight: '600' },
  badge: {
    color: C.danger, backgroundColor: C.dangerSoft, borderRadius: 7,
    paddingHorizontal: 5, paddingVertical: 2, fontSize: 9, fontWeight: '700',
  },
  summaryValue: { fontSize: 34, fontWeight: '800', marginTop: 14 },
  summarySuffix: { color: C.muted, fontSize: 11, marginTop: 1 },
  alertTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  seeAll: { color: C.primary, fontSize: 14, fontWeight: '700' },
  alertList: { gap: 12 },
  patientCard: {
    minHeight: 128, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14,
  },
  cardPressed: { opacity: 0.78 },
  patientAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: C.background,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  patientInfo: { flex: 1 },
  patientHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patientName: { flex: 1, color: C.text, fontSize: 17, fontWeight: '700', marginRight: 8 },
  patientTime: { color: C.muted, fontSize: 12 },
  patientMeta: { color: C.muted, fontSize: 13, marginTop: 3 },
  measureRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  alertBadge: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '700',
  },
  measureValue: { color: C.text, fontSize: 18, fontWeight: '800' },
  measureUnit: { color: C.muted, fontSize: 12 },
  emptyState: {
    backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border,
    padding: 30, alignItems: 'center',
  },
  emptyTitle: { color: C.text, fontWeight: '700', fontSize: 15, marginTop: 10 },
  emptyText: { color: C.muted, fontSize: 13, marginTop: 4 },
  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 82,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 10, paddingBottom: 14,
  },
  bottomItem: { flex: 1, alignItems: 'center', gap: 4 },
  bottomLabel: { color: C.muted, fontSize: 11, fontWeight: '500' },
  bottomLabelActive: { color: C.primary, fontWeight: '700' },
});
