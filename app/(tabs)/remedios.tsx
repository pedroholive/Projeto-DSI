import { useFocusEffect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Modal, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DetalheMedicamentoScreen } from "@/components/medicamentos/detalhe-medicamento";
import { EstadoLista } from "@/components/medicamentos/estado-lista";
import { COR, estilosComuns } from "@/components/medicamentos/estilos-comuns";
import { HistoricoScreen } from "@/components/medicamentos/historico-doses";
import { ListaMedicamentos } from "@/components/medicamentos/lista-medicamentos";
import { MedicamentoForm } from "@/components/medicamentos/medicamento-form";
import { auth } from "@/firebaseConfig";
import {
  atualizarMedicamento,
  criarMedicamento,
  gerarIdMedicamento,
  type DadosMedicamento,
  type Medicamento,
} from "@/services/medicamentoService";
import { formularioVazio, valoresDoMedicamento } from "@/utils/medicamentos";

type TelaMedicamentos =
  | { tipo: "lista" }
  | { tipo: "detalhe"; medicamento: Medicamento }
  | { tipo: "historico"; medicamento: Medicamento };

type FormularioAberto =
  | { tipo: "novo"; id: string; valores: DadosMedicamento }
  | { tipo: "editar"; id: string; valores: DadosMedicamento };

export default function RemediosScreen() {
  const [usuario, setUsuario] = useState<string | null>(
    auth.currentUser?.uid ?? null,
  );
  const [verificando, setVerificando] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (atual) => {
        setUsuario(atual?.uid ?? null);
        setVerificando(false);
      }),
    [],
  );

  if (verificando)
    return (
      <SafeAreaView style={estilosComuns.container}>
        <View style={estilosComuns.empty}>
          <ActivityIndicator size="large" color={COR} />
        </View>
      </SafeAreaView>
    );
  if (!usuario)
    return (
      <SafeAreaView style={estilosComuns.container}>
        <EstadoLista
          icone="lock-closed-outline"
          titulo="Entre na sua conta"
          descricao="Faça login para visualizar e cadastrar seus medicamentos."
        />
      </SafeAreaView>
    );
  // Trocar de usuário desmonta todos os estados da conta anterior.
  return <FluxoMedicamentos key={usuario} userId={usuario} />;
}

function FluxoMedicamentos({ userId }: { userId: string }) {
  const [tela, setTela] = useState<TelaMedicamentos>({ tipo: "lista" });
  const [formulario, setFormulario] = useState<FormularioAberto | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [revisao, setRevisao] = useState(0);
  const trava = useRef(false);

  const voltar = useCallback(() => {
    if (salvando) return;
    if (formulario) {
      setFormulario(null);
      return;
    }
    setTela((anterior) =>
      anterior.tipo === "historico"
        ? { tipo: "detalhe", medicamento: anterior.medicamento }
        : { tipo: "lista" },
    );
  }, [formulario, salvando]);

  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener("hardwareBackPress", () => {
        if (formulario || tela.tipo !== "lista") {
          voltar();
          return true;
        }
        return false;
      });
      return () => listener.remove();
    }, [formulario, tela.tipo, voltar]),
  );

  function abrirNovo() {
    setFormulario({
      tipo: "novo",
      id: gerarIdMedicamento(),
      valores: formularioVazio(),
    });
  }

  function abrirEdicao(m: Medicamento) {
    if (!m.id) return;
    setFormulario({
      tipo: "editar",
      id: m.id,
      valores: valoresDoMedicamento(m),
    });
  }

  async function salvar(dados: DadosMedicamento) {
    if (!formulario || trava.current) return;
    trava.current = true;
    setSalvando(true);
    try {
      if (formulario.tipo === "novo")
        await criarMedicamento(userId, dados, formulario.id);
      else await atualizarMedicamento(formulario.id, userId, dados);
      setRevisao((n) => n + 1);
      setFormulario(null);
    } finally {
      setSalvando(false);
      trava.current = false;
    }
  }

  return (
    <View style={estilosComuns.container}>
      {tela.tipo === "lista" ? (
        <ListaMedicamentos
          userId={userId}
          revisao={revisao}
          onNovo={abrirNovo}
          onAbrir={(m) => setTela({ tipo: "detalhe", medicamento: m })}
        />
      ) : tela.tipo === "detalhe" ? (
        <DetalheMedicamentoScreen
          key={tela.medicamento.id}
          id={tela.medicamento.id!}
          revisao={revisao}
          onVoltar={() => {
            setTela({ tipo: "lista" });
            setRevisao((n) => n + 1);
          }}
          onEditar={abrirEdicao}
          onHistorico={(m) => setTela({ tipo: "historico", medicamento: m })}
        />
      ) : (
        <HistoricoScreen medicamento={tela.medicamento} onVoltar={voltar} />
      )}
      <Modal
        visible={formulario !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={voltar}
      >
        {formulario ? (
          <MedicamentoForm
            key={`${formulario.tipo}-${formulario.id}`}
            titulo={
              formulario.tipo === "novo"
                ? "Novo Medicamento"
                : "Editar Medicamento"
            }
            subtitulo={
              formulario.tipo === "novo"
                ? "Adicione os dados da prescrição"
                : "Revise os dados da prescrição"
            }
            textoSalvar={
              formulario.tipo === "novo"
                ? "Cadastrar medicamento"
                : "Salvar alterações"
            }
            iconeSalvar={formulario.tipo === "novo" ? "add" : "checkmark"}
            valoresIniciais={formulario.valores}
            salvando={salvando}
            onSalvar={salvar}
            onCancelar={voltar}
          />
        ) : null}
      </Modal>
    </View>
  );
}
