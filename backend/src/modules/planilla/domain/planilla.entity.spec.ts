import { Planilla, Movimiento } from './planilla.entity';
import { PlanillaEstado } from './planilla-estado';

const mov = (id: number, monto: number, tipo: 'D' | 'C'): Movimiento => ({
  id, empleadoId: 1, empleadoNombre: 'Ana', centroCostoId: 1, centroCostoNombre: 'Ventas', concepto: 'X', monto, tipo,
});

describe('Planilla', () => {
  it('suma en centavos: 0.1 + 0.2 débitos cuadran con 0.3 de crédito', () => {
    const p = new Planilla(1, '2026-09', PlanillaEstado.Aprobada, [mov(1, 0.1, 'D'), mov(2, 0.2, 'D'), mov(3, 0.3, 'C')]);
    expect(p.totalDebitos).toBe(0.3);
    expect(p.estaCuadrada()).toBe(true);
  });

  it('detecta planilla descuadrada', () => {
    const p = new Planilla(1, '2026-09', PlanillaEstado.Aprobada, [mov(1, 100, 'D'), mov(2, 99.99, 'C')]);
    expect(p.estaCuadrada()).toBe(false);
  });

  it('expone el estado', () => {
    expect(new Planilla(1, '2026-09', PlanillaEstado.Aprobada, []).estaAprobada()).toBe(true);
    expect(new Planilla(1, '2026-09', PlanillaEstado.EnviadaSAP, []).yaFueEnviada()).toBe(true);
    expect(new Planilla(1, '2026-09', PlanillaEstado.Borrador, []).tieneMovimientos()).toBe(false);
  });
});
