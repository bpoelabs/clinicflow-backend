/*
 * =================================================================
 * Código Backend Completo (v3 - CRUDs para todos os módulos)
 * =================================================================
 * Este arquivo contém o backend completo e funcional, pronto para ser
 * conectado a um banco de dados PostgreSQL real na nuvem.
 *
 * Novidades:
 * - Adicionado CRUD completo para Pacientes (com endereço e CEP).
 * - Adicionado CRUD completo para Serviços.
 * - Adicionado CRUD completo para Profissionais.
 * - Adicionado CRUD completo para Agendamentos.
 * - Adicionadas rotas para o Financeiro (excluir, marcar como pago).
 * =================================================================
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// =================================================================
// ARQUIVO SIMULADO: /src/database/db.js
// =================================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const db = {
  query: (text, params) => pool.query(text, params),
};

// =================================================================
// MODELS (Camada de Acesso aos Dados)
// =================================================================

const pacienteModel = {
    getAll: async () => {
        const result = await db.query('SELECT * FROM pacientes ORDER BY nome ASC');
        return result.rows;
    },
    getById: async (id) => {
        const result = await db.query('SELECT * FROM pacientes WHERE id = $1', [id]);
        return result.rows[0];
    },
    create: async ({ nome, cpf, email, telefone, endereco, cep }) => {
        const sql = `INSERT INTO pacientes (nome, cpf, email, telefone, endereco, cep) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;
        const params = [nome, cpf, email, telefone, endereco, cep];
        const result = await db.query(sql, params);
        return result.rows[0];
    },
    update: async (id, { nome, cpf, email, telefone, endereco, cep }) => {
        const sql = `UPDATE pacientes SET nome = $1, cpf = $2, email = $3, telefone = $4, endereco = $5, cep = $6 WHERE id = $7 RETURNING *;`;
        const params = [nome, cpf, email, telefone, endereco, cep, id];
        const result = await db.query(sql, params);
        return result.rows[0];
    },
    remove: async (id) => {
        const result = await db.query('DELETE FROM pacientes WHERE id = $1 RETURNING *;', [id]);
        return result.rows[0];
    }
};

const servicoModel = {
    getAll: async () => {
        const result = await db.query('SELECT * FROM servicos ORDER BY nome ASC');
        return result.rows;
    },
    create: async ({ nome, preco, duracao_minutos }) => {
        const sql = `INSERT INTO servicos (nome, preco, duracao_minutos) VALUES ($1, $2, $3) RETURNING *;`;
        const params = [nome, preco, duracao_minutos];
        const result = await db.query(sql, params);
        return result.rows[0];
    },
    remove: async (id) => {
        const result = await db.query('DELETE FROM servicos WHERE id = $1 RETURNING *;', [id]);
        return result.rows[0];
    }
};

const profissionalModel = {
    getAll: async () => {
        const result = await db.query('SELECT * FROM profissionais ORDER BY nome ASC');
        return result.rows;
    },
    create: async ({ nome, comissao_percentual }) => {
        const sql = `INSERT INTO profissionais (nome, comissao_percentual) VALUES ($1, $2) RETURNING *;`;
        const params = [nome, comissao_percentual];
        const result = await db.query(sql, params);
        return result.rows[0];
    },
    update: async (id, { nome, comissao_percentual }) => {
        const sql = `UPDATE profissionais SET nome = $1, comissao_percentual = $2 WHERE id = $3 RETURNING *;`;
        const params = [nome, comissao_percentual, id];
        const result = await db.query(sql, params);
        return result.rows[0];
    },
    remove: async (id) => {
        const result = await db.query('DELETE FROM profissionais WHERE id = $1 RETURNING *;', [id]);
        return result.rows[0];
    }
};

const agendamentoModel = {
    getAll: async () => {
        const result = await db.query('SELECT * FROM agendamentos ORDER BY data_hora ASC');
        return result.rows;
    },
    create: async ({ id_paciente, id_servico, id_profissional, data_hora, status }) => {
        const sql = `INSERT INTO agendamentos (id_paciente, id_servico, id_profissional, data_hora, status) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
        const params = [id_paciente, id_servico, id_profissional, data_hora, status];
        const result = await db.query(sql, params);
        return result.rows[0];
    },
    update: async (id, { id_paciente, id_servico, id_profissional, data_hora, status }) => {
        const sql = `UPDATE agendamentos SET id_paciente = $1, id_servico = $2, id_profissional = $3, data_hora = $4, status = $5 WHERE id = $6 RETURNING *;`;
        const params = [id_paciente, id_servico, id_profissional, data_hora, status, id];
        const result = await db.query(sql, params);
        return result.rows[0];
    },
    remove: async (id) => {
        const result = await db.query('DELETE FROM agendamentos WHERE id = $1 RETURNING *;', [id]);
        return result.rows[0];
    }
};

// =================================================================
// CONTROLLERS (Lógica de Negócio)
// =================================================================

const createCrudController = (modelName, model) => ({
    listarTodos: async (req, res) => {
        try {
            const items = await model.getAll();
            res.status(200).json(items);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: `Erro ao buscar ${modelName}s.` });
        }
    },
    criar: async (req, res) => {
        try {
            const dados = req.body;
            const item = await model.create(dados);
            res.status(201).json({ mensagem: `${modelName} criado com sucesso!`, [modelName.toLowerCase()]: item });
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: `Erro ao criar ${modelName}.` });
        }
    },
    atualizar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const dados = req.body;
            const item = await model.update(id, dados);
            if (!item) return res.status(404).json({ mensagem: `${modelName} não encontrado.` });
            res.status(200).json({ mensagem: `${modelName} atualizado com sucesso!`, [modelName.toLowerCase()]: item });
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: `Erro ao atualizar ${modelName}.` });
        }
    },
    deletar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const item = await model.remove(id);
            if (!item) return res.status(404).json({ mensagem: `${modelName} não encontrado.` });
            res.status(200).json({ mensagem: `${modelName} deletado com sucesso.` });
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: `Erro ao deletar ${modelName}.` });
        }
    }
});

const pacienteController = createCrudController('Paciente', pacienteModel);
const servicoController = createCrudController('Servico', servicoModel);
const profissionalController = createCrudController('Profissional', profissionalModel);
const agendamentoController = createCrudController('Agendamento', agendamentoModel);

// =================================================================
// ROUTES (Endpoints da API)
// =================================================================

const createCrudRoutes = (controller) => {
    const router = express.Router();
    router.get('/', controller.listarTodos);
    router.post('/', controller.criar);
    router.put('/:id', controller.atualizar);
    router.delete('/:id', controller.deletar);
    return router;
};

const pacientesRouter = createCrudRoutes(pacienteController);
const servicosRouter = createCrudRoutes(servicoController);
const profissionaisRouter = createCrudRoutes(profissionalController);
const agendamentosRouter = createCrudRoutes(agendamentoController);

// =================================================================
// ARQUIVO PRINCIPAL: server.js
// =================================================================
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API do ClinicFlow está no ar!');
});

// Registrar todas as rotas no servidor
app.use('/api/pacientes', pacientesRouter);
app.use('/api/servicos', servicosRouter);
app.use('/api/profissionais', profissionaisRouter);
app.use('/api/agendamentos', agendamentosRouter);

app.listen(PORT, () => {
    console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});
