import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { TrialBalance } from '../TrialBalance';
import { BasIasAssistant } from '../BasIasAssistant';
import { TaxReturnAssistant } from '../TaxReturnAssistant';
import { CompanyTaxReturn } from '../CompanyTaxReturn';
import { TrustTaxReturn } from '../TrustTaxReturn';
import { EntityForm } from '../EntityForm';
import { AccountManager } from '../AccountManager';
import { AuditTrail } from '../AuditTrail';
import { JournalForm } from '../JournalForm';
import { ImportTB } from '../ImportTB';
import { FinancialTrendChart } from '../FinancialTrendChart';
import { DisclaimerFooter } from '../DisclaimerFooter';
import { PdfGate } from '../PdfGate';
import { MigrationError } from '../MigrationError';
import App from '../../App';
import { sampleAccounts } from '../../test/fixtures/accounts';

const noOp = () => {};
const emptyEntries: never[] = [];
const emptyLogs: never[] = [];

describe('Smoke tests — every major component renders without crashing (FND-07)', () => {
  it('App renders', () => {
    render(<App />);
  });
  it('TrialBalance renders', () => {
    render(<TrialBalance accounts={sampleAccounts} entries={emptyEntries} />);
  });
  it('BasIasAssistant renders', () => {
    render(<BasIasAssistant accounts={sampleAccounts} entries={emptyEntries} />);
  });
  it('TaxReturnAssistant renders', () => {
    render(
      <TaxReturnAssistant
        accounts={sampleAccounts}
        entries={emptyEntries}
        onUpdateAccount={noOp}
      />,
    );
  });
  it('CompanyTaxReturn renders', () => {
    render(
      <CompanyTaxReturn
        accounts={sampleAccounts}
        entries={emptyEntries}
        onUpdateAccount={noOp}
      />,
    );
  });
  it('TrustTaxReturn renders', () => {
    const trustEntity = {
      _v: 4 as const,
      id: 'smoke-trust',
      name: 'Smoke Trust',
      type: 'Trust' as const,
      status: 'Active' as const,
    };
    render(
      <TrustTaxReturn entity={trustEntity} accounts={sampleAccounts} entries={emptyEntries} />,
    );
  });
  it('EntityForm renders (create mode)', () => {
    render(<EntityForm onSave={noOp} onCancel={noOp} />);
  });
  it('AccountManager renders', () => {
    render(<AccountManager accounts={sampleAccounts} onSave={noOp} onCancel={noOp} />);
  });
  it('AuditTrail renders', () => {
    render(<AuditTrail logs={emptyLogs} />);
  });
  it('JournalForm renders', () => {
    render(
      <JournalForm
        accounts={sampleAccounts}
        onSave={noOp}
        onCancel={noOp}
      />,
    );
  });
  it('ImportTB renders', () => {
    render(<ImportTB accounts={sampleAccounts} onImport={noOp} />);
  });
  it('FinancialTrendChart renders', () => {
    render(<FinancialTrendChart accounts={sampleAccounts} entries={emptyEntries} />);
  });
  it('DisclaimerFooter renders', () => {
    render(<DisclaimerFooter />);
  });
  it('PdfGate renders', () => {
    render(<PdfGate onConfirmed={noOp} />);
  });
  it('MigrationError renders', () => {
    render(<MigrationError message="test" />);
  });
});
