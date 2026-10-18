import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export type TipoMensagem = "sucesso" | "erro" | "confirmacao";

interface MensagemModalProps {
  visivel: boolean;
  titulo: string;
  descricao: string;
  tipo?: TipoMensagem;
  destrutiva?: boolean;
  textoConfirmar?: string;
  carregando?: boolean;
  onFechar: () => void;
  onConfirmar?: () => void;
}

export function MensagemModal({
  visivel,
  titulo,
  descricao,
  tipo = "erro",
  destrutiva = true,
  textoConfirmar = "Confirmar",
  carregando = false,
  onFechar,
  onConfirmar,
}: MensagemModalProps) {
  const erro = tipo === "erro" || (tipo === "confirmacao" && destrutiva);

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!carregando) onFechar();
      }}
    >
      <View style={messageStyles.fundo}>
        <View style={messageStyles.caixa}>
          <View
            style={[
              messageStyles.icone,
              erro ? messageStyles.iconeErro : messageStyles.iconeOk,
            ]}
          >
            <Ionicons
              name={
                tipo === "sucesso"
                  ? "checkmark-circle-outline"
                  : tipo === "confirmacao"
                    ? destrutiva
                      ? "trash-outline"
                      : "help-circle-outline"
                    : "alert-circle-outline"
              }
              size={30}
              color={erro ? "#D9304F" : "#0E766D"}
            />
          </View>

          <Text style={messageStyles.titulo}>{titulo}</Text>
          <Text style={messageStyles.descricao}>{descricao}</Text>

          {tipo === "confirmacao" ? (
            <View style={messageStyles.linhaBotoes}>
              <Pressable
                style={[
                  messageStyles.botao,
                  messageStyles.botaoSecundario,
                  { flex: 1 },
                ]}
                onPress={onFechar}
                disabled={carregando}
              >
                <Text style={messageStyles.textoSecundario}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[
                  messageStyles.botao,
                  destrutiva
                    ? messageStyles.botaoPerigo
                    : messageStyles.botaoPrimario,
                  { flex: 1 },
                  carregando && messageStyles.desabilitado,
                ]}
                onPress={onConfirmar}
                disabled={carregando}
              >
                <Text style={messageStyles.textoPrimario}>
                  {carregando ? "Aguarde..." : textoConfirmar}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[messageStyles.botao, messageStyles.botaoPrimario]}
              onPress={onFechar}
            >
              <Text style={messageStyles.textoPrimario}>OK</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const messageStyles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  caixa: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
  },
  icone: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  iconeErro: { backgroundColor: "#FDECEF" },
  iconeOk: { backgroundColor: "#E6F6F3" },
  titulo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#273331",
    textAlign: "center",
  },
  descricao: {
    fontSize: 14,
    color: "#667572",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  linhaBotoes: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  botao: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  botaoPrimario: { backgroundColor: "#0E9488" },
  botaoPerigo: { backgroundColor: "#D9304F" },
  botaoSecundario: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6DDDB",
  },
  desabilitado: { opacity: 0.6 },
  textoPrimario: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  textoSecundario: { color: "#273331", fontWeight: "700", fontSize: 15 },
});
