const app = require('./serverApp');
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces para Render
app.listen(PORT, HOST, () => console.log(`Servidor backend escuchando en puerto ${PORT}`));
