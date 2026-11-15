
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');

const {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} = require('firebase/firestore');

const regras = fs.readFileSync(
  path.join(__dirname, '..', 'firestore.rules'),
  'utf8'
);

const projeto = 'demo-healthsync';

const pacienteId = 'paciente-teste';
const medicoId = 'medico-teste';
const outroId = 'outro-usuario';

function dadosPaciente() {
  return {
    nome: 'Paciente Teste',
    email: 'paciente@teste.com',
    dataNascimento: '10/05/2000',
    telefone: '(81) 99999-9999',
    telefoneEmergencia: '(81) 98888-8888',
    perfil: 'patient',
    verificado: false,
    especialidade: null,
    apresentaMorbidade: false,
    condicoes: [],
    tiposCondicoes: {},
  };
}

function dadosMedico() {
  return {
    nome: 'Medico Teste',
    email: 'medico@teste.com',
    dataNascimento: '15/08/1990',
    telefone: '(81) 97777-7777',
    perfil: 'professional',
    verificado: true,
    especialidade: 'Médico',
    crm: '123456-PE',
  };
}

test('Regras de segurança do HealthSync', async (t) => {
  const ambiente = await initializeTestEnvironment({
    projectId: projeto,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: regras,
    },
  });

  async function prepararDados() {
    await ambiente.clearFirestore();

    await ambiente.withSecurityRulesDisabled(
      async (contexto) => {
        const banco = contexto.firestore();

        await setDoc(
          doc(banco, 'usuarios', pacienteId),
          dadosPaciente()
        );

        await setDoc(
          doc(banco, 'usuarios', medicoId),
          dadosMedico()
        );

        await setDoc(
          doc(banco, 'usuarios', outroId),
          {
            ...dadosPaciente(),
            nome: 'Outro Paciente',
          }
        );
      }
    );
  }

  function bancoPaciente() {
    return ambiente
      .authenticatedContext(pacienteId)
      .firestore();
  }

  function bancoMedico() {
    return ambiente
      .authenticatedContext(medicoId)
      .firestore();
  }

  const referenciaPaciente = (banco) =>
    doc(banco, 'usuarios', pacienteId);

  const referenciaMedico = (banco) =>
    doc(banco, 'usuarios', medicoId);

  async function caso(nome, executar) {
    await t.test(nome, async () => {
      await prepararDados();
      await executar();
    });
  }

  try {
    await caso(
      'Paciente pode consultar o próprio perfil',
      async () => {
        const banco = bancoPaciente();

        const resultado = await assertSucceeds(
          getDoc(referenciaPaciente(banco))
        );

        assert.equal(
          resultado.data().perfil,
          'patient'
        );
      }
    );

    await caso(
      'Paciente pode alterar o nome',
      async () => {
        const banco = bancoPaciente();

        await assertSucceeds(
          updateDoc(
            referenciaPaciente(banco),
            {
              nome: 'Paciente Atualizado',
            }
          )
        );
      }
    );

    await caso(
      'Paciente pode alterar telefone',
      async () => {
        const banco = bancoPaciente();

        await assertSucceeds(
          updateDoc(
            referenciaPaciente(banco),
            {
              telefone: '(81) 96666-6666',
            }
          )
        );
      }
    );

    await caso(
      'Paciente pode alterar data de nascimento',
      async () => {
        const banco = bancoPaciente();

        await assertSucceeds(
          updateDoc(
            referenciaPaciente(banco),
            {
              dataNascimento: '20/06/2001',
            }
          )
        );
      }
    );

    await caso(
      'Paciente pode declarar diabetes',
      async () => {
        const banco = bancoPaciente();

        await assertSucceeds(
          updateDoc(
            referenciaPaciente(banco),
            {
              apresentaMorbidade: true,
              condicoes: ['Diabetes'],
              tiposCondicoes: {
                Diabetes: 'Diabetes Tipo 2',
              },
            }
          )
        );
      }
    );

    await caso(
      'Paciente pode declarar duas condições',
      async () => {
        const banco = bancoPaciente();

        await assertSucceeds(
          updateDoc(
            referenciaPaciente(banco),
            {
              apresentaMorbidade: true,
              condicoes: [
                'Diabetes',
                'Hipertensão',
              ],
              tiposCondicoes: {
                Diabetes: 'Diabetes Tipo 1',
                Hipertensão:
                  'Hipertensão Essencial / Primária',
              },
            }
          )
        );
      }
    );

    await caso(
      'Paciente pode remover condições de saúde',
      async () => {
        const banco = bancoPaciente();

        await assertSucceeds(
          updateDoc(
            referenciaPaciente(banco),
            {
              apresentaMorbidade: false,
              condicoes: [],
              tiposCondicoes: {},
            }
          )
        );
      }
    );

    await caso(
      'Paciente não pode declarar tipo inválido',
      async () => {
        const banco = bancoPaciente();

        await assertFails(
          updateDoc(
            referenciaPaciente(banco),
            {
              apresentaMorbidade: true,
              condicoes: ['Diabetes'],
              tiposCondicoes: {
                Diabetes: 'Tipo inexistente',
              },
            }
          )
        );
      }
    );

    await caso(
      'Paciente não pode declarar morbidade sem condição',
      async () => {
        const banco = bancoPaciente();

        await assertFails(
          updateDoc(
            referenciaPaciente(banco),
            {
              apresentaMorbidade: true,
              condicoes: [],
              tiposCondicoes: {},
            }
          )
        );
      }
    );

    await caso(
      'Paciente não pode alterar tipo de conta',
      async () => {
        const banco = bancoPaciente();

        await assertFails(
          updateDoc(
            referenciaPaciente(banco),
            {
              perfil: 'professional',
            }
          )
        );
      }
    );

    await caso(
      'Paciente não pode se declarar verificado',
      async () => {
        const banco = bancoPaciente();

        await assertFails(
          updateDoc(
            referenciaPaciente(banco),
            {
              verificado: true,
            }
          )
        );
      }
    );

    await caso(
      'Paciente não pode alterar especialidade',
      async () => {
        const banco = bancoPaciente();

        await assertFails(
          updateDoc(
            referenciaPaciente(banco),
            {
              especialidade: 'Médico',
            }
          )
        );
      }
    );

    await caso(
      'Paciente não pode modificar outro usuário',
      async () => {
        const banco = bancoPaciente();

        await assertFails(
          updateDoc(
            doc(banco, 'usuarios', outroId),
            {
              nome: 'Alteracao Indevida',
            }
          )
        );
      }
    );

    await caso(
      'Usuário não autenticado não pode ler perfil',
      async () => {
        const banco = ambiente
          .unauthenticatedContext()
          .firestore();

        await assertFails(
          getDoc(referenciaPaciente(banco))
        );
      }
    );

    await caso(
      'Profissional pode alterar nome',
      async () => {
        const banco = bancoMedico();

        await assertSucceeds(
          updateDoc(
            referenciaMedico(banco),
            {
              nome: 'Medico Atualizado',
            }
          )
        );
      }
    );

    await caso(
      'Profissional pode alterar telefone',
      async () => {
        const banco = bancoMedico();

        await assertSucceeds(
          updateDoc(
            referenciaMedico(banco),
            {
              telefone: '(81) 95555-5555',
            }
          )
        );
      }
    );

    await caso(
      'Profissional verificado não pode alterar especialidade',
      async () => {
        const banco = bancoMedico();

        await assertFails(
          updateDoc(
            referenciaMedico(banco),
            {
              especialidade: 'Enfermeiro',
            }
          )
        );
      }
    );

    await caso(
      'Profissional não pode alterar verificação',
      async () => {
        const banco = bancoMedico();

        await assertFails(
          updateDoc(
            referenciaMedico(banco),
            {
              verificado: false,
            }
          )
        );
      }
    );

    await caso(
      'Exclusão direta do perfil deve ser bloqueada',
      async () => {
        const banco = bancoPaciente();

        await assertFails(
          deleteDoc(
            referenciaPaciente(banco)
          )
        );
      }
    );
  } finally {
    await ambiente.cleanup();
  }
});
