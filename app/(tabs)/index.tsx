import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, db } from '../../firebaseConfig';

const COLORS = {
  background: '#F4F5F7',
  card: '#FFFFFF',
  text: '#20283A',
  muted: '#6B7280',
  teal: '#079A91',
  tealDark: '#087B75',
  tealSoft: '#E8FAF7',
  tealBorder: '#B8ECE5',
  pink: '#FF5571',
  pinkSoft: '#FFE8ED',
  border: '#E8EAEE',
};

function firstName(fullName?: string | null) {
  const cleanName = fullName?.trim();
  return cleanName ? cleanName.split(/\s+/)[0] : 'Paciente';
}

function formatCurrentDate() {
  const value = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function HomeScreen() {
  const [patientName, setPatientName] = useState(() => firstName(auth.currentUser?.displayName));
  const [medicationTaken, setMedicationTaken] = useState(false);
  const currentDate = useMemo(formatCurrentDate, []);

  useEffect(() => {
    let active = true;

    async function loadPatientName() {
      const user = auth.currentUser;
      if (!user) return;

      setPatientName(firstName(user.displayName));

      try {
        const profileSnapshot = await getDoc(doc(db, 'usuarios', user.uid));
        const profileName = profileSnapshot.data()?.nome;

        if (active && typeof profileName === 'string') {
          setPatientName(firstName(profileName));
        }
      } catch {
        // O displayName do Firebase Auth permanece como alternativa offline.
      }
    }

    loadPatientName();
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {patientName}!</Text>
            <Text style={styles.date}>{currentDate}</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} accessibilityLabel="Abrir notificações">
              <Ionicons name="notifications-outline" size={20} color={COLORS.teal} />
            </Pressable>
            <Pressable style={styles.avatar} accessibilityLabel="Abrir perfil">
              <Ionicons name="person" size={21} color={COLORS.tealDark} />
            </Pressable>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <View style={styles.metricTopRow}>
              <Text style={styles.metricLabel}>Glicose</Text>
              <View style={styles.fastBadge}><Text style={styles.fastBadgeText}>Jejum</Text></View>
            </View>
            <View style={styles.metricValueRow}>
              <Text style={[styles.metricValue, { color: COLORS.teal }]}>98</Text>
              <Text style={styles.metricUnit}>mg/dL</Text>
            </View>
            <View style={styles.statusRow}>
              <Ionicons name="trending-down" size={14} color={COLORS.teal} />
              <Text style={styles.goodStatus}>Estável</Text>
              <Text style={styles.statusTime}>• Há 1h</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricTopRow}>
              <Text style={styles.metricLabel}>Pressão</Text>
              <View style={styles.normalBadge}><Text style={styles.normalBadgeText}>Normal</Text></View>
            </View>
            <View style={styles.metricValueRow}>
              <Text style={styles.pressureValue}>120</Text>
              <Text style={styles.pressureDivider}>/</Text>
              <Text style={styles.pressureValue}>80</Text>
              <Text style={styles.metricUnit}>mmHg</Text>
            </View>
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.muted} />
              <Text style={styles.neutralStatus}>Aferida hoje cedo</Text>
            </View>
          </View>
        </View>

        <View style={styles.adherenceCard}>
          <View style={styles.progressRing}><Text style={styles.progressText}>85%</Text></View>
          <View style={styles.adherenceText}>
            <Text style={styles.cardTitle}>Adesão aos Medicamentos</Text>
            <Text style={styles.cardDescription}>Você tomou 3 de 4 doses programadas para hoje.</Text>
          </View>
        </View>

        <View style={styles.medicationCard}>
          <View style={styles.medicationHeader}>
            <View style={styles.nextMedication}>
              <Ionicons name="time-outline" size={17} color={COLORS.teal} />
              <Text style={styles.nextMedicationText}>Próxima medicação às 20:00</Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={COLORS.teal} />
          </View>

          <View style={styles.medicationBody}>
            <View style={styles.medicationInfo}>
              <Text style={styles.medicationName}>Cloridrato de Metformina</Text>
              <Text style={styles.medicationDose}>850 mg • 1 comprimido com jantar</Text>
            </View>
            <Pressable
              style={[styles.takeButton, medicationTaken && styles.takenButton]}
              onPress={() => setMedicationTaken(current => !current)}
              accessibilityRole="button"
            >
              <Text style={styles.takeButtonText}>{medicationTaken ? 'Tomado' : 'Tomar'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons name="heart-outline" size={24} color={COLORS.pink} />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipLabel}>Dica de Saúde</Text>
            <Text style={styles.tipText}>
              A caminhada leve após a refeição ajuda a diminuir os picos de glicose pós-prandial.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 4 },
  greeting: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  date: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#DDF2EF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.card },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metricCard: { flex: 1, minHeight: 112, backgroundColor: COLORS.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  metricTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricLabel: { color: COLORS.muted, fontSize: 12 },
  fastBadge: { backgroundColor: COLORS.tealSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
  fastBadgeText: { color: COLORS.tealDark, fontSize: 10, fontWeight: '700' },
  normalBadge: { backgroundColor: COLORS.pinkSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
  normalBadgeText: { color: COLORS.pink, fontSize: 10, fontWeight: '700' },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 9 },
  metricValue: { fontSize: 28, lineHeight: 31, fontWeight: '800' },
  pressureValue: { color: COLORS.text, fontSize: 25, lineHeight: 31, fontWeight: '800' },
  pressureDivider: { color: COLORS.muted, fontSize: 19, marginHorizontal: 2 },
  metricUnit: { color: COLORS.muted, fontSize: 10, marginLeft: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  goodStatus: { color: COLORS.teal, fontSize: 10, fontWeight: '700', marginLeft: 3 },
  neutralStatus: { color: COLORS.muted, fontSize: 10, marginLeft: 3 },
  statusTime: { color: COLORS.muted, fontSize: 10, marginLeft: 3 },
  adherenceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  progressRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 5, borderColor: COLORS.teal, alignItems: 'center', justifyContent: 'center' },
  progressText: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  adherenceText: { flex: 1, marginLeft: 14 },
  cardTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  cardDescription: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  medicationCard: { backgroundColor: COLORS.tealSoft, borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.tealBorder },
  medicationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextMedication: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextMedicationText: { color: COLORS.teal, fontSize: 11, fontWeight: '700' },
  medicationBody: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  medicationInfo: { flex: 1, paddingRight: 8 },
  medicationName: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  medicationDose: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  takeButton: { minWidth: 68, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, backgroundColor: COLORS.teal, alignItems: 'center' },
  takenButton: { backgroundColor: COLORS.tealDark },
  takeButtonText: { color: COLORS.card, fontSize: 11, fontWeight: '800' },
  tipCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: COLORS.border },
  tipIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  tipContent: { flex: 1, marginLeft: 12 },
  tipLabel: { color: COLORS.pink, fontSize: 11, fontWeight: '800' },
  tipText: { color: COLORS.text, fontSize: 12, lineHeight: 17, marginTop: 3 },
});