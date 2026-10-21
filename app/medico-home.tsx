import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { listarPacientesVinculados } from '../services/pacientesVinculadosService';

type DoctorProfile = {
  nome?: string;
  perfil?: 'patient' | 'professional';
  especialidade?: string | null;
  crm?: string | null;
};

type LinkedPatient = {
  id: string;
  nome: string;
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

// Consulta "DD/MM/AAAA" -> true se for hoje ou depois
function isTodayOrFuture(date?: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date ?? '');
  if (!m) return false;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

function doctorDisplayName(
  profile: DoctorProfile | null,
  user: User | null
) {
  const rawName =
    profile?.nome?.trim() ||
    user?.displayName?.trim() ||
    'Profissional';

  return /^(dr|dra)\.?\s/i.test(rawName)
    ? rawName
    : `Dr(a). ${rawName}`;
}

export default function DoctorHomeScreen() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(
    auth.currentUser
  );

  const [profile, setProfile] =
    useState<DoctorProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [patients, setPatients] = useState<LinkedPatient[]>([]);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setLoading(false);
          router.replace('/login');
          return;
        }

        try {
          const snapshot = await getDoc(
            doc(db, 'usuarios', currentUser.uid)
          );

          const data = snapshot.exists()
            ? (snapshot.data() as DoctorProfile)
            : null;

          if (
            data?.perfil &&
            data.perfil !== 'professional'
          ) {
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
      }
    );

    return unsubscribe;
  }, [router]);

  // Dados reais: pacientes vinculados e consultas agendadas pelo médico
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadData() {
        const uid = user?.uid;
        if (!uid) return;

        setDataLoading(true);
        setDataError('');

        let failed = '';

        // Pacientes vinculados (o nome vem do próprio vínculo: nomePaciente)
        try {
          const loaded = await listarPacientesVinculados();

          if (active) {
            setPatients(
              [...loaded].sort((a, b) =>
                a.nome.localeCompare(b.nome, 'pt-BR')
              )
            );
          }
        } catch (error) {
          console.error('Erro ao carregar vínculos da home:', error);
          failed = `pacientes (${(error as { code?: string }).code ?? 'erro'})`;
        }

        // Consultas agendadas pelo médico (independente dos pacientes)
        try {
          const appointmentsSnap = await getDocs(
            query(
              collection(db, 'consultas'),
              where('medicoId', '==', uid),
              // exigido pelas regras: só consultas marcadas por médico
              where('origem', '==', 'medico')
            )
          );

          const scheduled = appointmentsSnap.docs
            .map((d) => d.data())
            .filter(
              (c) =>
                (c.status === 'aguardando_confirmacao' ||
                  c.status === 'confirmada') &&
                isTodayOrFuture(c.data)
            ).length;

          if (active) setScheduledCount(scheduled);
        } catch (error) {
          console.error('Erro ao carregar consultas da home:', error);
          failed +=
            (failed ? ' e ' : '') +
            `consultas (${(error as { code?: string }).code ?? 'erro'})`;
        }

        if (active) {
          setDataError(
            failed ? `Não foi possível carregar: ${failed}.` : ''
          );
          setDataLoading(false);
        }
      }

      loadData();

      return () => {
        active = false;
      };
    }, [user?.uid])
  );

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');

    if (!term) return patients;

    return patients.filter(
      (patient) =>
        patient.nome.toLocaleLowerCase('pt-BR').includes(term) ||
        patient.id.toLocaleLowerCase('pt-BR').includes(term)
    );
  }, [patients, search]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={C.primary}
        />
        <Text style={styles.loadingText}>
          Carregando perfil...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* CABEÇALHO DO MÉDICO */}
        <View style={styles.header}>
          <View style={styles.doctorIcon}>
            <Ionicons
              name="medical-outline"
              size={28}
              color={C.primary}
            />
          </View>

          <View style={styles.headerText}>
            <Text
              style={styles.doctorName}
              numberOfLines={1}
            >
              {doctorDisplayName(profile, user)}
            </Text>

            <Text
              style={styles.specialty}
              numberOfLines={1}
            >
              {profile?.especialidade ||
                'Profissional de saúde'}
              {profile?.crm
                ? ` • CRM ${profile.crm}`
                : ''}
            </Text>
          </View>

          <Pressable
            style={styles.notificationButton}
            onPress={() => router.push('/alertas-medico' as Href)}
            accessibilityLabel="Notificações"
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={C.primary}
            />
          </Pressable>
        </View>

        {/* ACESSO À GLICEMIA PROFISSIONAL */}
        <Pressable
          onPress={() =>
            router.push('/glicemia-profissional' as Href)
          }
          style={({ pressed }) => [
            styles.glicemiaCard,
            pressed && styles.cardPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Consultar glicemia dos pacientes"
        >
          <View style={styles.glicemiaIcon}>
            <Ionicons
              name="pulse-outline"
              size={27}
              color={C.primary}
            />
          </View>

          <View style={styles.glicemiaInfo}>
            <Text style={styles.glicemiaTitle}>
              Glicemia dos pacientes
            </Text>

            <Text style={styles.glicemiaDescription}>
              Consulte gráficos, histórico e medições
              dos pacientes vinculados.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={23}
            color={C.primary}
          />
        </Pressable>

        {/* ACESSO AO VÍNCULO COM PACIENTES */}
        <Pressable
          onPress={() =>
            router.push('/meus-pacientes' as Href)
          }
          style={({ pressed }) => [
            styles.glicemiaCard,
            pressed && styles.cardPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Vincular paciente"
        >
          <View style={styles.glicemiaIcon}>
            <Ionicons
              name="person-add-outline"
              size={27}
              color={C.primary}
            />
          </View>

          <View style={styles.glicemiaInfo}>
            <Text style={styles.glicemiaTitle}>
              Vincular paciente
            </Text>

            <Text style={styles.glicemiaDescription}>
              Solicite o vínculo por código e acompanhe seus pacientes.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={23}
            color={C.primary}
          />
        </Pressable>

        {/* BUSCA */}
        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={24}
            color={C.muted}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar paciente vinculado..."
            placeholderTextColor={C.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />

          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              accessibilityLabel="Limpar busca"
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={C.muted}
              />
            </Pressable>
          )}
        </View>

        {/* RESUMO */}
        <Text style={styles.sectionTitle}>
          VISÃO GERAL DE HOJE
        </Text>

        <View style={styles.summaryRow}>
          <SummaryCard
            label="Pacientes"
            value={dataLoading ? '…' : String(patients.length)}
            suffix="ativos"
            color={C.primary}
          />

          <SummaryCard
            label="Alertas"
            value="—"
            suffix="em breve"
            color={C.muted}
          />

          <SummaryCard
            label="Consultas"
            value={dataLoading ? '…' : String(scheduledCount)}
            suffix="agendadas"
            color={C.text}
          />
        </View>

        {/* PACIENTES VINCULADOS */}
        <View style={styles.alertTitleRow}>
          <Text style={styles.sectionTitle}>
            SEUS PACIENTES
          </Text>

          <Pressable
            onPress={() => router.push('/meus-pacientes' as Href)}
          >
            <Text style={styles.seeAll}>
              Ver todos ({patients.length})
            </Text>
          </Pressable>
        </View>

        {dataError !== '' && (
          <Text style={styles.errorText}>{dataError}</Text>
        )}

        <View style={styles.alertList}>
          {dataLoading ? (
            <ActivityIndicator size="large" color={C.primary} />
          ) : filteredPatients.length > 0 ? (
            filteredPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onPress={() =>
                  router.push({
                    pathname: '/agendar-consulta-medica',
                    params: {
                      pacienteId: patient.id,
                      pacienteNome: patient.nome,
                    },
                  } as Href)
                }
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={30}
                color={C.muted}
              />

              <Text style={styles.emptyTitle}>
                {patients.length === 0
                  ? 'Nenhum paciente vinculado'
                  : 'Nenhum paciente encontrado'}
              </Text>

              <Text style={styles.emptyText}>
                {patients.length === 0
                  ? 'Use "Vincular paciente" para solicitar um vínculo.'
                  : 'Confira o nome informado.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* BARRA INFERIOR */}
      <View style={styles.bottomBar}>
        <BottomItem
          icon="people-outline"
          label="Pacientes"
          active
          onPress={() =>
            router.push('/meus-pacientes' as Href)
          }
        />

        <BottomItem
          icon="notifications-outline"
          label="Alertas"
          onPress={() =>
            router.push('/alertas-medico' as Href)
          }
        />

        <BottomItem
          icon="calendar-outline"
          label="Consultas"
          onPress={() =>
            router.push('/consultas-medico' as Href)
          }
        />

        <BottomItem
          icon="person-outline"
          label="Perfil"
          onPress={() =>
            router.push('/perfil-medico' as Href)
          }
        />
      </View>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  value,
  suffix,
  color,
  badge,
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
        <Text style={styles.summaryLabel}>
          {label}
        </Text>

        {badge && (
          <Text style={styles.badge}>
            {badge}
          </Text>
        )}
      </View>

      <Text
        style={[
          styles.summaryValue,
          { color },
        ]}
      >
        {value}
      </Text>

      <Text style={styles.summarySuffix}>
        {suffix}
      </Text>
    </View>
  );
}

function PatientCard({
  patient,
  onPress,
}: {
  patient: LinkedPatient;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.patientCard,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Agendar consulta para ${patient.nome}`}
    >
      <View style={styles.patientAvatar}>
        <Ionicons
          name="person-outline"
          size={27}
          color={C.muted}
        />
      </View>

      <View style={styles.patientInfo}>
        <Text
          style={styles.patientName}
          numberOfLines={1}
        >
          {patient.nome}
        </Text>

        <Text style={styles.patientMeta}>
          ID: #{patient.id.slice(0, 8)}
        </Text>

        <View style={styles.measureRow}>
          <Text
            style={[
              styles.alertBadge,
              {
                color: C.primary,
                backgroundColor: C.primaryPale,
              },
            ]}
          >
            Vínculo ativo
          </Text>

          <Text style={styles.measureUnit}>
            Toque para agendar consulta
          </Text>
        </View>
      </View>

      <Ionicons
        name="calendar-outline"
        size={24}
        color={C.primary}
      />
    </Pressable>
  );
}

function BottomItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.bottomItem}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={24}
        color={active ? C.primary : C.muted}
      />

      <Text
        style={[
          styles.bottomLabel,
          active && styles.bottomLabelActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.background,
    gap: 12,
  },

  loadingText: {
    color: C.muted,
    fontSize: 14,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 118,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  doctorIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.primaryPale,
    borderWidth: 1,
    borderColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
    marginHorizontal: 14,
  },

  doctorName: {
    color: C.text,
    fontSize: 22,
    fontWeight: '700',
  },

  specialty: {
    color: C.muted,
    fontSize: 13,
    marginTop: 3,
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },

  glicemiaCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 17,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  glicemiaIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: C.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },

  glicemiaInfo: {
    flex: 1,
  },

  glicemiaTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
  },

  glicemiaDescription: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    marginBottom: 26,
  },

  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    marginHorizontal: 10,
  },

  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.25,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 28,
  },

  summaryCard: {
    flex: 1,
    minHeight: 132,
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },

  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  summaryLabel: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '600',
  },

  badge: {
    color: C.danger,
    backgroundColor: C.dangerSoft,
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 9,
    fontWeight: '700',
  },

  summaryValue: {
    fontSize: 34,
    fontWeight: '800',
    marginTop: 14,
  },

  summarySuffix: {
    color: C.muted,
    fontSize: 11,
    marginTop: 1,
  },

  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  seeAll: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  alertList: {
    gap: 12,
  },

  patientCard: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },

  cardPressed: {
    opacity: 0.78,
  },

  patientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  patientInfo: {
    flex: 1,
  },

  patientHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  patientName: {
    flex: 1,
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },

  patientTime: {
    color: C.muted,
    fontSize: 12,
  },

  patientMeta: {
    color: C.muted,
    fontSize: 13,
    marginTop: 3,
  },

  measureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },

  alertBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
  },

  measureValue: {
    color: C.text,
    fontSize: 18,
    fontWeight: '800',
  },

  measureUnit: {
    color: C.muted,
    fontSize: 12,
  },

  errorText: {
    color: C.danger,
    fontSize: 14,
    marginBottom: 12,
  },

  emptyState: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 30,
    alignItems: 'center',
  },

  emptyTitle: {
    color: C.text,
    fontWeight: '700',
    fontSize: 15,
    marginTop: 10,
  },

  emptyText: {
    color: C.muted,
    fontSize: 13,
    marginTop: 4,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 82,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
    paddingBottom: 14,
  },

  bottomItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },

  bottomLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '500',
  },

  bottomLabelActive: {
    color: C.primary,
    fontWeight: '700',
  },
});