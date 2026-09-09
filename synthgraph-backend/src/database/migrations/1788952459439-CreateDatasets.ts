import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDatasets1788952459439 implements MigrationInterface {
    name = 'CreateDatasets1788952459439'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "generations" DROP CONSTRAINT "FK_generations_experiment_id"`);
        await queryRunner.query(`ALTER TABLE "generations" DROP CONSTRAINT "CHK_generations_generator_object"`);
        await queryRunner.query(`ALTER TABLE "generations" DROP CONSTRAINT "CHK_generations_parameters_object"`);
        await queryRunner.query(`ALTER TABLE "generations" DROP CONSTRAINT "CHK_generations_reproducibility_object"`);
        await queryRunner.query(`ALTER TABLE "generations" DROP CONSTRAINT "CHK_generations_inputs_array"`);
        await queryRunner.query(`ALTER TABLE "generations" DROP CONSTRAINT "CHK_generations_outputs_array"`);
        await queryRunner.query(`ALTER TABLE "generations" DROP CONSTRAINT "CHK_generations_metadata_object"`);
        await queryRunner.query(`ALTER TABLE "generations" DROP CONSTRAINT "CHK_generations_lifecycle_timestamps"`);
        await queryRunner.query(`CREATE TABLE "datasets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "name" character varying NOT NULL, "description" text, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bf831e43c559a240303e23d038" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_datasets_user_id" ON "datasets"  ("user_id") `);
        await queryRunner.query(`CREATE TABLE "dataset_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "dataset_id" uuid NOT NULL, "version" character varying NOT NULL, "uri" text NOT NULL, "format" character varying, "size" bigint, "checksum" character varying, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2335c164f3df47dabfe7d0fc6e5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_dataset_versions_dataset_id" ON "dataset_versions"  ("dataset_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_dataset_versions_dataset_version" ON "dataset_versions"  ("dataset_id", "version") `);
        await queryRunner.query(`CREATE TABLE "generation_dataset_refs" ("generation_id" uuid NOT NULL, "dataset_version_id" uuid NOT NULL, "role" character varying NOT NULL, CONSTRAINT "PK_9c6ac6d317784f6544327096936" PRIMARY KEY ("generation_id", "dataset_version_id", "role"))`);
        await queryRunner.query(`CREATE INDEX "IDX_generation_dataset_refs_generation_id" ON "generation_dataset_refs"  ("generation_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_generation_dataset_refs_dataset_version_id" ON "generation_dataset_refs"  ("dataset_version_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_generation_dataset_reference" ON "generation_dataset_refs"  ("generation_id", "dataset_version_id", "role") `);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "inputs" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "outputs" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TYPE "public"."generations_status_enum" RENAME TO "generations_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."generations_status_enum" AS ENUM('pending', 'running', 'completed', 'failed')`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "status" TYPE "public"."generations_status_enum" USING "status"::"text"::"public"."generations_status_enum"`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."generations_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "generations" ADD CONSTRAINT "FK_3df6e6e0a7b01691fef07e2741d" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dataset_versions" ADD CONSTRAINT "FK_59250594d45b0202fdc42d55ecc" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "generation_dataset_refs" ADD CONSTRAINT "FK_2dddb92632dc1fe68de6bade2cd" FOREIGN KEY ("generation_id") REFERENCES "generations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "generation_dataset_refs" ADD CONSTRAINT "FK_69b4b295b6e4201fa83089a2945" FOREIGN KEY ("dataset_version_id") REFERENCES "dataset_versions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "generation_dataset_refs" DROP CONSTRAINT "FK_69b4b295b6e4201fa83089a2945"`);
        await queryRunner.query(`ALTER TABLE "generation_dataset_refs" DROP CONSTRAINT "FK_2dddb92632dc1fe68de6bade2cd"`);
        await queryRunner.query(`ALTER TABLE "dataset_versions" DROP CONSTRAINT "FK_59250594d45b0202fdc42d55ecc"`);
        await queryRunner.query(`ALTER TABLE "generations" DROP CONSTRAINT "FK_3df6e6e0a7b01691fef07e2741d"`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`CREATE TYPE "public"."generations_status_enum_old" AS ENUM('pending', 'running', 'completed', 'failed')`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "status" TYPE "public"."generations_status_enum_old" USING "status"::"text"::"public"."generations_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."generations_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."generations_status_enum_old" RENAME TO "generations_status_enum"`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "outputs" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "generations" ALTER COLUMN "inputs" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."UQ_generation_dataset_reference"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_generation_dataset_refs_dataset_version_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_generation_dataset_refs_generation_id"`);
        await queryRunner.query(`DROP TABLE "generation_dataset_refs"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_dataset_versions_dataset_version"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dataset_versions_dataset_id"`);
        await queryRunner.query(`DROP TABLE "dataset_versions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_datasets_user_id"`);
        await queryRunner.query(`DROP TABLE "datasets"`);
        await queryRunner.query(`ALTER TABLE "generations" ADD CONSTRAINT "CHK_generations_lifecycle_timestamps" CHECK ((((status = 'pending'::generations_status_enum) AND (started_at IS NULL) AND (completed_at IS NULL)) OR ((status = 'running'::generations_status_enum) AND (started_at IS NOT NULL) AND (completed_at IS NULL)) OR ((status = ANY (ARRAY['completed'::generations_status_enum, 'failed'::generations_status_enum])) AND (started_at IS NOT NULL) AND (completed_at IS NOT NULL) AND (completed_at >= started_at))))`);
        await queryRunner.query(`ALTER TABLE "generations" ADD CONSTRAINT "CHK_generations_metadata_object" CHECK ((jsonb_typeof(metadata) = 'object'::text))`);
        await queryRunner.query(`ALTER TABLE "generations" ADD CONSTRAINT "CHK_generations_outputs_array" CHECK ((jsonb_typeof(outputs) = 'array'::text))`);
        await queryRunner.query(`ALTER TABLE "generations" ADD CONSTRAINT "CHK_generations_inputs_array" CHECK ((jsonb_typeof(inputs) = 'array'::text))`);
        await queryRunner.query(`ALTER TABLE "generations" ADD CONSTRAINT "CHK_generations_reproducibility_object" CHECK ((jsonb_typeof(reproducibility) = 'object'::text))`);
        await queryRunner.query(`ALTER TABLE "generations" ADD CONSTRAINT "CHK_generations_parameters_object" CHECK ((jsonb_typeof(parameters) = 'object'::text))`);
        await queryRunner.query(`ALTER TABLE "generations" ADD CONSTRAINT "CHK_generations_generator_object" CHECK ((jsonb_typeof(generator) = 'object'::text))`);
        await queryRunner.query(`ALTER TABLE "generations" ADD CONSTRAINT "FK_generations_experiment_id" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

}
