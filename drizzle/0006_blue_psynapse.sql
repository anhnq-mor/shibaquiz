CREATE TABLE "import_job_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"level" text NOT NULL,
	"event" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_job_logs_level_check" CHECK ("import_job_logs"."level" in ('INFO', 'ERROR'))
);
--> statement-breakpoint
CREATE TABLE "import_job_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"external_id" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_jobs" ADD COLUMN "exam_id" uuid;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD COLUMN "total_rows" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD COLUMN "processed_rows" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD COLUMN "created_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD COLUMN "updated_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "import_job_logs" ADD CONSTRAINT "import_job_logs_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_rows" ADD CONSTRAINT "import_job_rows_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_job_logs_job_created_idx" ON "import_job_logs" USING btree ("job_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "import_job_rows_job_row_unique" ON "import_job_rows" USING btree ("job_id","row_number");--> statement-breakpoint
CREATE INDEX "import_job_rows_job_idx" ON "import_job_rows" USING btree ("job_id");--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE restrict ON UPDATE no action;