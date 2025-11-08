import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

// O endereço do nosso back-end
const API_URL = 'http://127.0.0.1:8000'

function App() {
  const [produtos, setProdutos] = useState([])
  
  // Estado para o formulário de CADASTRO
  const [formData, setFormData] = useState({
    sku: '',
    nome: '',
    descricao: '',
    quantidade_atual: 0,
    ponto_ressuprimento: 5
  })
  
  // Estado para o formulário de MOVIMENTAÇÃO
  const [movData, setMovData] = useState({
    sku: '',
    tipo: 'entrada',
    quantidade: 1
  })
  
  // Estado para o ALERTA
  const [alerta, setAlerta] = useState(""); // Erro corrigido (só um '=')

  // --- Efeito para BUSCAR os produtos E Conectar WebSocket ---
  useEffect(() => {
    // 1. Função para buscar a lista inicial
    const buscarProdutos = async () => {
      try {
        const response = await axios.get(`${API_URL}/produtos`)
        setProdutos(response.data)
      } catch (error) {
        console.error("Erro ao buscar produtos:", error)
      }
    }
    buscarProdutos() // Busca a lista quando a página carrega

    // 2. Conectar ao WebSocket
    const socket = new WebSocket('ws://127.0.0.1:8000/ws')

    socket.onopen = () => {
      console.log("WebSocket Conectado!")
    }

    // 3. O que fazer quando uma MENSAGEM chegar do back-end
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log("Mensagem recebida:", data)

      if (data.tipo_msg === 'atualizacao_estoque') {
        // Atualiza a quantidade do produto na lista
        setProdutos(prevProdutos => 
          prevProdutos.map(p => 
            p.sku === data.sku ? { ...p, quantidade_atual: data.quantidade_atual } : p
          )
        )
      }

      if (data.tipo_msg === 'alerta_estoque_baixo') {
        // Define a mensagem de alerta
        setAlerta(data.mensagem)
        // Limpa o alerta depois de 5 segundos
        setTimeout(() => setAlerta(""), 5000)
      }
    }

    socket.onclose = () => {
      console.log("WebSocket Desconectado.")
    }

    // Limpar a conexão ao "desmontar" o componente
    return () => {
      socket.close()
    }
  }, []) // O [] vazio significa "rode isso apenas uma vez"

  // --- Funções para lidar com a MUDANÇA nos formulários ---
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleMovChange = (e) => {
    const { name, value } = e.target
    setMovData({ ...movData, [name]: value })
  }

  // --- Função para ENVIAR (Formulário Cadastro) ---
  const handleSubmit = async (e) => {
    e.preventDefault()
    const dadosEnvio = {
      ...formData,
      quantidade_atual: parseInt(formData.quantidade_atual),
      ponto_ressuprimento: parseInt(formData.ponto_ressuprimento)
    }

    try {
      const response = await axios.post(`${API_URL}/produtos`, dadosEnvio)
      setProdutos([...produtos, response.data]) // Atualização manual
      setFormData({ sku: '', nome: '', descricao: '', quantidade_atual: 0, ponto_ressuprimento: 5 })
    } catch (error) {
      console.error("Erro ao criar produto:", error)
      if (error.response && error.response.data.detail) {
        alert(error.response.data.detail)
      } else {
        alert("Erro ao criar produto.")
      }
    }
  }

  // --- Função para ENVIAR (Formulário Movimentação) ---
  const handleMovSubmit = async (e) => {
    e.preventDefault()
    
    const dadosEnvio = {
      ...movData,
      quantidade: parseInt(movData.quantidade)
    }
    
    if (dadosEnvio.quantidade <= 0) {
        alert("A quantidade deve ser maior que zero.")
        return
    }

    try {
      // Apenas envia a movimentação
      await axios.post(`${API_URL}/movimentacoes`, dadosEnvio)
      
      // O WebSocket (no useEffect) vai tratar a atualização
      
      // Apenas limpa o formulário
      setMovData({ ...movData, sku: '', quantidade: 1 })
      
    } catch (error) {
      console.error("Erro ao criar movimentação:", error)
      if (error.response && error.response.data.detail) {
        alert(error.response.data.detail)
      } else {
        alert("Erro ao criar movimentação.")
      }
    }
  }

  // --- O HTML (JSX) ---
  return (
    <div>
      {/* Banner de Alerta */}
      {alerta && (
        <div className="alerta-banner">
          {alerta}
        </div>
      )}

      <h1>Nosso Sistema MRP</h1>

      <div className="container-flex">
        {/* Formulário de Cadastro */}
        <div className="form-container">
          <h2>Cadastrar Novo Produto</h2>
          <form onSubmit={handleSubmit}>
            <input name="sku" value={formData.sku} onChange={handleChange} placeholder="SKU" required />
            <input name="nome" value={formData.nome} onChange={handleChange} placeholder="Nome do Produto" required />
            <input name="descricao" value={formData.descricao} onChange={handleChange} placeholder="Descrição" />
            <input name="quantidade_atual" type="number" value={formData.quantidade_atual} onChange={handleChange} placeholder="Quantidade Atual" />
            <input name="ponto_ressuprimento" type="number" value={formData.ponto_ressuprimento} onChange={handleChange} placeholder="Ponto de Ressuprimento" />
            <button type="submit">Cadastrar</button>
          </form>
        </div>

        {/* Formulário de Movimentação */}
        <div className="form-container">
          <h2>Movimentar Estoque</h2>
          <form onSubmit={handleMovSubmit}>
            <input
              name="sku"
              value={movData.sku}
              onChange={handleMovChange}
              placeholder="SKU do Produto"
              required
            />
            <select name="tipo" value={movData.tipo} onChange={handleMovChange}>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
            <input
              name="quantidade"
              type="number"
              value={movData.quantidade}
              onChange={handleMovChange}
              placeholder="Quantidade"
              min="1"
              required
            />
            <button type="submit">Movimentar</button>
          </form>
        </div>
      </div>

      <hr />

      {/* Lista de Produtos */}
      <div className="lista-container">
        <h2>Lista de Produtos no Estoque</h2>
        <ul>
          {produtos.map(produto => (
            <li key={produto.sku}>
              <strong>{produto.nome}</strong> ({produto.sku})
              - Qtd: {produto.quantidade_atual}
              (Min: {produto.ponto_ressuprimento})
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default App