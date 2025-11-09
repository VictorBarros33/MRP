# 📦 Sistema MRP Inteligente

> Um sistema completo de Planejamento de Recursos de Manufatura com controle de estoque em tempo real e previsões baseadas em IA.

![Badge em Desenvolvimento](http://img.shields.io/static/v1?label=STATUS&message=EM%20DESENVOLVIMENTO&color=GREEN&style=for-the-badge)

---

## 🖼️ Screenshots

| Dashboard | Inventário |
|---|---|
| ![Dashboard](.github/assets/dashboard.png) | ![Inventário](.github/assets/inventario.png) |

---

## ✨ Funcionalidades

Este projeto não é apenas um CRUD. Ele inclui recursos avançados:

✅ **Controle Total (CRUD):** Cadastro, edição e exclusão de produtos com interface amigável.
✅ **Tempo Real (WebSockets):** Se um usuário move o estoque, todos os outros veem a mudança instantaneamente sem recarregar a página.
✅ **Rastreabilidade Completa:** Histórico detalhado de cada entrada e saída, com datas e quantidades.
✅ **Inteligência Artificial:** Previsão de demanda usando o modelo estatístico ARIMA para estimar quando o estoque acabará.
✅ **Dashboard Visual:** Gráficos interativos para análise rápida da saúde do estoque.

---

## 🛠️ Tecnologias Utilizadas

O projeto foi construído utilizando um moderno **Monorepo**, dividindo responsabilidades de forma clara:

### Back-end (API & IA)
* 🐍 **Python 3.11+**
* ⚡ **FastAPI** (Framework de alta performance)
* 🗃️ **SQLModel & SQLite** (Banco de dados)
* 🧠 **Statsmodels & Pandas** (IA e análise de dados)
* 🔌 **WebSockets** (Comunicação em tempo real)

### Front-end (Interface)
* ⚛️ **React.js** (via Vite)
* 💅 **Chakra UI** (Biblioteca de componentes visuais)
* 📊 **Recharts** (Gráficos para o dashboard)
* 📡 **Axios** (Comunicação com a API)

---

## 🚀 Como Rodar o Projeto

Siga estes passos para ter o ambiente de desenvolvimento completo rodando na sua máquina.

💡 **Dica:** Os comandos abaixo devem ser executados no **Terminal Integrado do VS Code**. Você pode abrir novos terminais clicando no ícone `+` ou usando o atalho `Ctrl + Shift + '`.

### 1. Pré-requisitos
Certifique-se de ter instalado:
* [Git](https://git-scm.com/)
* [Python 3.10+](https://www.python.org/)
* [Node.js 18+](https://nodejs.org/)

### 2. Clonar o Repositório

```bash
git clone [https://github.com/pedrohogs/projeto-mrp-estoque.git](https://github.com/pedrohogs/projeto-mrp-estoque.git)
cd projeto-mrp-estoque
```
### 3. Iniciando o Back-end (Terminal 1)

```bash
cd backend
python -m venv .venv
```
### 4. Ativar o ambiente virtual:
##### No Windows (PowerShell): 
```bash
.\.venv\Scripts\activate
```

##### No Mac/Linux: source .venv/bin/activate
```bash
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
O servidor estará rodando em: http://127.0.0.1:8000

### 5. Iniciando o Front-end (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```
Acesse o sistema em: http://localhost:5173

