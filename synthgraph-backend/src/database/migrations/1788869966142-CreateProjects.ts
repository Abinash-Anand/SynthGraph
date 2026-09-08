import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProjects1788869966142 implements MigrationInterface {
    name = 'CreateProjects1788869966142'

public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
        `CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "name" character varying NOT NULL, "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
        `ALTER TABLE "projects" ADD CONSTRAINT "FK_bd55b203eb9f92b0c8390380010" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
        `CREATE INDEX "IDX_projects_user_id" ON "projects" ("user_id")`,
    );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
        `DROP INDEX "public"."IDX_projects_user_id"`,
    );

    await queryRunner.query(
        `ALTER TABLE "projects" DROP CONSTRAINT "FK_bd55b203eb9f92b0c8390380010"`,
    );

    await queryRunner.query(`DROP TABLE "projects"`);
    }
}
