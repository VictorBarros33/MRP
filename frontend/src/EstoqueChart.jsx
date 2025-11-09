import React from 'react';
// Importamos os componentes da biblioteca Recharts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Heading, Text } from '@chakra-ui/react';

function EstoqueChart({ data }) {
  // Se não houver dados, mostra uma mensagem simples
  if (!data || data.length === 0) {
    return (
      <Box p={5} bg="gray.50" borderRadius="md" textAlign="center">
        <Text color="gray.500">Ainda não há produtos para mostrar no gráfico.</Text>
      </Box>
    )
  }

  return (
    <Box width="100%" height={400} p={4} bg="white" borderRadius="md" boxShadow="sm">
      <Heading size="md" mb={6} textAlign="center" color="teal.600">
        Nível de Estoque vs. Ponto Mínimo
      </Heading>
      
      {/* ResponsiveContainer faz o gráfico adaptar-se ao tamanho da tela */}
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="sku" />
          <YAxis />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
          />
          <Legend verticalAlign="top" height={36} />
          {/* Barra Azul: Quantidade Atual */}
          <Bar dataKey="quantidade_atual" name="Qtd. Atual" fill="#3182ce" radius={[4, 4, 0, 0]} />
          {/* Barra Laranja: Ponto de Ressuprimento (Mínimo) */}
          <Bar dataKey="ponto_ressuprimento" name="Mínimo (Alerta)" fill="#dd6b20" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default EstoqueChart;