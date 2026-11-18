
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
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} = require('firebase/firestore');

const rules = fs.readFileSync(
  path.join(__dirname, '..', 'firestore.rules'),
  'utf8'
);

const pacienteId = 'paciente-pressao';
const medicoId = 'medico-pressao';
const outroId = 'outro-pressao';

const vinculoId = `${medicoId}_${pacienteId}`;

const dadosPressao = {
  sistolica: 145,
  diastolica: 95,
  dataMedicao: new Date('2026-11-01T12:00:00Z'),
};

test('Acesso às medições de pressão por médico vinculado', async (t) => {

  const ambiente = await initializeTestEnvironment({
    // Mesmo ID configurado no emulador Firebase.
    projectId: 'health-sync-projeto',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules,
    },
  });

  const banco = (uid) =>
    ambiente.authenticatedContext(uid).firestore();

  const registro = (db) =>
    doc(
      db,
      'usuarios',
      pacienteId,
      'registrosPressao',
      'medicao-1'
    );

  const registros = (db) =>
    collection(
      db,
      'usuarios',
      pacienteId,
      'registrosPressao'
    );

  // Prepara os dados para cada cenário.
  async function preparar(status = 'ativo') {

    await ambiente.clearFirestore();

    await ambiente.withSecurityRulesDisabled(async (ctx) => {
      const admin = ctx.firestore();

      await setDoc(doc(admin, 'usuarios', pacienteId), {
        perfil: 'patient',
        nome: 'Paciente',
        verificado: false,
      });

      await setDoc(doc(admin, 'usuarios', medicoId), {
        perfil: 'professional',
        especialidade: 'Médico',
        verificado: true,
        nome: 'Médico',
      });

      await setDoc(doc(admin, 'usuarios', outroId), {
        perfil: 'patient',
        nome: 'Outro',
        verificado: false,
      });

      await setDoc(doc(admin, 'vinculos', vinculoId), {
        profissionalId: medicoId,
        pacienteId,
        status,
      });

      await setDoc(registro(admin), dadosPressao);
    });
  }

  async function caso(nome, status, fn) {
    await t.test(nome, async () => {
      await preparar(status);
      await fn();
    });
  }

  try {

    // TESTE 1: paciente consulta seus registros.
    await caso(
      'Paciente lê seus próprios registros',
      'ativo',
      async () => {
        const resultado = await assertSucceeds(
          getDoc(registro(banco(pacienteId)))
        );

        assert.equal(resultado.data().sistolica, 145);

        await assertSucceeds(
          getDocs(registros(banco(pacienteId)))
        );
      }
    );

    // TESTE 2: médico vinculado consulta registros.
    await caso(
      'Médico verificado e vinculado lê registros e lista',
      'ativo',
      async () => {
        const resultado = await assertSucceeds(
          getDoc(registro(banco(medicoId)))
        );

        assert.equal(resultado.data().diastolica, 95);

        const lista = await assertSucceeds(
          getDocs(registros(banco(medicoId)))
        );

        assert.equal(lista.size, 1);
      }
    );

    // TESTE 3: médico não pode modificar registros.
    await caso(
      'Médico vinculado não altera nem exclui',
      'ativo',
      async () => {
        const db = banco(medicoId);

        await assertFails(
          updateDoc(registro(db), { sistolica: 120 })
        );

        await assertFails(
          deleteDoc(registro(db))
        );

        await assertFails(
          setDoc(
            doc(registros(db), 'medicao-2'),
            dadosPressao
          )
        );
      }
    );

    // TESTE 4: vínculo revogado bloqueia leitura.
    await caso(
      'Médico com vínculo revogado perde acesso',
      'revogado',
      async () => {
        const db = banco(medicoId);

        await assertFails(
          getDoc(registro(db))
        );

        await assertFails(
          getDocs(registros(db))
        );
      }
    );

    // TESTE 5: terceiros não podem acessar.
    await caso(
      'Usuário não vinculado não pode ler',
      'ativo',
      async () => {
        const db = banco(outroId);

        await assertFails(
          getDoc(registro(db))
        );

        await assertFails(
          getDocs(registros(db))
        );
      }
    );

  } finally {
    await ambiente.cleanup();
  }
});
