const pool = require('../db');

async function createJob(tipo, filename, userRut) {
    const { v4: uuidv4 } = require('uuid');
    const jobId = uuidv4();
    await pool.query(
        `INSERT INTO import_job (job_id, tipo, filename, status, user_rut, created_at) 
     VALUES ($1, $2, $3, 'pending', $4, NOW())`,
        [jobId, tipo, filename, userRut]
    );
    console.log(`✅ Job creado: ${jobId} (${tipo})`);
    return jobId;
}

async function updateJobStatus(jobId, status, data = {}) {
    const updates = [];
    const values = [jobId];
    let paramCount = 2;

    updates.push(`status = $${paramCount++}`);
    values.push(status);

    if (status === 'processing') {
        updates.push(`started_at = NOW()`);
    }
    if (status === 'completed' || status === 'failed') {
        updates.push(`finished_at = NOW()`);
    }
    if (data.totalRows) {
        updates.push(`total_rows = $${paramCount++}`);
        values.push(data.totalRows);
    }
    if (data.importedRows !== undefined) {
        updates.push(`imported_rows = $${paramCount++}`);
        values.push(data.importedRows);
    }
    if (data.duplicateRows !== undefined) {
        updates.push(`duplicate_rows = $${paramCount++}`);
        values.push(data.duplicateRows);
    }
    if (data.errorRows !== undefined) {
        updates.push(`error_rows = $${paramCount++}`);
        values.push(data.errorRows);
    }
    if (data.resultData) {
        updates.push(`result_data = $${paramCount++}`);
        values.push(JSON.stringify(data.resultData));
    }
    if (data.errorMessage) {
        updates.push(`error_message = $${paramCount++}`);
        values.push(data.errorMessage);
    }
    if (data.reportFilename) {
        updates.push(`report_filename = $${paramCount++}`);
        values.push(data.reportFilename);
    }
    if (data.observationsFilename) {
        updates.push(`observations_filename = $${paramCount++}`);
        values.push(data.observationsFilename);
    }

    const sql = `UPDATE import_job SET ${updates.join(', ')} WHERE job_id = $1`;
    await pool.query(sql, values);
    console.log(`📊 Job ${jobId} → ${status}`);
}

async function getJobStatus(jobId) {
    const result = await pool.query('SELECT * FROM import_job WHERE job_id = $1', [jobId]);
    return result.rows[0] || null;
}

module.exports = { createJob, updateJobStatus, getJobStatus };
