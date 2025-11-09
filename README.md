📦 Sistema MRP Inteligente
Este é um projeto de MRP (Material Requirements Planning) completo, desenvolvido como um monorepo, focado em controle de estoque em tempo real com previsões de demanda usando IA.

✨ Funcionalidades Principais
CRUD Completo: Cadastro, Edição, Leitura e Exclusão de produtos.

Tempo Real: Atualização instantânea da interface para todos os usuários conectados via WebSockets.

Rastreabilidade: Histórico completo de todas as movimentações de entrada e saída.

IA Preditiva: Endpoint que usa statsmodels (ARIMA) para prever em quantos dias o estoque de um item irá acabar.

Dashboard: Gráficos visuais (usando recharts) para análise rápida do nível de estoque vs. ponto mínimo.

UI Moderna: Interface construída com Chakra UI, incluindo alertas, modais e tabelas.

📁 Estrutura do Monorepo
O projeto está organizado em duas pastas principais:

/backend: A API em Python (FastAPI) que gerencia a lógica de negócios, banco de dados (SQLite), WebSockets e o endpoint de IA.

/frontend: A interface de usuário em React (Vite) que consome a API e exibe os dados.

🏃 Como Rodar o Projeto Localmente
Para rodar o projeto, você precisará de dois terminais abertos.

1. Pré-requisitos
Python 3.10+

Node.js 18+ (que inclui o npm)

Git

2. Clonar o Repositório
Bash

git clone https://github.com/SEU_USUARIO/projeto-mrp-estoque.git
cd projeto-mrp-estoque
3. Rodando o Back-end (Terminal 1)
Navegue até a pasta do back-end:

Bash

cd backend
Crie e ative o ambiente virtual:

Bash

# Criar
python -m venv .venv

# Ativar (Windows)
.\.venv\Scripts\activate

# Ativar (Mac/Linux)
source .venv/bin/activate
Instale as dependências:

Bash

python -m pip install -r requirements.txt
Inicie o servidor:

Bash

python -m uvicorn main:app --reload
🎉 O back-end estará rodando em http://127.0.0.1:8000

4. Rodando o Front-end (Terminal 2)
Abra um novo terminal.

Navegue até a pasta do front-end (a partir da raiz):

Bash

cd frontend
Instale as dependências:

Bash

npm install
Inicie o servidor de desenvolvimento:

Bash

npm run dev
🎉 O front-end estará rodando em http://localhost:5173

📖 Documentação da API
Com o back-end rodando, a documentação interativa (Swagger UI) gerada automaticamente pelo FastAPI está disponível em:

http://127.0.0.1:8000/docs