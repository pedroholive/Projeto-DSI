
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
  getDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} = require('firebase/firestore');

const regras = fs.readFileSync(
  path.join(__dirname, '..', 'firestore.rules'),
  'utf8'
);

const projeto = 'demo-healthsync';

const PACIENTE = 'paciente-vinculo-teste';
const OUTRO_PACIENTE = 'outro-paciente-vinculo';
const MEDICO = 'medico-vinculo-teste';
const MEDICO_NAO_VERIFICADO = 'medico-nao-verificado';
const OUTRO_MEDICO = 'outro-medico-vinculo';

const TOKEN = 'a'.repeat(64);
const TOKEN_EXPIRADO = 'b'.repeat(64);
const TOKEN_INVALIDO = 'codigo-invalido';

const VINCULO_ID = `${MEDICO}_${PACIENTE}`;

function perfilPaciente(nome) {
  return {
    nome,
    email: 'paciente@teste.com',
    perfil: 'patient',
    verificado: false,
  };
}

function perfilMedico(nome, verificado) {
  return {
    nome,
    email: 'medico@teste.com',
    perfil: 'professional',
    especialidade: 'Médico',
    crm: '123456-PE',
    verificado,
  };
}

test('Regras de vínculos do HealthSync', async (t) => {
  const ambiente = await initializeTestEnvironment({
    projectId: projeto,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: regras,
    },
  });

  function banco(uid) {
    return ambiente.authenticatedContext(uid).firestore();
  }

  function referenciaCodigo(firestore, codigo = TOKEN) {
    return doc(firestore, 'codigosVinculo', codigo);
  }

  function referenciaVinculo(firestore) {
    return doc(firestore, 'vinculos', VINCULO_ID);
  }

  async function prepararDados({
    criarConvite = false,
    expirado = false,
    statusVinculo = null,
  } = {}) {
    await ambiente.clearFirestore();

    await ambiente.withSecurityRulesDisabled(async (contexto) => {
      const firestore = contexto.firestore();

      await setDoc(
        doc(firestore, 'usuarios', PACIENTE),
        perfilPaciente('Paciente Teste')
      );

      await setDoc(
        doc(firestore, 'usuarios', OUTRO_PACIENTE),
        perfilPaciente('Outro Paciente')
      );

      await setDoc(
        doc(firestore, 'usuarios', MEDICO),
        perfilMedico('Médico Verificado', true)
      );

      await setDoc(
        doc(firestore, 'usuarios', MEDICO_NAO_VERIFICADO),
        perfilMedico('Médico Pendente', false)
      );

      await setDoc(
        doc(firestore, 'usuarios', OUTRO_MEDICO),
        perfilMedico('Outro Médico', true)
      );

      if (criarConvite) {
        const criadoEm = Timestamp.now();

        const expiraEm = Timestamp.fromMillis(
          criadoEm.toMillis() + 10 * 60 * 1000
        );

        await setDoc(
          referenciaCodigo(firestore),
          {
            pacienteId: PACIENTE,
            status: 'disponivel',
            criadoEm,
            expiraEm,
          }
        );
      }

      if (expirado) {
        const criadoEm = Timestamp.fromMillis(
          Date.now() - 20 * 60 * 1000
        );

        const expiraEm = Timestamp.fromMillis(
          criadoEm.toMillis() + 10 * 60 * 1000
        );

        await setDoc(
          referenciaCodigo(firestore, TOKEN_EXPIRADO),
          {
            pacienteId: PACIENTE,
            status: 'disponivel',
            criadoEm,
            expiraEm,
          }
        );
      }

      if (statusVinculo !== null) {
        await setDoc(
          referenciaVinculo(firestore),
          {
            profissionalId: MEDICO,
            pacienteId: PACIENTE,
            status: statusVinculo,
            nomePaciente: 'Paciente Teste',
            criadoEm: Timestamp.now(),
            atualizadoEm: Timestamp.now(),
          }
        );
      }
    });
  }

  async function caso(nome, preparar, executar) {
    await t.test(nome, async () => {
      await prepararDados(preparar);
      await executar();
    });
  }

  async function solicitarVinculo(
    firestore,
    codigo = TOKEN
  ) {
    const conviteRef = referenciaCodigo(firestore, codigo);
    const vinculoRef = referenciaVinculo(firestore);

    return runTransaction(firestore, async (transaction) => {
      const convite = await transaction.get(conviteRef);
      const vinculo = await transaction.get(vinculoRef);

      if (!convite.exists()) {
        throw new Error('Convite não encontrado.');
      }

      if (vinculo.exists()) {
        throw new Error('Vínculo já existe.');
      }

      transaction.set(vinculoRef, {
        profissionalId: MEDICO,
        pacienteId: PACIENTE,
        status: 'pendente',
        conviteCodigo: codigo,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });

      transaction.update(conviteRef, {
        status: 'utilizado',
        utilizadoPor: MEDICO,
        utilizadoEm: serverTimestamp(),
        vinculoId: VINCULO_ID,
      });
    });
  }

  try {
    await caso(
      'Paciente pode gerar convite de 64 caracteres',
      {},
      async () => {
        const firestore = banco(PACIENTE);
        const criadoEm = Timestamp.now();

        await assertSucceeds(
          setDoc(
            referenciaCodigo(firestore),
            {
              pacienteId: PACIENTE,
              status: 'disponivel',
              criadoEm,
              expiraEm: Timestamp.fromMillis(
                criadoEm.toMillis() + 10 * 60 * 1000
              ),
            }
          )
        );
      }
    );

    await caso(
      'Código com formato inválido é bloqueado',
      {},
      async () => {
        const firestore = banco(PACIENTE);
        const criadoEm = Timestamp.now();

        await assertFails(
          setDoc(
            referenciaCodigo(firestore, TOKEN_INVALIDO),
            {
              pacienteId: PACIENTE,
              status: 'disponivel',
              criadoEm,
              expiraEm: Timestamp.fromMillis(
                criadoEm.toMillis() + 10 * 60 * 1000
              ),
            }
          )
        );
      }
    );

    await caso(
      'Médico verificado pode consultar convite',
      { criarConvite: true },
      async () => {
        const firestore = banco(MEDICO);

        const resultado = await assertSucceeds(
          getDoc(referenciaCodigo(firestore))
        );

        assert.equal(resultado.exists(), true);
        assert.equal(resultado.data().pacienteId, PACIENTE);
      }
    );

    await caso(
      'Outro paciente não pode consultar o convite',
      { criarConvite: true },
      async () => {
        const firestore = banco(OUTRO_PACIENTE);

        await assertFails(
          getDoc(referenciaCodigo(firestore))
        );
      }
    );

    await caso(
      'Médico não verificado não pode consultar convite',
      { criarConvite: true },
      async () => {
        const firestore = banco(MEDICO_NAO_VERIFICADO);

        await assertFails(
          getDoc(referenciaCodigo(firestore))
        );
      }
    );

    await caso(
      'Médico verificado pode solicitar vínculo',
      { criarConvite: true },
      async () => {
        const firestore = banco(MEDICO);

        await assertSucceeds(
          solicitarVinculo(firestore)
        );

        const vinculo = await assertSucceeds(
          getDoc(referenciaVinculo(firestore))
        );

        assert.equal(vinculo.data().status, 'pendente');

        const convite = await assertSucceeds(
          getDoc(referenciaCodigo(firestore))
        );

        assert.equal(convite.data().status, 'utilizado');
      }
    );

    await caso(
      'Paciente pode aceitar vínculo pendente',
      { statusVinculo: 'pendente' },
      async () => {
        const firestore = banco(PACIENTE);

        await assertSucceeds(
          updateDoc(referenciaVinculo(firestore), {
            status: 'ativo',
            nomePaciente: 'Paciente Teste',
            atualizadoEm: serverTimestamp(),
          })
        );
      }
    );

    await caso(
      'Paciente pode recusar vínculo pendente',
      { statusVinculo: 'pendente' },
      async () => {
        const firestore = banco(PACIENTE);

        await assertSucceeds(
          updateDoc(referenciaVinculo(firestore), {
            status: 'recusado',
            atualizadoEm: serverTimestamp(),
          })
        );
      }
    );

    await caso(
      'Paciente pode revogar vínculo ativo',
      { statusVinculo: 'ativo' },
      async () => {
        const firestore = banco(PACIENTE);

        await assertSucceeds(
          updateDoc(referenciaVinculo(firestore), {
            status: 'revogado',
            atualizadoEm: serverTimestamp(),
          })
        );
      }
    );

    await caso(
      'Outro médico não pode modificar vínculo',
      { statusVinculo: 'pendente' },
      async () => {
        const firestore = banco(OUTRO_MEDICO);

        await assertFails(
          updateDoc(referenciaVinculo(firestore), {
            status: 'ativo',
            atualizadoEm: serverTimestamp(),
          })
        );
      }
    );

    await caso(
      'Paciente não pode alterar profissional do vínculo',
      { statusVinculo: 'ativo' },
      async () => {
        const firestore = banco(PACIENTE);

        await assertFails(
          updateDoc(referenciaVinculo(firestore), {
            profissionalId: OUTRO_MEDICO,
          })
        );
      }
    );

    await caso(
      'Convite expirado não pode gerar vínculo',
      { expirado: true },
      async () => {
        const firestore = banco(MEDICO);

        await assertFails(
          solicitarVinculo(
            firestore,
            TOKEN_EXPIRADO
          )
        );
      }
    );
  } finally {
    await ambiente.cleanup();
  }
});
