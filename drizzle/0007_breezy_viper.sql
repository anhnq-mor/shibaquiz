ALTER TYPE "public"."import_status" ADD VALUE 'CANCELLING' BEFORE 'COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."import_status" ADD VALUE 'CANCELLED' BEFORE 'COMPLETED';