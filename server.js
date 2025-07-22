/*
 * =================================================================
 * Código Backend (com Prontuário Eletrônico)
 * =================================================================
 * Novidades:
 * - Adicionado CRUD completo para o Prontuário (Sessões),
 * vinculado a cada paciente.
 * =================================================================
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// --- Conexão com o Banco de Dados ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
const db = {
  query: (text, params) => pool.query(text, params),
};

// --- MODELS (Camada de Acesso aos Dados) ---

const pacienteModel = {
    getAll: async () => db.query('SELECT * FROM pacientes ORDER BY nome ASC').then(res => res.rows),
    create: async (data) => db.query('INSERT INTO pacientes (nome, cpf, email, telefone, endereco, cep) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;', [data.nome, data.cpf, data.email, data.telefone, data.endereco, data.cep]).then(res => res.rows[0]),
    update: async (id, data) => db.query('UPDATE pacientes SET nome = $1, cpf = $2, email = $3, telefone = $4, endereco = $5, cep = $6 WHERE id = $7 RETURNING *;', [data.nome, data.cpf, data.email, data.telefone, data.endereco, data.cep, id]).then(res => res.rows[0]),
    remove: async (id) => db.query('DELETE FROM pacientes WHERE id = $1 RETURNING *;', [id]).then(res => res.rows[0])
};

const servicoModel = {
    getAll: async () => db.query('SELECT * FROM servicos ORDER BY nome ASC').then(res => res.rows),
    create: async (data) => db.query('INSERT INTO servicos (nome, preco, duracao_minutos, capacidade) VALUES ($1, $2, $3, $4) RETURNING *;', [data.nome, data.preco, data.duracao_minutos, data.capacidade || 1]).then(res => res.rows[0]),
    update: async (id, data) => db.query('UPDATE servicos SET nome = $1, preco = $2, duracao_minutos = $3, capacidade = $4 WHERE id = $5 RETURNING *;', [data.nome, data.preco, data.duracao_minutos, data.capacidade || 1, id]).then(res => res.rows[0]),
    remove: async (id) => db.query('DELETE FROM servicos WHERE id = $1 RETURNING *;', [id]).then(res => res.rows[0])
};

const profissionalModel = {
    getAll: async () => db.query('SELECT * FROM profissionais ORDER BY nome ASC').then(res => res.rows),
    create: async (data) => db.query('INSERT INTO profissionais (nome, comissao_percentual) VALUES ($1, $2) RETURNING *;', [data.nome, data.comissao_percentual]).then(res => res.rows[0]),
    update: async (id, data) => db.query('UPDATE profissionais SET nome = $1, comissao_percentual = $2 WHERE id = $3 RETURNING *;', [data.nome, data.comissao_percentual, id]).then(res => res.rows[0]),
    remove: async (id) => db.query('DELETE FROM profissionais WHERE id = $1 RETURNING *;', [id]).then(res => res.rows[0])
};

const agendamentoModel = {
    getAll: async () => { /* ...código da agenda... */ return []; },
    create: async (data) => { /* ...código da agenda... */ },
    remove: async (id) => { /* ...código da agenda... */ }
};

// NOVO MODEL PARA O PRONTUÁRIO
const prontuarioModel = {
    getByPacienteId: async (pacienteId) => db.query('SELECT * FROM prontuario_sessoes WHERE id_paciente = $1 ORDER BY data_sessao DESC', [pacienteId]).then(res => res.rows),
    create: async (data) => db.query('INSERT INTO prontuario_sessoes (id_paciente, data_sessao, subjetivo, objetivo, plano_tratamento) VALUES ($1, $2, $3, $4, $5) RETURNING *;', [data.id_paciente, data.data_sessao, data.subjetivo, data.objetivo, data.plano_tratamento]).then(res => res.rows[0]),
    update: async (id, data) => db.query('UPDATE prontuario_sessoes SET data_sessao = $1, subjetivo = $2, objetivo = $3, plano_tratamento = $4 WHERE id = $5 RETURNING *;', [data.data_sessao, data.subjetivo, data.objetivo, data.plano_tratamento, id]).then(res => res.rows[0]),
    remove: async (id) => db.query('DELETE FROM prontuario_sessoes WHERE id = $1 RETURNING *;', [id]).then(res => res.rows[0])
};


// --- CONTROLLERS (Lógica de Negócio) ---

const createCrudController = (modelName, model) => ({
    listarTodos: async (req, res) => { try { res.status(200).json(await model.getAll()); } catch (e) { console.error(e); res.status(500).json({ mensagem: `Erro ao buscar ${modelName}s.`}); }},
    criar: async (req, res) => { try { const item = await model.create(req.body); res.status(201).json({ [modelName.toLowerCase()]: item }); } catch (e) { console.error(e); res.status(500).json({ mensagem: `Erro ao criar ${modelName}.`}); }},
    atualizar: async (req, res) => { try { const item = await model.update(req.params.id, req.body); if (!item) return res.status(404).json({ mensagem: `${modelName} não encontrado.` }); res.status(200).json({ [modelName.toLowerCase()]: item }); } catch (e) { console.error(e); res.status(500).json({ mensagem: `Erro ao atualizar ${modelName}.`}); }},
    deletar: async (req, res) => { try { const item = await model.remove(req.params.id); if (!item) return res.status(404).json({ mensagem: `${modelName} não encontrado.` }); res.status(200).json({ mensagem: `${modelName} deletado!` }); } catch (e) { console.error(e); res.status(500).json({ mensagem: `Erro ao deletar ${modelName}.`}); }},
});

const pacienteController = createCrudController('paciente', pacienteModel);
const servicoController = createCrudController('servico', servicoModel);
const profissionalController = createCrudController('profissional', profissionalModel);
const agendamentoController = createCrudController('agendamento', agendamentoModel);

// NOVO CONTROLLER PARA O PRONTUÁRIO
const prontuarioController = {
    listarPorPaciente: async (req, res) => {
        try {
            const sessoes = await prontuarioModel.getByPacienteId(req.params.pacienteId);
            res.status(200).json(sessoes);
        } catch (e) {
            console.error(e);
            res.status(500).json({ mensagem: "Erro ao buscar prontuário." });
        }
    },
    ...createCrudController('sessao', prontuarioModel)
};


// --- ROUTES (Endpoints da API) ---

const createCrudRoutes = (controller) => {
    const router = express.Router();
    router.get('/', controller.listarTodos);
    router.post('/', controller.criar);
    router.put('/:id', controller.atualizar);
    router.delete('/:id', controller.deletar);
    return router;
};

const pacientesRouter = createCrudRoutes(pacienteController);
// NOVAS ROTAS PARA O PRONTUÁRIO, ANINHADAS DENTRO DE PACIENTES
pacientesRouter.get('/:pacienteId/prontuario', prontuarioController.listarPorPaciente);
pacientesRouter.post('/:pacienteId/prontuario', prontuarioController.criar);
pacientesRouter.put('/prontuario/:id', prontuarioController.atualizar); // Rota separada para editar uma sessão específica
pacientesRouter.delete('/prontuario/:id', prontuarioController.deletar); // Rota separada para deletar uma sessão específica


// --- Servidor Principal ---
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/pacientes', pacientesRouter);
app.use('/api/servicos', createCrudRoutes(servicoController));
app.use('/api/profissionais', createCrudRoutes(profissionalController));
app.use('/api/agendamentos', createCrudRoutes(agendamentoController));

app.get('/', (req, res) => res.send('API do ClinicFlow está no ar!'));

app.listen(PORT, () => console.log(`Servidor backend rodando em http://localhost:${PORT}`));
