import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COR, estilosComuns } from "./estilos-comuns";

export function EstadoLista({
  icone,
  titulo,
  descricao,
  acao,
  onAcao,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
  acao?: string;
  onAcao?: () => void;
}) {
  return (
    <View style={estilosComuns.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icone} color={COR} size={36} />
      </View>
      <Text style={styles.emptyTitle}>{titulo}</Text>
      <Text style={styles.emptyDescription}>{descricao}</Text>
      {acao && onAcao ? (
        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={onAcao}
        >
          <Text style={styles.primaryButtonText}>{acao}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#E6F6F3",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    color: "#273331",
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: "#667572",
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: COR,
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
