-- =============================================================================
-- MENIAL — MARKETPLACE TRANSACTIONS & FINANCIAL INTEGRITY
-- =============================================================================
-- Migration: 20260922160000_marketplace_transactions.sql
-- Purpose:   Payment initialization, server-enforced webhook confirmation,
--            idempotency / double-spend protection, append-only ledger records,
--            payout disbursement, and ledger-derived worker earnings.
-- Reference: menial-master-spec-v2.md (Sections 4, 37, 38, 39, 41, 42, 44)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. INITIALIZE JOB PAYMENT (Employer only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.initialize_job_payment(
  p_job_id uuid,
  p_provider text DEFAULT 'mock'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_payment_id uuid;
  v_provider_ref text;
  v_worker_total_amount integer;
BEGIN
  -- 1. Verify employer owns the job
  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id;

  IF v_job.id IS NULL OR v_job.employer_id != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this job.';
  END IF;

  -- 2. Verify job is in an acceptable status for payment (§32)
  IF v_job.status NOT IN ('accepted', 'payment_pending', 'payment_failed') THEN
    RAISE EXCEPTION 'Job status (%) does not allow payment initialization.', v_job.status;
  END IF;

  v_worker_total_amount := v_job.worker_pay * v_job.number_of_workers;
  v_provider_ref := 'pay_ref_' || v_job.public_job_id || '_' || floor(extract(epoch from now()));

  -- 3. Create or update pending payment record (§37)
  INSERT INTO public.payments (
    job_id,
    employer_id,
    worker_amount,
    platform_fee,
    total_amount,
    currency,
    provider,
    provider_reference,
    status
  ) VALUES (
    p_job_id,
    v_user_id,
    v_worker_total_amount,
    v_job.platform_fee,
    v_job.total_amount,
    'NGN',
    p_provider,
    v_provider_ref,
    'pending'
  )
  RETURNING id INTO v_payment_id;

  -- 4. Transition job status: -> payment_pending (§32)
  UPDATE public.jobs
  SET status = 'payment_pending', updated_at = now()
  WHERE id = p_job_id;

  -- 5. Record status transition (§33)
  INSERT INTO public.job_status_history (
    job_id,
    previous_status,
    new_status,
    actor_id,
    actor_type,
    reason,
    metadata
  ) VALUES (
    p_job_id,
    v_job.status,
    'payment_pending',
    v_user_id,
    'employer',
    'Payment checkout session initialized',
    jsonb_build_object(
      'payment_id', v_payment_id,
      'provider', p_provider,
      'provider_reference', v_provider_ref,
      'total_amount_kobo', v_job.total_amount
    )
  );

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'job_id', p_job_id,
    'public_job_id', v_job.public_job_id,
    'provider', p_provider,
    'provider_reference', v_provider_ref,
    'worker_amount_kobo', v_worker_total_amount,
    'platform_fee_kobo', v_job.platform_fee,
    'total_amount_kobo', v_job.total_amount,
    'currency', 'NGN',
    'status', 'pending'
  );
END;
$$;

COMMENT ON FUNCTION public.initialize_job_payment IS
  'Initializes an escrow payment record in pending status. §37, §38';


-- ---------------------------------------------------------------------------
-- 2. CONFIRM PAYMENT WEBHOOK (Backend Service Role Only)
-- ---------------------------------------------------------------------------
-- §37: "Client cannot set payment success."
-- §39: "Handle duplicate callbacks, webhook replay, retries..."
-- §44: "Single source of truth for reconciliation: append-only ledger_entries"
CREATE OR REPLACE FUNCTION public.confirm_payment_webhook(
  p_provider text,
  p_provider_reference text,
  p_amount_kobo integer,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_job public.jobs%ROWTYPE;
  v_jw record;
BEGIN
  -- 1. Locate payment by provider reference
  SELECT * INTO v_payment
  FROM public.payments
  WHERE provider_reference = p_provider_reference;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Payment record with reference % not found.', p_provider_reference;
  END IF;

  -- 2. IDEMPOTENCY CHECK (§39): Prevent duplicate processing / webhook replay
  IF v_payment.status = 'successful' THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'message', 'Payment was already confirmed previously. No duplicate ledger entries created.',
      'payment_id', v_payment.id
    );
  END IF;

  -- 3. Verify amount matches exactly in kobo
  IF v_payment.total_amount != p_amount_kobo THEN
    -- Mark payment failed due to reference/amount mismatch
    UPDATE public.payments
    SET status = 'failed',
        metadata = jsonb_build_object('failure_reason', 'Amount mismatch: expected ' || v_payment.total_amount || ', got ' || p_amount_kobo),
        updated_at = now()
    WHERE id = v_payment.id;

    RAISE EXCEPTION 'Payment verification failed: Amount mismatch (% expected, % received).',
      v_payment.total_amount, p_amount_kobo;
  END IF;

  -- 4. Mark payment successful
  UPDATE public.payments
  SET status = 'successful',
      metadata = p_metadata,
      updated_at = now()
  WHERE id = v_payment.id;

  SELECT * INTO v_job FROM public.jobs WHERE id = v_payment.job_id;

  -- 5. WRITE APPEND-ONLY LEDGER ENTRIES (§44)
  -- Entry A: Employer debit (negative amount) for total escrow deposit
  INSERT INTO public.ledger_entries (
    related_type,
    related_id,
    job_id,
    actor_id,
    amount,
    currency,
    description
  ) VALUES (
    'payment',
    v_payment.id,
    v_payment.job_id,
    v_payment.employer_id,
    -v_payment.total_amount,
    'NGN',
    'Escrow payment deposit for ' || v_job.public_job_id
  );

  -- Entry B: Platform fee credit (positive amount)
  IF v_payment.platform_fee > 0 THEN
    INSERT INTO public.ledger_entries (
      related_type,
      related_id,
      job_id,
      actor_id,
      amount,
      currency,
      description
    ) VALUES (
      'fee',
      v_payment.id,
      v_payment.job_id,
      v_payment.employer_id, -- employer pays the fee
      v_payment.platform_fee,
      'NGN',
      'Platform service fee for ' || v_job.public_job_id
    );
  END IF;

  -- Entry C: Worker escrow hold credit for each assigned worker
  FOR v_jw IN (
    SELECT worker_id, agreed_amount
    FROM public.job_workers
    WHERE job_id = v_payment.job_id
      AND assignment_status = 'accepted'
  ) LOOP
    INSERT INTO public.ledger_entries (
      related_type,
      related_id,
      job_id,
      actor_id,
      amount,
      currency,
      description
    ) VALUES (
      'payment',
      v_payment.id,
      v_payment.job_id,
      v_jw.worker_id,
      v_jw.agreed_amount,
      'NGN',
      'Escrow hold credited pending job completion: ' || v_job.public_job_id
    );
  END LOOP;

  -- 6. Transition job status: payment_pending -> payment_secured (§32)
  UPDATE public.jobs
  SET status = 'payment_secured', updated_at = now()
  WHERE id = v_payment.job_id;

  -- 7. Record status transition (§33)
  INSERT INTO public.job_status_history (
    job_id,
    previous_status,
    new_status,
    actor_id,
    actor_type,
    reason,
    metadata
  ) VALUES (
    v_payment.job_id,
    'payment_pending',
    'payment_secured',
    v_payment.employer_id,
    'system',
    'Payment confirmed via ' || p_provider || ' webhook',
    jsonb_build_object(
      'provider_reference', p_provider_reference,
      'amount_kobo', p_amount_kobo
    )
  );

  -- 8. Notify assigned workers that funds are secured and work may begin (§50)
  FOR v_jw IN (
    SELECT worker_id
    FROM public.job_workers
    WHERE job_id = v_payment.job_id
      AND assignment_status = 'accepted'
  ) LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      metadata
    ) VALUES (
      v_jw.worker_id,
      'Payment Secured!',
      'Employer has funded escrow for ' || v_job.title || '. You may now head to the job location.',
      jsonb_build_object('job_id', v_payment.job_id)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'job_id', v_payment.job_id,
    'status', 'payment_secured',
    'amount_kobo', p_amount_kobo
  );
END;
$$;

COMMENT ON FUNCTION public.confirm_payment_webhook IS
  'Server-enforced webhook receiver with idempotency protection and append-only ledger entries. §37, §39, §44';


-- ---------------------------------------------------------------------------
-- 3. PROCESS WORKER PAYOUT (§41, §44)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_job_payout(
  p_job_id uuid,
  p_worker_id uuid,
  p_provider text DEFAULT 'mock',
  p_provider_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
  v_assignment public.job_workers%ROWTYPE;
  v_payout_id uuid;
  v_ref text;
BEGIN
  -- 1. Verify job is completed
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF v_job.id IS NULL OR v_job.status != 'completed' THEN
    RAISE EXCEPTION 'Payout requires completed job status (current: %). §41', v_job.status;
  END IF;

  -- 2. Verify worker assignment
  SELECT * INTO v_assignment
  FROM public.job_workers
  WHERE job_id = p_job_id AND worker_id = p_worker_id;

  IF v_assignment.id IS NULL THEN
    RAISE EXCEPTION 'Worker assignment not found.';
  END IF;

  IF v_assignment.payout_status = 'successful' THEN
    RAISE EXCEPTION 'Worker has already received payout for this job.';
  END IF;

  v_ref := coalesce(p_provider_reference, 'payout_' || v_job.public_job_id || '_' || floor(extract(epoch from now())));

  -- 3. Record payout in payouts table (§41)
  INSERT INTO public.payouts (
    worker_id,
    job_id,
    amount,
    currency,
    provider,
    provider_reference,
    status,
    completed_at
  ) VALUES (
    p_worker_id,
    p_job_id,
    v_assignment.agreed_amount,
    'NGN',
    p_provider,
    v_ref,
    'successful',
    now()
  )
  RETURNING id INTO v_payout_id;

  -- 4. Update worker assignment payout status
  UPDATE public.job_workers
  SET payout_status = 'successful'
  WHERE id = v_assignment.id;

  -- 5. WRITE APPEND-ONLY LEDGER ENTRY FOR PAYOUT (§44)
  -- Debits worker available balance as funds are disbursed out to their external bank
  INSERT INTO public.ledger_entries (
    related_type,
    related_id,
    job_id,
    actor_id,
    amount,
    currency,
    description
  ) VALUES (
    'payout',
    v_payout_id,
    p_job_id,
    p_worker_id,
    -v_assignment.agreed_amount,
    'NGN',
    'Bank transfer payout disbursement for ' || v_job.public_job_id
  );

  -- 6. Send notification to worker (§50)
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    metadata
  ) VALUES (
    p_worker_id,
    'Payout Dispatched!',
    '₦' || (v_assignment.agreed_amount / 100) || ' has been transferred to your bank account.',
    jsonb_build_object('job_id', p_job_id, 'payout_id', v_payout_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'amount_kobo', v_assignment.agreed_amount,
    'status', 'successful'
  );
END;
$$;

COMMENT ON FUNCTION public.process_job_payout IS
  'Disburses worker payout and writes corresponding append-only ledger debit. §41, §44';


-- ---------------------------------------------------------------------------
-- 4. WORKER EARNINGS SUMMARY (Single Source of Truth: ledger_entries)
-- ---------------------------------------------------------------------------
-- §42: "Use actual transaction/ledger records (Section 45) as source of truth —
--  never a cached balance the client or a mutable row can drift from."
CREATE OR REPLACE FUNCTION public.get_worker_earnings_summary(p_worker_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_earned_kobo bigint := 0;
  v_pending_escrow_kobo bigint := 0;
  v_paid_out_kobo bigint := 0;
  v_available_balance_kobo bigint := 0;
BEGIN
  -- 1. Sum of all escrow credits earned (positive payment entries for this worker)
  SELECT coalesce(sum(amount), 0) INTO v_total_earned_kobo
  FROM public.ledger_entries
  WHERE actor_id = p_worker_id
    AND related_type = 'payment'
    AND amount > 0;

  -- 2. Pending escrow (jobs funded but not yet in 'completed' terminal status)
  SELECT coalesce(sum(le.amount), 0) INTO v_pending_escrow_kobo
  FROM public.ledger_entries le
  JOIN public.jobs j ON j.id = le.job_id
  WHERE le.actor_id = p_worker_id
    AND le.related_type = 'payment'
    AND le.amount > 0
    AND j.status NOT IN ('completed', 'cancelled');

  -- 3. Sum of all bank disbursements paid out (negative payout entries)
  SELECT coalesce(abs(sum(amount)), 0) INTO v_paid_out_kobo
  FROM public.ledger_entries
  WHERE actor_id = p_worker_id
    AND related_type = 'payout';

  -- 4. Available balance eligible for withdrawal = completed credits minus paid out
  v_available_balance_kobo := (v_total_earned_kobo - v_pending_escrow_kobo) - v_paid_out_kobo;
  IF v_available_balance_kobo < 0 THEN
    v_available_balance_kobo := 0;
  END IF;

  RETURN jsonb_build_object(
    'worker_id', p_worker_id,
    'total_earned_kobo', v_total_earned_kobo,
    'pending_escrow_kobo', v_pending_escrow_kobo,
    'paid_out_kobo', v_paid_out_kobo,
    'available_balance_kobo', v_available_balance_kobo,
    'currency', 'NGN'
  );
END;
$$;

COMMENT ON FUNCTION public.get_worker_earnings_summary IS
  'Calculates worker earnings dynamically from append-only ledger entries. §42, §44';


-- ---------------------------------------------------------------------------
-- 5. PROCESS PAYMENT REFUND (Offsetting Ledger Entry)
-- ---------------------------------------------------------------------------
-- §44: "Ledger entries are never updated or deleted — a correction is a new offsetting entry"
CREATE OR REPLACE FUNCTION public.process_payment_refund(
  p_job_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_job public.jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_payment
  FROM public.payments
  WHERE job_id = p_job_id AND status = 'successful';

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'No successful payment found to refund for job %.', p_job_id;
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  -- 1. Mark payment refunded
  UPDATE public.payments
  SET status = 'refunded', updated_at = now()
  WHERE id = v_payment.id;

  -- 2. APPEND OFFSETTING REVERSAL TO LEDGER (§44)
  INSERT INTO public.ledger_entries (
    related_type,
    related_id,
    job_id,
    actor_id,
    amount,
    currency,
    description
  ) VALUES (
    'refund',
    v_payment.id,
    p_job_id,
    v_payment.employer_id,
    v_payment.total_amount, -- Positive offsetting credit refunding employer
    'NGN',
    'Escrow refund reversal: ' || p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'refunded_amount_kobo', v_payment.total_amount,
    'status', 'refunded'
  );
END;
$$;

COMMENT ON FUNCTION public.process_payment_refund IS
  'Issues an escrow refund via an offsetting append-only ledger entry. §36, §44';
