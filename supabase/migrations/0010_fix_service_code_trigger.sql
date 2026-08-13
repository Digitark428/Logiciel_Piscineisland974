-- 0010 — Correctif : le trigger de génération du code de prestation doit tourner
-- en SECURITY DEFINER. Il appelle public.next_service_code(), dont l'EXECUTE a été
-- retiré à anon/authenticated en 0009. Sans ce correctif, toute insertion de prestation
-- par un utilisateur connecté échoue (« permission denied for function next_service_code »).
-- En SECURITY DEFINER, le trigger s'exécute avec les droits du propriétaire (qui possède
-- l'EXECUTE et l'USAGE sur la séquence), sans exposer la fonction via l'API REST.

alter function public.services_set_code() security definer;
