create extension if not exists pg_cron;
-- Named job is idempotent; retention uses submission date and never extends on rating updates.
do $$begin if not exists(select 1 from cron.job where jobname='peacecream-five-year-retention') then perform cron.schedule('peacecream-five-year-retention','17 3 * * *','select public.pc_retention()');end if;end$$;
