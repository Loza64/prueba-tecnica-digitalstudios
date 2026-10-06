/* =====================================================================
   PRUEBA TÉCNICA FULL STACK - PARTE 1: SQL SERVER
   Esquema: CentrosCosto, Empleados, Planillas, PlanillaDetalle
   Tipo: 'D' = Débito, 'C' = Crédito
   Estados: 'Borrador' | 'Aprobada' | 'EnviadaSAP'
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. Total de débitos y créditos por centro de costo
      Periodo 2026-09, solo planillas 'Aprobada'.
   --------------------------------------------------------------------- */
SELECT
    cc.CentroCostoId,
    cc.Nombre AS CentroCosto,
    ISNULL(SUM(CASE WHEN p.PlanillaId IS NOT NULL AND d.Tipo = 'D' THEN d.Monto END), 0) AS TotalDebitos,
    ISNULL(SUM(CASE WHEN p.PlanillaId IS NOT NULL AND d.Tipo = 'C' THEN d.Monto END), 0) AS TotalCreditos
FROM dbo.CentrosCosto cc
LEFT JOIN dbo.Empleados e
       ON e.CentroCostoId = cc.CentroCostoId
LEFT JOIN dbo.PlanillaDetalle d
       ON d.EmpleadoId = e.EmpleadoId
LEFT JOIN dbo.Planillas p
       ON p.PlanillaId = d.PlanillaId
      AND p.Periodo    = '2026-09'
      AND p.Estado     = 'Aprobada'
GROUP BY cc.CentroCostoId, cc.Nombre
ORDER BY cc.Nombre;
GO


/* ---------------------------------------------------------------------
   2. Planillas descuadradas (débitos <> créditos)
   --------------------------------------------------------------------- */
SELECT
    p.PlanillaId,
    p.Periodo,
    p.Estado,
    SUM(CASE WHEN d.Tipo = 'D' THEN d.Monto ELSE 0 END)              AS TotalDebitos,
    SUM(CASE WHEN d.Tipo = 'C' THEN d.Monto ELSE 0 END)              AS TotalCreditos,
    SUM(CASE WHEN d.Tipo = 'D' THEN d.Monto ELSE 0 END)
  - SUM(CASE WHEN d.Tipo = 'C' THEN d.Monto ELSE 0 END)              AS Diferencia
FROM dbo.Planillas p
INNER JOIN dbo.PlanillaDetalle d
        ON d.PlanillaId = p.PlanillaId
GROUP BY p.PlanillaId, p.Periodo, p.Estado
HAVING SUM(CASE WHEN d.Tipo = 'D' THEN d.Monto ELSE 0 END)
    <> SUM(CASE WHEN d.Tipo = 'C' THEN d.Monto ELSE 0 END)
ORDER BY p.PlanillaId;
GO


/* ---------------------------------------------------------------------
   3. Empleados con el mismo concepto duplicado en una misma planilla
   --------------------------------------------------------------------- */
SELECT
    d.PlanillaId,
    d.EmpleadoId,
    e.Nombre                    AS Empleado,
    d.Concepto,
    COUNT(*)                    AS Repeticiones,
    SUM(d.Monto)                AS MontoAcumulado
FROM dbo.PlanillaDetalle d
INNER JOIN dbo.Empleados e
        ON e.EmpleadoId = d.EmpleadoId
GROUP BY d.PlanillaId, d.EmpleadoId, e.Nombre, d.Concepto
HAVING COUNT(*) > 1
ORDER BY d.PlanillaId, e.Nombre, d.Concepto;
GO


/* ---------------------------------------------------------------------
   4. Stored Procedure: aprobar una planilla

   Reglas:
     - La planilla debe existir.
     - Estado actual debe ser 'Borrador'.
     - Debe tener movimientos.
     - Débitos = Créditos.
   Si todo se cumple: Estado -> 'Aprobada'.

   Errores (THROW, 50001+) mapear los errores en backend:
     50001 -> planilla no existe              (404)
     50002 -> estado distinto de 'Borrador'   (409)
     50003 -> planilla sin movimientos        (422)
     50004 -> débitos <> créditos             (422)
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.usp_AprobarPlanilla
    @PlanillaId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON; 

    DECLARE @Estado         VARCHAR(20);
    DECLARE @Movimientos    INT;
    DECLARE @TotalDebitos   DECIMAL(18,2);
    DECLARE @TotalCreditos  DECIMAL(18,2);
    DECLARE @Msg            NVARCHAR(2048);

    BEGIN TRY
        BEGIN TRANSACTION;

        SELECT @Estado = p.Estado
        FROM dbo.Planillas p WITH (UPDLOCK, HOLDLOCK)
        WHERE p.PlanillaId = @PlanillaId;

        IF @Estado IS NULL
        BEGIN
            SET @Msg = CONCAT(N'La planilla ', @PlanillaId, N' no existe.');
            THROW 50001, @Msg, 1;
        END;

        IF @Estado <> 'Borrador'
        BEGIN
            SET @Msg = CONCAT(N'La planilla ', @PlanillaId,
                              N' no se puede aprobar: su estado es "', @Estado,
                              N'" y debe ser "Borrador".');
            THROW 50002, @Msg, 1;
        END;

        SELECT
            @Movimientos   = COUNT(*),
            @TotalDebitos  = ISNULL(SUM(CASE WHEN d.Tipo = 'D' THEN d.Monto END), 0),
            @TotalCreditos = ISNULL(SUM(CASE WHEN d.Tipo = 'C' THEN d.Monto END), 0)
        FROM dbo.PlanillaDetalle d
        WHERE d.PlanillaId = @PlanillaId;

        IF @Movimientos = 0
        BEGIN
            SET @Msg = CONCAT(N'La planilla ', @PlanillaId, N' no tiene movimientos.');
            THROW 50003, @Msg, 1;
        END;

        IF @TotalDebitos <> @TotalCreditos
        BEGIN
            SET @Msg = CONCAT(N'La planilla ', @PlanillaId,
                              N' está descuadrada: débitos = ', @TotalDebitos,
                              N', créditos = ', @TotalCreditos, N'.');
            THROW 50004, @Msg, 1;
        END;

        UPDATE dbo.Planillas
           SET Estado = 'Aprobada'
         WHERE PlanillaId = @PlanillaId
           AND Estado     = 'Borrador';

        COMMIT TRANSACTION;

        SELECT
            @PlanillaId    AS PlanillaId,
            'Aprobada'     AS Estado,
            @TotalDebitos  AS TotalDebitos,
            @TotalCreditos AS TotalCreditos;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW; 
    END CATCH
END;

EXEC dbo.usp_AprobarPlanilla @PlanillaId = 2 --Planilla que esta en borrador en el seed de prisma