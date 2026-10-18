import { auth, db } from "@/firebaseConfig";
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import {
  hora,
  horarioValido,
  inicioDoDia,
  parseData,
  statusMedicamento,
  validarMedicamento,
} from "@/utils/medicamentos";

// =========================================================
// TIPOS
// =========================================================

export type DuracaoMedicamento = "continuo" | "periodo";

export interface DadosMedicamento {
  nome: string;
  dosagem: string;
  unidade: string;
  forma: string;

  frequencia: number;
  horarios: string[];
  duracao: DuracaoMedicamento;
  dataInicial: string;
  dataFinal: string;

  instrucoes: string;
  lembrete: boolean;
}

export interface Medicamento extends DadosMedicamento {
  id?: string;
  userId: string;
  lembreteMinutos?: number;
}

export type StatusDose = "confirmada" | "nao_registrada";

export interface DoseMedicamento {
  id?: string;
  previstoEm: Timestamp;
  confirmadaEm?: Timestamp | null;
  status: StatusDose;
}

// Cursor usado para paginar o histórico de doses.
export type CursorDoses = QueryDocumentSnapshot<DocumentData>;

export interface PaginaDoses {
  doses: DoseMedicamento[];
  cursor: CursorDoses | null;
  temMais: boolean;
}

// =========================================================
// FUNÇÕES AUXILIARES
// =========================================================

const COLECAO = "medicamentos";
const MINUTOS_LEMBRETE_PADRAO = 10;

function exigirUsuario(userId: string): void {
  const usuarioAtual = auth.currentUser;

  if (!usuarioAtual || usuarioAtual.uid !== userId) {
    throw new Error("Usuário não autorizado.");
  }
}

function normalizar(dados: DadosMedicamento) {
  return {
    nome: dados.nome.trim(),
    dosagem: dados.dosagem.trim(),
    unidade: dados.unidade.trim(),
    forma: dados.forma.trim(),
    frequencia: dados.frequencia,
    horarios: dados.horarios.map((h) => h.trim()),
    duracao: dados.duracao,
    dataInicial: dados.dataInicial.trim(),
    dataFinal: dados.duracao === "continuo" ? "" : dados.dataFinal.trim(),
    instrucoes: dados.instrucoes.trim(),
    lembrete: dados.lembrete,
    lembreteMinutos: MINUTOS_LEMBRETE_PADRAO,
  };
}

function lerMedicamento(id: string, dados: DocumentData): Medicamento {
  const texto = (campo: string, padrao = ""): string => {
    const valor: unknown = dados[campo];
    return typeof valor === "string" ? valor : padrao;
  };
  const horarios: unknown = dados.horarios;
  if (
    !texto("nome").trim() ||
    !texto("userId") ||
    !Array.isArray(horarios) ||
    horarios.length === 0 ||
    horarios.some((h: unknown) => typeof h !== "string" || !horarioValido(h))
  ) {
    throw new Error(
      `O cadastro "${texto("nome", id)}" contém dados incompletos. Revise o registro antes de continuar.`,
    );
  }
  if (!parseData(texto("dataInicial"))) {
    throw new Error(
      `O cadastro "${texto("nome")}" está sem uma data inicial válida.`,
    );
  }
  if (!["continuo", "periodo"].includes(texto("duracao"))) {
    throw new Error(
      `O cadastro "${texto("nome")}" está sem uma duração válida.`,
    );
  }
  if (dados.duracao === "periodo") {
    const fim = parseData(texto("dataFinal"));
    const inicio = parseData(texto("dataInicial"))!;
    if (!fim || fim < inicio) {
      throw new Error(
        `O cadastro "${texto("nome")}" contém um período inválido.`,
      );
    }
  }
  return {
    id,
    userId: texto("userId"),
    nome: texto("nome"),
    dosagem: texto("dosagem"),
    unidade: texto("unidade"),
    forma: texto("forma"),
    frequencia: new Set(horarios as string[]).size,
    horarios: [...new Set(horarios as string[])].sort(),
    duracao: dados.duracao,
    dataInicial: texto("dataInicial"),
    dataFinal: texto("dataFinal"),
    instrucoes: texto("instrucoes"),
    lembrete: dados.lembrete === true,
    lembreteMinutos:
      typeof dados.lembreteMinutos === "number" ? dados.lembreteMinutos : 10,
  };
}

// Gera o ID do novo medicamento antes de salvar (evita cadastro duplicado
// se o usuário tocar duas vezes no botão).
export function gerarIdMedicamento(): string {
  return doc(collection(db, COLECAO)).id;
}

// =========================================================
// CRIAR, LISTAR, BUSCAR, ATUALIZAR E EXCLUIR
// =========================================================

export async function criarMedicamento(
  userId: string,
  dados: DadosMedicamento,
  novoId: string,
): Promise<void> {
  exigirUsuario(userId);
  const problema = validarMedicamento(dados);
  if (problema) throw new Error(problema.descricao);
  await setDoc(doc(db, COLECAO, novoId), {
    userId,
    ...normalizar(dados),
    createdAt: serverTimestamp(),
  });
}

export async function listarMedicamentos(
  userId: string,
): Promise<Medicamento[]> {
  exigirUsuario(userId);

  const resultado = await getDocs(
    query(collection(db, COLECAO), where("userId", "==", userId)),
  );

  return resultado.docs
    .map((documento) => lerMedicamento(documento.id, documento.data()))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function buscarMedicamentoPorId(
  medicamentoId: string,
  userId: string,
): Promise<Medicamento | null> {
  exigirUsuario(userId);
  const resultado = await getDoc(doc(db, COLECAO, medicamentoId));

  if (!resultado.exists()) {
    return null;
  }

  const dados = resultado.data();

  if (dados.userId !== userId) {
    return null;
  }

  return lerMedicamento(resultado.id, dados);
}

export async function atualizarMedicamento(
  medicamentoId: string,
  userId: string,
  dados: DadosMedicamento,
): Promise<void> {
  exigirUsuario(userId);

  const referencia = doc(db, COLECAO, medicamentoId);
  const resultado = await getDoc(referencia);

  if (!resultado.exists()) {
    throw new Error("Medicamento não encontrado.");
  }

  if (resultado.data().userId !== userId) {
    throw new Error("Você não tem permissão para editar este medicamento.");
  }

  const problema = validarMedicamento(dados);
  if (problema) throw new Error(problema.descricao);

  await updateDoc(referencia, {
    ...normalizar(dados),
    updatedAt: serverTimestamp(),
  });
}

export async function excluirMedicamento(
  medicamentoId: string,
  userId: string,
): Promise<void> {
  exigirUsuario(userId);

  const referencia = doc(db, COLECAO, medicamentoId);
  const resultado = await getDoc(referencia);

  if (!resultado.exists()) {
    throw new Error("Medicamento não encontrado.");
  }

  if (resultado.data().userId !== userId) {
    throw new Error("Você não tem permissão para excluir este medicamento.");
  }

  while (true) {
    exigirUsuario(userId);
    const doses = await getDocs(
      query(collection(referencia, "doses"), limit(400)),
    );
    if (doses.empty) break;
    const lote = writeBatch(db);
    doses.docs.forEach((dose) => lote.delete(dose.ref));
    await lote.commit();
  }

  await deleteDoc(referencia);
}

export async function listarDoses(
  medicamentoId: string,
  userId: string,
  quantidade = 3,
): Promise<DoseMedicamento[]> {
  const medicamento = await buscarMedicamentoPorId(medicamentoId, userId);

  if (!medicamento) {
    return [];
  }

  const resultado = await getDocs(
    query(
      collection(db, COLECAO, medicamentoId, "doses"),
      orderBy("previstoEm", "desc"),
      limit(quantidade),
    ),
  );

  return resultado.docs.map(
    (documento) =>
      ({
        id: documento.id,
        ...documento.data(),
      }) as DoseMedicamento,
  );
}

// =========================================================
// DOSES
// =========================================================

function chaveDose(previsto: Date): string {
  return `dose_${previsto.getTime()}`;
}

// Horários (em milissegundos) das doses já confirmadas no dia informado.
export async function listarConfirmacoesDoDia(
  medicamento: Medicamento,
  dia: Date,
): Promise<number[]> {
  exigirUsuario(medicamento.userId);

  if (!medicamento.id) {
    throw new Error("Medicamento sem identificador.");
  }

  const inicio = inicioDoDia(dia);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  const resultado = await getDocs(
    query(
      collection(db, COLECAO, medicamento.id, "doses"),
      where("previstoEm", ">=", Timestamp.fromDate(inicio)),
      where("previstoEm", "<", Timestamp.fromDate(fim)),
    ),
  );

  return resultado.docs
    .map((d) => d.data() as DoseMedicamento)
    .filter((d) => d.status === "confirmada")
    .map((d) => d.previstoEm.toMillis());
}

// Uma página do histórico completo (mais recentes primeiro).
export async function listarHistoricoDoses(
  medicamento: Medicamento,
  cursor: CursorDoses | null,
  tamanho = 20,
): Promise<PaginaDoses> {
  if (!medicamento.id) {
    throw new Error("Medicamento sem identificador.");
  }

  const m = await buscarMedicamentoPorId(medicamento.id, medicamento.userId);

  if (!m) {
    throw new Error("Medicamento não encontrado.");
  }

  const base = collection(db, COLECAO, medicamento.id, "doses");
  const restricoes = [
    orderBy("previstoEm", "desc"),
    orderBy(documentId(), "desc"),
    limit(tamanho),
  ];
  const consulta = cursor
    ? query(base, ...restricoes, startAfter(cursor))
    : query(base, ...restricoes);

  const resultado = await getDocs(consulta);

  return {
    doses: resultado.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as DoseMedicamento,
    ),
    cursor: resultado.docs.at(-1) ?? cursor,
    temMais: resultado.size === tamanho,
  };
}

export async function confirmarDose(
  m: Medicamento,
  previsto: Date,
): Promise<void> {
  exigirUsuario(m.userId);
  if (!m.id) throw new Error("Medicamento sem identificador.");
  if (previsto.getTime() > Date.now()) {
    throw new Error("Este horário ainda não chegou.");
  }
  const referencia = doc(db, COLECAO, m.id);
  const doseRef = doc(referencia, "doses", chaveDose(previsto));
  const anteriores = await getDocs(
    query(
      collection(referencia, "doses"),
      where("previstoEm", "==", Timestamp.fromDate(previsto)),
    ),
  );
  if (anteriores.docs.some((d) => d.data().status === "confirmada")) return;
  await runTransaction(db, async (transaction) => {
    const [medSnapshot, doseSnapshot] = await Promise.all([
      transaction.get(referencia),
      transaction.get(doseRef),
    ]);
    if (!medSnapshot.exists() || medSnapshot.data().userId !== m.userId) {
      throw new Error("Medicamento não encontrado ou acesso não autorizado.");
    }
    const atual = { ...medSnapshot.data(), id: m.id } as Medicamento;
    if (
      statusMedicamento(atual, previsto) !== "ativo" ||
      !atual.horarios.includes(hora(previsto))
    ) {
      throw new Error(
        "O plano foi alterado. Atualize a tela antes de registrar.",
      );
    }
    if (doseSnapshot.exists() && doseSnapshot.data().status === "confirmada")
      return;
    transaction.set(doseRef, {
      previstoEm: Timestamp.fromDate(previsto),
      confirmadaEm: serverTimestamp(),
      status: "confirmada",
    });
  });
}
