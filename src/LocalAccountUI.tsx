import { useState } from 'react'
import { Check, KeyRound, LockKeyhole, LogIn, LogOut, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react'
import {
  changeLocalPassword,
  deleteLocalAccount,
  getLocalAccountCount,
  hasLegacyData,
  loginLocalAccount,
  logoutLocalAccount,
  registerLocalAccount,
  type AccountData,
  type LocalAccount,
} from './localAccounts'

export function LocalAccountGate({ blankData, legacyData, onAuthenticated }: {
  blankData: AccountData
  legacyData: AccountData
  onAuthenticated: (account: LocalAccount) => void
}) {
  const [mode, setMode] = useState<'login' | 'register'>(getLocalAccountCount() ? 'login' : 'register')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [importExisting, setImportExisting] = useState(hasLegacyData())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (mode === 'register' && password !== confirmPassword) return setError('两次输入的密码不一致')
    setBusy(true)
    try {
      const newAccountData = importExisting ? legacyData : {
        ...blankData,
        profile: { ...blankData.profile, name: displayName.trim() || username.trim() },
      }
      const account = mode === 'register'
        ? await registerLocalAccount(username, displayName, password, newAccountData)
        : await loginLocalAccount(username, password)
      onAuthenticated(account)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  return <main className="account-gate">
    <section className="account-intro">
      <div className="gate-brand"><span><Check/></span>Offer<i>Flow</i></div>
      <small>本机个人申请工作台</small>
      <h1>每个账号，一套独立的申请记录</h1>
      <p>投递、套磁和个人档案保存在这台电脑的当前浏览器中。关机、重启或关闭网页后仍然存在。</p>
      <div className="gate-points"><span><ShieldCheck/><b>互相隔离</b><small>同一浏览器的不同账号分别保存</small></span><span><LockKeyhole/><b>密码不存明文</b><small>使用本机加盐校验值验证</small></span></div>
    </section>
    <section className="account-panel">
      <div className="account-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>登录</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>注册</button></div>
      <div className="account-heading"><span>{mode === 'login' ? <LogIn/> : <UserPlus/>}</span><div><h2>{mode === 'login' ? '登录本机账号' : '创建本机账号'}</h2><p>{mode === 'login' ? '继续管理你的个性化记录' : '账号仅在当前浏览器生效'}</p></div></div>
      <form onSubmit={submit} className="account-form">
        {mode === 'register' && <label>显示名称<input autoComplete="name" value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="例如：小穆"/></label>}
        <label>账号<input required autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} placeholder="3–24 位中文、字母或数字"/></label>
        <label>密码<input required minLength={6} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="至少 6 位"/></label>
        {mode === 'register' && <label>确认密码<input required minLength={6} type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="再次输入密码"/></label>}
        {mode === 'register' && hasLegacyData() && <label className="import-check"><input type="checkbox" checked={importExisting} onChange={event => setImportExisting(event.target.checked)}/><span><b>导入当前已有记录</b><small>把升级前的个人档案、投递和套磁记录归入新账号</small></span></label>}
        {error && <p className="account-error">{error}</p>}
        <button className="account-submit" disabled={busy}>{busy ? '正在处理…' : mode === 'login' ? '登录并进入' : '注册并进入'}</button>
      </form>
      <p className="local-limit"><KeyRound/>静态本机账号没有邮箱找回功能，请牢记密码并定期导出备份。</p>
    </section>
  </main>
}

export function LocalAccountModal({ account, onClose, onLogout, onDeleted, onMessage }: {
  account: LocalAccount
  onClose: () => void
  onLogout: () => void
  onDeleted: () => void
  onMessage: (message: string) => void
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      await changeLocalPassword(account.id, currentPassword, nextPassword)
      setCurrentPassword(''); setNextPassword(''); onMessage('本机账号密码已更新')
    } catch (reason) { setError(reason instanceof Error ? reason.message : '修改失败') }
    finally { setBusy(false) }
  }

  const deleteAccount = async (event: React.FormEvent) => {
    event.preventDefault(); setError('')
    if (!window.confirm('注销后会永久删除该账号在本浏览器中的全部记录，确认继续吗？')) return
    setBusy(true)
    try { await deleteLocalAccount(account.id, deletePassword); onDeleted() }
    catch (reason) { setError(reason instanceof Error ? reason.message : '注销失败') }
    finally { setBusy(false) }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal account-modal" onMouseDown={event => event.stopPropagation()}>
    <div className="modal-head"><div><span><LockKeyhole/></span><div><h2>本机账号</h2><p>管理登录状态、密码和本机数据</p></div></div><button onClick={onClose}><X/></button></div>
    <div className="account-summary"><span>{account.displayName.slice(0, 1).toUpperCase()}</span><div><b>{account.displayName}</b><small>@{account.username} · 数据自动保存在当前浏览器</small></div><button onClick={() => { logoutLocalAccount(); onLogout() }}><LogOut/>退出登录</button></div>
    {!deleting ? <form className="account-settings" onSubmit={changePassword}><h3>修改密码</h3><div><label>当前密码<input required type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)}/></label><label>新密码<input required minLength={6} type="password" value={nextPassword} onChange={event => setNextPassword(event.target.value)}/></label></div>{error && <p className="account-error">{error}</p>}<button className="primary" disabled={busy}>保存新密码</button><button type="button" className="danger-link" onClick={() => { setDeleting(true); setError('') }}><Trash2/>注销并删除本机账号</button></form>
      : <form className="account-settings delete-account" onSubmit={deleteAccount}><h3>确认注销账号</h3><p>该操作会删除个人档案、投递和套磁记录，无法恢复。建议先在“数据备份”中导出文件。</p><label>输入密码确认<input required type="password" value={deletePassword} onChange={event => setDeletePassword(event.target.value)}/></label>{error && <p className="account-error">{error}</p>}<div><button type="button" onClick={() => setDeleting(false)}>返回</button><button className="delete-confirm" disabled={busy}>永久删除</button></div></form>}
  </section></div>
}
