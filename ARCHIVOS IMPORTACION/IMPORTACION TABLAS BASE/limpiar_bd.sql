-- Script para limpiar la base de datos y dejar solo las 5 tablas principales
-- Elimina todas las tablas existentes excepto USUARIOS, PRODUCTOS, CLIENTES, VENTAS y ABONOS

-- Eliminar tablas existentes (ajusta nombres si hay otras tablas)
DROP TABLE IF EXISTS venta CASCADE;
DROP TABLE IF EXISTS abono CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;
DROP TABLE IF EXISTS producto CASCADE;
DROP TABLE IF EXISTS cliente CASCADE;
DROP TABLE IF EXISTS signacion_litros CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- (Opcional) Eliminar otras tablas no listadas si existen
-- DROP TABLE IF EXISTS otra_tabla CASCADE;

-- Crear tablas principales
\i estructura_bd.sql

-- Fin de script
