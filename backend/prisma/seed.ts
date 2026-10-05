import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.planillaDetalle.deleteMany();
  await prisma.planilla.deleteMany();
  await prisma.empleado.deleteMany();
  await prisma.centroCosto.deleteMany();

  const [ventas, ti, rrhh] = await Promise.all(
    ['Ventas', 'Tecnología', 'Recursos Humanos'].map((nombre) => prisma.centroCosto.create({ data: { nombre } })),
  );

  const ana = await prisma.empleado.create({ data: { nombre: 'Ana Martínez', centroCostoId: ventas.id } });
  const luis = await prisma.empleado.create({ data: { nombre: 'Luis Hernández', centroCostoId: ti.id } });
  const sofia = await prisma.empleado.create({ data: { nombre: 'Sofía Ramírez', centroCostoId: ti.id } });
  const carlos = await prisma.empleado.create({ data: { nombre: 'Carlos Pérez', centroCostoId: rrhh.id } });

  const mov = (planillaId: number, empleadoId: number, concepto: string, monto: number, tipo: 'D' | 'C') => ({
    planillaId, empleadoId, concepto, monto, tipo,
  });

  const aprobada = await prisma.planilla.create({ data: { periodo: '2026-09', estado: 'Aprobada' } });
  await prisma.planillaDetalle.createMany({
    data: [
      mov(aprobada.id, ana.id, 'Salario', 1200, 'D'),
      mov(aprobada.id, luis.id, 'Salario', 1800, 'D'),
      mov(aprobada.id, sofia.id, 'Salario', 1500, 'D'),
      mov(aprobada.id, carlos.id, 'Salario', 900, 'D'),
      mov(aprobada.id, ana.id, 'ISSS', 36, 'C'),
      mov(aprobada.id, luis.id, 'ISSS', 54, 'C'),
      mov(aprobada.id, sofia.id, 'ISSS', 45, 'C'),
      mov(aprobada.id, carlos.id, 'ISSS', 27, 'C'),
      mov(aprobada.id, ana.id, 'Pago neto', 1164, 'C'),
      mov(aprobada.id, luis.id, 'Pago neto', 1746, 'C'),
      mov(aprobada.id, sofia.id, 'Pago neto', 1455, 'C'),
      mov(aprobada.id, carlos.id, 'Pago neto', 873, 'C'),
    ],
  });

  const borrador = await prisma.planilla.create({ data: { periodo: '2026-10', estado: 'Borrador' } });
  await prisma.planillaDetalle.createMany({
    data: [mov(borrador.id, ana.id, 'Salario', 1200, 'D'), mov(borrador.id, ana.id, 'Pago neto', 1200, 'C')],
  });

  const descuadrada = await prisma.planilla.create({ data: { periodo: '2026-09', estado: 'Aprobada' } });
  await prisma.planillaDetalle.createMany({
    data: [
      mov(descuadrada.id, luis.id, 'Salario', 1800, 'D'),
      mov(descuadrada.id, luis.id, 'Salario', 1800, 'D'),
      mov(descuadrada.id, luis.id, 'Pago neto', 1800, 'C'),
    ],
  });

  const enviada = await prisma.planilla.create({
    data: { periodo: '2026-08', estado: 'EnviadaSAP', sapReferencia: 'SAP-2026-08-000001', enviadaSapAt: new Date() },
  });
  await prisma.planillaDetalle.createMany({
    data: [mov(enviada.id, sofia.id, 'Salario', 1500, 'D'), mov(enviada.id, sofia.id, 'Pago neto', 1500, 'C')],
  });

  console.log('Seed listo. Planillas creadas:');
  console.log(`  ${aprobada.id}  Aprobada y cuadrada   -> POST /api/planillas/${aprobada.id}/enviar-sap = 200`);
  console.log(`  ${borrador.id}  Borrador              -> 409`);
  console.log(`  ${descuadrada.id}  Aprobada descuadrada  -> 422`);
  console.log(`  ${enviada.id}  Ya EnviadaSAP         -> 409`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
