import type {
  DadosMedicamento,
  DoseMedicamento,
  Medicamento,
} from "@/services/medicamentoService";

// =========================================================
// CONSTANTES
// =========================================================

export const UNIDADES = ["mg", "g", "mcg", "ml", "UI", "gotas"];

export const FORMAS = [
  "Comprimido",
  "Cápsula",
  "Líquido",
  "Gotas",
  "Injetável",
  "Pomada",
  "Spray",
];

export const HORARIOS_PADRAO = ["08:00", "14:00", "20:00"];

export const MAX_HORARIOS = 3;

// =========================================================
// MÁSCARAS E DATAS
// =========================================================

export function mascaraData(texto: string): string {
  const n = texto.replace(/\D/g, "").slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

export function mascaraHorario(texto: string): string {
  const n = texto.replace(/\D/g, "").slice(0, 4);

  return n.length <= 2 ? n : `${n.slice(0, 2)}:${n.slice(2)}`;
}

export function horarioValido(valor: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(valor)) return false;

  const [hora, minuto] = valor.split(":").map(Number);
  return hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59;
}

export function parseData(valor: string): Date | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return null;

  const [dia, mes, ano] = valor.split("/").map(Number);
  if (ano < 1900) return null;

  const data = new Date(ano, mes - 1, dia);

  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return null;
  }

  return data;
}

export function formatarData(data: Date): string {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");

  return `${dia}/${mes}/${data.getFullYear()}`;
}

export function minutosDoDia(horario: string): number {
  const [h, m] = horario.split(":").map(Number);
  return h * 60 + m;
}

export function inicioDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

// =========================================================
// VALIDAÇÃO DO FORMULÁRIO
// =========================================================

export interface ErroFormulario {
  titulo: string;
  descricao: string;
}

export function validarMedicamento(
  dados: DadosMedicamento,
): ErroFormulario | null {
  if (dados.nome.trim().length < 2) {
    return {
      titulo: "Nome obrigatório",
      descricao: "Informe o nome do medicamento.",
    };
  }

  if (dados.nome.trim().length > 120 || dados.instrucoes.length > 2000) {
    return {
      titulo: "Texto muito longo",
      descricao: "Use até 120 caracteres no nome e 2.000 nas instruções.",
    };
  }
  if (!UNIDADES.includes(dados.unidade)) {
    return {
      titulo: "Unidade inválida",
      descricao: "Selecione uma unidade disponível.",
    };
  }
  if (
    ![1, 2, 3].includes(dados.frequencia) ||
    dados.frequencia !== dados.horarios.length
  ) {
    return {
      titulo: "Frequência inválida",
      descricao:
        "Informe um horário diferente para cada dose, de 1 a 3 vezes ao dia.",
    };
  }
  if (!["continuo", "periodo"].includes(dados.duracao)) {
    return {
      titulo: "Duração inválida",
      descricao: "Escolha uso contínuo ou por período.",
    };
  }
  const dosagem = Number(dados.dosagem.trim().replace(",", "."));

  if (!dados.dosagem.trim() || !Number.isFinite(dosagem) || dosagem <= 0) {
    return {
      titulo: "Dosagem inválida",
      descricao: "Informe uma dosagem maior que zero. Ex.: 850.",
    };
  }

  if (!FORMAS.includes(dados.forma)) {
    return {
      titulo: "Forma obrigatória",
      descricao: "Selecione a forma do medicamento (comprimido, cápsula...).",
    };
  }

  if (dados.horarios.length === 0) {
    return {
      titulo: "Horário obrigatório",
      descricao: "Adicione ao menos um horário.",
    };
  }

  if (dados.horarios.some((h) => !horarioValido(h.trim()))) {
    return {
      titulo: "Horário inválido",
      descricao: "Use o formato HH:MM, entre 00:00 e 23:59.",
    };
  }

  if (
    new Set(dados.horarios.map((h) => h.trim())).size !== dados.horarios.length
  ) {
    return {
      titulo: "Horários repetidos",
      descricao: "Cada dose precisa de um horário diferente.",
    };
  }

  const inicio = parseData(dados.dataInicial.trim());

  if (!inicio) {
    return {
      titulo: "Data inicial inválida",
      descricao: "Informe uma data válida no formato DD/MM/AAAA.",
    };
  }

  if (dados.duracao === "periodo") {
    const fim = parseData(dados.dataFinal.trim());

    if (!fim) {
      return {
        titulo: "Data final inválida",
        descricao:
          "Para tratamento por período, informe a data final no formato DD/MM/AAAA.",
      };
    }

    if (fim.getTime() < inicio.getTime()) {
      return {
        titulo: "Período inválido",
        descricao: "A data final não pode ser anterior à data inicial.",
      };
    }
  }

  return null;
}

// =========================================================
// STATUS E TEXTOS DO MEDICAMENTO
// =========================================================

export type StatusMedicamento = "ativo" | "agendado" | "finalizado";

export const ROTULO_STATUS: Record<StatusMedicamento, string> = {
  ativo: "Ativo",
  agendado: "Agendado",
  finalizado: "Finalizado",
};

export function statusMedicamento(
  m: Pick<Medicamento, "duracao" | "dataInicial" | "dataFinal">,
  agora: Date = new Date(),
): StatusMedicamento {
  const hoje = inicioDoDia(agora).getTime();
  const inicio = parseData(m.dataInicial);
  const fim = m.duracao === "periodo" ? parseData(m.dataFinal) : null;

  if (inicio && inicio.getTime() > hoje) return "agendado";
  if (fim && fim.getTime() < hoje) return "finalizado";

  return "ativo";
}

export function textoProximaDose(
  m: Medicamento,
  agora: Date = new Date(),
): string | null {
  if (statusMedicamento(m, agora) !== "ativo" || m.horarios.length === 0) {
    return null;
  }

  const minutos = m.horarios.map(minutosDoDia).sort((a, b) => a - b);
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const proxima = minutos.find((x) => x >= agoraMin);

  const formatar = (x: number) =>
    `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;

  if (proxima !== undefined) {
    return `Próxima dose hoje, às ${formatar(proxima)}`;
  }

  const fim = m.duracao === "periodo" ? parseData(m.dataFinal) : null;
  const amanha = inicioDoDia(agora);
  amanha.setDate(amanha.getDate() + 1);

  if (fim && fim.getTime() < amanha.getTime()) {
    return null;
  }

  return `Próxima dose amanhã, às ${formatar(minutos[0])}`;
}

export function textoFrequencia(frequencia: number): string {
  return frequencia === 1 ? "1 vez ao dia" : `${frequencia} vezes ao dia`;
}

export function textoDuracao(m: Medicamento): string {
  if (m.duracao === "continuo") {
    return `Uso contínuo • Início em ${m.dataInicial}`;
  }

  return `De ${m.dataInicial} até ${m.dataFinal}`;
}

export function resumoDosagem(m: Medicamento): string {
  return `${m.dosagem} ${m.unidade} • ${m.forma}`;
}

// =========================================================
// VALORES DO FORMULÁRIO
// =========================================================

export function formularioVazio(): DadosMedicamento {
  return {
    nome: "",
    dosagem: "",
    unidade: "mg",
    forma: "",
    frequencia: 1,
    horarios: [HORARIOS_PADRAO[0]],
    duracao: "continuo",
    dataInicial: formatarData(new Date()),
    dataFinal: "",
    instrucoes: "",
    lembrete: false,
  };
}

export function valoresDoMedicamento(m: Medicamento): DadosMedicamento {
  return {
    nome: m.nome,
    dosagem: m.dosagem,
    unidade: m.unidade,
    forma: m.forma,
    frequencia: m.frequencia,
    horarios: [...m.horarios],
    duracao: m.duracao,
    dataInicial: m.dataInicial,
    dataFinal: m.dataFinal,
    instrucoes: m.instrucoes ?? "",
    lembrete: m.lembrete ?? false,
  };
}

// =========================================================
// HISTÓRICO E DOSES
// =========================================================

export function doisDigitos(n: number) {
  return String(n).padStart(2, "0");
}

export function hora(d: Date) {
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

export function rotuloDose(d: Date, agora: Date) {
  const diaA = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const diaD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((diaA.getTime() - diaD.getTime()) / 86400000);

  if (diff === 0) return `Hoje, ${hora(d)}`;
  if (diff === 1) return `Ontem, ${hora(d)}`;

  const dia = d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });

  return `${dia}, ${hora(d)}`;
}

export function descricaoDose(dose: DoseMedicamento) {
  if (dose.status !== "confirmada" || !dose.confirmadaEm) {
    return "Dose não registrada";
  }

  const atraso = Math.round(
    (dose.confirmadaEm.toMillis() - dose.previstoEm.toMillis()) / 60000,
  );

  if (atraso < -5) return `Dose confirmada • ${Math.abs(atraso)} min antes`;

  return atraso <= 5
    ? "Dose confirmada no horário"
    : `Dose confirmada • ${atraso} min após`;
}

export function dataDaDose(
  m: Medicamento,
  horario: string,
  dia: Date,
): Date | null {
  if (statusMedicamento(m, dia) !== "ativo" || !horarioValido(horario))
    return null;
  const [horas, minutos] = horario.split(":").map(Number);
  return new Date(
    dia.getFullYear(),
    dia.getMonth(),
    dia.getDate(),
    horas,
    minutos,
  );
}

export function proximoHorario(m: Medicamento, agora: Date): number {
  if (statusMedicamento(m, agora) === "finalizado") return Infinity;
  const inicio = parseData(m.dataInicial);
  const dia = inicio && inicio > agora ? inicio : inicioDoDia(agora);
  const fim = m.duracao === "periodo" ? parseData(m.dataFinal) : null;
  for (let deslocamento = 0; deslocamento < 2; deslocamento++) {
    const candidato = new Date(dia);
    candidato.setDate(candidato.getDate() + deslocamento);
    if (fim && candidato > fim) return Infinity;
    for (const horario of [...m.horarios].sort()) {
      const dose = dataDaDose(m, horario, candidato);
      if (dose && dose.getTime() >= agora.getTime()) return dose.getTime();
    }
  }
  return Infinity;
}

// =========================================================
// BUSCA E MENSAGENS DE ERRO
// =========================================================

export function mensagemErro(error: unknown): string {
  const codigo = (error as { code?: string })?.code;
  if (codigo === "permission-denied") {
    return "Sua conta não tem permissão para acessar estes dados. Verifique as regras de acesso do aplicativo.";
  }
  if (codigo === "unavailable") {
    return "Não foi possível conectar. Verifique sua conexão e tente novamente.";
  }
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação. Tente novamente.";
}

export function normalizarBusca(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
