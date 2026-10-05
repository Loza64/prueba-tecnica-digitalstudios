BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[CentrosCosto] (
    [CentroCostoId] INT NOT NULL IDENTITY(1,1),
    [Nombre] NVARCHAR(100) NOT NULL,
    CONSTRAINT [CentrosCosto_pkey] PRIMARY KEY CLUSTERED ([CentroCostoId])
);

-- CreateTable
CREATE TABLE [dbo].[Empleados] (
    [EmpleadoId] INT NOT NULL IDENTITY(1,1),
    [Nombre] NVARCHAR(150) NOT NULL,
    [CentroCostoId] INT NOT NULL,
    [Activo] BIT NOT NULL CONSTRAINT [Empleados_Activo_df] DEFAULT 1,
    CONSTRAINT [Empleados_pkey] PRIMARY KEY CLUSTERED ([EmpleadoId])
);

-- CreateTable
CREATE TABLE [dbo].[Planillas] (
    [PlanillaId] INT NOT NULL IDENTITY(1,1),
    [Periodo] VARCHAR(7) NOT NULL,
    [Estado] VARCHAR(20) NOT NULL CONSTRAINT [Planillas_Estado_df] DEFAULT 'Borrador',
    [SapReferencia] VARCHAR(100),
    [EnviadaSapAt] DATETIME2,
    CONSTRAINT [Planillas_pkey] PRIMARY KEY CLUSTERED ([PlanillaId])
);

-- CreateTable
CREATE TABLE [dbo].[PlanillaDetalle] (
    [DetalleId] INT NOT NULL IDENTITY(1,1),
    [PlanillaId] INT NOT NULL,
    [EmpleadoId] INT NOT NULL,
    [Concepto] NVARCHAR(100) NOT NULL,
    [Monto] DECIMAL(18,2) NOT NULL,
    [Tipo] CHAR(1) NOT NULL,
    CONSTRAINT [PlanillaDetalle_pkey] PRIMARY KEY CLUSTERED ([DetalleId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Empleados_CentroCostoId_idx] ON [dbo].[Empleados]([CentroCostoId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Planillas_Periodo_Estado_idx] ON [dbo].[Planillas]([Periodo], [Estado]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PlanillaDetalle_PlanillaId_idx] ON [dbo].[PlanillaDetalle]([PlanillaId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PlanillaDetalle_EmpleadoId_idx] ON [dbo].[PlanillaDetalle]([EmpleadoId]);

-- AddForeignKey
ALTER TABLE [dbo].[Empleados] ADD CONSTRAINT [Empleados_CentroCostoId_fkey] FOREIGN KEY ([CentroCostoId]) REFERENCES [dbo].[CentrosCosto]([CentroCostoId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PlanillaDetalle] ADD CONSTRAINT [PlanillaDetalle_PlanillaId_fkey] FOREIGN KEY ([PlanillaId]) REFERENCES [dbo].[Planillas]([PlanillaId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PlanillaDetalle] ADD CONSTRAINT [PlanillaDetalle_EmpleadoId_fkey] FOREIGN KEY ([EmpleadoId]) REFERENCES [dbo].[Empleados]([EmpleadoId]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
