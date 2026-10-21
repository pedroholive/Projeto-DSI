import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Medicamento } from "@/services/medicamentoService";
import {
  ROTULO_STATUS,
  resumoDosagem,
  statusMedicamento,
  textoDuracao,
  textoFrequencia,
  textoProximaDose,
} from "@/utils/medicamentos";

import { COR, estilosComuns } from "./estilos-comuns";

export function CardMedicamento({
  medicamento,
  agora,
  onAbrir,
}: {
  medicamento: Medicamento;
  agora: Date;
  onAbrir: (m: Medicamento) => void;
}) {
  const status = statusMedicamento(medicamento, agora);
  const proxima = textoProximaDose(medicamento, agora);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${medicamento.nome}, ${resumoDosagem(medicamento)}, ${ROTULO_STATUS[status]}. Abrir detalhes.`}
      style={({ pressed }) => [
        styles.medCard,
        pressed && styles.pressed,
      ]}
      onPress={() => onAbrir(medicamento)}
    >
      <View style={styles.medCardTop}>
        <View style={styles.medIcon}>
          <MaterialCommunityIcons name="pill" size={28} color={COR} />
        </View>
        <View style={estilosComuns.flex}>
          <Text style={styles.medName}>{medicamento.nome}</Text>
          <Text style={styles.medDose}>{resumoDosagem(medicamento)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#83918E" />
      </View>
      <View style={styles.medInfoRow}>
        <View
          style={[
            styles.statusBadge,
            status === "agendado" && styles.scheduledBadge,
            status === "finalizado" && styles.finishedBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              status === "agendado" && styles.scheduledText,
              status === "finalizado" && styles.finishedText,
            ]}
          >
            {ROTULO_STATUS[status]}
          </Text>
        </View>
        <Text style={styles.frequency}>
          {textoFrequencia(medicamento.frequencia)}
        </Text>
      </View>
      <View style={styles.timeChips}>
        {[...medicamento.horarios].sort().map((horario, index) => (
          <View key={`${horario}-${index}`} style={styles.timeChip}>
            <Ionicons name="time-outline" size={14} color="#667572" />
            <Text style={styles.timeChipText}>{horario}</Text>
          </View>
        ))}
      </View>
      {proxima ? (
        <Text style={styles.nextDose}>{proxima}</Text>
      ) : (
        <Text style={estilosComuns.helper}>{textoDuracao(medicamento)}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  medCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EDF1F0",
  },
  pressed: { opacity: 0.75 },
  medCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  medIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#E6F6F3",
    alignItems: "center",
    justifyContent: "center",
  },
  medName: { fontSize: 17, fontWeight: "700", color: "#273331" },
  medDose: { fontSize: 13, color: "#667572", marginTop: 4 },
  medInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
  },
  statusBadge: {
    backgroundColor: "#E6F6F3",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: { fontSize: 12, fontWeight: "700", color: "#087B70" },
  scheduledBadge: { backgroundColor: "#EEF0FE" },
  scheduledText: { color: "#5361AE" },
  finishedBadge: { backgroundColor: "#F0F2F2" },
  finishedText: { color: "#667572" },
  frequency: { fontSize: 12, color: "#667572" },
  timeChips: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 12 },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F4F7F6",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  timeChipText: { fontSize: 12, color: "#667572", fontWeight: "600" },
  nextDose: { fontSize: 12, fontWeight: "600", color: COR, marginTop: 12 },
});
