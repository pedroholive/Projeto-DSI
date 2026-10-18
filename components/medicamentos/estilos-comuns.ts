import { StyleSheet } from "react-native";

// Cor principal da tela de medicamentos.
export const COR = "#0E9488";

// Estilos usados por mais de um componente da tela de medicamentos.
export const estilosComuns = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F8F7" },
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  pageTitle: { fontSize: 24, fontWeight: "700", color: "#273331" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#273331" },
  link: { fontSize: 13, fontWeight: "700", color: COR, paddingVertical: 8 },
  helper: { fontSize: 12, lineHeight: 18, color: "#667572", marginTop: 5 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D6DDDB",
    minHeight: 48,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  inlineError: {
    padding: 14,
    backgroundColor: "#FFF1F3",
    borderRadius: 14,
    marginBottom: 14,
  },
  errorText: { color: "#A5253F", fontSize: 13, lineHeight: 19 },
  timeText: { fontSize: 14, fontWeight: "700", color: "#273331" },
});
