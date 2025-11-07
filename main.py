from fastapi import FastAPI, HTTPException
from sqlmodel import Field, Session, SQLModel, create_engine, select
from sqlalchemy.exc import IntegrityError
import datetime
from enum import Enum
from fastapi import WebSocket, WebSocketDisconnect, BackgroundTasks
from typing import List
import json # Vamos usar para formatar as mensagens

class ConnectionManager:
    def __init__(self):
        # Uma lista para guardar todas as conexões ativas
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        # Aceita a nova conexão
        await websocket.accept()
        # Adiciona o "ouvinte" à lista
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        # Remove o "ouvinte" da lista
        self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        """ Envia dados JSON para todas as conexões ativas. """
        # Converte o dicionário Python para uma string JSON
        json_message = json.dumps(data)
        
        for connection in self.active_connections:
            await connection.send_text(json_message)

# Cria uma instância única do nosso gerente
manager = ConnectionManager()

# 1. DEFINIÇÃO DOS MODELOS (As "Tabelas" do Banco)
# Pense nisso como a "planta baixa" dos nossos dados.

class Produto(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    sku: str = Field(index=True, unique=True) # Código único do produto
    nome: str
    descricao: str
    quantidade_atual: int = Field(default=0)
    ponto_ressuprimento: int = Field(default=5) # Nível mínimo de estoque

class TipoMovimentacao(str, Enum):
    ENTRADA = "entrada"
    SAIDA = "saida"

class Movimentacao(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    produto_id: int = Field(foreign_key="produto.id", index=True) # Chave estrangeira
    tipo: TipoMovimentacao
    quantidade: int
    data_hora: datetime.datetime = Field(default_factory=datetime.datetime.now)


# Este NÃO é um modelo de tabela.
# É apenas o formato do JSON que o usuário vai nos enviar.
class MovimentacaoInput(SQLModel):
    sku: str
    tipo: TipoMovimentacao
    quantidade: int    


# class Movimentacao(SQLModel, table=True):
#     # Vamos adicionar isso mais tarde!
#     pass


# 2. CONFIGURAÇÃO DO BANCO DE DADOS

# O nome do arquivo do nosso banco de dados
ARQUIVO_BANCO = "mrp.db" 

# A "string de conexão" diz ao SQLModel onde está o banco e que é um SQLite
sqlite_url = f"sqlite:///{ARQUIVO_BANCO}"

# O "engine" (motor) é quem realmente se conecta e executa os comandos
engine = create_engine(sqlite_url, echo=True) 

# Esta função é chamada uma vez para criar as tabelas no arquivo .db
def criar_banco_e_tabelas():
    SQLModel.metadata.create_all(engine)


# 3. LÓGICA DA APLICAÇÃO

# Cria a nossa aplicação (o "sous-chef")
app = FastAPI(title="Meu Sistema MRP")

# Esta função será executada UMA VEZ quando o servidor ligar
@app.on_event("startup")
def ao_iniciar():
    # Cria o arquivo mrp.db e as tabelas (se não existirem)
    criar_banco_e_tabelas()


# 4. NOSSA PRIMEIRA ROTA (ENDPOINT)
# O endereço principal que você já testou

@app.get("/")
def ler_raiz():
    return {"mensagem": "Bem-vindo ao meu sistema MRP! Banco de dados conectado."}

# 5. ENDPOINT PARA CRIAR PRODUTOS
@app.post("/produtos")
def criar_produto(produto: Produto):
    """
    Recebe um JSON com os dados do produto e o cadastra no banco.
    Trata erros de SKU duplicado.
    """
    try:
        with Session(engine) as session:
            session.add(produto)
            session.commit()
            session.refresh(produto)
            return produto
    except IntegrityError:
        # "except" captura o erro do banco de dados (SKU duplicado)
        # HTTPException é a forma correta do FastAPI retornar um erro
        raise HTTPException(status_code=409, detail=f"Produto com o SKU '{produto.sku}' já existe.")
    
    # 6. ENDPOINT PARA LISTAR PRODUTOS
@app.get("/produtos")
def listar_produtos():
    """
    Busca e retorna todos os produtos cadastrados no banco.
    """
    with Session(engine) as session:
        # select(Produto) é o comando "Selecione todos os Produtos"
        statement = select(Produto)
        
        # Executa o comando e pega todos os resultados
        produtos = session.exec(statement).all()
        
        return produtos
    
   # 7. ENDPOINT PARA CRIAR MOVIMENTAÇÕES (ENTRADA/SAÍDA)
@app.post("/movimentacoes")
def criar_movimentacao(
    mov_input: MovimentacaoInput, 
    background_tasks: BackgroundTasks # Adicionamos isso
):
    """
    Cria uma movimentação de entrada ou saída de um produto
    baseado no SKU e transmite a atualização via WebSocket.
    """
    with Session(engine) as session:
        # 1. Encontrar o produto (como antes)
        statement_produto = select(Produto).where(Produto.sku == mov_input.sku)
        produto = session.exec(statement_produto).first()

        if not produto:
            raise HTTPException(status_code=404, detail=f"Produto com SKU '{mov_input.sku}' não encontrado.")

        # 2. Validar e atualizar a quantidade (como antes)
        if mov_input.tipo == TipoMovimentacao.SAIDA:
            if produto.quantidade_atual < mov_input.quantidade:
                raise HTTPException(
                    status_code=400,
                    detail=f"Estoque insuficiente. Quantidade atual: {produto.quantidade_atual}"
                )
            produto.quantidade_atual -= mov_input.quantidade
        
        elif mov_input.tipo == TipoMovimentacao.ENTRADA:
            produto.quantidade_atual += mov_input.quantidade

        # 3. Criar o registro da movimentação (como antes)
        movimentacao = Movimentacao(
            produto_id=produto.id,
            tipo=mov_input.tipo,
            quantidade=mov_input.quantidade
        )

        # 4. Salvar tudo no banco (como antes)
        session.add(produto)
        session.add(movimentacao)
        session.commit()
        
        # 5. Pegar os dados atualizados
        session.refresh(produto)
        
        # --- NOVIDADE AQUI ---
        # 6. Preparar as mensagens para o WebSocket
        
        # Mensagem 1: Atualização geral de estoque
        msg_atualizacao = {
            "tipo_msg": "atualizacao_estoque",
            "sku": produto.sku,
            "quantidade_atual": produto.quantidade_atual
        }
        
        # Adiciona a tarefa de broadcast para rodar em segundo plano
        background_tasks.add_task(manager.broadcast, msg_atualizacao)

        # Mensagem 2: Alerta de estoque baixo (se for o caso)
        if produto.quantidade_atual <= produto.ponto_ressuprimento:
            msg_alerta = {
                "tipo_msg": "alerta_estoque_baixo",
                "sku": produto.sku,
                "quantidade_atual": produto.quantidade_atual,
                "ponto_ressuprimento": produto.ponto_ressuprimento,
                "mensagem": f"ALERTA: Produto {produto.nome} ({produto.sku}) está com estoque baixo!"
            }
            # Adiciona uma segunda tarefa
            background_tasks.add_task(manager.broadcast, msg_alerta)
        
        # 7. Retornar a resposta HTTP (como antes)
        return produto
    
    # 8. ENDPOINT PARA LISTAR PRODUTOS EM FALTA (Para o Dashboard)
@app.get("/produtos/em_falta")
def listar_produtos_em_falta():
    """
    Retorna uma lista de produtos onde a quantidade atual
    é menor ou igual ao ponto de ressuprimento.
    """
    with Session(engine) as session:
        # SQLModel nos permite usar os campos da classe direto no 'where'
        statement = select(Produto).where(
            Produto.quantidade_atual <= Produto.ponto_ressuprimento
        )
        
        # Executa o comando e pega todos os resultados
        produtos_em_falta = session.exec(statement).all()
        
        return produtos_em_falta
    
    # 9. ENDPOINT WEBSOCKET (para o tempo real)
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Aceita a conexão do cliente
    await manager.connect(websocket)
    try:
        # Mantém a conexão viva
        while True:
            # Apenas espera por mensagens (não faremos nada com elas)
            await websocket.receive_text()
    except WebSocketDisconnect:
        # Se o cliente desconectar, remove ele da lista
        manager.disconnect(websocket)