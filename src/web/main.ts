import { createLocalServer } from './server.js'

const server = createLocalServer()
server.on('error', () => {
  console.error('Impossible de démarrer FiscalUTXO sur la boucle locale.')
  process.exitCode = 1
})
server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  if (address && typeof address === 'object') {
    console.log('FiscalUTXO est disponible sur http://127.0.0.1:' + address.port)
  }
})
