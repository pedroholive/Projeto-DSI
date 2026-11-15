
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const {
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');

const {
  doc,
  setDoc,
  getDoc,
} = require('firebase/firestore');

const PROJECT_ID = 'demo-healthsync';

const AUTH_URL =
  'http://127.0.0.1:9099';

const FUNCTIONS_URL =
  'http://127.0.0.1:5001/demo-healthsync/us-central1';

const SENHA = 'SenhaTeste123!';

async function criarUsuario(tipo) {
  const email =
    `${tipo}-${randomUUID()}@example.com`;

  const resposta = await fetch(
    `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: SENHA,
        returnSecureToken: true,
      }),
    }
  );

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      `Falha ao criar usuário fictício: ${JSON.stringify(dados)}`
    );
  }

  return {
    uid: dados.localId,
    email,
    token: dados.idToken,
  };
}

async function chamarExclusao(token) {
  const resposta = await fetch(
    `${FUNCTIONS_URL}/excluirContaProfissional`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          confirmar: true,
        },
      }),
    }
  );

  return {
    status: resposta.status,
    dados: await resposta.json(),
  };
}

test(
  'Exclusão profissional preserva os dados pessoais dos pacientes',
  async () => {
    const ambiente = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
      },
    });

    try {
      const profissional =
        await criarUsuario('profissional');

      const paciente =
        await criarUsuario('paciente');

      const vinculoId =
        `${profissional.uid}_${paciente.uid}`;

      const consultaMedicaId = randomUUID();
      const consultaPessoalId = randomUUID();

      // Prepara documentos fictícios sem restrições
      // das regras do cliente.
      await ambiente.withSecurityRulesDisabled(
        async (contexto) => {
          const banco = contexto.firestore();

          await setDoc(
            doc(banco, 'usuarios', profissional.uid),
            {
              nome: 'Profissional Teste',
              email: profissional.email,
              perfil: 'professional',
              especialidade: 'Médico',
              verificado: true,
              crm: '123456-PE',
            }
          );

          await setDoc(
            doc(banco, 'usuarios', paciente.uid),
            {
              nome: 'Paciente Teste',
              email: paciente.email,
              perfil: 'patient',
              verificado: false,
            }
          );

          await setDoc(
            doc(banco, 'vinculos', vinculoId),
            {
              profissionalId: profissional.uid,
              pacienteId: paciente.uid,
              status: 'ativo',
              nomePaciente: 'Paciente Teste',
            }
          );

          await setDoc(
            doc(banco, 'consultas', consultaMedicaId),
            {
              userId: paciente.uid,
              pacienteId: paciente.uid,
              medicoId: profissional.uid,
              criadoPorId: profissional.uid,
              origem: 'medico',
              status: 'confirmada',
            }
          );

          await setDoc(
            doc(banco, 'consultas', consultaPessoalId),
            {
              userId: paciente.uid,
              pacienteId: paciente.uid,
              origem: 'pessoal',
              status: 'registro_pessoal',
            }
          );
        }
      );

      // Executa a função real no Functions Emulator.
      const resultado = await chamarExclusao(
        profissional.token
      );

      assert.equal(
        resultado.status,
        200,
        `Erro na Cloud Function: ${JSON.stringify(resultado.dados)}`
      );

      assert.equal(
        resultado.dados.result?.sucesso,
        true
      );

      // Confere a situação dos documentos após a função.
      await ambiente.withSecurityRulesDisabled(
        async (contexto) => {
          const banco = contexto.firestore();

          const perfilMedico = await getDoc(
            doc(banco, 'usuarios', profissional.uid)
          );

          const perfilPaciente = await getDoc(
            doc(banco, 'usuarios', paciente.uid)
          );

          const vinculo = await getDoc(
            doc(banco, 'vinculos', vinculoId)
          );

          const consultaMedica = await getDoc(
            doc(banco, 'consultas', consultaMedicaId)
          );

          const consultaPessoal = await getDoc(
            doc(banco, 'consultas', consultaPessoalId)
          );

          assert.equal(
            perfilMedico.exists(),
            false,
            'O perfil profissional deveria ser excluído.'
          );

          assert.equal(
            perfilPaciente.exists(),
            true,
            'O perfil do paciente deve ser preservado.'
          );

          assert.equal(
            vinculo.exists(),
            false,
            'O vínculo deveria ser excluído.'
          );

          assert.equal(
            consultaMedica.exists(),
            false,
            'A consulta médica deveria ser excluída.'
          );

          assert.equal(
            consultaPessoal.exists(),
            true,
            'A consulta pessoal do paciente deve ser preservada.'
          );
        }
      );

      // Verifica se a conta profissional foi removida
      // do Authentication Emulator.
      const login = await fetch(
        `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: profissional.email,
            password: SENHA,
            returnSecureToken: true,
          }),
        }
      );

      assert.notEqual(
        login.status,
        200,
        'A conta excluída não deveria conseguir entrar novamente.'
      );

      console.log(
        'Exclusão profissional validada no ambiente emulado.'
      );
    } finally {
      await ambiente.cleanup();
    }
  }
);
