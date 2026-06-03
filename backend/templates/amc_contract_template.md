# ANNUAL MAINTENANCE CONTRACT (AMC)

**Contract Number:** AMC-<%= new Date().getFullYear() %>-<%= customer_id %>
**Date of Agreement:** <%= new Date().toLocaleDateString() %>

## 1. PARTIES
This Agreement is made between:
- **Service Provider:** Linotec IT Solutions
- **Client:** <%= company_name %> (Attn: <%= customer_name %>)

## 2. DURATION
This contract is valid from **<%= start_date %>** to **<%= end_date %>**.

## 3. SCOPE OF WORK
Linotec IT Solutions shall provide the following services:
- On-Call Repair & Maintenance
- Software Updates & Security Patching
- Network & Server Monitoring
- [Additional scope as defined in the system]

## 4. SERVICE PACKAGES & LIMITS
- **Monthly Allotted Hours:** <%= monthly_hours %> Hours
- **Extra Hour Rate:** <%= extra_hour_rate %> AED / Hour
- **Rollover of Hours:** <%= rollover_hours ? "Enabled" : "Disabled" %>

## 5. SERVICE LEVEL AGREEMENT (SLA)
Support requests are categorized as below:
- **Priority 1 (Critical):** First Response: 15 Mins | Resolution: 2 Hours
- **Priority 2 (High):** First Response: 30 Mins | Resolution: 4 Hours
- **Priority 3 (Medium):** First Response: 2 Hours | Resolution: 8 Hours
- **Priority 4 (Low):** First Response: 4 Hours | Resolution: 24 Hours

## 6. PAYMENT TERMS
- The AMC fee is payable in advance for each billing cycle.
- Any overage beyond monthly hours will be billed in the following invoice at the agreed extra hour rate.
- All amounts are specified in **AED**.

## 7. TERMINATION
Either party may terminate this agreement with 30 days written notice.

---
**Linotec IT Solutions (Authorized Signatory)**
Name: ______________________
Date: ______________________

**<%= company_name %> (Authorized Signatory)**
Name: ______________________
Date: ______________________
