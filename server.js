/*
 * =================================================================
 * Código Backend (com Login e Permissões) - VERSÃO COMPLETA
 * =================================================================
 * Novidades:
 * - Lógica de Models e Controllers totalmente implementada.
 * - Adicionada uma tabela simulada de usuários com perfis (admin, fisio).
 * - Criada a rota /api/login para autenticação.
 * - Implementado um middleware de segurança para proteger as rotas.
 * =================================================================
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken'); // Biblioteca para criar tokens de segurança

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

// --- SIMULAÇÃO DE BANCO DE DADOS DE USUÁRIOS ---
// Em um projeto real, isso viria da tabela 'usuarios' que desenhamos.
const usuariosSimulados = [
    { id: 1, nome: 'Admin', email: 'admin@clinicflow.com', senha: 'admin', perfil: 'admin' },
    { id: 2, nome: 'Dra. Helena', email: 'helena@clinicflow.com', senha: '123', perfil: 'fisioterapeuta' }
];

// --- SECRET KEY PARA O TOKEN ---
// Em um projeto real, isso estaria em uma variável de ambiente.
const JWT_SECRET = 'seu-segredo-super-secreto';

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ mensagem: 'Acesso negado. Token não fornecido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Adiciona os dados do usuário (id, perfil) à requisição
        next(); // Continua para a rota solicitada
    } catch (error) {
        res.status(401).json({ mensagem: 'Token inválido.' });
    }
};

// --- MODELS ---
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
    getAll: async () => {
        const query = `
            SELECT 
                s.id, s.id_servico, s.id_profissional, s.data_hora_inicio, s.data_hora_fim, s.status,
                COALESCE(
                    (SELECT json_agg(json_build_object('id', p.id, 'nome', p.nome))
                     FROM agendamento_participantes ap
                     JOIN pacientes p ON ap.id_paciente = p.id
                     WHERE ap.id_agendamento_slot = s.id),
                    '[]'::json
                ) as participantes
            FROM agendamento_slots s
            GROUP BY s.id
            ORDER BY s.data_hora_inicio ASC;
        `;
        const result = await db.query(query);
        return result.rows;
    },
    create: async ({ id_servico, id_profissional, data_hora_inicio, data_hora_fim, status, participantes }) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const slotQuery = `INSERT INTO agendamento_slots (id_servico, id_profissional, data_hora_inicio, data_hora_fim, status) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
            const slotResult = await client.query(slotQuery, [id_servico, id_profissional, data_hora_inicio, data_hora_fim, status]);
            const newSlot = slotResult.rows[0];

            if (participantes && participantes.length > 0) {
                for (const pacienteId of participantes) {
                    const participanteQuery = `INSERT INTO agendamento_participantes (id_agendamento_slot, id_paciente) VALUES ($1, $2);`;
                    await client.query(participanteQuery, [newSlot.id, pacienteId]);
                }
            }
            await client.query('COMMIT');
            
            const finalResultQuery = `
                SELECT s.id, s.id_servico, s.id_profissional, s.data_hora_inicio, s.data_hora_fim, s.status,
                COALESCE((SELECT json_agg(json_build_object('id', p.id, 'nome', p.nome)) FROM agendamento_participantes ap JOIN pacientes p ON ap.id_paciente = p.id WHERE ap.id_agendamento_slot = s.id), '[]'::json) as participantes
                FROM agendamento_slots s WHERE s.id = $1 GROUP BY s.id`;
            const finalResult = await db.query(finalResultQuery, [newSlot.id]);
            return finalResult.rows[0];
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },
    remove: async (id) => {
        const result = await db.query('DELETE FROM agendamento_slots WHERE id = $1 RETURNING *;', [id]);
        return result.rows[0];
    }
};


// --- CONTROLLERS ---
const createCrudController = (modelName, model) => ({
    listarTodos: async (req, res) => { try { res.status(200).json(await model.getAll()); } catch (e) { console.error(e); res.status(500).json({ mensagem: `Erro ao buscar ${modelName}s.`}); }},
    criar: async (req, res) => { try { const item = await model.create(req.body); res.status(201).json({ mensagem: `${modelName} criado!`, [modelName.toLowerCase()]: item }); } catch (e) { console.error(e); res.status(500).json({ mensagem: `Erro ao criar ${modelName}.`}); }},
    atualizar: async (req, res) => { try { const item = await model.update(req.params.id, req.body); if (!item) return res.status(404).json({ mensagem: `${modelName} não encontrado.` }); res.status(200).json({ mensagem: `${modelName} atualizado!`, [modelName.toLowerCase()]: item }); } catch (e) { console.error(e); res.status(500).json({ mensagem: `Erro ao atualizar ${modelName}.`}); }},
    deletar: async (req, res) => { try { const item = await model.remove(req.params.id); if (!item) return res.status(404).json({ mensagem: `${modelName} não encontrado.` }); res.status(200).json({ mensagem: `${modelName} deletado!` }); } catch (e) { console.error(e); res.status(500).json({ mensagem: `Erro ao deletar ${modelName}.`}); }},
});

const pacienteController = createCrudController('paciente', pacienteModel);
const servicoController = createCrudController('servico', servicoModel);
const profissionalController = createCrudController('profissional', profissionalModel);
const agendamentoController = createCrudController('agendamento', agendamentoModel);

const authController = {
    login: (req, res) => {
        const { email, senha } = req.body;
        const usuario = usuariosSimulados.find(u => u.email === email && u.senha === senha);

        if (!usuario) {
            return res.status(401).json({ mensagem: "E-mail ou senha inválidos." });
        }

        const token = jwt.sign({ id: usuario.id, perfil: usuario.perfil }, JWT_SECRET, { expiresIn: '8h' });

        res.json({
            mensagem: "Login bem-sucedido!",
            token,
            usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil }
        });
    }
};

// --- ROUTES ---
const createCrudRoutes = (controller) => {
    const router = express.Router();
    router.get('/', controller.listarTodos);
    router.post('/', controller.criar);
    router.put('/:id', controller.atualizar);
    router.delete('/:id', controller.deletar);
    return router;
};

const authRouter = express.Router();
authRouter.post('/login', authController.login);

// --- Servidor Principal ---
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use(authMiddleware);

app.use('/api/pacientes', createCrudRoutes(pacienteController));
app.use('/api/servicos', createCrudRoutes(servicoController));
app.use('/api/profissionais', createCrudRoutes(profissionalController));
app.use('/api/agendamentos', createCrudRoutes(agendamentoController));

app.get('/', (req, res) => res.send('API do ClinicFlow está no ar!'));

app.listen(PORT, () => console.log(`Servidor backend rodando em http://localhost:${PORT}`));
