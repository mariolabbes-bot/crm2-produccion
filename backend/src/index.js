const app = require('./serverApp');
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor backend escuchando en puerto ${PORT}`));
