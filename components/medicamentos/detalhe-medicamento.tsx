import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth } from "@/firebaseConfig";
import { useRelogio } from "@/hooks/use-relogio";
import {
  buscarMedicamentoPorId,
  excluirMedicamento,
  listarDoses,
  type DoseMedicamento,
  type Medicamento,
} from "@/services/medicamentoService";
import {
  ROTULO_STATUS,
  descricaoDose,
  resumoDosagem,
  rotuloDose,
  statusMedicamento,
  textoDuracao,
  textoFrequencia,
  textoProximaDose,
} from "@/utils/medicamentos";

import { AgendaMedicamento } from "./agenda-medicamento";
import { COR, estilosComuns } from "./estilos-comuns";
import { MensagemModal } from "./mensagem-modal";

export function DetalheMedicamentoScreen({
  id,
  revisao,
  onVoltar,
  onEditar,
  onHistorico,
}: {
  id: string;
  revisao: number;
  onVoltar: () => void;
  onEditar: (m: Medicamento) => void;
  onHistorico: (m: Medicamento) => void;
}) {
  const [medicamento, setMedicamento] = useState<Medicamento | null>(null);
  const [doses, setDoses] = useState<DoseMedicamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregar() {
        setCarregando(true);
        setErro("");

        try {
          const usuario = auth.currentUser;

          if (!usuario || !id) {
            throw new Error("Medicamento ou usuário não encontrado.");
          }

          const m = await buscarMedicamentoPorId(id, usuario.uid);

          if (!m) {
            throw new Error(
              "Medicamento não encontrado ou acesso não autorizado.",
            );
          }

          const historico = await listarDoses(id, usuario.uid, 3);

          if (ativo) {
            setMedicamento(m);
            setDoses(historico);
          }
        } catch (error) {
          console.error("Erro ao carregar medicamento:", error);

          if (ativo) {
            setMedicamento(null);
            setErro(
              error instanceof Error
                ? error.message
                : "Não foi possível carregar o medicamento.",
            );
          }
        } finally {
          if (ativo) setCarregando(false);
        }
      }

      void carregar();

      return () => {
        ativo = false;
      };
    }, [id, revisao, tentativa]),
  );

  function voltar() {
    if (!excluindo) onVoltar();
  }

  async function excluir() {
    const usuario = auth.currentUser;

    if (!usuario || !id || excluindo) return;

    try {
      setExcluindo(true);
      await excluirMedicamento(id, usuario.uid);
      setConfirmarExclusao(false);
      onVoltar();
    } catch (error) {
      console.error("Erro ao excluir medicamento:", error);
      setConfirmarExclusao(false);
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o medicamento.",
      );
    } finally {
      setExcluindo(false);
    }
  }

  const agora = useRelogio();
  const status = medicamento ? statusMedicamento(medicamento, agora) : "ativo";
  const proxima = medicamento ? textoProximaDose(medicamento, agora) : null;

  return (
    <SafeAreaView style={detailStyles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={detailStyles.scroll}
      >
        <View style={detailStyles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar à lista de medicamentos"
            onPress={voltar}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={26} color="#273331" />
          </Pressable>

          <Text style={detailStyles.titulo}>Detalhes do Medicamento</Text>
        </View>

        {carregando ? (
          <View style={detailStyles.estado}>
            <ActivityIndicator size="large" color={COR} />
          </View>
        ) : !medicamento ? (
          <View style={detailStyles.estado}>
            <Ionicons name="alert-circle-outline" size={42} color={COR} />
            <Text style={detailStyles.estadoTexto}>
              {erro || "Medicamento não encontrado."}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={estilosComuns.secondaryButton}
              onPress={() => setTentativa((n) => n + 1)}
            >
              <Text style={estilosComuns.link}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={detailStyles.resumo}>
              <View style={detailStyles.resumoTopo}>
                <View style={detailStyles.resumoIcone}>
                  <MaterialCommunityIcons name="pill" size={30} color={COR} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={detailStyles.resumoNome}>
                    {medicamento.nome}
                  </Text>
                  <Text style={detailStyles.resumoDosagem}>
                    {resumoDosagem(medicamento)}
                  </Text>
                </View>

                <View style={detailStyles.badge}>
                  <Text style={detailStyles.badgeTexto}>
                    {ROTULO_STATUS[status]}
                  </Text>
                </View>
              </View>

              {proxima ? (
                <>
                  <View style={detailStyles.divisor} />

                  <View style={detailStyles.proxima}>
                    <Ionicons name="time-outline" size={17} color="#FFFFFF" />
                    <Text style={detailStyles.proximaTexto}>{proxima}</Text>
                  </View>
                </>
              ) : null}
            </View>

            <View style={detailStyles.card}>
              <Text style={detailStyles.cardTitulo}>Plano de uso</Text>

              <LinhaPlano
                icone="information-circle-outline"
                rotulo="Forma"
                valor={`${medicamento.forma}`}
              />
              <LinhaPlano
                icone="repeat-outline"
                rotulo="Frequência"
                valor={textoFrequencia(medicamento.frequencia)}
              />
              <LinhaPlano
                icone="time-outline"
                rotulo="Horário"
                valor={medicamento.horarios.join(" • ")}
              />
              <LinhaPlano
                icone="calendar-outline"
                rotulo="Duração"
                valor={textoDuracao(medicamento)}
              />
            </View>

            <View style={detailStyles.instrucoes}>
              <View style={detailStyles.instrucoesTitulo}>
                <Ionicons name="clipboard-outline" size={18} color={COR} />
                <Text style={detailStyles.instrucoesTituloTexto}>
                  Instruções
                </Text>
              </View>

              <Text style={detailStyles.instrucoesTexto}>
                {medicamento.instrucoes || "Nenhuma instrução cadastrada."}
              </Text>

              <Text style={detailStyles.lembrete}>
                {medicamento.lembrete
                  ? "Preferência de lembrete salva. Notificações ainda não disponíveis."
                  : "Preferência de lembrete desativada"}
              </Text>
            </View>

            <View style={estilosComuns.sectionHeader}>
              <Text style={detailStyles.secaoTitulo}>Histórico recente</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => onHistorico(medicamento)}
              >
                <Text style={estilosComuns.link}>Ver tudo</Text>
              </Pressable>
            </View>
            <AgendaMedicamento
              medicamento={medicamento}
              onAtualizado={() => {
                const usuario = auth.currentUser;
                if (usuario)
                  void listarDoses(id, usuario.uid, 3)
                    .then(setDoses)
                    .catch(() =>
                      setErro("Não foi possível atualizar o histórico."),
                    );
              }}
            />

            <View style={detailStyles.historico}>
              {doses.length === 0 ? (
                <Text style={detailStyles.historicoVazio}>
                  Nenhuma dose registrada ainda.
                </Text>
              ) : (
                doses.map((dose, i) => {
                  const confirmada = dose.status === "confirmada";

                  return (
                    <View
                      key={dose.id}
                      style={[
                        detailStyles.doseLinha,
                        i < doses.length - 1 && detailStyles.doseBorda,
                      ]}
                    >
                      <View
                        style={[
                          detailStyles.dosePonto,
                          !confirmada && detailStyles.dosePontoCinza,
                        ]}
                      />

                      <View style={{ flex: 1 }}>
                        <Text style={detailStyles.doseTitulo}>
                          {rotuloDose(
                            (dose.confirmadaEm ?? dose.previstoEm).toDate(),
                            agora,
                          )}
                        </Text>
                        <Text style={detailStyles.doseDescricao}>
                          {descricaoDose(dose)}
                        </Text>
                      </View>

                      <Ionicons
                        name={
                          confirmada
                            ? "checkmark-circle-outline"
                            : "remove-circle-outline"
                        }
                        size={24}
                        color={confirmada ? COR : "#667572"}
                      />
                    </View>
                  );
                })
              )}
            </View>

            <Pressable
              style={detailStyles.botaoEditar}
              onPress={() => onEditar(medicamento)}
            >
              <Ionicons name="pencil-outline" size={19} color="#FFFFFF" />
              <Text style={detailStyles.botaoEditarTexto}>
                Editar medicamento
              </Text>
            </Pressable>

            <Pressable
              style={detailStyles.botaoExcluir}
              onPress={() => setConfirmarExclusao(true)}
            >
              <Ionicons name="trash-outline" size={19} color="#D9304F" />
              <Text style={detailStyles.botaoExcluirTexto}>
                Excluir medicamento
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <MensagemModal
        visivel={!!erro && !!medicamento && !confirmarExclusao}
        titulo="Não foi possível concluir"
        descricao={erro}
        onFechar={() => setErro("")}
      />
      <MensagemModal
        visivel={confirmarExclusao}
        tipo="confirmacao"
        titulo="Excluir medicamento?"
        descricao="O medicamento e o histórico de doses serão removidos. Essa ação não pode ser desfeita."
        textoConfirmar="Excluir"
        carregando={excluindo}
        onFechar={() => {
          if (!excluindo) setConfirmarExclusao(false);
        }}
        onConfirmar={excluir}
      />
    </SafeAreaView>
  );
}

function LinhaPlano({
  icone,
  rotulo,
  valor,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  valor: string;
}) {
  return (
    <View style={detailStyles.planoLinha}>
      <View style={detailStyles.planoIcone}>
        <Ionicons name={icone} size={20} color={COR} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={detailStyles.planoRotulo}>{rotulo}</Text>
        <Text style={detailStyles.planoValor}>{valor}</Text>
      </View>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F8F7" },
  scroll: { padding: 16, paddingBottom: 32 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  titulo: { flex: 1, fontSize: 21, fontWeight: "700", color: "#273331" },

  estado: { alignItems: "center", paddingVertical: 48, gap: 10 },
  estadoTexto: { fontSize: 14, color: "#7E8D89", textAlign: "center" },

  resumo: {
    backgroundColor: COR,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  resumoTopo: { flexDirection: "row", alignItems: "center", gap: 14 },
  resumoIcone: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  resumoNome: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },
  resumoDosagem: { fontSize: 14, color: "#D6F2EE", marginTop: 3 },
  badge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  badgeTexto: { fontSize: 12, fontWeight: "700", color: COR },
  divisor: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.45)",
    marginVertical: 14,
  },
  proxima: { flexDirection: "row", alignItems: "center", gap: 8 },
  proximaTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  cardTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#273331",
    marginBottom: 10,
  },
  planoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 8,
  },
  planoIcone: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E6F6F3",
    alignItems: "center",
    justifyContent: "center",
  },
  planoRotulo: { fontSize: 12, color: "#7E8D89" },
  planoValor: {
    fontSize: 15,
    fontWeight: "700",
    color: "#273331",
    marginTop: 2,
  },

  instrucoes: {
    backgroundColor: "#E9F8F5",
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
  },
  instrucoesTitulo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  instrucoesTituloTexto: { fontSize: 15, fontWeight: "700", color: COR },
  instrucoesTexto: { fontSize: 14, color: "#273331", lineHeight: 21 },
  lembrete: { fontSize: 12, fontWeight: "600", color: COR, marginTop: 12 },

  secaoTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#273331",
    marginBottom: 10,
  },
  historico: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    marginBottom: 18,
    overflow: "hidden",
  },
  historicoVazio: { padding: 18, fontSize: 14, color: "#7E8D89" },
  doseLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  doseBorda: { borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  dosePonto: { width: 9, height: 9, borderRadius: 5, backgroundColor: COR },
  dosePontoCinza: { backgroundColor: "#667572" },
  doseTitulo: { fontSize: 15, fontWeight: "700", color: "#273331" },
  doseDescricao: { fontSize: 12, color: "#7E8D89", marginTop: 2 },

  botaoEditar: {
    backgroundColor: COR,
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  botaoEditarTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  botaoExcluir: {
    height: 52,
    borderRadius: 16,
    marginTop: 10,
    backgroundColor: "#FDECEF",
    borderWidth: 1,
    borderColor: "#F6C6CF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  botaoExcluirTexto: { color: "#D9304F", fontSize: 16, fontWeight: "700" },
});
