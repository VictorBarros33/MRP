import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  Box, Flex, Heading, Text, Input, Button, Select,
  Table, Thead, Tbody, Tr, Th, Td,
  Badge, Alert, AlertIcon, VStack, HStack, useToast,
  Container, Card, CardHeader, CardBody,
  useDisclosure, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Spinner, Tabs, TabList, TabPanels, TabPanel, Tab
} from '@chakra-ui/react'

// 1. Importamos o nosso novo componente de gráfico
import EstoqueChart from './EstoqueChart' 

const API_URL = 'http://127.0.0.1:8000'

function App() {
  // --- ESTADOS (Memória do Componente) ---
  const [produtos, setProdutos] = useState([])
  const [historico, setHistorico] = useState([])
  const [formData, setFormData] = useState({
    sku: '', nome: '', descricao: '', quantidade_atual: 0, ponto_ressuprimento: 5
  })
  const [movData, setMovData] = useState({
    sku: '', tipo: 'entrada', quantidade: 1
  })
  const [alerta, setAlerta] = useState("")
  const { isOpen: isPrevisaoOpen, onOpen: onPrevisaoOpen, onClose: onPrevisaoClose } = useDisclosure()
  const [previsaoData, setPrevisaoData] = useState(null)
  const [isLoadingIA, setIsLoadingIA] = useState(false)
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure()
  const [produtoEmEdicao, setProdutoEmEdicao] = useState(null)
  const toast = useToast()
  const ws = useRef(null);

  // --- FUNÇÃO AUXILIAR: BUSCAR HISTÓRICO ---
  const buscarHistorico = async () => {
    try {
      const response = await axios.get(`${API_URL}/movimentacoes/historico`)
      setHistorico(response.data)
    } catch (error) {
      console.error("Erro ao buscar histórico:", error)
    }
  }

  // --- EFEITOS (O que acontece ao carregar) ---
  useEffect(() => {
    const buscarProdutos = async () => {
      try {
        const response = await axios.get(`${API_URL}/produtos`)
        setProdutos(response.data)
      } catch (error) {
        console.error("Erro ao buscar produtos:", error)
        toast({ title: 'Erro ao buscar produtos.', status: 'error', duration: 3000, isClosable: true })
      }
    }
    
    buscarProdutos()
    buscarHistorico() 

    ws.current = new WebSocket('ws://127.0.0.1:8000/ws')
    ws.current.onopen = () => console.log("WebSocket Conectado!")
    ws.current.onclose = () => console.log("WebSocket Desconectado.")

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.tipo_msg === 'atualizacao_estoque') {
        // Atualiza a lista de produtos (para o gráfico atualizar!)
        setProdutos(prev => prev.map(p => 
          p.sku === data.sku ? { ...p, quantidade_atual: data.quantidade_atual } : p
        ))
        buscarHistorico() 
      }
      if (data.tipo_msg === 'alerta_estoque_baixo') {
        setAlerta(data.mensagem)
        setTimeout(() => setAlerta(""), 5000)
        toast({ title: 'Alerta de Estoque Baixo!', description: data.mensagem, status: 'warning', duration: 5000, isClosable: true, position: 'top-right' })
      }
    }

    return () => {
      if (ws.current) ws.current.close()
    }
  }, [toast])

  // --- FUNÇÕES DE FORMULÁRIO ---
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })
  const handleMovChange = (e) => setMovData({ ...movData, [e.target.name]: e.target.value })

  // --- FUNÇÕES DE AÇÃO (CRUD + IA) ---
  const handleSubmit = async (e) => {
    e.preventDefault()
    const dadosEnvio = {
      ...formData,
      quantidade_atual: parseInt(formData.quantidade_atual),
      ponto_ressuprimento: parseInt(formData.ponto_ressuprimento)
    }
    try {
      const response = await axios.post(`${API_URL}/produtos`, dadosEnvio)
      setProdutos([...produtos, response.data]) 
      setFormData({ sku: '', nome: '', descricao: '', quantidade_atual: 0, ponto_ressuprimento: 5 })
      toast({ title: 'Produto cadastrado com sucesso!', status: 'success', duration: 3000, isClosable: true })
    } catch (error) {
      toast({ title: 'Erro ao cadastrar.', description: error.response?.data?.detail || "Erro desconhecido", status: 'error', duration: 3000, isClosable: true })
    }
  }

  const handleMovSubmit = async (e) => {
    e.preventDefault()
    const dadosEnvio = { ...movData, quantidade: parseInt(movData.quantidade) }
    if (dadosEnvio.quantidade <= 0) {
      toast({ title: 'Quantidade deve ser maior que zero.', status: 'warning', duration: 3000, isClosable: true })
      return
    }
    try {
      await axios.post(`${API_URL}/movimentacoes`, dadosEnvio)
      setMovData({ ...movData, sku: '', quantidade: 1 })
      toast({ title: 'Movimentação registrada!', status: 'success', duration: 2000, isClosable: true })
    } catch (error) {
      toast({ title: 'Erro na movimentação.', description: error.response?.data?.detail || "Erro desconhecido", status: 'error', duration: 3000, isClosable: true })
    }
  }

  const handleDelete = async (skuParaExcluir) => {
    if (!confirm(`Tem certeza que deseja excluir o produto ${skuParaExcluir}? Esta ação apagará todo o histórico de movimentações dele.`)) return;
    try {
      await axios.delete(`${API_URL}/produtos/${skuParaExcluir}`)
      setProdutos(produtos.filter(p => p.sku !== skuParaExcluir))
      buscarHistorico()
      toast({ title: 'Produto excluído.', status: 'info', duration: 3000, isClosable: true })
    } catch (error) {
        toast({ title: 'Erro ao excluir.', description: error.response?.data?.detail, status: 'error', duration: 3000, isClosable: true })
    }
  }

  const handleAbrirEdicao = (produto) => {
    setProdutoEmEdicao(produto)
    onEditOpen()
  }

  const handleSalvarEdicao = async () => {
    if (!produtoEmEdicao) return;
    try {
      const updateData = {
        nome: produtoEmEdicao.nome,
        descricao: produtoEmEdicao.descricao,
        ponto_ressuprimento: parseInt(produtoEmEdicao.ponto_ressuprimento)
      }
      await axios.put(`${API_URL}/produtos/${produtoEmEdicao.sku}`, updateData)
      setProdutos(produtos.map(p => (p.sku === produtoEmEdicao.sku ? { ...p, ...updateData } : p)))
      toast({ title: 'Produto atualizado!', status: 'success', duration: 3000, isClosable: true })
      onEditClose()
    } catch (error) {
      toast({ title: 'Erro ao atualizar.', description: error.response?.data?.detail, status: 'error', duration: 3000, isClosable: true })
    }
  }

  const handlePrevisao = async (skuParaPrever) => {
    setIsLoadingIA(true)
    setPrevisaoData(null)
    try {
      const response = await axios.get(`${API_URL}/produtos/previsao/${skuParaPrever}`)
      setPrevisaoData(response.data)
      onPrevisaoOpen()
    } catch (error) {
      toast({ title: 'Erro na previsão.', description: error.response?.data?.detail, status: 'error', duration: 4000, isClosable: true })
    } finally {
      setIsLoadingIA(false)
    }
  }

  // --- O HTML (INTERFACE) ---
  return (
    <Container maxW="container.xl" p={5}>
      {alerta && (
        <Alert status='warning' mb={5} borderRadius="md">
          <AlertIcon />
          {alerta}
        </Alert>
      )}

      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="2xl" color="teal.500">Sistema MRP Previsivo</Heading>
          <Text color="gray.500">Controle de Estoque com previsão de IA integrado</Text>
        </Box>

        {/* 2. ADICIONAMOS A NOVA ABA "DASHBOARD" AQUI */}
        <Tabs isFitted variant='enclosed-colored' colorScheme='teal'>
          <TabList mb='1em'>
            <Tab fontWeight="bold" fontSize="lg">📈 Inventário</Tab>
            <Tab fontWeight="bold" fontSize="lg">📂 Histórico</Tab>
            <Tab fontWeight="bold" fontSize="lg">📊 Dashboard</Tab> 
          </TabList>
          
          <TabPanels>
            {/* ABA 1: INVENTÁRIO E FORMULÁRIOS */}
            <TabPanel p={0}>
              <VStack spacing={8}>
                <Flex direction={{ base: "column", md: "row" }} gap={5} width="100%">
                  {/* Card Cadastrar */}
                  <Card flex={1} variant="outline">
                    <CardHeader><Heading size="md">📦 Cadastrar Novo Produto</Heading></CardHeader>
                    <CardBody>
                      <form onSubmit={handleSubmit}>
                        <VStack spacing={3}>
                          <Input name="sku" value={formData.sku} onChange={handleChange} placeholder="Cód. do Produto (ex: PAR-001)" required focusBorderColor="teal.500" />
                          <Input name="nome" value={formData.nome} onChange={handleChange} placeholder="Nome do Produto" required focusBorderColor="teal.500" />
                          <Input name="descricao" value={formData.descricao} onChange={handleChange} placeholder="Descrição (Opcional)" focusBorderColor="teal.500" />
                          <HStack width="100%">
                            <Input name="quantidade_atual" type="number" value={formData.quantidade_atual} onChange={handleChange} placeholder="Qtd. Inicial" focusBorderColor="teal.500" />
                            <Input name="ponto_ressuprimento" type="number" value={formData.ponto_ressuprimento} onChange={handleChange} placeholder="Mínimo (Alerta)" focusBorderColor="teal.500" />
                          </HStack>
                          <Button type="submit" colorScheme="teal" width="full">Cadastrar Produto</Button>
                        </VStack>
                      </form>
                    </CardBody>
                  </Card>
                  {/* Card Movimentar */}
                  <Card flex={1} variant="outline" bg={movData.tipo === 'entrada' ? 'green.50' : 'red.50'}>
                    <CardHeader><Heading size="md">🔄 Movimentar Estoque</Heading></CardHeader>
                    <CardBody>
                      <form onSubmit={handleMovSubmit}>
                        <VStack spacing={3}>
                          <Input name="sku" value={movData.sku} onChange={handleMovChange} placeholder="Cód. do Produto" required bg="white" />
                          <Select name="tipo" value={movData.tipo} onChange={handleMovChange} bg="white">
                            <option value="entrada">Entrada (Compra)</option>
                            <option value="saida">Saída (Venda)</option>
                          </Select>
                          <Input name="quantidade" type="number" value={movData.quantidade} onChange={handleMovChange} placeholder="Quantidade" min="1" required bg="white" />
                          <Button type="submit" colorScheme={movData.tipo === 'entrada' ? 'green' : 'red'} width="full">
                            Registrar {movData.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </Button>
                        </VStack>
                      </form>
                    </CardBody>
                  </Card>
                </Flex>
                {/* Tabela Inventário */}
                <Card variant="outline" width="100%">
                  <CardHeader><Heading size="lg">📋 Inventário Atual</Heading></CardHeader>
                  <CardBody overflowX="auto">
                    <Table variant="simple">
                      <Thead bg="gray.100">
                        <Tr>
                          <Th>Cód.</Th><Th>Nome</Th><Th isNumeric>Qtd. Atual</Th><Th isNumeric>Mínimo</Th><Th>Status</Th><Th>Ações</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {produtos.map(produto => {
                          const isLowStock = produto.quantidade_atual <= produto.ponto_ressuprimento;
                          return (
                            <Tr key={produto.sku} bg={isLowStock ? 'red.50' : 'white'}>
                              <Td fontWeight="bold">{produto.sku}</Td>
                              <Td>{produto.nome}</Td>
                              <Td isNumeric fontSize="lg" fontWeight="bold" color={isLowStock ? 'red.500' : 'black'}>{produto.quantidade_atual}</Td>
                              <Td isNumeric>{produto.ponto_ressuprimento}</Td>
                              <Td>{isLowStock ? <Badge colorScheme="red">Estoque Baixo</Badge> : <Badge colorScheme="green">OK</Badge>}</Td>
                              <Td>
                                <HStack spacing={2}>
                                  <Button colorScheme="purple" size="sm" onClick={() => handlePrevisao(produto.sku)} isLoading={isLoadingIA}>📊 Prever</Button>
                                  <Button colorScheme="blue" size="sm" onClick={() => handleAbrirEdicao(produto)}>Editar</Button>
                                  <Button colorScheme="red" size="sm" onClick={() => handleDelete(produto.sku)}>Excluir</Button>
                                </HStack>
                              </Td>
                            </Tr>
                          )
                        })}
                      </Tbody>
                    </Table>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* ABA 2: HISTÓRICO */}
            <TabPanel p={0}>
              <Card variant="outline">
                <CardHeader>
                  <Heading size="lg">Histórico de Movimentações</Heading>
                  <Text color="gray.500">Todas as entradas e saídas registadas (mais recentes primeiro)</Text>
                </CardHeader>
                <CardBody overflowX="auto">
                  <Table variant="simple">
                    <Thead bg="gray.100">
                      <Tr>
                        <Th>Data & Hora</Th><Th>Cód.</Th><Th>Produto</Th><Th>Tipo</Th><Th isNumeric>Quantidade</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {historico.map(mov => (
                        <Tr key={mov.id}>
                          <Td>{new Date(mov.data_hora).toLocaleString('pt-BR')}</Td>
                          <Td fontWeight="bold">{mov.produto_sku}</Td>
                          <Td>{mov.produto_nome}</Td>
                          <Td>{mov.tipo === 'entrada' ? <Badge colorScheme="green">Entrada</Badge> : <Badge colorScheme="red">Saída</Badge>}</Td>
                          <Td isNumeric fontWeight="bold">{mov.tipo === 'entrada' ? '+' : '-'} {mov.quantidade}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </TabPanel>

            {/* 3. ADICIONAMOS O NOVO PAINEL DA ABA "DASHBOARD" */}
            <TabPanel p={0}>
              <Card variant="outline">
                <CardHeader>
                  <Heading size="lg">Dashboard de Estoque</Heading>
                </CardHeader>
                <CardBody>
                  {/* O gráfico é renderizado aqui! */}
                  <EstoqueChart data={produtos} />
                </CardBody>
              </Card>
            </TabPanel>

          </TabPanels>
        </Tabs>
      </VStack>

      {/* --- MODAIS (Ficam no final) --- */}
      
      {/* MODAL DE IA */}
      <Modal isOpen={isPrevisaoOpen} onClose={onPrevisaoClose} isCentered size="lg">
        <ModalOverlay backdropFilter='blur(5px)' />
        <ModalContent>
          <ModalHeader>🔮 Previsão de Estoque (IA)</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {previsaoData ? (
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text color="gray.500" fontSize="sm">Produto Analisado</Text>
                  <Heading size="md">{previsaoData.sku}</Heading>
                </Box>
                {previsaoData.previsao_dias !== null ? (
                  <Alert status={previsaoData.previsao_dias < 7 ? 'warning' : 'success'} variant='subtle' flexDirection='column' alignItems='center' justifyContent='center' textAlign='center' height='200px' borderRadius='md'>
                    <Heading size="2xl" mb={4}>{previsaoData.previsao_dias} dias</Heading>
                    <Text fontSize="lg">Tempo estimado até o estoque acabar.</Text>
                    <Text fontSize="sm" mt={2}>(Baseado numa média de {previsaoData.media_saida_diaria_prevista} saídas/dia)</Text>
                  </Alert>
                ) : (
                  <Alert status='info' borderRadius="md"><AlertIcon />{previsaoData.mensagem}</Alert>
                )}
              </VStack>
            ) : (
              <Flex justify="center" align="center" h="200px"><Spinner size="xl" color="purple.500" /></Flex>
            )}
          </ModalBody>
          <ModalFooter><Button colorScheme='purple' mr={3} onClick={onPrevisaoClose}>Fechar</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* MODAL DE EDIÇÃO */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>✏️ Editar Produto</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {produtoEmEdicao && (
              <VStack spacing={4}>
                <Box w="100%">
                  <Text mb="8px" fontWeight="bold" color="gray.500">Cód. Produto (Não editável):</Text>
                  <Input value={produtoEmEdicao.sku} isDisabled bg="gray.100" />
                </Box>
                <Box w="100%">
                  <Text mb="8px" fontWeight="bold">Nome:</Text>
                  <Input 
                    value={produtoEmEdicao.nome} 
                    onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, nome: e.target.value })} 
                  />
                </Box>
                <Box w="100%">
                  <Text mb="8px" fontWeight="bold">Descrição:</Text>
                  <Input 
                    value={produtoEmEdicao.descricao} 
                    onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, descricao: e.target.value })} 
                  />
                </Box>
                <Box w="100%">
                  <Text mb="8px" fontWeight="bold">Ponto de Ressuprimento (Mínimo):</Text>
                  <Input 
                    type="number"
                    value={produtoEmEdicao.ponto_ressuprimento} 
                    onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, ponto_ressuprimento: e.target.value })} 
                  />
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>Cancelar</Button>
            <Button colorScheme="blue" onClick={handleSalvarEdicao}>Salvar Alterações</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Container>
  )
}

export default App