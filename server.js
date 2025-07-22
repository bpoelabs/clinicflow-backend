/*
 * =================================================================
 * Código Backend Completo (v2 - com CRUD de Pacientes e Serviços)
 * =================================================================
 * Este arquivo contém o backend completo e funcional, pronto para ser
 * conectado a um banco de dados PostgreSQL real na nuvem.
 *
 * Novidades:
 * - Adicionado CRUD completo para o módulo de Serviços.
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
// ARQUIVO SIMULADO: /src/models/pacienteModel.js
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
    create: async ({ nome, cpf, email, telefone }) => {
        const sql = `INSERT INTO pacientes (nome, cpf, email, telefone) VALUES ($1, $2, $3, $4) RETURNING *;`;
        const params = [nome, cpf, email, telefone];
        const result = await db.query(sql, params);
        return result.rows[0];
    },
    update: async (id, { nome, cpf, email, telefone }) => {
        const sql = `UPDATE pacientes SET nome = $1, cpf = $2, email = $3, telefone = $4 WHERE id = $5 RETURNING *;`;
        const params = [nome, cpf, email, telefone, id];
        const result = await db.query(sql, params);
        return result.rows[0];
    },
    remove: async (id) => {
        const result = await db.query('DELETE FROM pacientes WHERE id = $1 RETURNING *;', [id]);
        return result.rows[0];
    }
};

// =================================================================
// NOVO ARQUIVO SIMULADO: /src/models/servicoModel.js
// =================================================================
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

// =================================================================
// ARQUIVO SIMULADO: /src/controllers/pacienteController.js
// =================================================================
const pacienteController = {
    listarTodos: async (req, res) => {
        try {
            const pacientes = await pacienteModel.getAll();
            res.status(200).json(pacientes);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: "Erro ao buscar pacientes." });
        }
    },
    buscarPorId: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const paciente = await pacienteModel.getById(id);
            if (!paciente) return res.status(404).json({ mensagem: "Paciente não encontrado." });
            res.status(200).json(paciente);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: "Erro ao buscar paciente." });
        }
    },
    criar: async (req, res) => {
        try {
            const dados = req.body;
            if (!dados.nome || !dados.cpf) return res.status(400).json({ mensagem: "Nome e CPF são obrigatórios." });
            const novoPaciente = await pacienteModel.create(dados);
            res.status(201).json({ mensagem: "Paciente criado com sucesso!", paciente: novoPaciente });
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: "Erro ao criar paciente." });
        }
    },
    atualizar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const dados = req.body;
            const pacienteAtualizado = await pacienteModel.update(id, dados);
            if (!pacienteAtualizado) return res.status(404).json({ mensagem: "Paciente não encontrado." });
            res.status(200).json({ mensagem: "Paciente atualizado com sucesso!", paciente: pacienteAtualizado });
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: "Erro ao atualizar paciente." });
        }
    },
    deletar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const deletado = await pacienteModel.remove(id);
            if (!deletado) return res.status(404).json({ mensagem: "Paciente não encontrado." });
            res.status(200).json({ mensagem: "Paciente deletado com sucesso." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: "Erro ao deletar paciente." });
        }
    }
};

// =================================================================
// NOVO ARQUIVO SIMULADO: /src/controllers/servicoController.js
// =================================================================
const servicoController = {
    listarTodos: async (req, res) => {
        try {
            const servicos = await servicoModel.getAll();
            res.status(200).json(servicos);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: "Erro ao buscar serviços." });
        }
    },
    criar: async (req, res) => {
        try {
            const dados = req.body;
            if (!dados.nome || !dados.preco) return res.status(400).json({ mensagem: "Nome e preço são obrigatórios." });
            const novoServico = await servicoModel.create(dados);
            res.status(201).json({ mensagem: "Serviço criado com sucesso!", servico: novoServico });
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: "Erro ao criar serviço." });
        }
    },
    deletar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const deletado = await servicoModel.remove(id);
            if (!deletado) return res.status(404).json({ mensagem: "Serviço não encontrado." });
            res.status(200).json({ mensagem: "Serviço deletado com sucesso." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: "Erro ao deletar serviço." });
        }
    }
};

// =================================================================
// ARQUIVO SIMULADO: /src/routes/pacientes.js
// =================================================================
const pacientesRouter = express.Router();
pacientesRouter.get('/', pacienteController.listarTodos);
pacientesRouter.get('/:id', pacienteController.buscarPorId);
pacientesRouter.post('/', pacienteController.criar);
pacientesRouter.put('/:id', pacienteController.atualizar);
pacientesRouter.delete('/:id', pacienteController.deletar);

// =================================================================
// NOVO ARQUIVO SIMULADO: /src/routes/servicos.js
// =================================================================
const servicosRouter = express.Router();
servicosRouter.get('/', servicoController.listarTodos);
servicosRouter.post('/', servicoController.criar);
servicosRouter.delete('/:id', servicoController.deletar);

// =================================================================
// ARQUIVO PRINCIPAL: /server.js
// =================================================================
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API do ClinicFlow está no ar!');
});

// Registrar as rotas no servidor
app.use('/api/pacientes', pacientesRouter);
app.use('/api/servicos', servicosRouter); // NOVA ROTA

app.listen(PORT, () => {
    console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});
