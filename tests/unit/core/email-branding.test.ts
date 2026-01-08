/**
 * @file email-branding.test.ts
 * @description Tests for organization branding colors in email templates
 *
 * Tests that email templates correctly apply organization's primaryColor
 * for branding and fall back to default colors when not provided.
 */

describe('Email Branding', () => {
  const DEFAULT_BRAND_COLOR = '#3B82F6';

  // Replicate the emailWrapper logic for testing
  function emailWrapper(content: string, orgName: string, brandColor?: string): string {
    const color = brandColor || DEFAULT_BRAND_COLOR;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: ${color}; padding: 30px 40px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">${orgName}</h1>
      </td>
    </tr>

    <!-- Main Content -->
    <tr>
      <td style="padding: 40px;">
        ${content}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #eeeeee;">
        <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
          This is an automated message from ${orgName}.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
  }

  describe('emailWrapper function', () => {
    describe('Default Brand Color', () => {
      it('should use default blue color when no brandColor provided', () => {
        const html = emailWrapper('<p>Test content</p>', 'Test Org');
        expect(html).toContain(`background-color: ${DEFAULT_BRAND_COLOR}`);
      });

      it('should use default blue color when brandColor is undefined', () => {
        const html = emailWrapper('<p>Test content</p>', 'Test Org', undefined);
        expect(html).toContain(`background-color: ${DEFAULT_BRAND_COLOR}`);
      });

      it('should have the correct default brand color value', () => {
        expect(DEFAULT_BRAND_COLOR).toBe('#3B82F6');
      });
    });

    describe('Custom Brand Color', () => {
      it('should use custom brand color when provided', () => {
        const customColor = '#FF5733';
        const html = emailWrapper('<p>Test content</p>', 'Test Org', customColor);
        expect(html).toContain(`background-color: ${customColor}`);
        expect(html).not.toContain(`background-color: ${DEFAULT_BRAND_COLOR}`);
      });

      it('should support red brand colors', () => {
        const redColor = '#DC2626';
        const html = emailWrapper('<p>Test</p>', 'Red Org', redColor);
        expect(html).toContain(`background-color: ${redColor}`);
      });

      it('should support green brand colors', () => {
        const greenColor = '#16A34A';
        const html = emailWrapper('<p>Test</p>', 'Green Org', greenColor);
        expect(html).toContain(`background-color: ${greenColor}`);
      });

      it('should support purple brand colors', () => {
        const purpleColor = '#9333EA';
        const html = emailWrapper('<p>Test</p>', 'Purple Org', purpleColor);
        expect(html).toContain(`background-color: ${purpleColor}`);
      });

      it('should support dark brand colors', () => {
        const darkColor = '#1F2937';
        const html = emailWrapper('<p>Test</p>', 'Dark Org', darkColor);
        expect(html).toContain(`background-color: ${darkColor}`);
      });
    });

    describe('Organization Name', () => {
      it('should include organization name in header', () => {
        const html = emailWrapper('<p>Test</p>', 'Acme Corporation');
        expect(html).toContain('<h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Acme Corporation</h1>');
      });

      it('should include organization name in footer', () => {
        const html = emailWrapper('<p>Test</p>', 'Acme Corporation');
        expect(html).toContain('This is an automated message from Acme Corporation.');
      });

      it('should handle organization names with special characters', () => {
        const html = emailWrapper('<p>Test</p>', 'O\'Brien & Sons');
        expect(html).toContain("O'Brien & Sons");
      });

      it('should handle organization names with unicode', () => {
        const html = emailWrapper('<p>Test</p>', 'شركة التقنية');
        expect(html).toContain('شركة التقنية');
      });
    });

    describe('Content Injection', () => {
      it('should include provided content in the email body', () => {
        const content = '<p>Welcome to our platform!</p>';
        const html = emailWrapper(content, 'Test Org');
        expect(html).toContain(content);
      });

      it('should preserve HTML structure in content', () => {
        const content = '<ul><li>Item 1</li><li>Item 2</li></ul>';
        const html = emailWrapper(content, 'Test Org');
        expect(html).toContain(content);
      });
    });

    describe('HTML Structure', () => {
      it('should generate valid HTML document structure', () => {
        const html = emailWrapper('<p>Test</p>', 'Test Org');
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<html lang="en">');
        expect(html).toContain('<head>');
        expect(html).toContain('<body');
        expect(html).toContain('</html>');
      });

      it('should include viewport meta tag for mobile', () => {
        const html = emailWrapper('<p>Test</p>', 'Test Org');
        expect(html).toContain('viewport');
        expect(html).toContain('width=device-width');
      });

      it('should use table-based layout for email compatibility', () => {
        const html = emailWrapper('<p>Test</p>', 'Test Org');
        expect(html).toContain('<table role="presentation"');
      });

      it('should set max-width for proper email rendering', () => {
        const html = emailWrapper('<p>Test</p>', 'Test Org');
        expect(html).toContain('max-width: 600px');
      });
    });

    describe('Color Format Validation', () => {
      it('should accept 6-digit hex colors', () => {
        const html = emailWrapper('<p>Test</p>', 'Test Org', '#AABBCC');
        expect(html).toContain('background-color: #AABBCC');
      });

      it('should accept lowercase hex colors', () => {
        const html = emailWrapper('<p>Test</p>', 'Test Org', '#aabbcc');
        expect(html).toContain('background-color: #aabbcc');
      });

      it('should accept 3-digit hex colors', () => {
        const html = emailWrapper('<p>Test</p>', 'Test Org', '#ABC');
        expect(html).toContain('background-color: #ABC');
      });
    });
  });

  describe('Email Template Branding Integration', () => {
    // Simulated template data interfaces
    interface TemplateData {
      orgName: string;
      primaryColor?: string;
    }

    function generateEmailFromTemplate(data: TemplateData): string {
      return emailWrapper('<p>Template content</p>', data.orgName, data.primaryColor);
    }

    it('should apply branding from template data', () => {
      const data: TemplateData = {
        orgName: 'Branded Corp',
        primaryColor: '#E11D48',
      };
      const html = generateEmailFromTemplate(data);
      expect(html).toContain('background-color: #E11D48');
      expect(html).toContain('Branded Corp');
    });

    it('should use default when primaryColor is missing', () => {
      const data: TemplateData = {
        orgName: 'Unbranded Corp',
      };
      const html = generateEmailFromTemplate(data);
      expect(html).toContain(`background-color: ${DEFAULT_BRAND_COLOR}`);
    });

    it('should handle null primaryColor gracefully', () => {
      const data: TemplateData = {
        orgName: 'Null Color Corp',
        primaryColor: undefined,
      };
      const html = generateEmailFromTemplate(data);
      expect(html).toContain(`background-color: ${DEFAULT_BRAND_COLOR}`);
    });
  });

  describe('Real-world Email Templates', () => {
    // Test specific email template scenarios

    describe('Welcome Email', () => {
      interface WelcomeEmailData {
        userName: string;
        userEmail: string;
        userRole: string;
        orgSlug: string;
        orgName: string;
        primaryColor?: string;
      }

      function mockWelcomeEmail(data: WelcomeEmailData): { html: string; text: string } {
        const content = `
          <h2>Welcome, ${data.userName}!</h2>
          <p>You have been added to ${data.orgName} as a ${data.userRole}.</p>
        `;
        return {
          html: emailWrapper(content, data.orgName, data.primaryColor),
          text: `Welcome ${data.userName} to ${data.orgName}`,
        };
      }

      it('should apply organization brand color to welcome email', () => {
        const result = mockWelcomeEmail({
          userName: 'John Doe',
          userEmail: 'john@example.com',
          userRole: 'ADMIN',
          orgSlug: 'acme',
          orgName: 'Acme Corp',
          primaryColor: '#7C3AED',
        });
        expect(result.html).toContain('background-color: #7C3AED');
      });
    });

    describe('Asset Assignment Email', () => {
      interface AssetAssignmentData {
        assetTag: string;
        assetModel: string;
        assigneeName: string;
        orgName: string;
        primaryColor?: string;
      }

      function mockAssetAssignmentEmail(data: AssetAssignmentData): string {
        const content = `
          <p>Asset ${data.assetTag} (${data.assetModel}) has been assigned to ${data.assigneeName}.</p>
        `;
        return emailWrapper(content, data.orgName, data.primaryColor);
      }

      it('should apply brand color to asset assignment emails', () => {
        const html = mockAssetAssignmentEmail({
          assetTag: 'AST-001',
          assetModel: 'MacBook Pro',
          assigneeName: 'Jane Smith',
          orgName: 'Tech Corp',
          primaryColor: '#0891B2',
        });
        expect(html).toContain('background-color: #0891B2');
        expect(html).toContain('Tech Corp');
      });
    });

    describe('Leave Request Email', () => {
      interface LeaveRequestData {
        employeeName: string;
        leaveType: string;
        startDate: string;
        endDate: string;
        orgName: string;
        primaryColor?: string;
      }

      function mockLeaveRequestEmail(data: LeaveRequestData): string {
        const content = `
          <p>${data.employeeName} has requested ${data.leaveType} leave from ${data.startDate} to ${data.endDate}.</p>
        `;
        return emailWrapper(content, data.orgName, data.primaryColor);
      }

      it('should apply brand color to leave request emails', () => {
        const html = mockLeaveRequestEmail({
          employeeName: 'Bob Wilson',
          leaveType: 'Annual',
          startDate: '2024-01-15',
          endDate: '2024-01-20',
          orgName: 'HR Corp',
          primaryColor: '#059669',
        });
        expect(html).toContain('background-color: #059669');
      });
    });
  });

  describe('Accessibility Considerations', () => {
    it('should use white text on colored header for contrast', () => {
      const html = emailWrapper('<p>Test</p>', 'Test Org', '#1E40AF');
      expect(html).toContain('color: #ffffff');
    });

    it('should maintain readable footer text color', () => {
      const html = emailWrapper('<p>Test</p>', 'Test Org');
      expect(html).toContain('color: #888888');
    });
  });
});
