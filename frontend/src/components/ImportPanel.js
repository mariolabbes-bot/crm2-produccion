import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { uploadVentasFile, uploadAbonosFile, uploadClientesFile, downloadPlantillaVentas, downloadPlantillaAbonos, downloadPlantillaClientes, downloadInformePendientes } from '../api';
import { removeToken } from '../utils/auth';

const ImportPanel = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [importType, setImportType] = useState('clientes'); // 'clientes' | 'ventas' | 'abonos'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [updateMissingAbonos, setUpdateMissingAbonos] = useState(false); // modo actualización de abonos

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.xlsm'))) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    } else {
      setError('Solo se permiten archivos Excel (.xlsx, .xls, .xlsm)');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Selecciona un archivo primero');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;
      if (importType === 'clientes') {
        response = await uploadClientesFile(selectedFile);
      } else if (importType === 'ventas') {
        response = await uploadVentasFile(selectedFile);
      } else {
          // Abonos: si está activo updateMissing, hacemos llamada manual con query
          if (updateMissingAbonos) {
            const token = getToken();
            const formData = new FormData();
            formData.append('file', selectedFile);
            const fetchUrl = `${API_URL}/import/abonos?updateMissing=1`;
            const resp = await fetch(fetchUrl, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData
            });
            if (!resp.ok) {
              const errorData = await resp.json().catch(() => ({}));
              const err = new Error(errorData.msg || 'Error al subir archivo');
              err.status = resp.status;
              err.data = errorData;
              throw err;
            }
            response = await resp.json();
          } else {
            response = await uploadAbonosFile(selectedFile);
          }
      }

      setResult(response);
      setSelectedFile(null);
    } catch (err) {
      console.error('Error en upload:', err);
      const status = err.status || 0;
      const backendMsg = err.data?.msg;
      const backendDetail = err.data?.error;
      const msg = backendDetail
        ? `${backendMsg || 'Error al procesar archivo'}: ${backendDetail}`
        : (backendMsg || err.message || 'Error al procesar el archivo');
      setError(msg);
      if (status === 401 || status === 403) {
        setTimeout(() => {
          removeToken();
          navigate('/login');
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPlantilla = () => {
    if (importType === 'clientes') {
      downloadPlantillaClientes();
    } else if (importType === 'ventas') {
      downloadPlantillaVentas();
    } else {
      downloadPlantillaAbonos();
    }
  };

  const handleDownloadInforme = () => {
    if (result && result.pendingReportUrl) {
      const filename = result.pendingReportUrl.split('/').pop();
      downloadInformePendientes(filename);
    }
  };

  const handleDownloadObservaciones = () => {
    if (result && result.observationsReportUrl) {
      const filename = result.observationsReportUrl.split('/').pop();
      downloadInformePendientes(filename);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', p: 3 }}>
      <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            📊 Importación de Datos
          </Typography>
          <Box>
            <Button onClick={() => navigate('/')} sx={{ mr: 2 }}>
              Volver al Dashboard
            </Button>
            <Button variant="outlined" color="error" onClick={handleLogout}>
              Cerrar Sesión
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Panel izquierdo: Upload */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                1. Selecciona el tipo de datos
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  variant={importType === 'clientes' ? 'contained' : 'outlined'}
                  onClick={() => setImportType('clientes')}
                  fullWidth
                  color="secondary"
                >
                  Clientes
                </Button>
                <Button
                  variant={importType === 'ventas' ? 'contained' : 'outlined'}
                  onClick={() => setImportType('ventas')}
                  fullWidth
                >
                  Ventas
                </Button>
                <Button
                  variant={importType === 'abonos' ? 'contained' : 'outlined'}
                  onClick={() => setImportType('abonos')}
                  fullWidth
                >
                  Abonos
                </Button>
              </Box>

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
                2. Descarga la plantilla
              </Typography>
              <Button
                startIcon={<DownloadIcon />}
                variant="outlined"
                onClick={handleDownloadPlantilla}
                fullWidth
                sx={{ mb: 3 }}
              >
                Descargar Plantilla de {
                  importType === 'clientes' ? 'Clientes' :
                  importType === 'ventas' ? 'Ventas' : 'Abonos'
                }
              </Button>

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                3. Sube tu archivo
              </Typography>
                {importType === 'abonos' && (
                  <Box sx={{ mb: 2, mt: 1, p: 2, border: '1px solid #ddd', borderRadius: 2, bgcolor: '#fafafa' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Opciones avanzadas (Abonos)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <input
                        id="chk-update-missing"
                        type="checkbox"
                        checked={updateMissingAbonos}
                        onChange={e => setUpdateMissingAbonos(e.target.checked)}
                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                      />
                      <label htmlFor="chk-update-missing" style={{ cursor: 'pointer' }}>
                        Actualizar datos faltantes (cliente / vendedor) sin duplicar
                      </label>
                    </Box>
                    <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                      Usa esto después de cargar nuevos clientes o vendedores. Los folios existentes se completarán.
                    </Typography>
                  </Box>
                )}
              <Box
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                sx={{
                  border: '2px dashed #1976d2',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  bgcolor: selectedFile ? '#e3f2fd' : '#fafafa',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': {
                    bgcolor: '#e3f2fd',
                    borderColor: '#1565c0'
                  }
                }}
                onClick={() => document.getElementById('file-input').click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls,.xlsm"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <UploadIcon sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {selectedFile ? selectedFile.name : 'Arrastra tu archivo aquí'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  o haz clic para seleccionar
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Archivos permitidos: .xlsx, .xls, .xlsm (máx. 50MB)
                </Typography>
              </Box>

              {selectedFile && (
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{ mt: 3 }}
                  onClick={handleUpload}
                  disabled={loading}
                  startIcon={<UploadIcon />}
                >
                  {loading ? 'Procesando...' : 'Importar y Procesar'}
                </Button>
              )}

              {loading && <LinearProgress sx={{ mt: 2 }} />}
            </Paper>
          </Grid>

          {/* Panel derecho: Resultados */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Resultado de la Importación
              </Typography>

              {!result && !error && (
                <Box sx={{ textAlign: 'center', py: 8, color: '#999' }}>
                  <Typography variant="body1">
                    Sube un archivo para ver los resultados
                  </Typography>
                </Box>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {result && (
                <Box>
                  {/* Resumen */}
                    <Card sx={{ mb: 2, bgcolor: result.dataImported ? '#e8f5e9' : result.canProceed ? '#e8f5e9' : '#fff3e0' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          {result.dataImported ? (
                          <CheckIcon sx={{ color: '#4caf50', fontSize: 40, mr: 2 }} />
                          ) : result.canProceed ? (
                            <CheckIcon sx={{ color: '#4caf50', fontSize: 40, mr: 2 }} />
                        ) : (
                          <WarningIcon sx={{ color: '#ff9800', fontSize: 40, mr: 2 }} />
                        )}
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {result.dataImported ? '¡Importación Exitosa!' : result.canProceed ? 'Listo para importar' : 'Atención: Hay pendientes'}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {result.totalRows} filas procesadas
                          </Typography>
                        </Box>
                      </Box>

                        {result.dataImported && (
                          <Alert severity="success" sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              ✅ Se han guardado {result.imported} registro{result.imported !== 1 ? 's' : ''} en la base de datos
                            </Typography>
                            <Typography variant="caption">
                              Los datos ya están disponibles en el sistema
                            </Typography>
                          </Alert>
                        )}

                      <Grid container spacing={2}>
                        {importType === 'clientes' && result.inserted !== undefined ? (
                          <>
                            <Grid item xs={4}>
                              <Typography variant="caption" color="textSecondary">Nuevos</Typography>
                              <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 700 }}>{result.inserted}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="caption" color="textSecondary">Actualizados</Typography>
                              <Typography variant="h4" sx={{ color: '#2196f3', fontWeight: 700 }}>{result.updated}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="caption" color="textSecondary">Errores</Typography>
                              <Typography variant="h4" sx={{ color: '#f44336', fontWeight: 700 }}>{result.errors || 0}</Typography>
                            </Grid>
                          </>
                        ) : (
                          <>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">{result.dataImported ? 'Importados' : 'Para importar'}</Typography>
                              <Typography variant="h4" sx={{ color: result.dataImported ? '#4caf50' : '#1976d2', fontWeight: 700 }}>
                                {result.dataImported ? result.imported : result.toImport}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Duplicados</Typography>
                              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 700 }}>{result.duplicates}</Typography>
                            </Grid>
                            {importType === 'abonos' && result.updatedMissing !== undefined && (
                              <Grid item xs={12}>
                                <Box sx={{ mt: 1, p: 1.5, border: '1px dashed #2196f3', borderRadius: 2, bgcolor: '#e3f2fd' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0d47a1' }}>
                                    Abonos existentes actualizados: {result.updatedMissing}
                                  </Typography>
                                  {result.updatedReportUrl && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      sx={{ mt: 1 }}
                                      onClick={() => window.open(result.updatedReportUrl + `?token=${getToken()}`, '_blank')}
                                    >
                                      Descargar reporte de actualizados
                                    </Button>
                                  )}
                                </Box>
                              </Grid>
                            )}
                          </>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Referencias faltantes */}
                  {(result.missingVendors?.length > 0 || result.missingClients?.length > 0) && (
                    <Card sx={{ mb: 2, border: '2px solid #ff9800' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <ErrorIcon sx={{ color: '#ff9800', mr: 1 }} />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Referencias Faltantes
                          </Typography>
                        </Box>

                        {result.missingVendors?.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Chip
                              label={`${result.missingVendors.length} Vendedor(es) no encontrado(s)`}
                              color="warning"
                              size="small"
                              sx={{ mb: 1 }}
                            />
                            <List dense>
                              {result.missingVendors.slice(0, 5).map((v, idx) => (
                                <ListItem key={idx} sx={{ py: 0.5 }}>
                                  <ListItemText primary={v} primaryTypographyProps={{ variant: 'body2' }} />
                                </ListItem>
                              ))}
                              {result.missingVendors.length > 5 && (
                                <ListItem>
                                  <ListItemText 
                                    primary={`... y ${result.missingVendors.length - 5} más`}
                                    primaryTypographyProps={{ variant: 'caption', color: 'textSecondary' }}
                                  />
                                </ListItem>
                              )}
                            </List>
                          </Box>
                        )}

                        {result.missingClients?.length > 0 && (
                          <Box>
                            <Chip
                              label={`${result.missingClients.length} Cliente(s) no encontrado(s)`}
                              color="warning"
                              size="small"
                              sx={{ mb: 1 }}
                            />
                            <List dense>
                              {result.missingClients.slice(0, 5).map((c, idx) => (
                                <ListItem key={idx} sx={{ py: 0.5 }}>
                                  <ListItemText primary={c} primaryTypographyProps={{ variant: 'body2' }} />
                                </ListItem>
                              ))}
                              {result.missingClients.length > 5 && (
                                <ListItem>
                                  <ListItemText 
                                    primary={`... y ${result.missingClients.length - 5} más`}
                                    primaryTypographyProps={{ variant: 'caption', color: 'textSecondary' }}
                                  />
                                </ListItem>
                              )}
                            </List>
                          </Box>
                        )}

                        {(result.pendingReportUrl || result.observationsReportUrl) && (
                          <Button
                            startIcon={<DownloadIcon />}
                            variant="contained"
                            color="warning"
                            fullWidth
                            sx={{ mt: 2 }}
                            onClick={result.pendingReportUrl ? handleDownloadInforme : handleDownloadObservaciones}
                          >
                            {result.pendingReportUrl ? 'Descargar Informe de Pendientes' : 'Descargar Informe de Observaciones'}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Duplicados detectados */}
                  {result.duplicates > 0 && result.duplicatesList?.length > 0 && (
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                          Registros Duplicados (primeros 10)
                        </Typography>
                        <List dense>
                          {result.duplicatesList.map((dup, idx) => (
                            <React.Fragment key={idx}>
                              <ListItem>
                                <ListItemText
                                  primary={`Folio: ${dup.folio}${dup.tipoDoc ? ` (${dup.tipoDoc})` : ''}`}
                                  secondary={dup.cliente || dup.fecha}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                  secondaryTypographyProps={{ variant: 'caption' }}
                                />
                              </ListItem>
                              {idx < result.duplicatesList.length - 1 && <Divider />}
                            </React.Fragment>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  )}

                  {/* Instrucciones */}
                  {!result.canProceed && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        Próximos pasos:
                      </Typography>
                      <Typography variant="body2" component="ol" sx={{ pl: 2, m: 0 }}>
                        <li>Descarga el informe de pendientes</li>
                        <li>Registra los clientes/vendedores faltantes en el CRM</li>
                        <li>Vuelve a subir el archivo para completar la importación</li>
                      </Typography>
                    </Alert>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ImportPanel;
