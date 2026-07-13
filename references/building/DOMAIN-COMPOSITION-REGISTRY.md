# Domain Composition Registry

Compose domain guidance on four independent axes, in this order:

1. Product form: delivery shape and Build completion gate.
2. Product archetype: product mechanics such as SaaS, marketplace, developer
   platform, workflow automation, or internal tool.
3. Industry overlay: domain entities, operator expectations, and failure modes.
4. Regulatory overlay: only evidenced jurisdictions, data classes, and control
   frameworks.

Product form is selected through `references/building/PRODUCT-FORM-ROUTER.md`.
Regulatory and provider details are freshness-sensitive. Verify applicability,
effective date, jurisdiction, and current provider capabilities before making a
commitment.

## Stack profile mappings

| Domain profile | Axis role | Primary stack profile | Common product forms |
|---|---|---|---|
| SaaS / Multi-tenant | Product archetype | SaaS / Multi-tenant | Web application, API or service |
| Marketplace / Platform | Product archetype | Marketplace / Two-sided | Web application, mobile or desktop, API or service |
| Developer Platform / API / SDK | Product archetype | SaaS / Multi-tenant | API or service, CLI or SDK, web application |
| Workflow Automation / Integration | Product archetype | SaaS / Multi-tenant | Web application, API or service |
| Internal Tool / Back-office | Product archetype | Internal Tools / Back-office | Web application, API or service |
| Data / Analytics / BI | Product archetype | Analytics / BI / Dashboards | Data or ML, web application |
| AI / ML / Chat | Product archetype | AI / ML / LLM products | Web application, API or service, data or ML |
| E-commerce / Retail | Archetype and industry | E-commerce / Retail | Web application, mobile or desktop |
| Financial / Fintech / Accounting | Industry overlay | Fintech / Financial | Web application, API or service |
| Healthcare / Medical | Industry and regulatory overlay | Healthcare / Medical | Web application, mobile or desktop, API or service |
| Education / EdTech / LMS | Industry overlay | Education / LMS | Web application, mobile or desktop |
| Customer Support / Helpdesk | Product archetype | Customer Support / Helpdesk | Web application |
| Marketing / CRM / Sales | Product archetype | CRM / Sales / Marketing | Web application, API or service |
| Logistics / Supply Chain / Fleet | Industry overlay | Internal Tools / Back-office | Web application, mobile or desktop, data or ML |
| HR / People / Payroll | Industry overlay | SaaS / Multi-tenant | Web application |
| Project Management / Collaboration | Product archetype | SaaS / Multi-tenant | Web application, mobile or desktop |
| IoT / Device Management | Industry overlay | Internal Tools / Back-office | Web application, API or service, infrastructure or IaC |
| Travel / Hospitality / Booking | Industry overlay | Marketplace / Two-sided | Web application, mobile or desktop |
| Sports / Fitness | Industry overlay | SaaS / Multi-tenant | Web application, mobile or desktop |
| Real Estate / Property Management | Industry overlay | SaaS / Multi-tenant | Web application, mobile or desktop |
| Restaurant / Food Service | Industry overlay | E-commerce / Retail | Web application, mobile or desktop |
| Legal / Law Firm | Industry overlay | SaaS / Multi-tenant | Web application |
| Non-profit / Fundraising | Industry overlay | CRM / Sales / Marketing | Web application |
| Media / Streaming | Industry overlay | CMS / Content / Blog | Web application, mobile or desktop |
| Agriculture / Farm Management | Industry overlay | Internal Tools / Back-office | Mobile or desktop, data or ML |
| Entertainment / Events | Industry overlay | E-commerce / Retail | Web application, mobile or desktop |
| Gaming / Esports | Industry overlay | SaaS / Multi-tenant | Web application, API or service |
| Cybersecurity / SOC | Industry overlay | Analytics / BI / Dashboards | Web application, data or ML |
| Construction / Field Services | Industry overlay | Internal Tools / Back-office | Mobile or desktop, web application |
| Insurance / InsurTech | Industry overlay | Fintech / Financial | Web application, API or service |
| Telecommunications / ISP | Industry overlay | Internal Tools / Back-office | Web application, API or service, infrastructure or IaC |
| Energy / Utilities | Industry overlay | Analytics / BI / Dashboards | Web application, data or ML, infrastructure or IaC |
| Government / Public Sector | Industry and regulatory overlay | Internal Tools / Back-office | Web application, mobile or desktop |
| Recruiting / ATS | Product archetype and industry | SaaS / Multi-tenant | Web application |
| Co-working Space / Shared Office | Industry overlay | SaaS / Multi-tenant | Web application, mobile or desktop |
| Manufacturing / MES | Industry overlay | Internal Tools / Back-office | Web application, mobile or desktop, infrastructure or IaC |
| Research / Lab / LIMS | Industry overlay | Internal Tools / Back-office | Web application, data or ML |

This registry selects the smallest directly applicable guidance set. When the
repository lacks a focused profile for the selected industry, infer constraints
from current project evidence, label the inference, and record the missing
profile as a context gap instead of loading unrelated industries.

## Composition rules

- A developer platform is a product archetype, not an industry. Add a customer
  industry only when the platform itself encodes that industry's rules.
- SaaS and marketplace describe product mechanics. They can combine with
  healthcare, manufacturing, research, or other industry overlays.
- Analytics or BI can be an archetype or a secondary capability. Do not force
  OLAP infrastructure onto modest operational reporting.
- Research / Lab / LIMS remains an industry overlay because sample custody,
  instrument provenance, and method versioning are stable constraints.
  Clinical research adds healthcare and applicable regulatory overlays.
- When two stack profiles apply, score the primary profile first, then add only
  hard constraints from the secondary profile. Do not average full matrices.
- Regulatory language is a routing signal, not legal advice. Record uncertain
  applicability as an open question with an owner and due date.

## Required route evidence

Before Architecture, Stack, or Build closes, record:

- Primary product form and its observable distribution channel.
- Product archetype or an explicit statement that none applies.
- Industry overlay or an explicit statement that none is evidenced.
- Regulatory overlay or an explicit statement that none is evidenced.
- Primary stack profile plus any secondary hard constraints.
- Form-specific vertical-slice definition and completion evidence.
