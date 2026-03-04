import { TwoFactorService } from '../TwoFactorService';
import { t } from '../../utils/i18n';

describe('TwoFactorService', () => {
  it('returns translated message when 2FA is not enabled for user', async () => {
    // use an ID that likely does not exist in the seeded test database
    const result = await TwoFactorService.validate2FACode('nonexistent-user', '000000');
    expect(result.verified).toBe(false);
    // service should already return a localized string based on DEFAULT_LOCALE
    expect(result.message).toBe(t('twoFANotEnabled'));
  });
});
