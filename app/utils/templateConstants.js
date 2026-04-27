export const DEFAULT_EMAIL_SUBJECT_TEMPLATE =
  "New order from {{companyName}}: {{orderName}}";

export const DEFAULT_EMAIL_BODY_TEMPLATE = `A new order has been placed.

Order: {{orderName}}
Customer: {{customerName}}
Company: {{companyName}}
Location: {{companyLocationName}}
Total: {{orderTotal}}

Items:
{{lineItems}}

View order:
{{orderAdminUrl}}`;
