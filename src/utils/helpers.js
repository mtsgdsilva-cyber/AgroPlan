// src/utils/helpers.js

/**
 * Formata valores numéricos para Real Brasileiro (BRL)
 */
export const formatCurrency = (value) => {
  if (isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Formata datas ISO ou objetos Date para o padrão brasileiro (DD/MM/AAAA)
 */
export const formatDate = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  // Corrige o fuso horário para evitar que mostre o dia anterior
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

/**
 * Gera um ID único simples para uso offline antes de sincronizar com o Firebase
 */
export const generateId = () => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

/**
 * MÓDULO AGRO: Calcula a população de plantas/sementes por Hectare
 * @param {number} seedsPerMeter - Quantidade de sementes por metro linear
 * @param {number} spacingMeters - Espaçamento entre linhas (em metros, ex: 0.45 para soja)
 */
export const calcSeedsPerHa = (seedsPerMeter, spacingMeters) => {
  if (!seedsPerMeter || !spacingMeters) return 0;
  // 1 hectare = 10.000 m². Descobrimos os metros lineares por hectare e multiplicamos pelas sementes/metro.
  const linearMetersPerHa = 10000 / spacingMeters;
  return linearMetersPerHa * seedsPerMeter;
};

/**
 * MÓDULO AGRO: Calcula a necessidade total de sementes (em KG)
 * @param {number} seedsPerHa - População de sementes por hectare
 * @param {number} areaHa - Tamanho do talhão em hectares
 * @param {number} pms - Peso de Mil Sementes (em gramas)
 */
export const calcTotalSeedKg = (seedsPerHa, areaHa, pms) => {
  if (!seedsPerHa || !areaHa || !pms) return 0;
  // (Sementes/ha * PMS) / 1.000.000 converte para kg/ha
  const kgPerHa = (seedsPerHa * pms) / 1000000;
  return kgPerHa * areaHa;
};