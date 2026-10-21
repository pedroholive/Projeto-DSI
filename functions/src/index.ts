
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
  FieldValue,
} from "firebase-admin/firestore";
import { randomBytes, createHash } from "node:crypto";

initializeApp();

const db = getFirestore();

function gerarHash(codigo: string): string {
  return createHash("sha256")
    .update(codigo)
    .digest("hex");
}

const MAX_TENTATIVAS = 5;
const JANELA_TENTATIVAS_MS = 10 * 60 * 1000;

async function verificarLimiteTentativas(
  profissionalId: string
): Promise<void> {
  const controleRef = db
    .collection("tentativasCodigoVinculo")
    .doc(profissionalId);

  const agora = Date.now();

  await db.runTransaction(async (transaction) => {
    const documento = await transaction.get(controleRef);
    const dados = documento.data();

    const inicioJanela =
      dados?.inicioJanela instanceof Timestamp
        ? dados.inicioJanela.toMillis()
        : 0;

    const dentroDaJanela =
      agora - inicioJanela < JANELA_TENTATIVAS_MS;

    const tentativas = dentroDaJanela
      ? (dados?.tentativas ?? 0)
      : 0;

    if (tentativas >= MAX_TENTATIVAS) {
      throw new HttpsError(
        "resource-exhausted",
        "Limite de tentativas atingido. Aguarde 10 minutos."
      );
    }

    transaction.set(controleRef, {
      tentativas: tentativas + 1,
      inicioJanela: Timestamp.fromMillis(
        dentroDaJanela ? inicioJanela : agora
      ),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  });
}

// ======================================================
// 1. GERAR CÓDIGO DE VÍNCULO
// ======================================================

export const gerarCodigoVinculo = onCall(
  async (request) => {
    const pacienteId = request.auth?.uid;

    if (!pacienteId) {
      throw new HttpsError(
        "unauthenticated",
        "É necessário estar autenticado."
      );
    }

    const usuarioDoc = await db
      .collection("usuarios")
      .doc(pacienteId)
      .get();

    if (
      !usuarioDoc.exists ||
      usuarioDoc.data()?.perfil !== "patient"
    ) {
      throw new HttpsError(
        "permission-denied",
        "Somente pacientes podem gerar códigos."
      );
    }

    const controleRef = db
      .collection("controleCodigosVinculo")
      .doc(pacienteId);

    const codigo = randomBytes(6)
      .toString("hex")
      .toUpperCase();

    const hash = gerarHash(codigo);

    const codigoRef = db
      .collection("codigosVinculo")
      .doc(hash);

    const agora = Timestamp.now();

    const expiraEm = Timestamp.fromMillis(
      agora.toMillis() + 10 * 60 * 1000
    );

    await db.runTransaction(async (transaction) => {
      const controleDoc = await transaction.get(
        controleRef
      );

      const controle = controleDoc.data();

      // Impede gerar outro código antes de 1 minuto.
      if (controle?.ultimaGeracao instanceof Timestamp) {
        const intervalo =
          agora.toMillis() -
          controle.ultimaGeracao.toMillis();

        if (intervalo < 60 * 1000) {
          throw new HttpsError(
            "resource-exhausted",
            "Aguarde 1 minuto antes de gerar outro código."
          );
        }
      }

      // Invalida o código anterior, caso exista.
      const hashAnterior = controle?.hashAtivo;

      if (typeof hashAnterior === "string") {
        const codigoAnteriorRef = db
          .collection("codigosVinculo")
          .doc(hashAnterior);

        // A leitura precisa ocorrer antes das escritas.
        const codigoAnteriorDoc =
          await transaction.get(codigoAnteriorRef);

        if (codigoAnteriorDoc.exists) {
          transaction.update(codigoAnteriorRef, {
            utilizado: true,
            invalidadoEm: FieldValue.serverTimestamp(),
          });
        }
      }

      // Cria o novo código.
      transaction.create(codigoRef, {
        pacienteId,
        criadoEm: FieldValue.serverTimestamp(),
        expiraEm,
        utilizado: false,
      });

      // Atualiza o controle do paciente.
      transaction.set(controleRef, {
        hashAtivo: hash,
        ultimaGeracao: FieldValue.serverTimestamp(),
        expiraEm,
      });
    });

    return {
      codigo,
      expiraEm: expiraEm.toMillis(),
    };
  }
);

// ======================================================
// 2. SOLICITAR VÍNCULO POR CÓDIGO
// ======================================================

export const solicitarVinculoPorCodigo = onCall(
  async (request) => {
    const profissionalId = request.auth?.uid;
    const codigoRecebido = request.data?.codigo;

    if (!profissionalId) {
      throw new HttpsError(
        "unauthenticated",
        "É necessário estar autenticado."
      );
    }

    if (
      typeof codigoRecebido !== "string" ||
      !/^[A-Fa-f0-9]{12}$/.test(codigoRecebido)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Código de vínculo inválido."
      );
    }

    const profissionalDoc = await db
      .collection("usuarios")
      .doc(profissionalId)
      .get();

    const profissional = profissionalDoc.data();

    if (
      !profissionalDoc.exists ||
      profissional?.perfil !== "professional" ||
      profissional?.especialidade !== "Médico" ||
      profissional?.verificado !== true
    ) {
      throw new HttpsError(
        "permission-denied",
        "Profissional não autorizado."
      );
    }

    await verificarLimiteTentativas(profissionalId);

    const codigo = codigoRecebido.toUpperCase();
    const hash = gerarHash(codigo);

    const codigoRef = db
      .collection("codigosVinculo")
      .doc(hash);

    const resultado = await db.runTransaction(
      async (transaction) => {
        const codigoDoc = await transaction.get(codigoRef);

        if (!codigoDoc.exists) {
          throw new HttpsError(
            "not-found",
            "Código inválido ou expirado."
          );
        }

        const dadosCodigo = codigoDoc.data()!;

        if (
          dadosCodigo.utilizado !== false ||
          !(dadosCodigo.expiraEm instanceof Timestamp) ||
          dadosCodigo.expiraEm.toMillis() <= Date.now()
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Código expirado ou já utilizado."
          );
        }

        const pacienteId = dadosCodigo.pacienteId;

        const controleRef = db
          .collection("controleCodigosVinculo")
          .doc(pacienteId);

        const controleDoc = await transaction.get(
          controleRef
        );

        if (
          !controleDoc.exists ||
          controleDoc.data()?.hashAtivo !== hash
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Este código não está mais ativo."
          );
        }

        if (
          typeof pacienteId !== "string" ||
          pacienteId === profissionalId
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Solicitação inválida."
          );
        }

        const vinculoId =
          `${profissionalId}_${pacienteId}`;

        const vinculoRef = db
          .collection("vinculos")
          .doc(vinculoId);

        const vinculoDoc = await transaction.get(vinculoRef);

        if (vinculoDoc.exists) {
          throw new HttpsError(
            "already-exists",
            "Já existe uma solicitação ou vínculo."
          );
        }

        transaction.create(vinculoRef, {
          profissionalId,
          pacienteId,
          status: "pendente",
          criadoEm: FieldValue.serverTimestamp(),
          atualizadoEm: FieldValue.serverTimestamp(),
        });

        transaction.update(codigoRef, {
          utilizado: true,
          utilizadoEm: FieldValue.serverTimestamp(),
        });

        return { vinculoId };
      }
    );

    return {
      sucesso: true,
      vinculoId: resultado.vinculoId,
    };
  }
);

// ======================================================
// 3. LISTAR PACIENTES VINCULADOS AO MÉDICO
// ======================================================

export const listarPacientesVinculados = onCall(
  async (request) => {
    const profissionalId = request.auth?.uid;

    if (!profissionalId) {
      throw new HttpsError(
        "unauthenticated",
        "É necessário estar autenticado."
      );
    }

    // Verifica se o usuário é um médico autorizado.
    const profissionalDoc = await db
      .collection("usuarios")
      .doc(profissionalId)
      .get();

    const profissional = profissionalDoc.data();

    if (
      !profissionalDoc.exists ||
      profissional?.perfil !== "professional" ||
      profissional?.especialidade !== "Médico" ||
      profissional?.verificado !== true
    ) {
      throw new HttpsError(
        "permission-denied",
        "Somente médicos verificados podem consultar pacientes vinculados."
      );
    }

    // Busca somente os vínculos ativos deste médico.
    const vinculosSnapshot = await db
      .collection("vinculos")
      .where("profissionalId", "==", profissionalId)
      .where("status", "==", "ativo")
      .get();

    // Busca os nomes dos pacientes autorizados.
    const pacientes = await Promise.all(
      vinculosSnapshot.docs.map(async (vinculoDoc) => {
        const pacienteId = vinculoDoc.data().pacienteId;

        if (typeof pacienteId !== "string") {
          return null;
        }

        const pacienteDoc = await db
          .collection("usuarios")
          .doc(pacienteId)
          .get();

        if (
          !pacienteDoc.exists ||
          pacienteDoc.data()?.perfil !== "patient"
        ) {
          return null;
        }

        const nome = pacienteDoc.data()?.nome;

        return {
          id: pacienteId,
          nome:
            typeof nome === "string" && nome.trim()
              ? nome.trim()
              : "Paciente sem nome",
        };
      })
    );

    // Retorna apenas os dados necessários à interface.
    return {
      pacientes: pacientes.filter(
        (
          paciente
        ): paciente is { id: string; nome: string } =>
          paciente !== null
      ),
    };
  }
);
