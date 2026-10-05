import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      version: 'v1.0.0',
      title: 'Planilla API',
      description: 'API de planillas: detalle y envío a SAP (simulado).',
    },
    servers: [{ url: '/' }],
    paths: {
      '/api/health/hello': {
        get: {
          summary: 'Chequeo simple de que el server está vivo',
          tags: ['Health'],
          responses: {
            '200': { description: 'El server responde' },
          },
        },
      },
      '/api/health/circuit-breakers': {
        get: {
          summary: 'Estado actual de los circuit breakers registrados',
          tags: ['Health'],
          responses: {
            '200': { description: 'Lista de circuit breakers con su estado y estadísticas' },
          },
        },
      },
      '/api/planillas/{id}': {
        get: {
          summary: 'Detalle de una planilla con sus movimientos y totales',
          tags: ['Planillas'],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            '200': { description: 'Detalle de la planilla' },
            '400': { description: 'Id inválido' },
            '404': { description: 'La planilla no existe' },
          },
        },
      },
      '/api/planillas/{id}/enviar-sap': {
        post: {
          summary: 'Envía una planilla «Aprobada» a SAP (simulado)',
          description: 'Valida estado y cuadre contable, reserva la planilla de forma atómica (protección contra doble envío) y registra la referencia de SAP en una sola transacción. Si SAP falla, hace rollback y la planilla sigue «Aprobada».',
          tags: ['Planillas'],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'integer' },
            },
          ],
          responses: {
            '200': { description: 'Enviada correctamente' },
            '400': { description: 'Id inválido' },
            '404': { description: 'La planilla no existe' },
            '409': { description: 'No está «Aprobada», o ya fue/está siendo enviada' },
            '422': { description: 'Planilla sin movimientos o descuadrada' },
            '502': { description: 'SAP rechazó o falló el envío' },
            '503': { description: 'Circuit breaker abierto, SAP no disponible' },
            '504': { description: 'SAP no respondió a tiempo' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
