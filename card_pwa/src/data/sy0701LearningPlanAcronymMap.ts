/**
 * AI_CONTEXT:
 * Role: Explicit, reviewable mapping of the real cards in the
 *       `sy0-701-acronyms-bonus` deck to SY0-701 learning-plan objectives.
 * Source: `content/sy0-701/source/cards-snapshot.json`, card front content,
 *         and the official V7 objective hierarchy.
 * Important: `cardId` is the only progress key. A reference may occur in
 *            several objectives, but no card or scheduler state is copied.
 */

export const SY0701_ACRONYM_DECK_ID = 'sy0-701-acronyms-bonus'
export const SY0701_ACRONYM_DECK_NAME = 'Acronym-Bonus (ABCD + PBQ)'

export interface Sy0701LearningPlanAcronymReference {
  cardId: string
  label: string
  objectiveIds: readonly string[]
  rationale: string
}

export const SY0701_LEARNING_PLAN_ACRONYM_REFERENCES:
readonly Sy0701LearningPlanAcronymReference[] = [
  {
    cardId: '1779724748973',
    label: 'Cloud & Zero Trust: CASB, SASE, ZTNA, IaaS, PaaS, SaaS',
    objectiveIds: ['1.2', '3.1'],
    rationale: 'Zero Trust belongs to 1.2; cloud architecture and service models belong to 3.1.',
  },
  {
    cardId: '1779724748974',
    label: 'Detection & Response: EDR, XDR, MDR, SOAR, SIEM',
    objectiveIds: ['4.4', '4.5', '4.7'],
    rationale: 'Monitoring/MDR/SIEM, enterprise detection, and orchestration span objectives 4.4, 4.5, and 4.7.',
  },
  {
    cardId: '1779724748975',
    label: 'Resilienz: MTBF, MTTR, RTO, RPO',
    objectiveIds: ['3.4'],
    rationale: 'All four terms measure resiliency and recovery.',
  },
  {
    cardId: '1779724748976',
    label: 'E-Mail-Schutz: SPF, DKIM, DMARC, S/MIME',
    objectiveIds: ['4.5'],
    rationale: 'Secure enterprise mail protocols and their implementation belong to 4.5.',
  },
  {
    cardId: '1779724748977',
    label: 'Mobile Strategien: BYOD, COPE, CYOD, MDM',
    objectiveIds: ['4.1'],
    rationale: 'Mobile-device deployment and management techniques belong to 4.1.',
  },
  {
    cardId: '1780262916255',
    label: 'CASB',
    objectiveIds: ['3.1'],
    rationale: 'Cloud architecture control point between users and SaaS applications.',
  },
  {
    cardId: '1780262916256',
    label: 'SASE',
    objectiveIds: ['3.1'],
    rationale: 'Cloud-edge architecture combining networking and security services.',
  },
  {
    cardId: '1780262916257',
    label: 'ZTNA',
    objectiveIds: ['1.2'],
    rationale: 'Identity- and context-based application access is a Zero Trust concept.',
  },
  {
    cardId: '1780262916258',
    label: 'SBOM',
    objectiveIds: ['5.3'],
    rationale: 'Software supply-chain inventory supports third-party risk management.',
  },
  {
    cardId: '1780262916259',
    label: 'SED',
    objectiveIds: ['1.4'],
    rationale: 'A self-encrypting drive is a cryptographic solution for data at rest.',
  },
  {
    cardId: '1780262916260',
    label: 'STIX & TAXII',
    objectiveIds: ['4.3'],
    rationale: 'Structured threat information and its exchange support vulnerability intelligence workflows.',
  },
  {
    cardId: '1780262916261',
    label: 'SOAR',
    objectiveIds: ['4.7'],
    rationale: 'Automated playbooks are security orchestration and automation.',
  },
  {
    cardId: '1780262916262',
    label: 'MDR',
    objectiveIds: ['4.4'],
    rationale: 'Managed detection and response is an operational monitoring capability.',
  },
  {
    cardId: '1780262916263',
    label: 'RPO',
    objectiveIds: ['3.4'],
    rationale: 'Recovery point objective is a recovery and resiliency metric.',
  },
  {
    cardId: '1780262916264',
    label: 'MTTR',
    objectiveIds: ['3.4'],
    rationale: 'Mean time to repair/restore is a recovery metric.',
  },
  {
    cardId: '1780262916265',
    label: 'DMARC',
    objectiveIds: ['4.5'],
    rationale: 'DMARC is an enterprise email authentication policy protocol.',
  },
  {
    cardId: '1780262916266',
    label: 'COPE',
    objectiveIds: ['4.1'],
    rationale: 'Corporate-owned, personally enabled is a mobile-device deployment model.',
  },
  {
    cardId: '1780262916267',
    label: 'Cloud-Modelle: IaaS → PaaS → SaaS',
    objectiveIds: ['3.1'],
    rationale: 'Cloud service responsibility models are architecture models.',
  },
  {
    cardId: '1780262916268',
    label: 'Mobile Kontrolle: BYOD → CYOD → COPE',
    objectiveIds: ['4.1'],
    rationale: 'The ordering compares mobile-device deployment strategies.',
  },
  {
    cardId: '1781206500001',
    label: 'SIEM',
    objectiveIds: ['4.4'],
    rationale: 'SIEM centralizes operational log monitoring and alerting.',
  },
  {
    cardId: '1781206500002',
    label: 'EDR',
    objectiveIds: ['4.5'],
    rationale: 'Endpoint detection and response is an enterprise security capability.',
  },
  {
    cardId: '1781206500003',
    label: 'XDR',
    objectiveIds: ['4.5'],
    rationale: 'Extended detection and response is an enterprise security capability.',
  },
  {
    cardId: '1781206500004',
    label: 'MDR',
    objectiveIds: ['4.4'],
    rationale: 'Managed detection and response is an operational monitoring capability.',
  },
  {
    cardId: '1781206500005',
    label: 'SPF',
    objectiveIds: ['4.5'],
    rationale: 'SPF is an enterprise email authentication protocol.',
  },
  {
    cardId: '1781206500006',
    label: 'DKIM',
    objectiveIds: ['4.5'],
    rationale: 'DKIM is an enterprise email authentication protocol.',
  },
  {
    cardId: '1781206500007',
    label: 'S/MIME',
    objectiveIds: ['4.5'],
    rationale: 'S/MIME secures enterprise email with certificates.',
  },
  {
    cardId: '1781206500008',
    label: 'DMARC',
    objectiveIds: ['4.5'],
    rationale: 'DMARC is the policy and reporting layer for enterprise email authentication.',
  },
  {
    cardId: '1781206500009',
    label: 'STIX',
    objectiveIds: ['4.3'],
    rationale: 'STIX structures vulnerability and threat-intelligence data.',
  },
  {
    cardId: '1781206500010',
    label: 'TAXII',
    objectiveIds: ['4.3'],
    rationale: 'TAXII transports vulnerability and threat-intelligence data.',
  },
  {
    cardId: '1781206500011',
    label: 'SCAP',
    objectiveIds: ['4.3'],
    rationale: 'SCAP standardizes automated security configuration and vulnerability checks.',
  },
  {
    cardId: '1781206500012',
    label: 'DLP',
    objectiveIds: ['3.3'],
    rationale: 'Data loss prevention protects data in its different states.',
  },
  {
    cardId: '1781206500013',
    label: 'IAM',
    objectiveIds: ['4.6'],
    rationale: 'Identity and access management directly belongs to objective 4.6.',
  },
  {
    cardId: '1781206500014',
    label: 'PAM',
    objectiveIds: ['4.6'],
    rationale: 'Privileged access management is an identity and access control capability.',
  },
  {
    cardId: '1781206500015',
    label: 'CASB',
    objectiveIds: ['3.1'],
    rationale: 'A CASB is a cloud architecture control point.',
  },
  {
    cardId: '1781206500016',
    label: 'SASE',
    objectiveIds: ['3.1'],
    rationale: 'SASE is a cloud-edge security architecture model.',
  },
  {
    cardId: '1781206500017',
    label: 'ZTNA',
    objectiveIds: ['1.2'],
    rationale: 'ZTNA implements the Zero Trust concept.',
  },
  {
    cardId: '1781206500018',
    label: 'SBOM',
    objectiveIds: ['5.3'],
    rationale: 'An SBOM makes software supply-chain and third-party risk visible.',
  },
  {
    cardId: '1781206500019',
    label: 'SED',
    objectiveIds: ['1.4'],
    rationale: 'A self-encrypting drive is a cryptographic data-at-rest solution.',
  },
  {
    cardId: '1781206500020',
    label: 'RTO',
    objectiveIds: ['3.4'],
    rationale: 'Recovery time objective is a recovery and resiliency metric.',
  },
  {
    cardId: '1781206500021',
    label: 'RPO',
    objectiveIds: ['3.4'],
    rationale: 'Recovery point objective is a recovery and resiliency metric.',
  },
  {
    cardId: '1781206500022',
    label: 'MTBF',
    objectiveIds: ['3.4'],
    rationale: 'Mean time between failures is a resiliency metric.',
  },
  {
    cardId: '1781206500023',
    label: 'MTTR',
    objectiveIds: ['3.4'],
    rationale: 'Mean time to repair/restore is a recovery metric.',
  },
  {
    cardId: '1781206500024',
    label: 'COPE',
    objectiveIds: ['4.1'],
    rationale: 'COPE is a mobile-device deployment strategy.',
  },
]

export const SY0701_LEARNING_PLAN_ACRONYM_CARD_IDS = Object.freeze(
  SY0701_LEARNING_PLAN_ACRONYM_REFERENCES.map(reference => reference.cardId),
)
