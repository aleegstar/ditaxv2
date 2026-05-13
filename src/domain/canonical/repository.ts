/**
 * Canonical Repository — thin Supabase persistence layer.
 *
 * Responsibilities:
 *  - Upsert canonical_dossiers + child entities scoped per (tax_filer_id, tax_year).
 *  - Persist field-level provenance rows in lockstep with values.
 *  - Provide read of canonical dossiers (write-only phase: not used by UI).
 *  - Trigger snapshots via `create_dossier_snapshot` RPC.
 *
 * NOT responsible for: AI extraction, validation, calculation, export.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Dossier } from './types';
import { SCHEMA_VERSION } from './types';
import { Money } from './money';
import type { ProvenanceRow, Tracked } from './provenance';

export type SnapshotReason = 'manual' | 'submission' | 'export' | 'migration' | 'checkpoint';

interface UpsertResult {
  dossier_id: string;
  revision: number;
}

/** Helper to extract scalar value + provenance row from a Tracked<T>. */
function bindProvenance(
  acc: ProvenanceRow[],
  dossier_id: string,
  entity_table: string,
  entity_id: string,
  field_path: string,
  tracked: Tracked<unknown> | undefined | null,
): void {
  if (!tracked) return;
  acc.push({
    dossier_id,
    entity_table,
    entity_id,
    field_path,
    ...tracked.provenance,
  });
}

export const canonicalRepository = {
  /**
   * Idempotent upsert of an entire canonical dossier.
   * Returns dossier id + new revision.
   */
  async upsertDossier(dossier: Dossier): Promise<UpsertResult> {
    const provRows: ProvenanceRow[] = [];

    // 1. Dossier root
    const { data: dossierRow, error: dErr } = await supabase
      .from('canonical_dossiers' as never)
      .upsert(
        {
          user_id: dossier.user_id,
          tax_filer_id: dossier.tax_filer_id,
          tax_year: dossier.tax_year,
          canton: dossier.canton,
          status: dossier.status,
          schema_version: SCHEMA_VERSION,
          validation_status: dossier.validation_status,
          currency: dossier.currency,
          updated_by: dossier.user_id,
        } as never,
        { onConflict: 'tax_filer_id,tax_year' } as never,
      )
      .select('id, current_revision')
      .single();
    if (dErr) throw dErr;
    const dossierId = (dossierRow as { id: string }).id;
    const newRevision = ((dossierRow as { current_revision: number }).current_revision ?? 0) + 1;

    await supabase
      .from('canonical_dossiers' as never)
      .update({ current_revision: newRevision } as never)
      .eq('id', dossierId);

    // 2. Persons (full replace per dossier)
    await supabase.from('canonical_persons' as never).delete().eq('dossier_id', dossierId);
    if (dossier.persons.length) {
      const rows = dossier.persons.map((p) => ({
        dossier_id: dossierId,
        role: p.role,
        first_name: p.first_name?.value,
        last_name: p.last_name?.value,
        birth_date: p.birth_date?.value,
        ahv_number: p.ahv_number?.value,
        nationality: p.nationality?.value,
        marital_status: p.marital_status?.value,
        religion: p.religion?.value,
        address: p.address?.value,
        postal_code: p.postal_code?.value,
        city: p.city?.value,
        canton: p.canton?.value,
        municipality: p.municipality?.value,
        extra: p.extra ?? {},
        schema_version: SCHEMA_VERSION,
        created_by: dossier.user_id,
        updated_by: dossier.user_id,
      }));
      const { data: inserted, error } = await supabase
        .from('canonical_persons' as never)
        .insert(rows as never)
        .select('id');
      if (error) throw error;
      (inserted as { id: string }[]).forEach((row, i) => {
        const p = dossier.persons[i];
        const fields: [string, Tracked<unknown> | undefined][] = [
          ['first_name', p.first_name], ['last_name', p.last_name], ['birth_date', p.birth_date],
          ['ahv_number', p.ahv_number], ['nationality', p.nationality],
          ['marital_status', p.marital_status], ['religion', p.religion],
          ['address', p.address], ['postal_code', p.postal_code], ['city', p.city],
          ['canton', p.canton], ['municipality', p.municipality],
        ];
        for (const [path, t] of fields) bindProvenance(provRows, dossierId, 'canonical_persons', row.id, path, t);
      });
    }

    // 3. Household
    if (dossier.household) {
      const h = dossier.household;
      await supabase.from('canonical_household' as never).upsert(
        {
          dossier_id: dossierId,
          marital_status_effective: h.marital_status_effective?.value,
          children_count: h.children_count,
          dependents_count: h.dependents_count,
          notes: h.notes,
          extra: h.extra ?? {},
          schema_version: SCHEMA_VERSION,
          updated_by: dossier.user_id,
        } as never,
        { onConflict: 'dossier_id' } as never,
      );
    }

    // 4. Employment incomes (full replace)
    await supabase.from('canonical_employment_incomes' as never).delete().eq('dossier_id', dossierId);
    if (dossier.employment_incomes.length) {
      const rows = dossier.employment_incomes.map((e) => {
        const salaryDb = Money.toDb(e.salary?.value ?? null);
        return {
          dossier_id: dossierId,
          person_id: e.person_id ?? null,
          employer: e.employer?.value,
          salary: salaryDb.amount,
          bonus: Money.toDb(e.bonus?.value ?? null).amount,
          pension_contributions: Money.toDb(e.pension_contributions?.value ?? null).amount,
          ahv: Money.toDb(e.ahv?.value ?? null).amount,
          withholding_tax: Money.toDb(e.withholding_tax?.value ?? null).amount,
          currency: salaryDb.currency ?? 'CHF',
          source_document_id: e.source_document_id ?? null,
          extra: e.extra ?? {},
          schema_version: SCHEMA_VERSION,
          created_by: dossier.user_id,
          updated_by: dossier.user_id,
        };
      });
      const { data, error } = await supabase
        .from('canonical_employment_incomes' as never)
        .insert(rows as never)
        .select('id');
      if (error) throw error;
      (data as { id: string }[]).forEach((row, i) => {
        const e = dossier.employment_incomes[i];
        for (const [path, t] of [
          ['employer', e.employer], ['salary', e.salary], ['bonus', e.bonus],
          ['pension_contributions', e.pension_contributions], ['ahv', e.ahv],
          ['withholding_tax', e.withholding_tax],
        ] as [string, Tracked<unknown> | undefined][]) {
          bindProvenance(provRows, dossierId, 'canonical_employment_incomes', row.id, path, t);
        }
      });
    }

    // 5. Self-employment, pension — analogous full-replace
    await supabase.from('canonical_self_employment_incomes' as never).delete().eq('dossier_id', dossierId);
    if (dossier.self_employment_incomes.length) {
      await supabase.from('canonical_self_employment_incomes' as never).insert(
        dossier.self_employment_incomes.map((s) => ({
          dossier_id: dossierId,
          person_id: s.person_id ?? null,
          business_name: s.business_name?.value,
          revenue: Money.toDb(s.revenue?.value ?? null).amount,
          expenses: Money.toDb(s.expenses?.value ?? null).amount,
          net_income: Money.toDb(s.net_income?.value ?? null).amount,
          currency: 'CHF',
          details: s.details ?? {},
          schema_version: SCHEMA_VERSION,
          created_by: dossier.user_id,
          updated_by: dossier.user_id,
        })) as never,
      );
    }

    await supabase.from('canonical_pension_incomes' as never).delete().eq('dossier_id', dossierId);
    if (dossier.pension_incomes.length) {
      await supabase.from('canonical_pension_incomes' as never).insert(
        dossier.pension_incomes.map((p) => ({
          dossier_id: dossierId,
          person_id: p.person_id ?? null,
          ahv_income: Money.toDb(p.ahv_income?.value ?? null).amount,
          pension_income: Money.toDb(p.pension_income?.value ?? null).amount,
          pillar3a: Money.toDb(p.pillar3a?.value ?? null).amount,
          pillar3b: Money.toDb(p.pillar3b?.value ?? null).amount,
          currency: 'CHF',
          extra: p.extra ?? {},
          schema_version: SCHEMA_VERSION,
          created_by: dossier.user_id,
          updated_by: dossier.user_id,
        })) as never,
      );
    }

    // 6. Assets (1:1)
    if (dossier.assets) {
      const a = dossier.assets;
      await supabase.from('canonical_assets' as never).upsert(
        {
          dossier_id: dossierId,
          bank_accounts: a.bank_accounts as never,
          cash: Money.toDb(a.cash?.value ?? null).amount,
          securities: a.securities as never,
          crypto_assets: a.crypto_assets as never,
          foreign_assets: a.foreign_assets as never,
          currency: 'CHF',
          schema_version: SCHEMA_VERSION,
          updated_by: dossier.user_id,
        } as never,
        { onConflict: 'dossier_id' } as never,
      );
    }

    // 7. Debts (1:1)
    if (dossier.debts) {
      const d = dossier.debts;
      await supabase.from('canonical_debts' as never).upsert(
        {
          dossier_id: dossierId,
          mortgages: d.mortgages as never,
          loans: d.loans as never,
          interest_paid: Money.toDb(d.interest_paid?.value ?? null).amount,
          currency: 'CHF',
          schema_version: SCHEMA_VERSION,
          updated_by: dossier.user_id,
        } as never,
        { onConflict: 'dossier_id' } as never,
      );
    }

    // 8. Real estate (full replace)
    await supabase.from('canonical_real_estate' as never).delete().eq('dossier_id', dossierId);
    if (dossier.real_estate.length) {
      await supabase.from('canonical_real_estate' as never).insert(
        dossier.real_estate.map((r) => ({
          dossier_id: dossierId,
          address: r.address?.value,
          canton: r.canton?.value,
          municipality: r.municipality?.value,
          usage: r.usage?.value,
          purchase_value: Money.toDb(r.purchase_value?.value ?? null).amount,
          purchase_year: r.purchase_year?.value,
          tax_value: Money.toDb(r.tax_value?.value ?? null).amount,
          rental_income: Money.toDb(r.rental_income?.value ?? null).amount,
          maintenance_costs: Money.toDb(r.maintenance_costs?.value ?? null).amount,
          currency: 'CHF',
          extra: r.extra ?? {},
          schema_version: SCHEMA_VERSION,
          created_by: dossier.user_id,
          updated_by: dossier.user_id,
        })) as never,
      );
    }

    // 9. Deductions (1:1)
    if (dossier.deductions) {
      const de = dossier.deductions;
      await supabase.from('canonical_deductions' as never).upsert(
        {
          dossier_id: dossierId,
          commuting: de.commuting ?? {},
          meals: de.meals ?? {},
          education: de.education ?? {},
          health_costs: de.health_costs ?? {},
          pillar3a: Money.toDb(de.pillar3a?.value ?? null).amount,
          donations: de.donations ?? {},
          childcare: de.childcare ?? {},
          other: de.other ?? {},
          currency: 'CHF',
          schema_version: SCHEMA_VERSION,
          updated_by: dossier.user_id,
        } as never,
        { onConflict: 'dossier_id' } as never,
      );
    }

    // 10. Attachments (replace)
    await supabase.from('canonical_attachments' as never).delete().eq('dossier_id', dossierId);
    if (dossier.attachments.length) {
      await supabase.from('canonical_attachments' as never).insert(
        dossier.attachments.map((at) => ({
          dossier_id: dossierId,
          uploaded_document_id: at.uploaded_document_id ?? null,
          mime_type: at.mime_type,
          extracted_entities: at.extracted_entities ?? {},
          extraction_confidence: at.extraction_confidence,
          extraction_model: at.extraction_model,
          extracted_at: at.extracted_at,
          schema_version: SCHEMA_VERSION,
          created_by: dossier.user_id,
          updated_by: dossier.user_id,
        })) as never,
      );
    }

    // 11. Field provenance — wipe & re-insert per dossier (cheap; rows are sparse)
    await supabase.from('canonical_field_provenance' as never).delete().eq('dossier_id', dossierId);
    if (provRows.length) {
      await supabase.from('canonical_field_provenance' as never).insert(
        provRows.map((r) => ({ ...r, schema_version: SCHEMA_VERSION, created_by: dossier.user_id, updated_by: dossier.user_id })) as never,
      );
    }

    return { dossier_id: dossierId, revision: newRevision };
  },

  async createSnapshot(dossierId: string, reason: SnapshotReason = 'manual'): Promise<string | null> {
    const { data, error } = await supabase.rpc('create_dossier_snapshot' as never, {
      p_dossier_id: dossierId,
      p_reason: reason,
    } as never);
    if (error) {
      console.warn('[canonical] snapshot failed:', error.message);
      return null;
    }
    return (data as string) ?? null;
  },

  async getDossierByFilerYear(taxFilerId: string, taxYear: string): Promise<{ id: string } | null> {
    const { data } = await supabase
      .from('canonical_dossiers' as never)
      .select('id')
      .eq('tax_filer_id', taxFilerId)
      .eq('tax_year', taxYear)
      .maybeSingle();
    return (data as { id: string } | null) ?? null;
  },
};
