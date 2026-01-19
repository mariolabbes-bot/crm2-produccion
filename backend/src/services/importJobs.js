const { createJob, updateJobStatus, getJobStatus } = require('./jobManager');
const { processVentasFileAsync } = require('./importers/ventas');
const { processAbonosFileAsync } = require('./importers/abonos');
const { processClientesFileAsync } = require('./importers/clientes');
const { processSaldoCreditoFileAsync } = require('./importers/saldo_credito');
const { processProductosFileAsync } = require('./importers/productos');

// This module aggregates all import logic
module.exports = {
  createJob,
  updateJobStatus,
  getJobStatus,
  processVentasFileAsync,
  processAbonosFileAsync,
  processClientesFileAsync,
  processSaldoCreditoFileAsync,
  processProductosFileAsync
};
