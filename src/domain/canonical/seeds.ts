/**
 * Canonical test seed helpers — produce deterministic FormData-shaped fixtures
 * to stress-test the canonical mapper + repository end-to-end.
 *
 * Use from /dev/canonical or unit tests. NOT used in production flows.
 */
export type SeedScenario = 'single_employee' | 'married_with_children' | 'investor_pillar3a';

export function buildSeedFormData(scenario: SeedScenario): Record<string, unknown> {
  switch (scenario) {
    case 'single_employee':
      return {
        personal: {
          firstName: 'Lara', lastName: 'Muster', dateOfBirth: '1990-04-12',
          ahvNumber: '756.1234.5678.90', nationality: 'CH', maritalStatus: 'single',
          address: 'Bahnhofstrasse 1', postalCode: '5000', city: 'Aarau', canton: 'AG',
        },
        income: {
          employments: [{ employer: 'Acme AG', salary: 92000, bonus: 4000, pensionContributions: 5500, ahv: 4830 }],
        },
        assets: { cash: 12000, bankAccounts: [{ bank: 'UBS', iban: 'CH93 0076 2011 6238 5295 7', balance: 8400, interest: 12 }] },
        deductions: { pillar3a: 7056 },
      };

    case 'married_with_children':
      return {
        personal: { firstName: 'Reto', lastName: 'Beispiel', dateOfBirth: '1982-07-03', maritalStatus: 'married', canton: 'AG', city: 'Baden', postalCode: '5400' },
        spouse:   { firstName: 'Anna', lastName: 'Beispiel', dateOfBirth: '1984-01-15', ahvNumber: '756.9999.1111.22' },
        children: [
          { firstName: 'Mia', lastName: 'Beispiel', dateOfBirth: '2015-09-01' },
          { firstName: 'Tim', lastName: 'Beispiel', dateOfBirth: '2018-03-22' },
        ],
        income: {
          employments: [
            { employer: 'Beispiel GmbH', salary: 110000, pensionContributions: 6800 },
            { employer: 'Teilzeit AG',  salary: 38000 },
          ],
        },
        deductions: { pillar3a: 7056, childcare: { amount: 9000 } },
      };

    case 'investor_pillar3a':
      return {
        personal: { firstName: 'Yuki', lastName: 'Invest', dateOfBirth: '1988-11-30', maritalStatus: 'single', canton: 'AG' },
        income: { employments: [{ employer: 'FinTech AG', salary: 145000, bonus: 22000 }] },
        assets: {
          cash: 5000,
          securities: [
            { isin: 'CH0012032048', description: 'Roche GS', quantity: '20', market_value: { amount: '5800.00', currency: 'CHF' }, dividend: { amount: '180.00', currency: 'CHF' } },
            { isin: 'US0378331005', description: 'Apple', quantity: '50', market_value: { amount: '11200.00', currency: 'CHF' } },
          ],
          cryptoAssets: [{ asset: 'BTC', quantity: '0.35', fair_value: { amount: '21000.00', currency: 'CHF' } }],
        },
        deductions: { pillar3a: 7056, donations: { amount: 1200 } },
      };
  }
}
