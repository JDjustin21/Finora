import api from './api';

const PROJECTIONS_ENDPOINT = '/finanzas/proyecciones';

export function getProjections() {
  return api.get(`${PROJECTIONS_ENDPOINT}/`);
}

export function createProjection(payload) {
  return api.post(`${PROJECTIONS_ENDPOINT}/`, payload);
}

export function updateProjection(idProjection, payload) {
  return api.put(`${PROJECTIONS_ENDPOINT}/${idProjection}`, payload);
}

export function confirmProjection(idProjection) {
  return api.post(`${PROJECTIONS_ENDPOINT}/${idProjection}/confirmar`);
}

export function rejectProjection(idProjection) {
  return api.post(`${PROJECTIONS_ENDPOINT}/${idProjection}/rechazar`);
}

export function rescheduleProjection(idProjection, fechaProgramada) {
  return api.patch(`${PROJECTIONS_ENDPOINT}/${idProjection}/reprogramar`, {
    fecha_programada: fechaProgramada,
  });
}

export function getPendingProjectionsToday() {
  return api.get(`${PROJECTIONS_ENDPOINT}/pendientes-hoy`);
}