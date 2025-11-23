import React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Link,
} from '@react-email/components';

interface RentReminderEmailProps {
  tenantName: string;
  landlordName: string;
  landlordEmail: string;
  landlordPhone?: string;
  amountDue: number;
  baseRent?: number;
  utilitiesCharges?: number;
  historicalDebt?: number;
  dueDate: string;
  daysRemaining: number;
  propertyName: string;
  unitNumber: string;
  customMessage?: string;
  mpesaPaybill?: string;
  mpesaAccountNumber?: string;
}

export default function RentReminderEmail({
  tenantName,
  landlordName,
  landlordEmail,
  landlordPhone,
  amountDue,
  baseRent,
  utilitiesCharges,
  historicalDebt,
  dueDate,
  daysRemaining,
  propertyName,
  unitNumber,
  customMessage,
  mpesaPaybill,
  mpesaAccountNumber,
}: RentReminderEmailProps) {
  const isUrgent = daysRemaining <= 1;
  const isDue = daysRemaining === 0;
  const hasBreakdown = baseRent || utilitiesCharges || historicalDebt;

  return (
    <Html>
      <Head />
      <Preview>
        {isDue
          ? 'Rent Payment Due Today'
          : `Rent Due in ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={isUrgent ? urgentBanner : reminderBanner}>
            <Heading style={h1}>
              {isDue ? '⏰ Rent Due Today' : `📅 Rent Reminder`}
            </Heading>
          </Section>
          
          <Text style={text}>
            Dear {tenantName},
          </Text>

          <Text style={text}>
            This is a friendly reminder that your rent payment is{' '}
            {isDue ? <strong>due today</strong> : `due in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`}.
          </Text>

          {customMessage && (
            <Section style={customMessageBox}>
              <Text style={customMessageText}>{customMessage}</Text>
            </Section>
          )}

          <Section style={amountBox}>
            <Heading style={h2}>Payment Information</Heading>
            <table style={table}>
              <tbody>
                {hasBreakdown ? (
                  <>
                    {baseRent && baseRent > 0 && (
                      <tr>
                        <td style={labelCell}>Monthly Rent:</td>
                        <td style={valueCell}>KES {baseRent.toLocaleString()}</td>
                      </tr>
                    )}
                    {utilitiesCharges && utilitiesCharges > 0 && (
                      <tr>
                        <td style={labelCell}>Utilities:</td>
                        <td style={valueCell}>KES {utilitiesCharges.toLocaleString()}</td>
                      </tr>
                    )}
                    {historicalDebt && historicalDebt > 0 && (
                      <tr>
                        <td style={labelCell}>Previous Outstanding:</td>
                        <td style={valueCell}>KES {historicalDebt.toLocaleString()}</td>
                      </tr>
                    )}
                    <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                      <td style={labelCell}><strong>Total Amount Due:</strong></td>
                      <td style={amountCell}><strong>KES {amountDue.toLocaleString()}</strong></td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td style={labelCell}>Amount Due:</td>
                    <td style={amountCell}><strong>KES {amountDue.toLocaleString()}</strong></td>
                  </tr>
                )}
                <tr>
                  <td style={labelCell}>Due Date:</td>
                  <td style={valueCell}>{dueDate}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Property:</td>
                  <td style={valueCell}>{propertyName}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Unit:</td>
                  <td style={valueCell}>{unitNumber}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {(mpesaPaybill || mpesaAccountNumber) && (
            <Section style={paymentMethodBox}>
              <Heading style={h3}>💳 M-Pesa Payment Details</Heading>
              {mpesaPaybill && (
                <Text style={paymentText}>
                  <strong>Paybill Number:</strong> {mpesaPaybill}
                </Text>
              )}
              {mpesaAccountNumber && (
                <Text style={paymentText}>
                  <strong>Account Number:</strong> {mpesaAccountNumber}
                </Text>
              )}
              <Text style={paymentSteps}>
                <strong>How to Pay:</strong><br />
                1. Go to M-Pesa menu<br />
                2. Select "Lipa na M-Pesa"<br />
                3. Select "Paybill"<br />
                4. Enter Business Number: <strong>{mpesaPaybill}</strong><br />
                5. Enter Account Number: <strong>{mpesaAccountNumber || 'Your Phone Number'}</strong><br />
                6. Enter Amount: <strong>{amountDue}</strong><br />
                7. Enter your M-Pesa PIN and confirm
              </Text>
            </Section>
          )}

          <Section style={contactBox}>
            <Heading style={h3}>Need Help?</Heading>
            <Text style={contactText}>
              If you have any questions or need to discuss your payment, please contact:<br />
              <strong>{landlordName}</strong><br />
              📧 <Link href={`mailto:${landlordEmail}`}>{landlordEmail}</Link><br />
              {landlordPhone && <>📞 {landlordPhone}</>}
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            This is an automated reminder from RentEase<br />
            Managed by {landlordName}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
  borderRadius: '8px',
};

const reminderBanner = {
  backgroundColor: '#3b82f6',
  padding: '20px',
  borderRadius: '8px 8px 0 0',
  marginTop: '-40px',
  marginLeft: '-20px',
  marginRight: '-20px',
  marginBottom: '24px',
};

const urgentBanner = {
  backgroundColor: '#f59e0b',
  padding: '20px',
  borderRadius: '8px 8px 0 0',
  marginTop: '-40px',
  marginLeft: '-20px',
  marginRight: '-20px',
  marginBottom: '24px',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  marginBottom: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#374151',
  fontSize: '20px',
  fontWeight: 'bold',
  marginBottom: '16px',
};

const h3 = {
  color: '#374151',
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '12px',
};

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
};

const amountBox = {
  backgroundColor: '#fef3c7',
  padding: '24px',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '2px solid #f59e0b',
};

const paymentMethodBox = {
  backgroundColor: '#f0fdf4',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '1px solid #86efac',
};

const contactBox = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '1px solid #e5e7eb',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const labelCell = {
  color: '#6b7280',
  fontSize: '15px',
  padding: '8px 0',
  width: '35%',
};

const valueCell = {
  color: '#1f2937',
  fontSize: '15px',
  padding: '8px 0',
  textAlign: 'right' as const,
};

const amountCell = {
  color: '#b45309',
  fontSize: '18px',
  padding: '8px 0',
  textAlign: 'right' as const,
};

const customMessageBox = {
  backgroundColor: '#eff6ff',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '20px',
  borderLeft: '4px solid #3b82f6',
};

const customMessageText = {
  color: '#1e40af',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0',
  fontStyle: 'italic' as const,
};

const paymentText = {
  color: '#166534',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '8px 0',
};

const paymentSteps = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '12px 0 0 0',
  backgroundColor: '#ffffff',
  padding: '12px',
  borderRadius: '6px',
};

const contactText = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const footer = {
  color: '#9ca3af',
  fontSize: '14px',
  lineHeight: '20px',
  textAlign: 'center' as const,
};
