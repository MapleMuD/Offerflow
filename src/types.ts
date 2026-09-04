export type ApplicationStatus = '待投递' | '已投递' | '笔试' | '面试' | 'Offer' | '已结束'

export interface Application {
  id: string
  company: string
  role: string
  location: string
  status: ApplicationStatus
  appliedAt: string
  deadline: string
  url: string
  priority: '高' | '中' | '低'
  note: string
}

export interface Opportunity {
  id: string
  company: string
  short: string
  role: string
  category: string
  locations: string
  deadline: string | null
  deadlineLabel: string
  officialUrl: string
  verifiedAt: string
  tags: string[]
  color: string
  fit: number
}

export type OutreachStatus = '待筛选' | '待套磁' | '已联系' | '已回复' | '已面谈' | '积极进展' | '已婉拒'

export interface PhdTarget {
  id: string
  group: '中科院/国科大' | '高校'
  institution: string
  city: string
  unit: string
  directions: string[]
  priority: string
  admissionsUrl: string
  facultyUrl: string
  nextAction: string
  note: string
  suggestedMentor?: string
}

export interface OutreachRecord {
  id: string
  targetId: string
  institution: string
  unit: string
  mentor: string
  direction: string
  email: string
  status: OutreachStatus
  firstContactAt: string
  followUpAt: string
  priority: '高' | '中' | '低'
  homepage: string
  note: string
}

export interface CandidateProfile {
  name: string
  graduation: string
  school: string
  degree: string
  major: string
  ranking: string
  research: string
  publications: string
  awards: string
  skills: string
  projects: string
  targets: string
  cities: string
  targetCompanies: string
  targetSchools: string
}
