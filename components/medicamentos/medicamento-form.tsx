import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { DadosMedicamento } from "@/services/medicamentoService";
import {
  FORMAS,
  HORARIOS_PADRAO,
  MAX_HORARIOS,
  UNIDADES,
  mascaraData,
  mascaraHorario,
  mensagemErro,
  validarMedicamento,
} from "@/utils/medicamentos";

import { COR } from "./estilos-comuns";
import { MensagemModal } from "./mensagem-modal";

interface MedicamentoFormProps {
  titulo: string;
  subtitulo: string;
  textoSalvar: string;
  iconeSalvar: keyof typeof Ionicons.glyphMap;
  valoresIniciais: DadosMedicamento;
  salvando: boolean;
  onSalvar: (dados: DadosMedicamento) => Promise<void>;
  onCancelar: () => void;
}

export function MedicamentoForm({
  titulo,
  subtitulo,
  textoSalvar,
  iconeSalvar,
  valoresIniciais,
  salvando,
  onSalvar,
  onCancelar,
}: MedicamentoFormProps) {
  const travaSalvar = useRef(false);
  const [dados, setDados] = useState<DadosMedicamento>(valoresIniciais);
  const [seletor, setSeletor] = useState<"unidade" | "forma" | null>(null);
  const [erro, setErro] = useState<{
    titulo: string;
    descricao: string;
  } | null>(null);

  function alterar<K extends keyof DadosMedicamento>(
    campo: K,
    valor: DadosMedicamento[K],
  ) {
    if (salvando) return;
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  function escolherFrequencia(n: number) {
    setDados((atual) => {
      const horarios = Array.from(
        { length: n },
        (_, i) => atual.horarios[i] ?? HORARIOS_PADRAO[i],
      );
      return { ...atual, frequencia: n, horarios };
    });
  }

  function adicionarHorario() {
    setDados((atual) => {
      if (atual.horarios.length >= MAX_HORARIOS) return atual;

      const novo =
        HORARIOS_PADRAO.find((h) => !atual.horarios.includes(h)) ?? "12:00";
      const horarios = [...atual.horarios, novo];

      return { ...atual, horarios, frequencia: horarios.length };
    });
  }

  function removerHorario(indice: number) {
    setDados((atual) => {
      if (atual.horarios.length <= 1) return atual;

      const horarios = atual.horarios.filter((_, i) => i !== indice);
      return { ...atual, horarios, frequencia: horarios.length };
    });
  }

  function alterarHorario(indice: number, texto: string) {
    setDados((atual) => ({
      ...atual,
      horarios: atual.horarios.map((h, i) =>
        i === indice ? mascaraHorario(texto) : h,
      ),
    }));
  }

  async function salvar() {
    if (salvando || travaSalvar.current) return;

    const problema = validarMedicamento(dados);

    if (problema) {
      setErro(problema);
      return;
    }

    travaSalvar.current = true;
    try {
      await onSalvar({
        ...dados,
        horarios: [...dados.horarios].sort(),
      });
    } catch (error) {
      console.error("Erro ao salvar medicamento:", error);
      setErro({
        titulo: "Não foi possível salvar",
        descricao:mensagemErro(error),
      });
    } finally {
      travaSalvar.current = false;
    }
  }

  const continuo = dados.duracao === "continuo";

  return (
    <SafeAreaView style={formStyles.container}>
      <KeyboardAvoidingView
        style={formStyles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={formStyles.conteudo}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={formStyles.header}>
            <Text style={formStyles.titulo}>{titulo}</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar formulário"
              disabled={salvando}
              onPress={onCancelar}
              hitSlop={10}
            >
              <Ionicons name="close" size={26} color="#273331" />
            </Pressable>
          </View>

          <Text style={formStyles.subtituloForte}>{subtitulo}</Text>
          <Text style={formStyles.subtitulo}>
            Use as informações da receita ou a orientação do seu profissional de
            saúde.
          </Text>

          <View style={formStyles.card}>
            <Text style={formStyles.cardTitulo}>Medicamento</Text>

            <Text style={formStyles.label}>Nome</Text>
            <TextInput
              editable={!salvando}
              style={formStyles.input}
              placeholder="Ex.: Metformina"
              placeholderTextColor="#9CA3AF"
              maxLength={120}
              accessibilityLabel="Nome do medicamento"
              value={dados.nome}
              onChangeText={(t) => alterar("nome", t)}
            />

            <View style={formStyles.linha}>
              <View style={formStyles.colunaEstreita}>
                <Text style={formStyles.label}>Dosagem</Text>
                <TextInput
                  editable={!salvando}
                  style={formStyles.input}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={dados.dosagem}
                  onChangeText={(t) =>
                    alterar("dosagem", t.replace(/[^0-9.,]/g, ""))
                  }
                />
              </View>

              <View style={formStyles.colunaEstreita}>
                <Text style={formStyles.label}>Unidade</Text>
                <Pressable
                  style={formStyles.select}
                  disabled={salvando}
                  accessibilityRole="button"
                  accessibilityLabel="Selecionar unidade de dosagem"
                  onPress={() => setSeletor("unidade")}
                >
                  <Text style={formStyles.selectTexto}>{dados.unidade}</Text>
                  <Ionicons name="chevron-down" size={18} color="#667572" />
                </Pressable>
              </View>
            </View>

            <Text style={formStyles.label}>Forma</Text>
            <Pressable
              style={formStyles.select}
              disabled={salvando}
              accessibilityRole="button"
              accessibilityLabel="Selecionar forma farmacêutica"
              onPress={() => setSeletor("forma")}
            >
              <Text
                style={
                  dados.forma
                    ? formStyles.selectTexto
                    : formStyles.selectPlaceholder
                }
              >
                {dados.forma || "Selecione a forma"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#667572" />
            </Pressable>
          </View>

          <View style={formStyles.card}>
            <Text style={formStyles.cardTitulo}>Frequência e horários</Text>

            <Text style={formStyles.label}>Frequência</Text>
            <View style={formStyles.linhaChips}>
              {[1, 2, 3].map((n) => (
                <Pressable
                  key={n}
                  disabled={salvando}
                  accessibilityRole="button"
                  accessibilityState={{ selected: dados.frequencia === n }}
                  style={[
                    formStyles.chip,
                    dados.frequencia === n && formStyles.chipAtivo,
                  ]}
                  onPress={() => escolherFrequencia(n)}
                >
                  <Text
                    style={[
                      formStyles.chipTexto,
                      dados.frequencia === n && formStyles.chipTextoAtivo,
                    ]}
                  >
                    {n}x ao dia
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={formStyles.label}>Horários</Text>
            <View style={formStyles.linhaChips}>
              {dados.horarios.map((horario, indice) => (
                <View
                  key={indice}
                  style={[
                    formStyles.chip,
                    formStyles.chipAtivo,
                    formStyles.chipHorario,
                  ]}
                >
                  <Ionicons name="time-outline" size={17} color={COR} />

                  <TextInput
                    editable={!salvando}
                    style={formStyles.horarioInput}
                    accessibilityLabel={`Horário da dose ${indice + 1}`}
                    value={horario}
                    onChangeText={(t) => alterarHorario(indice, t)}
                    keyboardType="numeric"
                    maxLength={5}
                    placeholder="HH:MM"
                    placeholderTextColor="#9CA3AF"
                  />

                  {dados.horarios.length > 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remover horário ${horario}`}
                      disabled={salvando}
                      onPress={() => removerHorario(indice)}
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle" size={17} color={COR} />
                    </Pressable>
                  ) : null}
                </View>
              ))}

              {dados.horarios.length < MAX_HORARIOS ? (
                <Pressable
                  style={[formStyles.chip, formStyles.chipHorario]}
                  disabled={salvando}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar horário"
                  onPress={adicionarHorario}
                >
                  <Ionicons name="add" size={18} color="#667572" />
                  <Text style={formStyles.chipTexto}>Adicionar</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={formStyles.ajuda}>
              Os horários ficam disponíveis no seu plano de uso.
            </Text>
          </View>

          <View style={formStyles.card}>
            <Text style={formStyles.cardTitulo}>Duração do tratamento</Text>

            <View style={formStyles.linhaChips}>
              <Pressable
                style={[formStyles.chip, continuo && formStyles.chipAtivo]}
                disabled={salvando}
                accessibilityRole="button"
                accessibilityState={{ selected: continuo }}
                onPress={() => alterar("duracao", "continuo")}
              >
                <Text
                  style={[
                    formStyles.chipTexto,
                    continuo && formStyles.chipTextoAtivo,
                  ]}
                >
                  Uso contínuo
                </Text>
              </Pressable>

              <Pressable
                style={[formStyles.chip, !continuo && formStyles.chipAtivo]}
                disabled={salvando}
                accessibilityRole="button"
                accessibilityState={{ selected: !continuo }}
                onPress={() => alterar("duracao", "periodo")}
              >
                <Text
                  style={[
                    formStyles.chipTexto,
                    !continuo && formStyles.chipTextoAtivo,
                  ]}
                >
                  Por período
                </Text>
              </Pressable>
            </View>

            <View style={formStyles.linha}>
              <View style={formStyles.colunaEstreita}>
                <Text style={formStyles.label}>Data inicial</Text>
                <View style={formStyles.inputIcone}>
                  <Ionicons name="calendar-outline" size={18} color="#667572" />
                  <TextInput
                    editable={!salvando}
                    style={formStyles.inputSemBorda}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={10}
                    value={dados.dataInicial}
                    onChangeText={(t) => alterar("dataInicial", mascaraData(t))}
                  />
                </View>
              </View>

              <View style={formStyles.colunaEstreita}>
                <Text style={formStyles.label}>Data final</Text>
                <View
                  style={[
                    formStyles.inputIcone,
                    continuo && formStyles.inputDesabilitado,
                  ]}
                >
                  <Ionicons name="calendar-outline" size={18} color="#667572" />
                  <TextInput
                    style={formStyles.inputSemBorda}
                    placeholder={continuo ? "Sem data final" : "DD/MM/AAAA"}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={10}
                    editable={!continuo && !salvando}
                    value={continuo ? "" : dados.dataFinal}
                    onChangeText={(t) => alterar("dataFinal", mascaraData(t))}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={formStyles.card}>
            <Text style={formStyles.cardTitulo}>Instruções</Text>

            <TextInput
              editable={!salvando}
              style={[formStyles.input, formStyles.areaTexto]}
              placeholder="Ex.: Tomar após as refeições"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              maxLength={2000}
              accessibilityLabel="Instruções da prescrição"
              value={dados.instrucoes}
              onChangeText={(t) => alterar("instrucoes", t)}
            />

            <Text style={formStyles.ajuda}>
              Inclua orientações importantes para tomar o medicamento.
            </Text>

            <View style={formStyles.linhaSwitch}>
              <View style={{ flex: 1 }}>
                <Text style={formStyles.switchTitulo}>
                  Preferência de lembrete
                </Text>
                <Text style={formStyles.switchDescricao}>{`Salva sua preferência. Notificações ainda não disponíveis.`}</Text>
              </View>

              <Switch
                disabled={salvando}
                accessibilityLabel="Salvar preferência de lembrete"
                value={dados.lembrete}
                onValueChange={(v) => alterar("lembrete", v)}
                trackColor={{ false: "#D6DDDB", true: COR }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <Pressable
            style={[
              formStyles.botaoSalvar,
              salvando && formStyles.desabilitado,
            ]}
            onPress={salvar}
            disabled={salvando}
          >
            <Ionicons name={iconeSalvar} size={20} color="#FFFFFF" />
            <Text style={formStyles.botaoSalvarTexto}>
              {salvando ? "Salvando..." : textoSalvar}
            </Text>
          </Pressable>

          <Pressable
            style={formStyles.botaoCancelar}
            onPress={onCancelar}
            disabled={salvando}
          >
            <Text style={formStyles.botaoCancelarTexto}>Cancelar</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={seletor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSeletor(null)}
      >
        <Pressable
          style={formStyles.fundoSeletor}
          onPress={() => setSeletor(null)}
        >
          <View style={formStyles.caixaSeletor}>
            <Text style={formStyles.cardTitulo}>
              {seletor === "unidade" ? "Unidade" : "Forma"}
            </Text>

            {(seletor === "unidade" ? UNIDADES : FORMAS).map((opcao) => {
              const atual = seletor === "unidade" ? dados.unidade : dados.forma;

              return (
                <Pressable
                  key={opcao}
                  style={formStyles.opcao}
                  onPress={() => {
                    alterar(seletor === "unidade" ? "unidade" : "forma", opcao);
                    setSeletor(null);
                  }}
                >
                  <Text
                    style={[
                      formStyles.opcaoTexto,
                      atual === opcao && formStyles.opcaoAtiva,
                    ]}
                  >
                    {opcao}
                  </Text>

                  {atual === opcao ? (
                    <Ionicons name="checkmark" size={20} color={COR} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <MensagemModal
        visivel={erro !== null}
        titulo={erro?.titulo ?? ""}
        descricao={erro?.descricao ?? ""}
        tipo="erro"
        onFechar={() => setErro(null)}
      />
    </SafeAreaView>
  );
}

const formStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F8F7" },
  conteudo: { padding: 16, paddingBottom: 32 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 14,
  },
  titulo: { fontSize: 22, fontWeight: "700", color: "#273331" },
  subtituloForte: { fontSize: 15, fontWeight: "700", color: "#273331" },
  subtitulo: { fontSize: 13, color: "#7E8D89", marginTop: 2, marginBottom: 14 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  cardTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#273331",
    marginBottom: 6,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#273331",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F1F4F4",
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 15,
    color: "#273331",
  },
  areaTexto: { height: 92, paddingTop: 12 },

  linha: { flexDirection: "row", gap: 12 },
  colunaEstreita: { flex: 1 },

  select: {
    backgroundColor: "#F1F4F4",
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectTexto: { fontSize: 15, color: "#273331" },
  selectPlaceholder: { fontSize: 15, color: "#9CA3AF" },

  linhaChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  chip: {
    backgroundColor: "#F1F4F4",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipAtivo: { backgroundColor: "#E6F6F3", borderColor: COR },
  chipTexto: { fontSize: 13, fontWeight: "600", color: "#667572" },
  chipTextoAtivo: { color: COR },
  chipHorario: { flexDirection: "row", gap: 6 },
  horarioInput: {
    fontSize: 15,
    fontWeight: "700",
    color: COR,
    minWidth: 52,
    padding: 0,
  },

  ajuda: { fontSize: 12, color: "#7E8D89", marginTop: 8 },

  inputIcone: {
    backgroundColor: "#F1F4F4",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputDesabilitado: { opacity: 0.6 },
  inputSemBorda: { flex: 1, fontSize: 14, color: "#273331", padding: 0 },

  linhaSwitch: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 12,
  },
  switchTitulo: { fontSize: 15, fontWeight: "700", color: "#273331" },
  switchDescricao: { fontSize: 12, color: "#7E8D89", marginTop: 2 },

  botaoSalvar: {
    backgroundColor: COR,
    minHeight: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  botaoSalvarTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  desabilitado: { opacity: 0.6 },
  botaoCancelar: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#273331",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  botaoCancelarTexto: { fontSize: 16, fontWeight: "700", color: "#273331" },

  fundoSeletor: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  caixaSeletor: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18 },
  opcao: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  opcaoTexto: { fontSize: 15, color: "#273331" },
  opcaoAtiva: { fontWeight: "700", color: COR },
});
