import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRelogio } from "@/hooks/use-relogio";
import { listarMedicamentos, type Medicamento } from "@/services/medicamentoService";
import {
  mensagemErro,
  normalizarBusca,
  proximoHorario,
  statusMedicamento,
  type StatusMedicamento,
} from "@/utils/medicamentos";

import { CardMedicamento } from "./card-medicamento";
import { COR, estilosComuns } from "./estilos-comuns";
import { EstadoLista } from "./estado-lista";

type FiltroStatus = "todos" | StatusMedicamento;
type Ordenacao = "nome" | "horario";

const FILTROS: { valor: FiltroStatus; texto: string }[] = [
  { valor: "todos", texto: "Todos" },
  { valor: "ativo", texto: "Ativos" },
  { valor: "agendado", texto: "Agendados" },
  { valor: "finalizado", texto: "Finalizados" },
];

export function ListaMedicamentos({
  userId,
  revisao,
  onNovo,
  onAbrir,
}: {
  userId: string;
  revisao: number;
  onNovo: () => void;
  onAbrir: (m: Medicamento) => void;
}) {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [ordem, setOrdem] = useState<Ordenacao>("nome");
  const requisicao = useRef(0);
  const agora = useRelogio();

  const carregar = useCallback(
    async (silencioso = false) => {
      const numero = ++requisicao.current;
      if (silencioso) setAtualizando(true);
      else setCarregando(true);
      setErro("");
      try {
        const resultado = await listarMedicamentos(userId);
        if (numero === requisicao.current) setMedicamentos(resultado);
      } catch (error) {
        if (numero === requisicao.current) setErro(mensagemErro(error));
      } finally {
        if (numero === requisicao.current) {
          setCarregando(false);
          setAtualizando(false);
        }
      }
    },
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      void carregar();
      return () => {
        requisicao.current++;
      };
    }, [carregar, revisao]),
  );

  const contagem = useMemo(() => {
    const total: Record<FiltroStatus, number> = {
      todos: medicamentos.length,
      ativo: 0,
      agendado: 0,
      finalizado: 0,
    };
    medicamentos.forEach((m) => {
      total[statusMedicamento(m, agora)]++;
    });
    return total;
  }, [medicamentos, agora]);

  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    return medicamentos
      .filter((m) => {
        const combinaStatus =
          filtro === "todos" || statusMedicamento(m, agora) === filtro;
        const combinaTexto =
          !termo ||
          normalizarBusca(
            `${m.nome} ${m.forma} ${m.dosagem} ${m.unidade}`,
          ).includes(termo);
        return combinaStatus && combinaTexto;
      })
      .sort((a, b) => {
        if (ordem === "horario") {
          const horarioA = proximoHorario(a, agora);
          const horarioB = proximoHorario(b, agora);
          if (horarioA !== horarioB) return horarioA < horarioB ? -1 : 1;
        }
        return a.nome.localeCompare(b.nome, "pt-BR");
      });
  }, [medicamentos, busca, filtro, ordem, agora]);

  function limparFiltros() {
    setBusca("");
    setFiltro("todos");
  }

  return (
    <SafeAreaView style={estilosComuns.container} edges={["top"]}>
      <FlatList
        data={carregando ? [] : filtrados}
        keyExtractor={(item) => item.id!}
        renderItem={({ item }) => (
          <CardMedicamento medicamento={item} agora={agora} onAbrir={onAbrir} />
        )}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void carregar(true)}
            tintColor={COR}
            colors={[COR]}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.listHeader}>
              <View style={estilosComuns.flex}>
                <Text style={estilosComuns.pageTitle}>Remédios</Text>
                <Text style={styles.subtitle}>
                  Seus medicamentos e horários em um só lugar.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cadastrar novo medicamento"
                style={styles.addButton}
                onPress={onNovo}
              >
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={styles.summary}>
              <View style={estilosComuns.flex}>
                <Text style={styles.summaryNumber}>{contagem.ativo}</Text>
                <Text style={styles.summaryLabel}>Em tratamento</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={estilosComuns.flex}>
                <Text style={styles.summaryNumber}>
                  {contagem.agendado}
                </Text>
                <Text style={styles.summaryLabel}>Agendados</Text>
              </View>
              <MaterialCommunityIcons name="pill" size={35} color="#B9E9E2" />
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={21} color="#667572" />
              <TextInput
                accessibilityLabel="Buscar medicamento por nome, forma ou dosagem"
                placeholder="Buscar medicamento"
                placeholderTextColor="#7E8D89"
                value={busca}
                onChangeText={setBusca}
                style={styles.searchInput}
                autoCorrect={false}
                returnKeyType="search"
              />
              {!!busca && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Limpar busca"
                  onPress={() => setBusca("")}
                  hitSlop={10}
                >
                  <Ionicons name="close-circle" size={20} color="#667572" />
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {FILTROS.map((opcao) => (
                <Pressable
                  key={opcao.valor}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filtro === opcao.valor }}
                  onPress={() => setFiltro(opcao.valor)}
                  style={[
                    styles.filter,
                    filtro === opcao.valor && styles.filterActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filtro === opcao.valor && styles.filterActiveText,
                    ]}
                  >
                    {opcao.texto} · {contagem[opcao.valor]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={estilosComuns.sectionHeader}>
              <Text style={estilosComuns.sectionTitle}>
                {filtrados.length} medicamento
                {filtrados.length === 1 ? "" : "s"}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Alternar ordenação"
                onPress={() =>
                  setOrdem((atual) => (atual === "nome" ? "horario" : "nome"))
                }
                style={estilosComuns.row}
              >
                <Ionicons name="swap-vertical" size={16} color={COR} />
                <Text style={estilosComuns.link}>
                  {ordem === "nome" ? "Nome" : "Próxima dose"}
                </Text>
              </Pressable>
            </View>
            {!!erro && medicamentos.length > 0 && (
              <View style={estilosComuns.inlineError}>
                <Text style={estilosComuns.errorText}>{erro}</Text>
                <Text style={estilosComuns.helper}>
                  Exibindo os dados carregados anteriormente.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void carregar(true)}
                >
                  <Text style={estilosComuns.link}>Tentar novamente</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          carregando ? (
            <View style={estilosComuns.empty}>
              <ActivityIndicator color={COR} size="large" />
              <Text style={estilosComuns.helper}>Carregando medicamentos...</Text>
            </View>
          ) : erro ? (
            <EstadoLista
              icone="cloud-offline-outline"
              titulo="Não foi possível carregar"
              descricao={erro}
              acao="Tentar novamente"
              onAcao={() => void carregar()}
            />
          ) : medicamentos.length === 0 ? (
            <EstadoLista
              icone="medkit-outline"
              titulo="Nenhum medicamento cadastrado"
              descricao="Adicione os dados da sua prescrição para organizar seus horários."
              acao="Cadastrar medicamento"
              onAcao={onNovo}
            />
          ) : (
            <EstadoLista
              icone="search-outline"
              titulo="Nenhum resultado"
              descricao="Tente outro nome ou selecione um filtro diferente."
              acao="Limpar filtros"
              onAcao={limparFiltros}
            />
          )
        }
        ListFooterComponent={
          medicamentos.length > 0 ? (
            <Text style={styles.listFooter}>
              Arraste para baixo para atualizar seus medicamentos.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  subtitle: { fontSize: 14, lineHeight: 20, color: "#667572", marginTop: 6 },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COR,
    alignItems: "center",
    justifyContent: "center",
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    padding: 22,
    backgroundColor: COR,
    borderRadius: 22,
    marginBottom: 20,
  },
  summaryNumber: { fontSize: 28, fontWeight: "700", color: "#FFFFFF" },
  summaryLabel: { fontSize: 12, color: "#E0F5F2", marginTop: 4 },
  summaryDivider: {
    width: 1,
    height: 42,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#E5ECEA",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#273331",
    minHeight: 48,
    paddingVertical: 10,
  },
  filterRow: { gap: 8, paddingVertical: 16 },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5ECEA",
  },
  filterActive: { backgroundColor: "#E6F6F3", borderColor: COR },
  filterText: { fontSize: 13, fontWeight: "600", color: "#667572" },
  filterActiveText: { color: COR },
  listFooter: {
    textAlign: "center",
    color: "#7E8D89",
    fontSize: 12,
    marginTop: 12,
  },
});
