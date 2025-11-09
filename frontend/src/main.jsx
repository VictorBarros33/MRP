import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// 1. Importamos o ChakraProvider
import { ChakraProvider } from '@chakra-ui/react'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Envolvemos o App com ele */}
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
)