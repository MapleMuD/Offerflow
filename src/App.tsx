import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight, Award, Bell, BookOpen, BriefcaseBusiness, Building2, CalendarClock,
  CalendarDays, Check, ChevronDown, CircleHelp, Code2, Database, Download, ExternalLink,
  FileText, Flame, Gauge, GraduationCap, LayoutDashboard, ListFilter, LockKeyhole, Mail, Menu,
  Pencil, Plus, Radar, Save, Search, ShieldCheck, Sparkles, Target, Trash2, Trophy,
  Upload, UserRound, X
} from 'lucide-react'
import { opportunities, outreachStatusOptions, phdTargets, statusOptions } from './data'
import type { Application, ApplicationStatus, CandidateProfile, Opportunity, OutreachRecord, OutreachStatus, PhdTarget } from './types'
import { LocalAccountGate, LocalAccountModal } from './LocalAccountUI'
import {
  getCurrentAccount, loadAccountData, saveAccountData,
  type AccountData, type LocalAccount,
} from './localAccounts'

const STORAGE_KEY = 'offerflow-applications-v1'
const PROFILE_KEY = 'offerflow-profile-v2'
const OUTREACH_KEY = 'offerflow-phd-outreach-v1'

type PageName = '总览' | '博士申请' | '投递管理' | '官网情报' | '截止日历' | '个人档案' | '数据备份'

const routes: Record<PageName, string> = {
  总览: 'overview', 博士申请: 'phd', 投递管理: 'applications', 官网情报: 'radar',
  截止日历: 'calendar', 个人档案: 'profile', 数据备份: 'backup'
}
const pageByRoute = Object.fromEntries(Object.entries(routes).map(([name, route]) => [route, name])) as Record<string, PageName>

const defaultProfile: CandidateProfile = {
  name: '新用户', graduation: '', school: '', degree: '', major: '', ranking: '', research: '', publications: '',
  awards: '', skills: '', projects: '', targets: '', cities: '', targetCompanies: '', targetSchools: ''
}

const blankAccountData: AccountData = { profile: defaultProfile, applications: [], outreachRecords: [] }

const statusClass: Record<ApplicationStatus, string> = { 待投递: 'neutral', 已投递: 'blue', 笔试: 'violet', 面试: 'orange', Offer: 'green', 已结束: 'muted' }
const outreachStatusClass: Record<OutreachStatus, string> = { 待筛选: 'neutral', 待套磁: 'violet', 已联系: 'blue', 已回复: 'orange', 已面谈: 'orange', 积极进展: 'green', 已婉拒: 'muted' }
const initialForm: Omit<Application, 'id'> = { company: '', role: '', location: '', status: '待投递', appliedAt: '', deadline: '', url: '', priority: '中', note: '' }
const initialOutreachForm: Omit<OutreachRecord, 'id'> = { targetId: '', institution: '', unit: '', mentor: '', direction: '', email: '', status: '待套磁', firstContactAt: '', followUpAt: '', priority: '高', homepage: '', note: '' }

function readStored<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
function readProfile(): CandidateProfile {
  try {
    const old = JSON.parse(localStorage.getItem(PROFILE_KEY) || localStorage.getItem('offerflow-profile-v1') || '{}')
    return { ...defaultProfile, ...old }
  } catch { return defaultProfile }
}
function readLegacyData(): AccountData {
  return {
    profile: readProfile(),
    applications: readStored(STORAGE_KEY, [] as Application[]),
    outreachRecords: readStored(OUTREACH_KEY, [] as OutreachRecord[]),
  }
}
function daysUntil(date: string) {
  if (!date) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86400000)
}
function splitTerms(value: string) { return value.split(/[、,，;/；|\s]+/).map(x => x.trim().toLowerCase()).filter(x => x.length > 1) }
function countProfileItems(value: string) { return value.split(/[；;\n]+/).map(item => item.trim()).filter(Boolean).length }
function opportunityMatch(opp: Opportunity, profile: CandidateProfile) {
  const source = `${profile.targets} ${profile.skills} ${profile.research} ${profile.projects}`.toLowerCase()
  const target = `${opp.role} ${opp.category} ${opp.tags.join(' ')}`.toLowerCase()
  const terms = splitTerms(source).filter(term => target.includes(term) || (term.includes('图神经网络') && /算法|ai|机器学习/.test(target)))
  const companyHit = splitTerms(profile.targetCompanies).some(x => opp.company.toLowerCase().includes(x))
  const cityHit = splitTerms(profile.cities).some(x => opp.locations.toLowerCase().includes(x))
  let fit = 58 + Math.min(terms.length, 5) * 6 + (companyHit ? 12 : 0) + (cityHit ? 5 : 0) + (opp.tags.includes('2027届') ? 4 : 0)
  const reasons = [terms.length ? `命中 ${terms.slice(0, 2).join('、')}` : '具备计算机复合背景', companyHit ? '目标公司' : '', cityHit ? '城市匹配' : ''].filter(Boolean)
  return { fit: Math.min(98, fit), reasons }
}
function targetMatch(target: PhdTarget, profile: CandidateProfile) {
  const source = `${profile.research} ${profile.skills} ${profile.targetSchools}`.toLowerCase()
  const hits = target.directions.filter(x => source.includes(x.toLowerCase()) || (/ai|机器学习|模式识别|数据/.test(x.toLowerCase()) && /人工智能|图神经网络|机器学习|数据/.test(source)))
  const schoolHit = splitTerms(profile.targetSchools).some(x => target.institution.toLowerCase().includes(x) || (x.includes('中国科学院') && target.group === '中科院/国科大'))
  return { fit: Math.min(98, 60 + Math.min(hits.length, 4) * 7 + (schoolHit ? 10 : 0)), reasons: hits.slice(0, 3) }
}

function App({ account, onSessionEnd }: { account: LocalAccount, onSessionEnd: () => void }) {
  const initialPage = pageByRoute[window.location.hash.replace('#/', '')] || '总览'
  const initialAccountData = useRef(loadAccountData(account.id, blankAccountData)).current
  const [activeNav, setActiveNav] = useState<PageName>(initialPage)
  const [applications, setApplications] = useState<Application[]>(initialAccountData.applications)
  const [outreachRecords, setOutreachRecords] = useState<OutreachRecord[]>(initialAccountData.outreachRecords)
  const [profile, setProfile] = useState<CandidateProfile>({ ...defaultProfile, ...initialAccountData.profile })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部状态')
  const [oppFilter, setOppFilter] = useState('为我推荐')
  const [outreachFilter, setOutreachFilter] = useState('全部状态')
  const [targetFilter, setTargetFilter] = useState('全部目标')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)
  const [outreachOpen, setOutreachOpen] = useState(false)
  const [editingOutreachId, setEditingOutreachId] = useState<string | null>(null)
  const [outreachForm, setOutreachForm] = useState(initialOutreachForm)
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    saveAccountData(account.id, { profile, applications, outreachRecords })
  }, [account.id, applications, outreachRecords, profile])
  useEffect(() => {
    const onHash = () => setActiveNav(pageByRoute[window.location.hash.replace('#/', '')] || '总览')
    window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(t) }, [toast])

  const stats = useMemo(() => ({
    total: applications.length,
    active: applications.filter(a => !['待投递', '已结束'].includes(a.status)).length,
    interviews: applications.filter(a => a.status === '面试').length,
    offers: applications.filter(a => a.status === 'Offer').length,
    upcoming: applications.filter(a => { const d = daysUntil(a.deadline); return d !== null && d >= 0 && d <= 7 }).length
  }), [applications])
  const profileCounts = useMemo(() => ({
    publications: countProfileItems(profile.publications),
    awards: countProfileItems(profile.awards),
    projects: countProfileItems(profile.projects),
  }), [profile.awards, profile.projects, profile.publications])

  const matchedOpportunities = useMemo(() => opportunities.map(opp => ({ ...opp, match: opportunityMatch(opp, profile) })), [profile])
  const visibleOpportunities = useMemo(() => matchedOpportunities.filter(o => {
    if (oppFilter === 'AI / 算法') return o.tags.includes('AI专项') || /技术|算法|研究/.test(o.category)
    if (oppFilter === '应届校招') return o.tags.includes('2027届') || o.tags.includes('校招')
    return true
  }).sort((a, b) => b.match.fit - a.match.fit), [matchedOpportunities, oppFilter])

  const visibleTargets = useMemo(() => phdTargets.filter(target => {
    const groupMatch = targetFilter === '全部目标' || (targetFilter === '中科院' ? target.group === '中科院/国科大' : target.institution === targetFilter)
    const query = search.trim().toLowerCase()
    return groupMatch && (!query || `${target.institution}${target.unit}${target.directions.join('')}`.toLowerCase().includes(query))
  }).map(target => ({ ...target, match: targetMatch(target, profile) })).sort((a, b) => b.match.fit - a.match.fit), [profile, search, targetFilter])

  const filteredApps = useMemo(() => applications.filter(app => {
    const query = search.trim().toLowerCase()
    return (!query || `${app.company}${app.role}${app.location}${app.note}`.toLowerCase().includes(query)) && (statusFilter === '全部状态' || app.status === statusFilter)
  }).sort((a, b) => (b.appliedAt ? Date.parse(b.appliedAt) : 0) - (a.appliedAt ? Date.parse(a.appliedAt) : 0)), [applications, search, statusFilter])

  const filteredOutreach = useMemo(() => outreachRecords.filter(record => {
    const query = search.trim().toLowerCase()
    return (!query || `${record.institution}${record.unit}${record.mentor}${record.direction}${record.note}`.toLowerCase().includes(query)) && (outreachFilter === '全部状态' || record.status === outreachFilter)
  }), [outreachRecords, outreachFilter, search])

  const outreachStats = useMemo(() => ({
    total: outreachRecords.length, contacted: outreachRecords.filter(x => !['待筛选', '待套磁'].includes(x.status)).length,
    replied: outreachRecords.filter(x => ['已回复', '已面谈', '积极进展'].includes(x.status)).length,
    followUps: outreachRecords.filter(x => { const d = daysUntil(x.followUpAt); return d !== null && d >= 0 && d <= 7 }).length
  }), [outreachRecords])

  const calendarItems = useMemo(() => [
    ...applications.filter(x => x.deadline).map(x => ({ id: `a-${x.id}`, date: x.deadline, type: '投递截止', title: `${x.company} · ${x.role}`, note: x.status })),
    ...outreachRecords.filter(x => x.followUpAt).map(x => ({ id: `o-${x.id}`, date: x.followUpAt, type: '套磁跟进', title: `${x.institution} · ${x.mentor}`, note: x.status }))
  ].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)), [applications, outreachRecords])

  const navigate = (name: PageName) => { window.location.hash = `/${routes[name]}`; setActiveNav(name); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openAdd = (opp?: Opportunity) => { setEditingId(null); setForm({ ...initialForm, company: opp?.company || '', role: opp?.role || '', location: opp?.locations || '', deadline: opp?.deadline || '', url: opp?.officialUrl || '', priority: opp && opportunityMatch(opp, profile).fit >= 90 ? '高' : '中', note: opp ? `${opp.category}｜官网核验 ${opp.verifiedAt}` : '' }); setModalOpen(true) }
  const openEdit = (app: Application) => { const { id: _, ...rest } = app; setEditingId(app.id); setForm(rest); setModalOpen(true) }
  const saveApplication = (event: React.FormEvent) => { event.preventDefault(); if (!form.company.trim() || !form.role.trim()) return; setApplications(list => editingId ? list.map(x => x.id === editingId ? { ...form, id: editingId } : x) : [{ ...form, id: crypto.randomUUID() }, ...list]); setModalOpen(false); setToast(editingId ? '投递信息已更新' : '已加入投递计划') }
  const removeApplication = (id: string) => { if (!window.confirm('确认删除这条投递记录吗？')) return; setApplications(list => list.filter(x => x.id !== id)); setToast('记录已删除') }
  const openOutreach = (target?: PhdTarget) => { setEditingOutreachId(null); setOutreachForm({ ...initialOutreachForm, targetId: target?.id || '', institution: target?.institution || '', unit: target?.unit || '', mentor: target?.suggestedMentor || '', direction: target?.directions[0] || '', homepage: target?.facultyUrl || '', note: target ? target.nextAction : '' }); setOutreachOpen(true) }
  const openOutreachEdit = (record: OutreachRecord) => { const { id: _, ...rest } = record; setEditingOutreachId(record.id); setOutreachForm(rest); setOutreachOpen(true) }
  const saveOutreach = (event: React.FormEvent) => { event.preventDefault(); if (!outreachForm.institution.trim() || !outreachForm.mentor.trim()) return; setOutreachRecords(list => editingOutreachId ? list.map(x => x.id === editingOutreachId ? { ...outreachForm, id: editingOutreachId } : x) : [{ ...outreachForm, id: crypto.randomUUID() }, ...list]); setOutreachOpen(false); setToast(editingOutreachId ? '套磁记录已更新' : '已加入套磁记录') }
  const removeOutreach = (id: string) => { if (!window.confirm('确认删除这条套磁记录吗？')) return; setOutreachRecords(list => list.filter(x => x.id !== id)); setToast('套磁记录已删除') }
  const exportData = () => { const blob = new Blob([JSON.stringify({ profile, applications, outreachRecords, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `OfferFlow-数据备份-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); setToast('备份文件已导出') }
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(String(reader.result)); if (!Array.isArray(data.applications)) throw new Error(); setApplications(data.applications); if (Array.isArray(data.outreachRecords)) setOutreachRecords(data.outreachRecords); if (data.profile) setProfile({ ...defaultProfile, ...data.profile }); setToast('备份数据已导入') } catch { setToast('文件格式不正确') } }; reader.readAsText(file); event.target.value = '' }

  const navItems: [PageName, typeof LayoutDashboard][] = [['总览', LayoutDashboard], ['博士申请', GraduationCap], ['投递管理', BriefcaseBusiness], ['官网情报', Radar], ['截止日历', CalendarDays]]
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Check size={18}/></span><span>Offer<span>Flow</span></span></div>
      <button className="close-mobile" onClick={() => setMobileNav(false)} aria-label="关闭导航"><X/></button>
      <div className="season"><span className="season-icon"><Flame size={17}/></span><div><strong>2027 秋招季</strong><small>个人申请管理中</small></div><span className="live-dot"/></div>
      <nav><p>工作台</p>{navItems.map(([label, Icon]) => <button key={label} className={activeNav === label ? 'active' : ''} onClick={() => navigate(label)}><Icon size={18}/><span>{label}</span>{label === '官网情报' && <i>{opportunities.length}</i>}</button>)}<p>我的空间</p><button className={activeNav === '个人档案' ? 'active' : ''} onClick={() => navigate('个人档案')}><UserRound size={18}/><span>个人档案</span></button><button className={activeNav === '数据备份' ? 'active' : ''} onClick={() => navigate('数据备份')}><Database size={18}/><span>数据备份</span></button></nav>
      <button className="profile-card" onClick={() => navigate('个人档案')}><span className="avatar">{profile.name.trim().slice(0, 1) || account.displayName.slice(0, 1)}</span><span><strong>{profile.name || account.displayName}</strong><small>{profile.graduation || '完善个人档案'}</small></span><ArrowUpRight size={16}/></button>
    </aside>
    <main>
      <header><button className="menu-button" onClick={() => setMobileNav(true)} aria-label="打开导航"><Menu/></button><div className="page-location"><small>OfferFlow</small><strong>{activeNav}</strong></div><div className="global-search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索公司、岗位、院校或导师"/></div><div className="header-actions"><button className="account-trigger" onClick={() => setAccountOpen(true)} title="管理本机账号"><LockKeyhole size={16}/><span>{account.displayName}</span><small>本机账号</small></button><button className="icon-button" title="临期提醒"><Bell size={20}/>{stats.upcoming > 0 && <span/>}</button>{activeNav === '博士申请' ? <button className="primary" onClick={() => openOutreach()}><Plus size={17}/> 新增套磁</button> : ['总览','投递管理','官网情报'].includes(activeNav) ? <button className="primary" onClick={() => openAdd()}><Plus size={17}/> 新增投递</button> : null}</div></header>
      <div className="content page-content">
        {activeNav === '总览' && <>
          <PageTitle title={`你好，${profile.name}`} description="今天需要推进的投递、套磁与截止日期都集中在这里。" icon={<LayoutDashboard/>}/>
          <section className="stats-grid"><Metric icon={<BriefcaseBusiness/>} label="投递总数" value={stats.total} hint="全部记录" color="orange"/><Metric icon={<Gauge/>} label="进行中" value={stats.active} hint="等待下一进展" color="blue"/><Metric icon={<CalendarDays/>} label="面试阶段" value={stats.interviews} hint="及时准备" color="violet"/><Metric icon={<Check/>} label="收到 Offer" value={stats.offers} hint="持续推进" color="green"/></section>
          <button className="profile-banner" onClick={() => navigate('个人档案')}><span className="profile-glow"><Sparkles/></span><span className="profile-copy"><small>实时匹配已启用</small><strong>简历画像已连接到公司与博士目标</strong><span>{profile.research || '完善研究方向与求职偏好后，推荐结果会更准确'}</span></span><span className="profile-proof"><b>{profileCounts.publications}</b><small>项学术成果</small></span><span className="profile-proof"><b>{profileCounts.awards}</b><small>项竞赛荣誉</small></span><span className="banner-link">管理档案 <ArrowUpRight size={16}/></span></button>
          <section className="overview-grid"><div className="panel compact-panel"><div className="panel-head"><div><h2>最近投递</h2><p>已按投递日期从新到旧排列</p></div><button className="text-button" onClick={() => navigate('投递管理')}>全部记录 <ArrowUpRight size={15}/></button></div><QuickApplications items={filteredApps.slice(0, 4)}/></div><div className="panel compact-panel"><div className="panel-head"><div><h2>优先推荐</h2><p>根据个人档案实时计算</p></div><button className="text-button" onClick={() => navigate('官网情报')}>招聘雷达 <ArrowUpRight size={15}/></button></div><div className="quick-list">{visibleOpportunities.slice(0, 4).map(x => <div key={x.id}><span className="mini-logo">{x.short}</span><p><b>{x.company}</b><small>{x.role}</small></p><strong>{x.match.fit}%</strong></div>)}</div></div></section>
        </>}

        {activeNav === '博士申请' && <>
          <PageTitle title="博士申请与套磁" description="聚焦中科院、武汉大学与天津大学，按研究方向实时排序。" icon={<GraduationCap/>}/>
          <section className="phd-section"><div className="outreach-metrics"><MiniMetric label="目标单位" value={phdTargets.length} hint="6 个中科院体系"/><MiniMetric label="已建记录" value={outreachStats.total} hint="按导师管理"/><MiniMetric label="已联系" value={outreachStats.contacted} hint="邮件已发出"/><MiniMetric label="有效回复" value={outreachStats.replied} hint={outreachStats.followUps ? `${outreachStats.followUps} 条近期跟进` : '等待进展'}/></div><div className="target-toolbar"><div className="filter-chips">{['全部目标','中科院','武汉大学','天津大学'].map(x => <button key={x} className={targetFilter === x ? 'active' : ''} onClick={() => setTargetFilter(x)}>{x}</button>)}</div><span>{visibleTargets.length} 个目标单位</span></div><div className="target-grid">{visibleTargets.map(target => <article className={`target-card ${target.group === '中科院/国科大' ? 'cas' : 'university'}`} key={target.id}><div className="target-title"><span><Building2 size={17}/></span><div><small>{target.group} · {target.city}</small><h3>{target.institution}</h3><p>{target.unit}</p></div><b>{target.match.fit}% 匹配</b></div><div className="tags">{target.directions.slice(0, 6).map(tag => <span key={tag}>{tag}</span>)}</div><p className="match-copy">{target.match.reasons.length ? `匹配：${target.match.reasons.join('、')}` : '建议结合导师论文进一步判断'}</p><p className="next-action"><Sparkles size={14}/><span><b>下一步：</b>{target.nextAction}</span></p><div className="target-actions"><button onClick={() => openOutreach(target)}><Mail size={15}/> 记录导师</button><a href={target.facultyUrl} target="_blank" rel="noreferrer">导师入口 <ExternalLink size={13}/></a><a href={target.admissionsUrl} target="_blank" rel="noreferrer">招生信息 <ExternalLink size={13}/></a></div></article>)}</div><div className="outreach-list-head"><div><h3>套磁流水</h3><p>记录首次联系、下次跟进和回复状态</p></div><div className="select-wrap"><ListFilter size={15}/><select value={outreachFilter} onChange={e => setOutreachFilter(e.target.value)}><option>全部状态</option>{outreachStatusOptions.map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={14}/></div></div><OutreachTable items={filteredOutreach} setItems={setOutreachRecords} onEdit={openOutreachEdit} onRemove={removeOutreach}/></section>
        </>}

        {activeNav === '投递管理' && <><PageTitle title="投递信息管理" description="默认按投递日期从新到旧自动排序，待投递记录排列在后。" icon={<BriefcaseBusiness/>}/><section className="panel"><div className="panel-head"><div><h2>全部投递</h2><p>{filteredApps.length} 条记录 · 自动日期排序</p></div><div className="panel-tools"><div className="select-wrap"><ListFilter size={15}/><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>全部状态</option>{statusOptions.map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={14}/></div><span className="sort-note"><CalendarClock size={15}/> 最新投递优先</span></div></div><ApplicationsTable items={filteredApps} setItems={setApplications} onEdit={openEdit} onRemove={removeApplication}/></section></>}

        {activeNav === '官网情报' && <><PageTitle title="官网招聘雷达" description="岗位匹配度由个人档案实时计算，招聘状态仍以企业官网为准。" icon={<Radar/>}/><section className="radar-section"><div className="panel-head"><div><h2>适合你的机会</h2><p>档案字段发生变化后自动重新排序</p></div><div className="filter-chips">{['为我推荐','AI / 算法','应届校招'].map(x => <button key={x} className={oppFilter === x ? 'active' : ''} onClick={() => setOppFilter(x)}>{x}</button>)}</div></div><div className="opportunity-grid">{visibleOpportunities.map(opp => <article className="opportunity" key={opp.id}><div className="opp-top"><span className="company-logo" style={{'--brand-color': opp.color} as React.CSSProperties}>{opp.short}</span><span className="fit"><Sparkles size={13}/> {opp.match.fit}% 匹配</span></div><h3>{opp.company}</h3><h4>{opp.role}</h4><p>{opp.category}</p><small>{opp.locations}</small><div className="match-reasons">{opp.match.reasons.map(x => <span key={x}>{x}</span>)}</div><div className="deadline"><CalendarDays size={16}/><div><small>网申状态</small><b>{opp.deadlineLabel}</b></div></div><div className="source-note"><Check size={13}/> 官方来源 · {opp.verifiedAt} 核验</div><div className="opp-actions"><button onClick={() => openAdd(opp)}><Plus size={16}/> 加入计划</button><a href={opp.officialUrl} target="_blank" rel="noreferrer">进入官网 <ExternalLink size={14}/></a></div></article>)}</div><div className="accuracy-note"><CircleHelp size={17}/><p><b>更新说明：</b>自动抓取官网职位暂未启用。本版保留官网直达、核验日期和动态匹配，避免展示未经确认的职位信息。</p></div></section></>}

        {activeNav === '截止日历' && <><PageTitle title="截止日期与跟进" description="把企业截止日期和导师跟进日期合并到一条时间线。" icon={<CalendarDays/>}/><section className="panel calendar-panel">{calendarItems.length ? <div className="timeline">{calendarItems.map(item => { const days = daysUntil(item.date); return <article key={item.id} className={days !== null && days < 0 ? 'past' : days !== null && days <= 7 ? 'urgent' : ''}><time>{item.date}</time><span className="timeline-mark"/><div><small>{item.type}</small><h3>{item.title}</h3><p>{days === null ? item.note : days < 0 ? `已过去 ${Math.abs(days)} 天` : days === 0 ? '今天' : `${days} 天后`} · {item.note}</p></div></article>})}</div> : <Empty icon={<CalendarDays/>} title="暂无日期安排" text="在投递记录中填写截止日期，或在套磁记录中填写下次跟进日期。"/>}</section></>}

        {activeNav === '个人档案' && <><PageTitle title="个人档案与实时匹配" description="内容来自你的简历，修改任一字段后，公司与博士目标的匹配结果会立即更新。" icon={<UserRound/>}/><section className="profile-layout"><div className="profile-score"><div className="profile-score-head"><span><Sparkles/></span><div><small>画像完整度</small><strong>已连接推荐引擎</strong></div></div><div className="profile-highlights"><span><BookOpen/><b>{profileCounts.publications} 项</b><small>学术成果</small></span><span><Trophy/><b>{profileCounts.awards} 项</b><small>竞赛荣誉</small></span><span><Code2/><b>{profileCounts.projects} 项</b><small>项目经历</small></span></div><p>推荐排序只在当前浏览器计算，内容自动保存到账号“{account.username}”的本机空间。</p></div><form className="profile-editor" onSubmit={e => { e.preventDefault(); setToast('个人档案已保存，匹配结果已更新') }}><ProfileGroup title="基本与教育" icon={<GraduationCap/>}><ProfileField label="姓名" value={profile.name} onChange={name => setProfile({ ...profile, name })}/><ProfileField label="毕业届别" value={profile.graduation} onChange={graduation => setProfile({ ...profile, graduation })}/><ProfileField label="学校" value={profile.school} onChange={school => setProfile({ ...profile, school })}/><ProfileField label="学历" value={profile.degree} onChange={degree => setProfile({ ...profile, degree })}/><ProfileField label="专业" value={profile.major} onChange={major => setProfile({ ...profile, major })}/><ProfileField label="成绩与排名" value={profile.ranking} onChange={ranking => setProfile({ ...profile, ranking })}/></ProfileGroup><ProfileGroup title="简历能力" icon={<Award/>}><ProfileArea label="研究方向" value={profile.research} onChange={research => setProfile({ ...profile, research })}/><ProfileArea label="论文与学术成果" value={profile.publications} onChange={publications => setProfile({ ...profile, publications })}/><ProfileArea label="竞赛与荣誉" value={profile.awards} onChange={awards => setProfile({ ...profile, awards })}/><ProfileArea label="技术技能" value={profile.skills} onChange={skills => setProfile({ ...profile, skills })}/><ProfileArea label="项目经历" value={profile.projects} onChange={projects => setProfile({ ...profile, projects })}/></ProfileGroup><ProfileGroup title="目标偏好" icon={<Target/>}><ProfileArea label="目标岗位" value={profile.targets} onChange={targets => setProfile({ ...profile, targets })}/><ProfileField label="意向城市" value={profile.cities} onChange={cities => setProfile({ ...profile, cities })}/><ProfileField label="目标公司" value={profile.targetCompanies} onChange={targetCompanies => setProfile({ ...profile, targetCompanies })}/><ProfileField label="目标院校 / 研究所" value={profile.targetSchools} onChange={targetSchools => setProfile({ ...profile, targetSchools })}/></ProfileGroup><div className="profile-actions"><button type="button" onClick={() => setProfile(defaultProfile)}>清空档案</button><button className="primary" type="submit"><Save size={16}/> 保存档案</button></div></form><aside className="live-preview"><h2>实时匹配预览</h2><p>当前修改会即时反映在这里</p><h3>公司机会</h3>{visibleOpportunities.slice(0, 3).map(x => <div key={x.id}><span>{x.company}</span><b>{x.match.fit}%</b><small>{x.match.reasons.join(' · ')}</small></div>)}<h3>博士目标</h3>{visibleTargets.slice(0, 3).map(x => <div key={x.id}><span>{x.institution}</span><b>{x.match.fit}%</b><small>{x.match.reasons.join(' · ') || '待精筛导师'}</small></div>)}</aside></section></>}

        {activeNav === '数据备份' && <><PageTitle title="数据备份与迁移" description={`当前内容属于本机账号“${account.username}”，建议定期导出备份。`} icon={<Database/>}/><section className="backup-grid"><button onClick={exportData}><span><Download/></span><div><h2>导出完整备份</h2><p>包含个人档案、投递记录和套磁记录，保存为 JSON 文件。</p></div><ArrowUpRight/></button><button onClick={() => importRef.current?.click()}><span><Upload/></span><div><h2>导入历史备份</h2><p>选择 OfferFlow 导出的 JSON 文件，恢复到当前登录账号。</p></div><ArrowUpRight/></button><div className="privacy-note"><ShieldCheck/><div><h2>本机账号隔离</h2><p>不同账号使用不同的浏览器存储空间，关机重启后仍保留；内容不会上传服务器，也不能在另一台电脑自动找回。</p></div></div></section></>}
        <footer><span>OfferFlow · 已登录本机账号 @{account.username}</span><span>账号隔离 · 自动保存 · 可导出备份</span></footer>
      </div>
    </main>
    <input ref={importRef} type="file" accept="application/json" hidden onChange={importData}/>
    {modalOpen && <ApplicationModal form={form} setForm={setForm} editing={Boolean(editingId)} onClose={() => setModalOpen(false)} onSubmit={saveApplication}/>} 
    {outreachOpen && <OutreachModal form={outreachForm} setForm={setOutreachForm} editing={Boolean(editingOutreachId)} onClose={() => setOutreachOpen(false)} onSubmit={saveOutreach}/>} 
    {accountOpen && <LocalAccountModal account={account} onClose={() => setAccountOpen(false)} onLogout={onSessionEnd} onDeleted={onSessionEnd} onMessage={setToast}/>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>
}

function PageTitle({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) { return <section className="page-title"><span>{icon}</span><div><h1>{title}</h1><p>{description}</p></div></section> }
function Metric({ icon, label, value, hint, color }: { icon: React.ReactNode, label: string, value: number, hint: string, color: string }) { return <div className="metric"><span className={`metric-icon ${color}`}>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{hint}</p></div></div> }
function MiniMetric({ label, value, hint }: { label: string, value: number, hint: string }) { return <div className="mini-metric"><small>{label}</small><strong>{value}</strong><span>{hint}</span></div> }
function Empty({ icon, title, text }: { icon: React.ReactNode, title: string, text: string }) { return <div className="empty">{icon}<h3>{title}</h3><p>{text}</p></div> }
function QuickApplications({ items }: { items: Application[] }) { return items.length ? <div className="quick-list">{items.map(x => <div key={x.id}><span className="mini-logo">{x.company.slice(0, 1)}</span><p><b>{x.company}</b><small>{x.role}</small></p><strong>{x.appliedAt || '待投递'}</strong></div>)}</div> : <Empty icon={<BriefcaseBusiness/>} title="暂无投递" text="添加第一条投递记录后会显示在这里。"/> }

function ApplicationsTable({ items, setItems, onEdit, onRemove }: { items: Application[], setItems: React.Dispatch<React.SetStateAction<Application[]>>, onEdit: (x: Application) => void, onRemove: (id: string) => void }) { return <div className="table-wrap"><table><thead><tr><th>公司与岗位</th><th>地点</th><th>当前状态</th><th>投递日期</th><th>优先级</th><th>操作</th></tr></thead><tbody>{items.map(app => <tr key={app.id}><td><div className="company-cell"><span className="mini-logo">{app.company.slice(0, 1)}</span><div><strong>{app.company}</strong><small>{app.role}</small></div></div></td><td>{app.location || '未填写'}</td><td><select className={`status-pill ${statusClass[app.status]}`} value={app.status} onChange={e => setItems(list => list.map(x => x.id === app.id ? { ...x, status: e.target.value as ApplicationStatus } : x))}>{statusOptions.map(x => <option key={x}>{x}</option>)}</select></td><td>{app.appliedAt || '待投递'}</td><td><span className={`priority ${app.priority}`}>{app.priority}</span></td><td><div className="row-actions">{app.url && <a href={app.url} target="_blank" rel="noreferrer" title="进入官网"><ExternalLink size={16}/></a>}<button onClick={() => onEdit(app)} title="编辑"><Pencil size={16}/></button><button className="danger" onClick={() => onRemove(app.id)} title="删除"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{!items.length && <Empty icon={<Search/>} title="没有匹配记录" text="换个关键词或清除筛选条件。"/>}</div> }

function OutreachTable({ items, setItems, onEdit, onRemove }: { items: OutreachRecord[], setItems: React.Dispatch<React.SetStateAction<OutreachRecord[]>>, onEdit: (x: OutreachRecord) => void, onRemove: (id: string) => void }) { return <div className="table-wrap outreach-table"><table><thead><tr><th>导师与单位</th><th>研究方向</th><th>状态</th><th>首次联系</th><th>下次跟进</th><th>优先级</th><th>操作</th></tr></thead><tbody>{items.map(record => <tr key={record.id}><td><div className="company-cell"><span className="mini-logo phd-logo">{record.mentor.slice(0, 1)}</span><div><strong>{record.mentor}</strong><small>{record.institution} · {record.unit}</small></div></div></td><td>{record.direction || '待确定'}</td><td><select className={`status-pill ${outreachStatusClass[record.status]}`} value={record.status} onChange={e => setItems(list => list.map(x => x.id === record.id ? { ...x, status: e.target.value as OutreachStatus } : x))}>{outreachStatusOptions.map(x => <option key={x}>{x}</option>)}</select></td><td>{record.firstContactAt || '尚未联系'}</td><td className={record.followUpAt && (daysUntil(record.followUpAt) ?? 99) <= 7 ? 'due-soon' : ''}>{record.followUpAt || '未设置'}</td><td><span className={`priority ${record.priority}`}>{record.priority}</span></td><td><div className="row-actions">{record.homepage && <a href={record.homepage} target="_blank" rel="noreferrer" title="导师主页"><ExternalLink size={16}/></a>}{record.email && <a href={`mailto:${record.email}`} title="发邮件"><Mail size={16}/></a>}<button onClick={() => onEdit(record)} title="编辑"><Pencil size={16}/></button><button className="danger" onClick={() => onRemove(record.id)} title="删除"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{!items.length && <Empty icon={<Mail/>} title="还没有套磁记录" text="从目标单位选择记录导师，开始跟进。"/>}</div> }

function ProfileGroup({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) { return <fieldset><legend><span>{icon}</span>{title}</legend><div className="profile-field-grid">{children}</div></fieldset> }
function ProfileField({ label, value, onChange }: { label: string, value: string, onChange: (value: string) => void }) { return <label>{label}<input value={value} onChange={e => onChange(e.target.value)}/></label> }
function ProfileArea({ label, value, onChange }: { label: string, value: string, onChange: (value: string) => void }) { return <label className="wide">{label}<textarea value={value} onChange={e => onChange(e.target.value)}/></label> }

function ApplicationModal({ form, setForm, editing, onClose, onSubmit }: { form: Omit<Application, 'id'>, setForm: React.Dispatch<React.SetStateAction<Omit<Application, 'id'>>>, editing: boolean, onClose: () => void, onSubmit: (e: React.FormEvent) => void }) { return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onSubmit={onSubmit} onMouseDown={e => e.stopPropagation()}><ModalHead icon={<FileText/>} title={editing ? '编辑投递' : '新增投递'} text="记录岗位信息与关键节点" onClose={onClose}/><div className="form-grid"><label>公司名称 *<input required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}/></label><label>岗位名称 *<input required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}/></label><label>工作地点<input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}/></label><label>当前状态<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ApplicationStatus })}>{statusOptions.map(x => <option key={x}>{x}</option>)}</select></label><label>投递日期<input type="date" value={form.appliedAt} onChange={e => setForm({ ...form, appliedAt: e.target.value })}/></label><label>截止日期<input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}/></label><label>优先级<select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Application['priority'] })}><option>高</option><option>中</option><option>低</option></select></label><label>招聘官网<input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}/></label><label className="wide">备注<textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}/></label></div><ModalActions editing={editing} onClose={onClose}/></form></div> }
function OutreachModal({ form, setForm, editing, onClose, onSubmit }: { form: Omit<OutreachRecord, 'id'>, setForm: React.Dispatch<React.SetStateAction<Omit<OutreachRecord, 'id'>>>, editing: boolean, onClose: () => void, onSubmit: (e: React.FormEvent) => void }) { return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onSubmit={onSubmit} onMouseDown={e => e.stopPropagation()}><ModalHead icon={<GraduationCap/>} title={editing ? '编辑套磁记录' : '新增套磁记录'} text="记录导师、联系节点和下一步行动" onClose={onClose}/><div className="form-grid"><label>目标单位 *<input required value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })}/></label><label>院系 / 研究所<input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}/></label><label>导师姓名 *<input required value={form.mentor} onChange={e => setForm({ ...form, mentor: e.target.value })}/></label><label>研究方向<input value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })}/></label><label>联系邮箱<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label><label>当前状态<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as OutreachStatus })}>{outreachStatusOptions.map(x => <option key={x}>{x}</option>)}</select></label><label>首次联系日期<input type="date" value={form.firstContactAt} onChange={e => setForm({ ...form, firstContactAt: e.target.value })}/></label><label>下次跟进日期<input type="date" value={form.followUpAt} onChange={e => setForm({ ...form, followUpAt: e.target.value })}/></label><label>优先级<select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as OutreachRecord['priority'] })}><option>高</option><option>中</option><option>低</option></select></label><label>导师主页<input type="url" value={form.homepage} onChange={e => setForm({ ...form, homepage: e.target.value })}/></label><label className="wide">备注 / 下一步<textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}/></label></div><ModalActions editing={editing} onClose={onClose}/></form></div> }
function ModalHead({ icon, title, text, onClose }: { icon: React.ReactNode, title: string, text: string, onClose: () => void }) { return <div className="modal-head"><div><span>{icon}</span><div><h2>{title}</h2><p>{text}</p></div></div><button type="button" onClick={onClose}><X/></button></div> }
function ModalActions({ editing, onClose }: { editing: boolean, onClose: () => void }) { return <div className="modal-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" type="submit">{editing ? '保存修改' : '保存记录'}</button></div> }

function OfferFlowRoot() {
  const [account, setAccount] = useState<LocalAccount | null>(getCurrentAccount)
  if (!account) return <LocalAccountGate blankData={blankAccountData} legacyData={readLegacyData()} onAuthenticated={setAccount}/>
  return <App key={account.id} account={account} onSessionEnd={() => setAccount(null)}/>
}

export default OfferFlowRoot
