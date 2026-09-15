import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            <Text style={styles.saudacao}>Olá, Paciente</Text>
            <Text style={styles.subtitulo}>Acompanhamento em dia</Text>
          </View>
          <Pressable style={styles.perfilBtn}>
            <Ionicons name="person-outline" size={22} color="#0E766D" />
          </Pressable>
        </View>

        {/* Card de Resumo das Comorbidades */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="pulse-outline" size={20} color="#0E766D" />
            <Text style={styles.statusTitulo}>Últimas Aferições</Text>
          </View>

          <View style={styles.metricasContainer}>
            <View style={styles.metricaItem}>
              <Text style={styles.metricaLabel}>Pressão Arterial</Text>
              <Text style={styles.metricaValor}>120/80 <Text style={styles.unidade}>mmHg</Text></Text>
              <View style={[styles.tagStatus, { backgroundColor: '#E8F5E9' }]}>
                <Text style={[styles.tagTexto, { color: '#2E7D32' }]}>Normal</Text>
              </View>
            </View>

            <View style={styles.divisorVertical} />

            <View style={styles.metricaItem}>
              <Text style={styles.metricaLabel}>Glicemia (Jejum)</Text>
              <Text style={styles.metricaValor}>95 <Text style={styles.unidade}>mg/dL</Text></Text>
              <View style={[styles.tagStatus, { backgroundColor: '#E8F5E9' }]}>
                <Text style={[styles.tagTexto, { color: '#2E7D32' }]}>Controlada</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Seção de Ações Rápidas */}
        <Text style={styles.secaoTitulo}>Registros e Cuidados</Text>

        <View style={styles.grid}>
          {/* Card Pressão */}
          <Pressable style={styles.cardAcao}>
            <View style={[styles.iconeContainer, { backgroundColor: '#FDE8E8' }]}>
              <Ionicons name="heart-outline" size={26} color="#E02424" />
            </View>
            <Text style={styles.cardTitulo}>Pressão</Text>
            <Text style={styles.cardSub}>Registrar aferição</Text>
          </Pressable>

          {/* Card Glicemia */}
          <Pressable style={styles.cardAcao}>
            <View style={[styles.iconeContainer, { backgroundColor: '#E1EFFE' }]}>
              <Ionicons name="water-outline" size={26} color="#1A56DB" />
            </View>
            <Text style={styles.cardTitulo}>Glicemia</Text>
            <Text style={styles.cardSub}>Nível de glicose</Text>
          </Pressable>

          {/* Card Medicamentos */}
          <Pressable style={styles.cardAcao}>
            <View style={[styles.iconeContainer, { backgroundColor: '#FEF08A' }]}>
              <Ionicons name="medkit-outline" size={26} color="#A16207" />
            </View>
            <Text style={styles.cardTitulo}>Remédios</Text>
            <Text style={styles.cardSub}>Horários e doses</Text>
          </Pressable>

          {/* Card Consultas */}
          <Pressable style={styles.cardAcao}>
            <View style={[styles.iconeContainer, { backgroundColor: '#E6F4EA' }]}>
              <Ionicons name="calendar-outline" size={26} color="#0E766D" />
            </View>
            <Text style={styles.cardTitulo}>Consultas</Text>
            <Text style={styles.cardSub}>Próximas visitas</Text>
          </Pressable>
        </View>

        {/* Card Informativo */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={22} color="#0E766D" />
          <Text style={styles.infoTexto}>
            Mantenha as medições atualizadas para gerar relatórios precisos ao seu médico assistente.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8F7',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  saudacao: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333E3C',
  },
  subtitulo: {
    fontSize: 14,
    color: '#8A9A96',
    marginTop: 2,
  },
  perfilBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0EAE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0EAE8',
    marginBottom: 28,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statusTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333E3C',
  },
  metricasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricaItem: {
    flex: 1,
  },
  metricaLabel: {
    fontSize: 13,
    color: '#8A9A96',
    marginBottom: 4,
  },
  metricaValor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333E3C',
  },
  unidade: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#8A9A96',
  },
  tagStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  tagTexto: {
    fontSize: 11,
    fontWeight: '600',
  },
  divisorVertical: {
    width: 1,
    height: 48,
    backgroundColor: '#E0EAE8',
    marginHorizontal: 16,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333E3C',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  cardAcao: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0EAE8',
  },
  iconeContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333E3C',
  },
  cardSub: {
    fontSize: 12,
    color: '#8A9A96',
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E6F4EA',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 12,
  },
  infoTexto: {
    flex: 1,
    fontSize: 12,
    color: '#0E766D',
    lineHeight: 18,
  },
});