import type { Application, Opportunity, PhdTarget } from './types'

export const statusOptions = ['待投递', '已投递', '笔试', '面试', 'Offer', '已结束'] as const
export const outreachStatusOptions = ['待筛选', '待套磁', '已联系', '已回复', '已面谈', '积极进展', '已婉拒'] as const

export const sampleApplications: Application[] = [
  { id: 'a1', company: '字节跳动', role: '产品经理（AI方向）', location: '北京', status: '面试', appliedAt: '2026-08-18', deadline: '', url: 'https://jobs.bytedance.com/campus/', priority: '高', note: '准备业务面：产品拆解 + AI 应用案例' },
  { id: 'a2', company: '百度', role: 'AI产品经理', location: '北京', status: '已投递', appliedAt: '2026-08-24', deadline: '', url: 'https://talent.baidu.com/jobs/list', priority: '高', note: '官网 2027 校招岗位' },
  { id: 'a3', company: '腾讯音乐娱乐', role: '产品策划', location: '深圳', status: '待投递', appliedAt: '', deadline: '', url: 'https://join.tencentmusic.com/campus/post', priority: '中', note: '招满即止，尽早投递' },
  { id: 'a4', company: '华为', role: '产品数据运营', location: '深圳', status: '笔试', appliedAt: '2026-08-21', deadline: '', url: 'https://career.huawei.com/cn/campus-recruitment', priority: '中', note: '复习数据分析题型' },
]

// 官方页面快照：没有明确网申截止日时，不推测具体日期。
export const opportunities: Opportunity[] = [
  { id: 'o1', company: '腾讯音乐娱乐', short: 'TME', role: '2027 校园招聘', category: '产品 / 技术 / 设计 / 运营', locations: '深圳 · 北京 · 广州', deadline: null, deadlineLabel: '招满即止', officialUrl: 'https://join.tencentmusic.com/campus/post', verifiedAt: '2026-08-30', tags: ['2027届', '应届生'], color: '#22c55e', fit: 94 },
  { id: 'o2', company: '百度', short: 'du', role: '2027 校园招聘', category: '技术 / 产品 / 管培 / 设计', locations: '北京 · 上海 · 深圳等', deadline: null, deadlineLabel: '官网在招', officialUrl: 'https://talent.baidu.com/jobs/list', verifiedAt: '2026-08-30', tags: ['2027届', 'AI岗位'], color: '#3b82f6', fit: 91 },
  { id: 'o3', company: '字节跳动 Seed', short: 'Seed', role: '大模型人才校招', category: '算法 / 机器学习系统 / 研究', locations: '北京 · 上海 · 深圳', deadline: null, deadlineLabel: '官网在招', officialUrl: 'https://seed.bytedance.com/zh/seedearlycareer', verifiedAt: '2026-08-30', tags: ['2027届', 'AI专项'], color: '#8b5cf6', fit: 88 },
  { id: 'o4', company: '华为', short: 'HUAWEI', role: '校园招聘', category: '研发 / 销售 / 产品 / 供应链', locations: '全国多地', deadline: null, deadlineLabel: '以职位页为准', officialUrl: 'https://career.huawei.com/cn/campus-recruitment', verifiedAt: '2026-08-30', tags: ['官方入口', '多岗位'], color: '#ef4444', fit: 86 },
  { id: 'o5', company: '美团', short: '美团', role: '校园招聘 / 北斗计划', category: '技术 / 产品 / 商业分析 / 运营', locations: '北京 · 上海 · 深圳等', deadline: null, deadlineLabel: '官网在招', officialUrl: 'https://job.meituan.com/', verifiedAt: '2026-08-30', tags: ['校招', '转正实习'], color: '#facc15', fit: 84 },
  { id: 'o6', company: '字节跳动', short: 'Byte', role: '校园招聘 / ByteIntern', category: '产品 / 技术 / 运营 / 设计', locations: '北京 · 上海 · 深圳等', deadline: null, deadlineLabel: '职位滚动更新', officialUrl: 'https://jobs.bytedance.com/campus/', verifiedAt: '2026-08-30', tags: ['2027届', '转正实习'], color: '#06b6d4', fit: 82 },
]

// 来源：用户提供的《01_目标院校.xlsx》，仅收录用户指定的中科院、武大和天大重点目标。
export const phdTargets: PhdTarget[] = [
  { id: 'ict', group: '中科院/国科大', institution: '中国科学院计算技术研究所', city: '北京', unit: '计算所', directions: ['体系结构','高性能计算','AI芯片','系统','网络','数据','网安'], priority: '冲刺/重点', admissionsUrl: 'https://ict.cas.cn/yjsjy/zsxx/bszs/202512/t20251211_8025601.html', facultyUrl: 'https://www.ict.cas.cn/yjsjy/dsjj/', nextAction: '按实验室筛体系结构、智能计算、网络、分布式、数据和安全方向导师。', note: '导师名额很关键，网报前需充分沟通。' },
  { id: 'ia', group: '中科院/国科大', institution: '中国科学院自动化研究所', city: '北京', unit: '自动化所', directions: ['模式识别','机器学习','CV','NLP','类脑智能','机器人','社会计算'], priority: '冲刺/重点', admissionsUrl: 'https://ia.cas.cn/yjsjy/zs/bszs/202511/t20251104_8006012.html', facultyUrl: 'https://ia.cas.cn/yjsjy/dsjj/', nextAction: '优先按论文方向筛导师，准备英文 PPT、研究计划和成果证明。', note: 'AI 方向非常值得冲，但竞争强。' },
  { id: 'iscas', group: '中科院/国科大', institution: '中国科学院软件研究所', city: '北京', unit: '软件所', directions: ['软件工程','形式化','操作系统','编译','算法','密码','网安'], priority: '重点', admissionsUrl: 'https://www.iscas.ac.cn/yjsjy2016/zsxx2016/', facultyUrl: 'https://www.iscas.ac.cn/yjsjy2016/dsxx2016/', nextAction: '根据笔试科目和导师方向反推算法、软件工程、计算机数学或密码学准备。', note: '若论文偏软件工程、程序分析或系统软件，匹配度可能很高。' },
  { id: 'iie', group: '中科院/国科大', institution: '中国科学院信息工程研究所', city: '北京', unit: '信工所', directions: ['网络空间安全','密码','系统安全','数据安全','内容安全','模型安全'], priority: '重点', admissionsUrl: 'https://iie.cas.cn/xsjy/zsxx/bszs/', facultyUrl: 'https://iie.cas.cn/xsjy/dsjs/', nextAction: '有网安、隐私、密码或安全项目经历时优先精筛。', note: '非网安方向不建议盲投。', suggestedMentor: '曹亚男' },
  { id: 'ucas-ai', group: '中科院/国科大', institution: '中国科学院大学人工智能学院', city: '北京', unit: '国科大 AI 学院', directions: ['AI基础','机器感知','语言知识','智能机器人','复杂系统智能'], priority: '冲刺/重点', admissionsUrl: 'https://ai.ucas.ac.cn/index.php/zh-cn/zsjy/bszs/7597-2026', facultyUrl: 'https://ai.ucas.ac.cn/', nextAction: '与自动化所、计算所、软件所的导师资源联动筛选。', note: '适合 AI 方向且想走国科大体系者。' },
  { id: 'ucas-cs', group: '中科院/国科大', institution: '中国科学院大学计算机科学与技术学院', city: '北京', unit: '国科大计算机学院', directions: ['多媒体','数据挖掘','模式识别','NLP','体系结构','硬件安全','网络','信息安全'], priority: '重点', admissionsUrl: 'https://scce.ucas.ac.cn/index.php/zh-CN/tzgg/3648-2026-6', facultyUrl: 'https://scce.ucas.ac.cn/', nextAction: '按实验室方向找导师，并核实联合培养名额。', note: '方向覆盖广，适合与中科院各所组合申请。' },
  { id: 'whu', group: '高校', institution: '武汉大学', city: '武汉', unit: '计算机学院 / 人工智能学院 / 国家网络安全学院 / 遥感信息工程学院', directions: ['AI','网安','遥感智能','GIS','软件','数据'], priority: '重点', admissionsUrl: 'https://wdyz.whu.edu.cn/index.htm', facultyUrl: 'https://cs.whu.edu.cn/', nextAction: '分别核实计算机、AI、网安学院博士细则；遥感智能/GIS 方向可加权。', note: '当前作为待核实重点池。' },
  { id: 'tju', group: '高校', institution: '天津大学', city: '天津', unit: '智能与计算学部', directions: ['计算机','软件工程','网络空间安全','智能科学','AI'], priority: '重点/稳健', admissionsUrl: 'https://cic.tju.edu.cn/info/1041/6196.htm', facultyUrl: 'https://cic.tju.edu.cn/', nextAction: '按计算机、软件、网安、AI 四类方向筛导师，注意两阶段报名时间。', note: '学部制信息集中，后续匹配效率较高。' },
]
