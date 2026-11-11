import { Ionicons } from "@expo/vector-icons";

import { useFocusEffect, useRouter } from "expo-router";

import { signOut } from "firebase/auth";

import { useCallback, useRef, useState } from "react";

import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { MensagemModal } from "@/components/medicamentos/mensagem-modal";

import { auth } from "@/firebaseConfig";
import {
  alterarEmailPaciente,
  alterarSenhaPaciente,
  atualizarCampoPaciente,
  CampoPaciente,
  carregarPerfilPaciente,
  excluirContaPaciente,
  mascaraData,
  mascaraTelefonePaciente,
  mensagemErroPerfil,
  PerfilPaciente,
} from "@/services/perfilPacienteService";

type Tela =
  | "perfil"
  | "configuracoes"
  | CampoPaciente
  | "email"
  | "senha"
  | "excluir";

const ROTULOS: Record<CampoPaciente, string> = {
  nome: "Nome",
  telefone: "Telefone",
  telefoneEmergencia: "Telefone de emergência",
  dataNascimento: "Data de nascimento",
};

const ehCampo = (t: Tela): t is CampoPaciente => t in ROTULOS;

export default function PerfilPacienteScreen() {
  const router = useRouter();

  const [perfil, setPerfil] = useState<PerfilPaciente | null>(null);

  const [tela, setTela] = useState<Tela>("perfil");

  const [carregando, setCarregando] = useState(true);

  const [ocupado, setOcupado] = useState(false);

  const [valor, setValor] = useState("");

  const [senhaAtual, setSenhaAtual] = useState("");

  const [confirmacao, setConfirmacao] = useState("");

  const [erroCarga, setErroCarga] = useState("");

  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const [feedback, setFeedback] = useState<{
    tipo: "erro" | "sucesso";
    titulo: string;
    descricao: string;
  } | null>(null);

  const trava = useRef(false);

  const campoAtual = ehCampo(tela) ? tela : null;

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga("");

    try {
      if (!auth.currentUser) {
        router.replace("/login");
        return;
      }
      setPerfil(await carregarPerfilPaciente());
      setCarregando(false);
    } catch (erro) {
      setErroCarga(mensagemErroPerfil(erro));
      setCarregando(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
      return () => {
        setSenhaAtual("");
        setValor("");
        setConfirmacao("");
        setTela("perfil");
      };
    }, [carregar]),
  );

  const voltar = useCallback(() => {
    if (trava.current) return;
    setSenhaAtual("");
    setValor("");
    setConfirmacao("");

    if (tela === "perfil") {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    } else setTela(tela === "configuracoes" ? "perfil" : "configuracoes");
  }, [router, tela]);

  useFocusEffect(
    useCallback(() => {
      const evento = BackHandler.addEventListener("hardwareBackPress", () => {
        voltar();
        return true;
      });
      return () => evento.remove();
    }, [voltar]),
  );

  function abrir(destino: Tela) {
    if (trava.current) return;
    setValor(ehCampo(destino) && perfil ? perfil[destino] : "");
    setSenhaAtual("");
    setConfirmacao("");
    setTela(destino);
  }

  async function executar(acao: () => Promise<void>) {
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);

    try {
      await acao();
    } catch (erro) {
      setConfirmarExclusao(false);
      setFeedback({
        tipo: "erro",
        titulo: "Não foi possível concluir",
        descricao: mensagemErroPerfil(erro),
      });
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }

  function salvar() {
    void executar(async () => {
      let descricao = "Sua alteração foi salva.";
      if (tela === "email") {
        await alterarEmailPaciente(valor, senhaAtual);
        descricao =
          "Enviamos um link para o novo e-mail. Confirme por lá e entre novamente com ele. Seu e-mail atual continua valendo até a confirmação.";
      } else if (tela === "senha") {
        await alterarSenhaPaciente(senhaAtual, valor, confirmacao);
        descricao =
          "Sua senha foi atualizada. Use a nova senha no próximo acesso.";
      } else if (ehCampo(tela)) {
        const chave = tela;
        const atualizado = await atualizarCampoPaciente(chave, valor);
        setPerfil((anterior: PerfilPaciente | null) =>
          anterior ? { ...anterior, [chave]: atualizado } : anterior,
        );
      } else return;
      setSenhaAtual("");
      setValor("");
      setConfirmacao("");
      setTela("configuracoes");
      setFeedback({
        tipo: "sucesso",
        titulo:
          tela === "email" ? "Confirme o novo e-mail" : "Alteração concluída",
        descricao,
      });
    });
  }

  function botao(titulo: string, acao: () => void, perigo = false) {
    return (
      <Pressable
        key={titulo}
        accessibilityRole="button"
        disabled={ocupado}
        onPress={acao}
        style={({ pressed }) => [
          s.botao,
          (pressed || ocupado) && s.pressionado,
        ]}
      >
        <Text style={[s.textoBotao, perigo && s.perigo]}>{titulo}</Text>
      </Pressable>
    );
  }

  function campo(
    rotulo: string,
    texto: string,
    mudar: (v: string) => void,
    seguro = false,
    teclado:
      | "default"
      | "email-address"
      | "phone-pad"
      | "number-pad" = "default",
  ) {
    const senhaExistente = seguro && rotulo === "Senha atual";
    return (
      <View style={s.campo}>
        <Text style={s.rotulo}>{rotulo}</Text>
        <TextInput
          accessibilityLabel={rotulo}
          style={s.input}
          value={texto}
          onChangeText={mudar}
          editable={!ocupado}
          secureTextEntry={seguro}
          keyboardType={teclado}
          autoCapitalize={tela === "nome" ? "words" : "none"}
          autoCorrect={false}
          autoComplete={
            seguro
              ? senhaExistente
                ? "current-password"
                : "new-password"
              : teclado === "email-address"
                ? "email"
                : undefined
          }
          textContentType={
            seguro
              ? senhaExistente
                ? "password"
                : "newPassword"
              : teclado === "email-address"
                ? "emailAddress"
                : undefined
          }
          maxLength={seguro ? 128 : tela === "dataNascimento" ? 10 : 150}
          placeholder={seguro ? "Digite sua senha" : rotulo}
          placeholderTextColor="#92989B"
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.conteudo}>
            <View style={s.cabecalho}>
              <Pressable
                style={s.iconeBotao}
                onPress={voltar}
                disabled={ocupado}
                accessibilityRole="button"
                accessibilityLabel="Voltar"
              >
                <Ionicons name="chevron-back" size={28} color="#171717" />
              </Pressable>
              <Text style={s.titulo}>
                {tela === "perfil"
                  ? "Meu perfil"
                  : tela === "configuracoes"
                    ? "Configurações"
                    : "Editar conta"}
              </Text>

              {tela === "perfil" && perfil && !erroCarga ? (
                <Pressable
                  style={s.iconeBotao}
                  onPress={() => abrir("configuracoes")}
                  accessibilityRole="button"
                  accessibilityLabel="Configurações do perfil"
                >
                  <Ionicons name="settings-outline" size={26} color="#171717" />
                </Pressable>
              ) : (
                <View style={s.espacador} />
              )}
            </View>

            {carregando ? (
              <ActivityIndicator
                color="#078B8D"
                size="large"
                style={s.carregamento}
              />
            ) : erroCarga ? (
              <View style={s.erro}>
                <Text style={s.aviso}>{erroCarga}</Text>
                {botao("Tentar novamente", () => void carregar())}
              </View>
            ) : (
              perfil && (
                <>
                  {(tela === "perfil" || tela === "configuracoes") && (
                    <View style={s.identidade}>
                      <View style={s.avatar}>
                        <Ionicons name="person" size={78} color="#FFFFFF" />
                      </View>
                      <Text style={s.nome}>
                        {perfil.nome?.trim().split(/\s+/)[0] || "Paciente"}
                      </Text>
                    </View>
                  )}

                  {tela === "perfil" ? (
                    <View style={s.dados}>
                      {(
                        [
                          "nome",
                          "email",
                          "telefone",
                          "telefoneEmergencia",
                          "dataNascimento",
                        ] as const
                      ).map((chave) => (
                        <View key={chave} style={s.linha}>
                          <Text style={s.rotuloDado}>
                            {chave === "email" ? "E-mail" : ROTULOS[chave]}
                          </Text>
                          <Text selectable style={s.valorDado}>
                            {perfil[chave] || "Não informado"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : tela === "configuracoes" ? (
                    <View style={s.opcoes}>
                      {botao("Alterar nome", () => abrir("nome"))}

                      {botao("Atualizar e-mail", () => abrir("email"))}

                      {botao("Atualizar senha", () => abrir("senha"))}

                      {botao("Data de nascimento", () =>
                        abrir("dataNascimento"),
                      )}

                      {botao("Telefone", () => abrir("telefone"))}

                      {botao("Telefone de emergência", () =>
                        abrir("telefoneEmergencia"),
                      )}

                      {botao(
                        "Sair da conta",
                        () =>
                          void executar(async () => {
                            await signOut(auth);
                            router.replace("/login");
                          }),
                      )}

                      {botao(
                        "Excluir minha conta",
                        () => abrir("excluir"),
                        true,
                      )}
                    </View>
                  ) : (
                    <View style={s.formulario}>
                      {tela === "excluir" ? (
                        <>
                          <Text style={s.subtitulo}>Excluir minha conta</Text>

                          <Text style={s.aviso}>
                            Sua conta e os registros vinculados a ela serão
                            removidos permanentemente: medições, medicamentos,
                            doses, consultas e vínculos com médicos. Essa ação
                            não pode ser desfeita.
                          </Text>

                          <Text style={s.rotulo}>E-mail da conta</Text>
                          <Text selectable style={s.valorDado}>
                            {perfil.email}
                          </Text>
                          {campo(
                            "Senha atual",
                            senhaAtual,
                            setSenhaAtual,
                            true,
                          )}
                          {botao(
                            "Excluir minha conta",
                            () => {
                              if (!senhaAtual) {
                                setFeedback({
                                  tipo: "erro",
                                  titulo: "Confirme sua identidade",
                                  descricao: "Digite sua senha atual.",
                                });
                                return;
                              }
                              setConfirmarExclusao(true);
                            },
                            true,
                          )}
                        </>
                      ) : (
                        <>
                          <Text style={s.subtitulo}>
                            {tela === "email"
                              ? "Atualizar e-mail"
                              : tela === "senha"
                                ? "Atualizar senha"
                                : campoAtual
                                  ? ROTULOS[campoAtual]
                                  : ""}
                          </Text>
                          {tela === "email" ? (
                            <>
                              <Text style={s.aviso}>
                                Confirme sua senha e informe o novo e-mail.
                                Enviaremos um link de confirmação para ele.
                              </Text>
                              {campo(
                                "Novo e-mail",
                                valor,
                                setValor,
                                false,
                                "email-address",
                              )}
                              {campo(
                                "Senha atual",
                                senhaAtual,
                                setSenhaAtual,
                                true,
                              )}
                            </>
                          ) : tela === "senha" ? (
                            <>
                              {campo(
                                "Senha atual",
                                senhaAtual,
                                setSenhaAtual,
                                true,
                              )}
                              {campo("Nova senha", valor, setValor, true)}
                              {campo(
                                "Confirmar nova senha",
                                confirmacao,
                                setConfirmacao,
                                true,
                              )}
                            </>
                          ) : (
                            campoAtual &&
                            campo(
                              ROTULOS[campoAtual],
                              valor,
                              (texto) =>
                                setValor(
                                  campoAtual === "dataNascimento"
                                    ? mascaraData(texto)
                                    : campoAtual === "telefone" ||
                                        campoAtual === "telefoneEmergencia"
                                      ? mascaraTelefonePaciente(texto)
                                      : texto,
                                ),
                              false,
                              campoAtual === "dataNascimento"
                                ? "number-pad"
                                : campoAtual === "telefone" ||
                                    campoAtual === "telefoneEmergencia"
                                  ? "phone-pad"
                                  : "default",
                            )
                          )}
                          {botao(
                            tela === "email"
                              ? "Enviar confirmação"
                              : "Salvar alteração",
                            salvar,
                          )}
                        </>
                      )}
                      {botao("Cancelar", voltar)}
                    </View>
                  )}
                </>
              )
            )}
            {ocupado && (
              <ActivityIndicator
                color="#078B8D"
                style={s.progresso}
                accessibilityLabel="Aguarde, processando"
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <MensagemModal
        visivel={feedback !== null}
        tipo={feedback?.tipo ?? "erro"}
        titulo={feedback?.titulo ?? ""}
        descricao={feedback?.descricao ?? ""}
        onFechar={() => setFeedback(null)}
      />
      <MensagemModal
        visivel={confirmarExclusao}
        tipo="confirmacao"
        destrutiva
        titulo="Excluir sua conta definitivamente?"
        descricao="Todos os registros descritos serão removidos. Confirme apenas se deseja continuar."
        textoConfirmar="Sim, excluir"
        carregando={ocupado}
        onFechar={() => {
          if (!ocupado) setConfirmarExclusao(false);
        }}
        onConfirmar={() =>
          void executar(async () => {
            await excluirContaPaciente(senhaAtual);
            setSenhaAtual("");
            setConfirmarExclusao(false);
            router.replace("/login");
          })
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 32,
  },

  conteudo: {
    width: "100%",
    maxWidth: 520,
    paddingHorizontal: 22,
    paddingTop: 16,
  },

  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  iconeBotao: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#ECFBE2",
    alignItems: "center",
    justifyContent: "center",
  },

  espacador: { width: 46 },

  titulo: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    color: "#171717",
    fontWeight: "500",
  },

  identidade: { alignItems: "center", marginTop: 40, marginBottom: 30 },

  avatar: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: "#078B8D",
    alignItems: "center",
    justifyContent: "center",
  },

  nome: {
    fontSize: 24,
    color: "#171717",
    marginTop: 14,
    textAlign: "center",
  },

  dados: {
    gap: 22,
    paddingHorizontal: 8,
  },

  linha: { gap: 5 },

  rotuloDado: {
    fontSize: 14,
    color: "#667572",
  },

  valorDado: {
    fontSize: 17,
    lineHeight: 25,
    color: "#171717",
  },

  opcoes: { gap: 10 },

  botao: {
    minHeight: 54,
    borderRadius: 28,
    backgroundColor: "#EAEAEA",
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  textoBotao: {
    fontSize: 17,
    color: "#171717",
    textAlign: "center",
  },

  perigo: { color: "#D93645" },

  pressionado: { opacity: 0.6 },

  formulario: { marginTop: 46, gap: 16 },

  subtitulo: {
    fontSize: 25,
    color: "#171717",
    marginBottom: 8,
  },

  campo: { gap: 9 },
  rotulo: {
    fontSize: 17,
    color: "#171717",
  },

  input: {
    backgroundColor: "#F6F8F9",
    borderColor: "#EFF1F2",
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 54,
    padding: 14,
    fontSize: 17,
    color: "#171717",
  },

  aviso: {
    fontSize: 15,
    lineHeight: 23,
    color: "#667572",
  },

  carregamento: { marginTop: 70 },

  progresso: { marginTop: 18 },

  erro: {
    marginTop: 48,
    gap: 20,
  },
});
