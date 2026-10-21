import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useRelogio } from "@/hooks/use-relogio";
import {
  confirmarDose,
  listarConfirmacoesDoDia,
  type Medicamento,
} from "@/services/medicamentoService";
import {
  dataDaDose,
  formatarData,
  hora,
  mensagemErro,
  parseData,
  statusMedicamento,
} from "@/utils/medicamentos";

import { COR, estilosComuns } from "./estilos-comuns";
import { MensagemModal } from "./mensagem-modal";

export function AgendaMedicamento({
  medicamento,
  onAtualizado,
}: {
  medicamento: Medicamento;
  onAtualizado: () => void;
}) {
  const agora = useRelogio();
  const hoje = formatarData(agora);
  const [registradas, setRegistradas] = useState<Set<number>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [selecionada, setSelecionada] = useState<Date | null>(null);
  const [salvando, setSalvando] = useState(false);
  const trava = useRef(false);
  const [tentativa, setTentativa] = useState(0);
  const horarios = [...new Set(medicamento.horarios)].sort();

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setRegistradas(new Set());
    setErro("");
    async function carregar() {
      try {
        const confirmadas = await listarConfirmacoesDoDia(
          medicamento,
          parseData(hoje)!,
        );
        if (ativo) setRegistradas(new Set(confirmadas));
      } catch (error) {
        if (ativo) setErro(mensagemErro(error));
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [medicamento.id, medicamento.userId, hoje, tentativa]);

  async function registrar() {
    if (!selecionada || trava.current) return;
    trava.current = true;
    setSalvando(true);
    try {
      await confirmarDose(medicamento, selecionada);
      setRegistradas(
        (anteriores) => new Set([...anteriores, selecionada.getTime()]),
      );
      setSelecionada(null);
      onAtualizado();
    } catch (error) {
      setSelecionada(null);
      setErro(mensagemErro(error));
    } finally {
      setSalvando(false);
      trava.current = false;
    }
  }

  if (statusMedicamento(medicamento, agora) !== "ativo") return null;
  return (
    <View style={styles.agenda}>
      <Text style={estilosComuns.sectionTitle}>Registro de hoje</Text>
      <Text style={estilosComuns.helper}>
        Confirme somente doses que você já tomou. O registro não altera sua
        prescrição.
      </Text>
      {carregando ? (
        <ActivityIndicator color={COR} />
      ) : erro ? (
        <View style={estilosComuns.inlineError}>
          <Text style={estilosComuns.errorText}>{erro}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setTentativa((n) => n + 1)}
          >
            <Text style={estilosComuns.link}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        horarios.map((horario) => {
          const previsto = dataDaDose(medicamento, horario, agora);
          if (!previsto) return null;
          const confirmada = registradas.has(previsto.getTime());
          const futuro = previsto.getTime() > agora.getTime();
          return (
            <View key={horario} style={styles.agendaRow}>
              <View style={estilosComuns.row}>
                <Ionicons name="time-outline" size={19} color={COR} />
                <Text style={estilosComuns.timeText}>{horario}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  confirmada
                    ? `Dose das ${horario} confirmada`
                    : `Registrar dose das ${horario}`
                }
                accessibilityState={{
                  disabled: futuro || confirmada || salvando,
                }}
                disabled={futuro || confirmada || salvando}
                onPress={() => setSelecionada(previsto)}
                style={[
                  styles.doseButton,
                  (futuro || confirmada) && styles.mutedButton,
                ]}
              >
                <Text style={styles.doseButtonText}>
                  {confirmada
                    ? "Confirmada"
                    : futuro
                      ? "Programada"
                      : "Registrar dose"}
                </Text>
              </Pressable>
            </View>
          );
        })
      )}
      <MensagemModal
        visivel={selecionada !== null}
        tipo="confirmacao"
        destrutiva={false}
        titulo="Confirmar dose tomada?"
        descricao={
          selecionada
            ? `Você confirma que tomou a dose prevista para ${hora(selecionada)} de ${medicamento.nome}?`
            : ""
        }
        textoConfirmar="Sim, tomei"
        carregando={salvando}
        onConfirmar={registrar}
        onFechar={() => {
          if (!salvando) setSelecionada(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  agenda: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  agendaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 12,
  },
  doseButton: {
    backgroundColor: "#E6F6F3",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  mutedButton: { backgroundColor: "#F0F3F2", opacity: 0.7 },
  doseButtonText: { color: "#087B70", fontSize: 12, fontWeight: "700" },
});
