const { createJob, updateJobStatus, getJobStatus } = require('./jobManager');
const { processVentasFileAsync } = require('./importers/ventas');
const { processAbonosFileAsync } = require('./importers/abonos');
const { processClientesFileAsync } = require('./importers/clientes');

// This module aggregates all import logic
module.exports = {
  createJob,
  updateJobStatus,
  getJobStatus,
  processVentasFileAsync,
  processAbonosFileAsync,
  processClientesFileAsync
};
