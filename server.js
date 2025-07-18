/*
 * =================================================================
 * Código Backend Completo (Pronto para Produção)
 * =================================================================
 * Este arquivo contém o backend completo e funcional, pronto para ser
 * conectado a um banco de dados PostgreSQL real na nuvem.
 *
 * ESTRUTURA DO PROJETO (simulada neste arquivo único):
 * /clinicflow-backend
 * |-- .env                     (Arquivo para suas senhas e segredos)
 * |-- .gitignore               (Arquivo para ignorar o .env)
 * |-- package.json             (Criado pelo npm)
 * |-- server.js                (Este arquivo)
 * |-- node_modules/            (Criado pelo npm)
 *
 * =================================================================
 */

// PASSO 1: CONFIGURAR VARIÁVEIS DE AMBIENTE
// Carrega as variáveis do arquivo .env para process.env
// Esta deve ser a PRIMEIRA linha do seu código.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Importa o driver do PostgreSQL

// =================================================================
// ARQUIVO SIMULADO: /src/database/db.js
// =================================================================
// RESPONSABILIDADE: Configurar e exportar a conexão com o banco de dados.

// Cria um "pool" de conexões. O pool gerencia múltiplas conexões
// para otimizar a performance.
const pool = new Pool({
  // A biblioteca 'pg' automaticamente usa a variável de ambiente DATABASE_URL
  // se 'connectionString' não for definido explicitamente.
  connectionString: process.env.DATABASE_URL,
  // A maioria dos bancos de dados em nuvem (Supabase, Render, etc.)
  // exige uma conexão SSL.
  ssl: {
    rejectUnauthorized: false
  }
});

// Exporta um objeto com uma função 'query' para ser usada nos models.
const db = {
  query: (text, params) => pool.query(text, params),
};


// =================================================================
// ARQUIVO SIMULADO: /src/models/pacienteModel.js
// =================================================================
// RESPONSABILIDADE: Interagir com a tabela 'pacientes' no banco de dados.

const pacienteModel = {
    // Busca todos os pacientes
    getAll: async () => {
        const result = await db.query('SELECT * FROM pacientes ORDER BY nome ASC');
        return result.rows;
    },

    // Busca um paciente por ID
    getById: async (id) => {
        const result = await db.query('SELECT * FROM pacientes WHERE id = $1', [id]);
        return result.rows[0]; // Retorna o primeiro resultado ou undefined
    },

    // Cria um novo paciente
    create: async ({ nome, cpf, email, telefone }) => {
        const sql = `
            INSERT INTO pacientes (nome, cpf, email, telefone)
            VALUES ($1, $2, $3, $4)
            RETURNING *; 
        `; // RETURNING * retorna o registro que foi acabado de criar.
        const params = [nome, cpf, email, telefone];
        const result = await db.query(sql, params);
        return result.rows[0];
    },

    // Atualiza um paciente
    update: async (id, { nome, cpf, email, telefone }) => {
        const sql = `
            UPDATE pacientes
            SET nome = $1, cpf = $2, email = $3, telefone = $4
            WHERE id = $5
            RETURNING *;
        `;
        const params = [nome, cpf, email, telefone, id];
        const result = await db.query(sql, params);
        return result.rows[0];
    },

    // Deleta um paciente
    remove: async (id) => {
        const result = await db.query('DELETE FROM pacientes WHERE id = $1 RETURNING *;', [id]);
        return result.rows[0];
    }
};


// =================================================================
// ARQUIVO SIMULADO: /src/controllers/pacienteController.js
// =================================================================
// RESPONSABILIDADE: Lógica de negócio para as rotas de pacientes.

const pacienteController = {
    // As funções agora são 'async' porque as operações de banco de dados
    // são assíncronas (levam um tempo para completar).
    listarTodos: async (req, res) => {
        try {
            const pacientes = await pacienteModel.getAll();
            res.status(200).json(pacientes);
        } catch (error) {
            console.error(error); // Loga o erro no console do servidor
            res.status(500).json({ mensagem: "Erro ao buscar pacientes." });
        }
    },

    buscarPorId: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const paciente = await pacienteModel.getById(id);
            if (!paciente) {
                return res.status(404).json({ mensagem: "Paciente não encontrado." });
            }
            res.status(200).json(paciente);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: "Erro ao buscar paciente." });
        }
    },

    criar: async (req, res) => {
        try {
            const dados = req.body;
            if (!dados.nome || !dados.cpf) {
                return res.status(400).json({ mensagem: "Nome e CPF são obrigatórios." });
            }
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
            if (!pacienteAtualizado) {
                return res.status(404).json({ mensagem: "Paciente não encontrado." });
            }
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
            if (!deletado) {
                return res.status(404).json({ mensagem: "Paciente não encontrado." });
            }
            res.status(200).json({ mensagem: "Paciente deletado com sucesso." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensagem: "Erro ao deletar paciente." });
        }
    }
};


// =================================================================
// ARQUIVO SIMULADO: /src/routes/pacientes.js
// =================================================================
// RESPONSABILIDADE: Definir os endpoints da API para "pacientes".

const pacientesRouter = express.Router();

pacientesRouter.get('/', pacienteController.listarTodos);
pacientesRouter.get('/:id', pacienteController.buscarPorId);
pacientesRouter.post('/', pacienteController.criar);
pacientesRouter.put('/:id', pacienteController.atualizar);
pacientesRouter.delete('/:id', pacienteController.deletar);


// =================================================================
// ARQUIVO PRINCIPAL: /server.js
// =================================================================
// RESPONSABILIDADE: Configurar e iniciar o servidor Express.

const app = express();
// Usa a porta definida no ambiente (pelo Render) ou 3001 se não estiver definida.
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rota principal da API
app.get('/', (req, res) => {
    res.send('API do ClinicFlow está no ar e conectada ao banco de dados!');
});

// Registrar a rota de pacientes no servidor
app.use('/api/pacientes', pacientesRouter);
// Futuramente, outras rotas seriam adicionadas aqui:
// app.use('/api/agendamentos', agendamentosRouter);
// app.use('/api/financeiro', financeiroRouter);

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});
