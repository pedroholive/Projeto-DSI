import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRelogio } from "@/hooks/use-relogio";
import {
  listarHistoricoDoses,
  type CursorDoses,
  type DoseMedicamento,
  type Medicamento,
} from "@/services/medicamentoService";
import {
  descricaoDose,
  formatarData,
  hora,
  mensagemErro,
  rotuloDose,
} from "@/utils/medicamentos";

import { COR, estilosComuns } from "./estilos-comuns";
import { EstadoLista } from "./estado-lista";

export function HistoricoScreen({
  medicamento,
  onVoltar,
}: {
  medicamento: Medicamento;
  onVoltar: () => void;
}) {
  const [doses, setDoses] = useState<DoseMedicamento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [temMais, setTemMais] = useState(true);
  const cursor = useRef<CursorDoses | null>(null);
  const trava = useRef(false);
  const montado = useRef(true);
  const agora = useRelogio();

  const carregar = useCallback(async () => {
    if (trava.current || !medicamento.id) return;
    trava.current = true;
    setCarregando(true);
    setErro("");
    try {
      const pagina = await listarHistoricoDoses(medicamento, cursor.current);
      if (!montado.current) return;
      setDoses((anteriores) => {
        const mapa = new Map(anteriores.map((d) => [d.id, d]));
        pagina.doses.forEach((d) => mapa.set(d.id, d));
        return [...mapa.values()];
      });
      cursor.current = pagina.cursor;
      setTemMais(pagina.temMais);
    } catch (error) {
      if (montado.current) setErro(mensagemErro(error));
    } finally {
      trava.current = false;
      if (montado.current) setCarregando(false);
    }
  }, [medicamento.id, medicamento.userId]);

  useEffect(() => {
    montado.current = true;
    void carregar();
    return () => {
      montado.current = false;
    };
  }, [carregar]);

  return (
    <SafeAreaView style={estilosComuns.container} edges={["top"]}>
      <View style={styles.historyHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar aos detalhes"
          onPress={onVoltar}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={25} color="#273331" />
        </Pressable>
        <View style={estilosComuns.flex}>
          <Text style={estilosComuns.pageTitle}>Histórico de doses</Text>
          <Text style={estilosComuns.helper}>{medicamento.nome}</Text>
        </View>
      </View>
      <FlatList
        data={doses}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={styles.historyContent}
        renderItem={({ item }) => (
          <View style={styles.historyItem}>
            <Ionicons
              name={
                item.status === "confirmada"
                  ? "checkmark-circle-outline"
                  : "remove-circle-outline"
              }
              size={25}
              color={item.status === "confirmada" ? COR : "#667572"}
            />
            <View style={estilosComuns.flex}>
              <Text style={estilosComuns.timeText}>
                {rotuloDose(
                  (item.confirmadaEm ?? item.previstoEm).toDate(),
                  agora,
                )}
              </Text>
              <Text style={estilosComuns.helper}>{descricaoDose(item)}</Text>
              <Text style={estilosComuns.helper}>
                Prevista: {formatarData(item.previstoEm.toDate())} às{" "}
                {hora(item.previstoEm.toDate())}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !carregando && !erro ? (
            <EstadoLista
              icone="time-outline"
              titulo="Nenhuma dose registrada"
              descricao="As confirmações feitas nos detalhes aparecem aqui."
            />
          ) : null
        }
        ListFooterComponent={
          <View style={styles.historyFooter}>
            {!!erro && <Text style={estilosComuns.errorText}>{erro}</Text>}
            {carregando ? (
              <ActivityIndicator color={COR} />
            ) : temMais || erro ? (
              <Pressable
                accessibilityRole="button"
                style={estilosComuns.secondaryButton}
                onPress={() => void carregar()}
              >
                <Text style={estilosComuns.link}>
                  {erro ? "Tentar novamente" : "Carregar mais"}
                </Text>
              </Pressable>
            ) : doses.length > 0 ? (
              <Text style={estilosComuns.helper}>
                Todos os registros foram carregados.
              </Text>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  historyContent: {
    padding: 16,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
    borderRadius: 16,
  },
  historyFooter: { alignItems: "center", gap: 12, paddingVertical: 18 },
});
